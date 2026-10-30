import assert from "node:assert/strict";
import test from "node:test";

import {
  createExportOutputSession,
  type ExportAttention,
  type ExportDiagnosticRecord,
} from "../src/export-output.ts";

function session() {
  const records: ExportDiagnosticRecord[] = [];
  const attention: ExportAttention[] = [];
  const output = createExportOutputSession({
    onRecord: (record) => records.push(record),
    onAttention: (event) => attention.push(event),
  });
  return { ...output, records, attention };
}

test("assembles split UTF-8, CRLF, final lines, and marks invalid input", () => {
  const capture = session();
  const multibyte = Buffer.from("café\r\n");
  capture.output.onStdout(multibyte.subarray(0, 4));
  capture.output.onStdout(multibyte.subarray(4));
  capture.output.onStderr(
    Buffer.from([0x45, 0x52, 0x52, 0x4f, 0x52, 0x20, 0xff]),
  );
  capture.close();

  assert.deepEqual(
    capture.records.map(({ stream, severity, message, invalidUtf8 }) => ({
      stream,
      severity,
      message,
      invalidUtf8,
    })),
    [
      {
        stream: "stdout",
        severity: "info",
        message: "café",
        invalidUtf8: false,
      },
      {
        stream: "stderr",
        severity: "error",
        message: "ERROR �",
        invalidUtf8: true,
      },
    ],
  );
  assert.deepEqual(capture.attention, [{ category: "error" }]);
});

test("strips terminal formatting and redacts every secret policy class", () => {
  const capture = session();
  capture.output.onStderr(
    Buffer.from(
      "\u001b[31m WARNING: \u001b]0;title\u0007" +
        "https://user:pass@example.test/path?q=secret#fragment " +
        "Authorization: Bearer abcdefghijklmnopqrstuvwxyz012345 " +
        "cookie=session-value password=hunter2 api_key=key-value " +
        "access_key=access-value secret_key=secret-value " +
        "x-amz-signature=signature-value " +
        "abcdefgh.ijklmnop.qrstuvwx " +
        "0123456789abcdefghijklmnopqrstuvwxyz\u0001\n",
    ),
  );
  capture.close();

  assert.equal(capture.records.length, 1);
  const record = capture.records[0] as ExportDiagnosticRecord;
  assert.equal(record.severity, "warning");
  assert.equal(record.message.includes("example.test/path"), true);
  for (const secret of [
    "user",
    "user:pass",
    "q=secret",
    "Bearer abcdef",
    "session-value",
    "hunter2",
    "key-value",
    "access-value",
    "secret-value",
    "signature-value",
    "abcdefgh.ijklmnop.qrstuvwx",
    "0123456789abcdefghijklmnopqrstuvwxyz",
    "\u001b",
    "\u0001",
  ]) {
    assert.equal(record.message.includes(secret), false, secret);
  }
  assert.deepEqual(capture.attention, [{ category: "warning" }]);
});

test("drops split and unterminated CSI and OSC payloads without retaining credentials", () => {
  const terminated = session();
  const bytes = Buffer.from(
    "safe \u001b[31mred\u001b[0m " +
      "\u001b]52;c;YXV0aG9yaXphdGlvbj1CZWFyZXIgZml4dHVyZS1jcmVkZW50aWFs\u0007" +
      "after-bel " +
      "\u001b]0;password=osc-secret\u001b\\after-st\n",
  );
  for (const byte of bytes) terminated.output.onStdout(Buffer.of(byte));
  terminated.close();
  assert.equal(terminated.records.length, 1);
  assert.equal(terminated.records[0]?.message, "safe red after-bel after-st");
  const serialized = JSON.stringify(terminated.records);
  for (const payload of [
    "YXV0aG9yaXphdGlvbj1CZWFyZXIgZml4dHVyZS1jcmVkZW50aWFs",
    "osc-secret",
    "password",
  ]) {
    assert.equal(serialized.includes(payload), false, payload);
  }

  const unterminatedCsi = session();
  unterminatedCsi.output.onStdout(Buffer.from("prefix "));
  unterminatedCsi.output.onStdout(Buffer.from("\u001b[38;5;"));
  unterminatedCsi.close();
  assert.deepEqual(
    unterminatedCsi.records.map((record) => record.message),
    ["prefix "],
  );
});

test("malformed control lines resynchronize at LF and CRLF boundaries", () => {
  const capture = session();
  const osc = Buffer.from(
    "\u001b]52;c;Bearer-osc-line-secret\nsafe after osc\n",
  );
  const csi = Buffer.from("\u001b[38;5;12345\r\nsafe after csi\r\n");
  for (const byte of osc) capture.output.onStderr(Buffer.of(byte));
  for (let offset = 0; offset < csi.length; offset += 2) {
    capture.output.onStdout(csi.subarray(offset, offset + 2));
  }
  capture.close();

  const messages = capture.records.map((record) => record.message);
  assert.equal(messages.includes("safe after osc"), true);
  assert.equal(messages.includes("safe after csi"), true);
  const serialized = JSON.stringify(capture.records);
  assert.equal(serialized.includes("Bearer-osc-line-secret"), false);
  assert.equal(serialized.includes("38;5;12345"), false);
});

test("bounds overlong and high-volume output and emits one advisory aggregate", () => {
  const capture = session();
  capture.output.onStdout(Buffer.from(`${"x".repeat(9_000)}\n`));
  capture.output.onStderr(Buffer.from("WARN first\nERROR second\n"));
  for (let index = 0; index < 600; index += 1) {
    capture.output.onStdout(Buffer.from(`ordinary ${index}\n`));
  }
  capture.close();
  capture.close();

  assert.equal(capture.records.length, 512);
  assert.equal(capture.records[0]?.truncated, true);
  assert.ok(Buffer.byteLength(capture.records[0]?.message ?? "") <= 4_096);
  assert.equal(capture.records.at(-1)?.message, "export output truncated");
  assert.deepEqual(capture.attention, [{ category: "both" }]);
});

test("observer failures never escape export child callbacks", () => {
  const failures: unknown[] = [];
  const output = createExportOutputSession({
    onRecord: () => {
      throw new Error("record observer failed");
    },
    onAttention: () => {
      throw new Error("attention observer failed");
    },
    onFailure: (cause) => failures.push(cause),
  });
  assert.doesNotThrow(() =>
    output.output.onStdout(Buffer.from("ERROR advisory\n")),
  );
  assert.doesNotThrow(() => output.close());
  assert.equal(failures.length, 2);
});
