export type RunTrigger =
  | "scheduled"
  | "startup-catch-up"
  | "scheduled-retry"
  | "manual"
  | "pending-publication";

export type RunRequest<T> =
  | { readonly status: "started"; readonly completion: Promise<T> }
  | { readonly status: "skipped"; readonly reason: "active" | "not-ready" };

export interface RunAdmission {
  request<T>(
    trigger: RunTrigger,
    admittedOperation: () => Promise<T>,
  ): RunRequest<T>;
  stop(): void;
}

class RunAdmissionImplementation implements RunAdmission {
  private activeGeneration: number | undefined;
  private nextGeneration = 0;
  private stopped = false;

  request<T>(
    _trigger: RunTrigger,
    admittedOperation: () => Promise<T>,
  ): RunRequest<T> {
    if (this.stopped) return { status: "skipped", reason: "not-ready" };
    if (this.activeGeneration !== undefined) {
      return { status: "skipped", reason: "active" };
    }
    const generation = ++this.nextGeneration;
    this.activeGeneration = generation;
    let operation: Promise<T>;
    try {
      operation = admittedOperation();
    } catch (error) {
      operation = Promise.reject(error);
    }
    const completion = operation.finally(() => {
      if (this.activeGeneration === generation) {
        this.activeGeneration = undefined;
      }
    });
    return { status: "started", completion };
  }

  stop(): void {
    this.stopped = true;
  }
}

export function createRunAdmission(): RunAdmission {
  return new RunAdmissionImplementation();
}

export function createManualRunRequestHandler(
  requestManual: () => RunRequest<unknown>,
  onError: (error: unknown) => void,
): () => void {
  return () => {
    const request = requestManual();
    if (request.status === "started") {
      void request.completion.catch(onError);
    }
  };
}
