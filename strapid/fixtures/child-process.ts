import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const SELF_EXPIRY_MS = 30_000;

function writeEvent(event: string, fields: Record<string, unknown> = {}): void {
  process.stdout.write(`${JSON.stringify({ event, ...fields })}\n`);
}

function numericArgument(index: number, fallback?: number): number {
  const raw = process.argv[index];
  if (raw === undefined && fallback !== undefined) {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Argument ${index} must be a non-negative integer`);
  }
  return value;
}

function expireAfter(milliseconds = SELF_EXPIRY_MS): NodeJS.Timeout {
  return setTimeout(() => process.exit(124), milliseconds);
}

function spawnDescendant(mode: string, ...arguments_: number[]) {
  return spawn(
    process.execPath,
    [fileURLToPath(import.meta.url), mode, ...arguments_.map(String)],
    {
      detached: false,
      stdio: ["ignore", "inherit", "inherit"],
    },
  );
}

const mode = process.argv[2];

switch (mode) {
  case "exit": {
    process.exit(numericArgument(3));
    break;
  }
  case "signal-self": {
    const signal = (process.argv[3] ?? "SIGTERM") as NodeJS.Signals;
    process.kill(process.pid, signal);
    break;
  }
  case "tail": {
    const descendant = spawn(
      process.execPath,
      [
        fileURLToPath(import.meta.url),
        "tail-descendant",
        String(numericArgument(3)),
      ],
      {
        detached: false,
        stdio: ["ignore", "inherit", "inherit", "ipc"],
      },
    );
    descendant.once("message", () => {
      writeEvent("descendant", { pid: descendant.pid });
      process.exit(0);
    });
    break;
  }
  case "diagnostic-tail": {
    const descendant = spawn(
      process.execPath,
      [
        fileURLToPath(import.meta.url),
        "diagnostic-tail-descendant",
        String(numericArgument(3)),
      ],
      {
        detached: false,
        stdio: ["ignore", "inherit", "inherit", "ipc"],
      },
    );
    descendant.once("message", () => {
      writeEvent("descendant", { pid: descendant.pid });
      process.exit(0);
    });
    break;
  }
  case "tail-descendant": {
    expireAfter();
    let closed = false;
    const closeTail = () => {
      if (closed) {
        return;
      }
      closed = true;
      process.stdout.write(
        `${JSON.stringify({ event: "tail-closed", pid: process.pid })}\n`,
        () => process.exit(0),
      );
    };
    process.once("SIGTERM", closeTail);
    process.send?.({ event: "ready" });
    setTimeout(() => {
      closeTail();
    }, numericArgument(3));
    break;
  }
  case "diagnostic-tail-descendant": {
    expireAfter();
    process.stderr.write("WA");
    process.stderr.write(
      "RN token=fixture-secret-value-0123456789abcdef\nunfamiliar exporter status\n",
    );
    let closed = false;
    const closeTail = () => {
      if (closed) return;
      closed = true;
      process.stdout.write(
        `${JSON.stringify({ event: "tail-closed", pid: process.pid })}\n`,
        () => process.exit(0),
      );
    };
    process.once("SIGTERM", closeTail);
    process.send?.({ event: "ready" });
    setTimeout(closeTail, numericArgument(3));
    break;
  }
  case "idle-graceful": {
    expireAfter();
    process.once("SIGTERM", () => process.exit(0));
    writeEvent("ready", { pid: process.pid });
    break;
  }
  case "exit-after": {
    expireAfter();
    process.once("SIGTERM", () => process.exit(0));
    writeEvent("ready", { pid: process.pid });
    setTimeout(() => process.exit(numericArgument(4, 1)), numericArgument(3));
    break;
  }
  case "idle-tree": {
    expireAfter();
    process.once("SIGTERM", () => process.exit(0));
    const descendant = spawnDescendant("idle-descendant");
    descendant.once("spawn", () => {
      writeEvent("descendant", { pid: descendant.pid });
      writeEvent("ready", { pid: process.pid });
    });
    break;
  }
  case "idle-descendant": {
    expireAfter();
    process.once("SIGTERM", () => process.exit(0));
    break;
  }
  case "ignore-tree": {
    expireAfter();
    process.on("SIGTERM", () => undefined);
    const descendant = spawnDescendant("ignore-descendant");
    descendant.once("spawn", () => {
      writeEvent("descendant", { pid: descendant.pid });
      writeEvent("ready", { pid: process.pid });
    });
    break;
  }
  case "ignore-descendant": {
    expireAfter();
    process.on("SIGTERM", () => undefined);
    break;
  }
  default:
    throw new Error("Unknown child fixture mode");
}
