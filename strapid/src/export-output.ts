const MAX_LINE_BYTES = 4_096;
const MAX_RECORDS = 512;
const MAX_OUTPUT_BYTES = 512 * 1_024;
const MAX_PENDING_BYTES = 8_192;
const TRUNCATION_SUMMARY = "export output truncated";

export type ExportDiagnosticStream = "stdout" | "stderr";
export type ExportDiagnosticSeverity = "info" | "warning" | "error";

export interface ExportDiagnosticRecord {
  readonly stream: ExportDiagnosticStream;
  readonly severity: ExportDiagnosticSeverity;
  readonly message: string;
  readonly truncated: boolean;
  readonly invalidUtf8: boolean;
}

export interface ExportAttention {
  readonly category: "warning" | "error" | "both";
}

export interface ExportOutputSession {
  readonly output: {
    readonly onStdout: (chunk: Uint8Array) => void;
    readonly onStderr: (chunk: Uint8Array) => void;
  };
  close(): void;
}

export interface ExportOutputSessionOptions {
  readonly onRecord: (record: ExportDiagnosticRecord) => void;
  readonly onAttention: (attention: ExportAttention) => void;
  readonly onFailure?: (cause: unknown) => void;
}

function safeCall(operation: () => void, onFailure: (cause: unknown) => void) {
  try {
    operation();
  } catch (cause) {
    try {
      onFailure(cause);
    } catch {
      // Output observation must never enter child-process control flow.
    }
  }
}

type ControlSequenceState = "text" | "escape" | "csi" | "osc" | "osc-escape";

class ControlSequenceFilter {
  private state: ControlSequenceState = "text";

  push(chunk: Uint8Array): Buffer {
    const output = Buffer.allocUnsafe(chunk.length);
    let outputLength = 0;
    for (const byte of chunk) {
      if (this.state === "text") {
        if (byte === 0x1b) {
          this.state = "escape";
        } else if (
          !(
            byte <= 0x08 ||
            byte === 0x0b ||
            byte === 0x0c ||
            (byte >= 0x0e && byte <= 0x1f) ||
            byte === 0x7f
          )
        ) {
          output[outputLength] = byte;
          outputLength += 1;
        }
        continue;
      }
      if (byte === 0x0a || byte === 0x0d) {
        this.state = "text";
        output[outputLength] = byte;
        outputLength += 1;
        continue;
      }
      if (this.state === "escape") {
        if (byte === 0x5b) this.state = "csi";
        else if (byte === 0x5d) this.state = "osc";
        else if (byte !== 0x1b) this.state = "text";
        continue;
      }
      if (this.state === "csi") {
        if (byte === 0x1b) this.state = "escape";
        else if (byte >= 0x40 && byte <= 0x7e) this.state = "text";
        continue;
      }
      if (this.state === "osc") {
        if (byte === 0x07) this.state = "text";
        else if (byte === 0x1b) this.state = "osc-escape";
        continue;
      }
      if (byte === 0x5c || byte === 0x07) this.state = "text";
      else if (byte !== 0x1b) this.state = "osc";
    }
    return output.subarray(0, outputLength);
  }

  close(): void {
    this.state = "text";
  }
}

function redactUrls(value: string): string {
  return value.replace(/https?:\/\/[^\s<>"']+/gi, (candidate) => {
    try {
      const parsed = new URL(candidate);
      parsed.username = "";
      parsed.password = "";
      parsed.search = "";
      parsed.hash = "";
      return parsed.toString();
    } catch {
      return "[REDACTED_URL]";
    }
  });
}

function redactSecrets(value: string): string {
  return redactUrls(value)
    .replace(/\b(?:bearer|basic)\s+[A-Za-z0-9+/_.=-]+/gi, "[REDACTED]")
    .replace(
      /\b(authorization|cookie|set-cookie|password|passwd|secret|token|api[-_]?key|access[-_]?key|secret[-_]?key|signature|credential|x-amz-[a-z0-9-]+)\s*[:=]\s*[^\s,;]+/gi,
      "$1=[REDACTED]",
    )
    .replace(
      /\b[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
      "[REDACTED]",
    )
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, "[REDACTED]");
}

function truncateUtf8(value: string): { value: string; truncated: boolean } {
  if (Buffer.byteLength(value) <= MAX_LINE_BYTES) {
    return { value, truncated: false };
  }
  let result = "";
  let length = 0;
  for (const character of value) {
    const next = Buffer.byteLength(character);
    if (length + next > MAX_LINE_BYTES) break;
    result += character;
    length += next;
  }
  return { value: result, truncated: true };
}

