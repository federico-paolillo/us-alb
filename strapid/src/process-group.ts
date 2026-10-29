import type { ChildProcess } from "node:child_process";
import { spawn } from "node:child_process";
import { isAbsolute } from "node:path";
import { performance } from "node:perf_hooks";

export interface ProcessTerminationBounds {
  readonly gracefulTimeoutMs: number;
  readonly forcedTimeoutMs: number;
  readonly pollIntervalMs: number;
}

export interface ChildCommand {
  readonly role: "serving" | "export";
  readonly executable: string;
  readonly arguments: readonly string[];
  readonly cwd: string;
  readonly environment: NodeJS.ProcessEnv;
  readonly output:
    | { readonly mode: "inherit" }
    | {
        readonly mode: "pipe";
        readonly onStdout: (chunk: Uint8Array) => void;
        readonly onStderr: (chunk: Uint8Array) => void;
      };
}

export type ChildCloseResult =
  | { readonly status: "exited"; readonly exitCode: number }
  | { readonly status: "signaled"; readonly signal: NodeJS.Signals };

export interface ManagedCompletion {
  readonly close: ChildCloseResult;
  readonly termination: "natural" | "graceful" | "forced";
}

export interface ManagedProcessGroup {
  readonly pid: number;
  readonly role: ChildCommand["role"];
  isDirectChildLive(): boolean;
  wait(): Promise<ManagedCompletion>;
  terminate(bounds: ProcessTerminationBounds): Promise<ManagedCompletion>;
  reconfirmExit(): Promise<boolean>;
}

export class ChildSpawnError extends Error {
  constructor(role: ChildCommand["role"], cause: unknown) {
    super(`Failed to spawn ${role} child`, { cause });
    this.name = "ChildSpawnError";
  }
}

export class ChildOutputError extends Error {
  constructor(role: ChildCommand["role"], pid: number, cause: unknown) {
    super(`Failed to consume ${role} child output for process group ${pid}`, {
      cause,
    });
    this.name = "ChildOutputError";
  }
}

export class ProcessGroupExitUnconfirmedError extends Error {
  readonly processGroupId: number;
  readonly role: ChildCommand["role"];

  constructor(
    role: ChildCommand["role"],
    processGroupId: number,
    cause?: unknown,
  ) {
    super(
      `Could not confirm ${role} process group ${processGroupId} exited`,
      cause === undefined ? undefined : { cause },
    );
    this.name = "ProcessGroupExitUnconfirmedError";
    this.processGroupId = processGroupId;
    this.role = role;
  }
}

function assertTerminationBounds(bounds: ProcessTerminationBounds): void {
  for (const [name, value] of Object.entries(bounds)) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(`${name} must be a positive finite number`);
    }
  }
}

function assertCommand(command: ChildCommand): void {
  if (!isAbsolute(command.executable)) {
    throw new Error("Child executable must be absolute");
  }
  if (!isAbsolute(command.cwd)) {
    throw new Error("Child working directory must be absolute");
  }
  if (process.platform !== "linux") {
    throw new Error("Detached process-group supervision requires Linux");
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

class NodeManagedProcessGroup implements ManagedProcessGroup {
  readonly role: ChildCommand["role"];

  private readonly child: ChildProcess;
  private readonly naturalExitCleanupBounds: ProcessTerminationBounds;
  private readonly directExit = Promise.withResolvers<void>();
  private readonly directClose = Promise.withResolvers<void>();
  private spawnFailure: unknown;
  private outputFailure: ChildOutputError | undefined;
  private exitObserved = false;
  private closeObserved = false;
  private closeResult: ChildCloseResult | undefined;
  private cleanupPromise: Promise<ManagedCompletion> | undefined;

  constructor(
    command: ChildCommand,
    naturalExitCleanupBounds: ProcessTerminationBounds,
  ) {
    this.role = command.role;
    this.naturalExitCleanupBounds = naturalExitCleanupBounds;
    this.child = spawn(command.executable, [...command.arguments], {
      cwd: command.cwd,
      detached: true,
      env: command.environment,
      shell: false,
      stdio:
        command.output.mode === "inherit"
          ? ["ignore", "inherit", "inherit"]
          : ["ignore", "pipe", "pipe"],
    });

    this.child.once("error", (error) => {
      this.spawnFailure = error;
      this.directExit.resolve();
    });
    this.child.once("exit", () => {
      this.exitObserved = true;
      this.directExit.resolve();
      void this.beginCleanup("natural", this.naturalExitCleanupBounds).catch(
        () => undefined,
      );
    });
    this.child.once("close", (exitCode, signal) => {
      this.closeObserved = true;
      if (this.spawnFailure === undefined) {
        if (exitCode !== null) {
          this.closeResult = { status: "exited", exitCode };
        } else if (signal !== null) {
          this.closeResult = { status: "signaled", signal };
        }
      }
      this.directClose.resolve();
    });

    if (command.output.mode === "pipe") {
      this.consumeOutput(this.child.stdout, command.output.onStdout);
      this.consumeOutput(this.child.stderr, command.output.onStderr);
    }
  }

  get pid(): number {
    const pid = this.child.pid;
    if (pid === undefined) {
      throw new ChildSpawnError(
        this.role,
        this.spawnFailure ?? new Error("Child process has no process ID"),
      );
    }
    return pid;
  }

  isDirectChildLive(): boolean {
    return (
      this.child.pid !== undefined &&
      this.spawnFailure === undefined &&
      !this.exitObserved &&
      !this.closeObserved
    );
  }

  async wait(): Promise<ManagedCompletion> {
    await this.directExit.promise;
    if (this.spawnFailure !== undefined) {
      await this.directClose.promise;
      throw new ChildSpawnError(this.role, this.spawnFailure);
    }

    return this.complete(
      this.beginCleanup("natural", this.naturalExitCleanupBounds),
    );
  }

  terminate(bounds: ProcessTerminationBounds): Promise<ManagedCompletion> {
    assertTerminationBounds(bounds);
    return this.complete(this.beginCleanup("graceful", bounds));
  }

  async reconfirmExit(): Promise<boolean> {
    if (!this.closeObserved || this.child.pid === undefined) {
      return false;
    }

    return !(await this.processGroupExists());
  }

  private consumeOutput(
    stream: NodeJS.ReadableStream | null,
    consumer: (chunk: Uint8Array) => void,
  ): void {
    stream?.on("data", (chunk: Uint8Array) => {
      if (this.outputFailure !== undefined) {
        return;
      }

      try {
        consumer(chunk);
      } catch (cause) {
        this.outputFailure = new ChildOutputError(this.role, this.pid, cause);
        void this.beginCleanup("graceful", this.naturalExitCleanupBounds).catch(
          () => undefined,
        );
      }
    });
  }

  private async complete(
    completion: Promise<ManagedCompletion>,
  ): Promise<ManagedCompletion> {
    const result = await completion;
    if (this.outputFailure !== undefined) {
      throw this.outputFailure;
    }
    return result;
  }

  private beginCleanup(
    initialTermination: "natural" | "graceful",
    bounds: ProcessTerminationBounds,
  ): Promise<ManagedCompletion> {
    assertTerminationBounds(bounds);
    this.cleanupPromise ??= this.cleanup(initialTermination, bounds);
    return this.cleanupPromise;
  }

  private async cleanup(
    initialTermination: "natural" | "graceful",
    bounds: ProcessTerminationBounds,
  ): Promise<ManagedCompletion> {
    if (this.child.pid === undefined) {
      await this.directExit.promise;
    }
    if (this.spawnFailure !== undefined) {
      await this.directClose.promise;
      throw new ChildSpawnError(this.role, this.spawnFailure);
    }

    let termination: ManagedCompletion["termination"] = initialTermination;
    const groupInitiallyExists = await this.processGroupExists();

    if (groupInitiallyExists) {
      await this.signalProcessGroup("SIGTERM");
      termination = "graceful";
    }

    if (await this.waitForConfirmation(bounds.gracefulTimeoutMs, bounds)) {
      return { close: this.requireCloseResult(), termination };
    }

    await this.signalProcessGroup("SIGKILL");
    if (await this.waitForConfirmation(bounds.forcedTimeoutMs, bounds)) {
      return { close: this.requireCloseResult(), termination: "forced" };
    }

    throw new ProcessGroupExitUnconfirmedError(this.role, this.pid);
  }

  private async waitForConfirmation(
    timeoutMs: number,
    bounds: ProcessTerminationBounds,
  ): Promise<boolean> {
    const deadline = performance.now() + timeoutMs;
    while (true) {
      if (this.closeObserved && !(await this.processGroupExists())) {
        return true;
      }

      const remaining = deadline - performance.now();
      if (remaining <= 0) {
        return false;
      }
      await delay(Math.min(bounds.pollIntervalMs, remaining));
    }
  }

  private async processGroupExists(): Promise<boolean> {
    try {
      process.kill(-this.pid, 0);
      return true;
    } catch (cause) {
      if (this.isMissingProcess(cause)) {
        return false;
      }
      throw new ProcessGroupExitUnconfirmedError(this.role, this.pid, cause);
    }
  }

  private async signalProcessGroup(signal: NodeJS.Signals): Promise<void> {
    try {
      process.kill(-this.pid, signal);
    } catch (cause) {
      if (!this.isMissingProcess(cause)) {
        throw new ProcessGroupExitUnconfirmedError(this.role, this.pid, cause);
      }
    }
  }

  private isMissingProcess(error: unknown): boolean {
    return (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ESRCH"
    );
  }

  private requireCloseResult(): ChildCloseResult {
    if (this.closeResult === undefined) {
      throw new ProcessGroupExitUnconfirmedError(this.role, this.pid);
    }
    return this.closeResult;
  }
}

export function spawnManagedProcessGroup(
  command: ChildCommand,
  naturalExitCleanupBounds: ProcessTerminationBounds,
): ManagedProcessGroup {
  assertCommand(command);
  assertTerminationBounds(naturalExitCleanupBounds);
  return new NodeManagedProcessGroup(command, naturalExitCleanupBounds);
}