function classify(value: string): ExportDiagnosticSeverity {
  const match =
    /^\s*(?:\[(WARN(?:ING)?|ERROR)\]|(WARN(?:ING)?|ERROR))(?=\s|:|-|$)/i.exec(
      value,
    );
  const marker = (match?.[1] ?? match?.[2])?.toLowerCase();
  if (marker === "error") return "error";
  if (marker === "warn" || marker === "warning") return "warning";
  return "info";
}

class StreamAssembler {
  private pending = Buffer.alloc(0);
  private overlong = false;
  private readonly controlFilter = new ControlSequenceFilter();
  private readonly emitLine: (
    stream: ExportDiagnosticStream,
    line: Buffer,
    truncated: boolean,
  ) => void;
  private readonly stream: ExportDiagnosticStream;

  constructor(
    stream: ExportDiagnosticStream,
    emitLine: (
      stream: ExportDiagnosticStream,
      line: Buffer,
      truncated: boolean,
    ) => void,
  ) {
    this.stream = stream;
    this.emitLine = emitLine;
  }

  push(chunk: Uint8Array): void {
    let bytes = this.controlFilter.push(chunk);
    while (bytes.length > 0) {
      const lineEnd = bytes.indexOf(0x0a);
      const part = lineEnd < 0 ? bytes : bytes.subarray(0, lineEnd);
      const remaining = Math.max(0, MAX_PENDING_BYTES - this.pending.length);
      if (part.length > remaining) this.overlong = true;
      if (remaining > 0) {
        this.pending = Buffer.concat([
          this.pending,
          part.subarray(0, remaining),
        ]);
      }
      if (lineEnd < 0) return;
      this.flushLine();
      bytes = bytes.subarray(lineEnd + 1);
    }
  }

  close(): void {
    this.controlFilter.close();
    if (this.pending.length > 0 || this.overlong) this.flushLine();
  }

  private flushLine(): void {
    const line =
      this.pending.at(-1) === 0x0d
        ? this.pending.subarray(0, -1)
        : this.pending;
    this.emitLine(this.stream, line, this.overlong);
    this.pending = Buffer.alloc(0);
    this.overlong = false;
  }
}

export function createExportOutputSession(
  options: ExportOutputSessionOptions,
): ExportOutputSession {
  const onFailure = options.onFailure ?? (() => undefined);
  let records = 0;
  let outputBytes = 0;
  let dropped = false;
  let warning = false;
  let error = false;
  let closed = false;

  const emitLine = (
    stream: ExportDiagnosticStream,
    bytes: Buffer,
    assemblerTruncated: boolean,
  ) => {
    let decoded: string;
    let invalidUtf8 = false;
    try {
      decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      decoded = new TextDecoder("utf-8").decode(bytes);
      invalidUtf8 = true;
    }
    const safe = redactSecrets(decoded);
    const severity = classify(safe);
    warning ||= severity === "warning";
    error ||= severity === "error";
    const truncated = truncateUtf8(safe);
    const messageBytes = Buffer.byteLength(truncated.value);
    if (
      records >= MAX_RECORDS - 1 ||
      outputBytes + messageBytes >
        MAX_OUTPUT_BYTES - Buffer.byteLength(TRUNCATION_SUMMARY)
    ) {
      dropped = true;
      return;
    }
    records += 1;
    outputBytes += messageBytes;
    safeCall(
      () =>
        options.onRecord({
          stream,
          severity,
          message: truncated.value,
          truncated: assemblerTruncated || truncated.truncated,
          invalidUtf8,
        }),
      onFailure,
    );
  };

  const stdout = new StreamAssembler("stdout", emitLine);
  const stderr = new StreamAssembler("stderr", emitLine);
  return {
    output: {
      onStdout: (chunk) => safeCall(() => stdout.push(chunk), onFailure),
      onStderr: (chunk) => safeCall(() => stderr.push(chunk), onFailure),
    },
    close() {
      if (closed) return;
      closed = true;
      safeCall(() => stdout.close(), onFailure);
      safeCall(() => stderr.close(), onFailure);
      if (dropped) {
        safeCall(
          () =>
            options.onRecord({
              stream: "stderr",
              severity: "info",
              message: TRUNCATION_SUMMARY,
              truncated: true,
              invalidUtf8: false,
            }),
          onFailure,
        );
      }
      if (warning || error) {
        safeCall(
          () =>
            options.onAttention({
              category:
                warning && error ? "both" : warning ? "warning" : "error",
            }),
          onFailure,
        );
      }
    },
  };
}

export const exportOutputTestHooks = {
  filterControlBytes(chunks: readonly Uint8Array[]): Buffer {
    const filter = new ControlSequenceFilter();
    const result = Buffer.concat(chunks.map((chunk) => filter.push(chunk)));
    filter.close();
    return result;
  },
  redactSecrets,
  classify,
};
