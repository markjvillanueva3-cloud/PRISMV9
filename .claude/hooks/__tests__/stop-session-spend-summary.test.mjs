import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeSession, formatSpendSummary } from "../stop-session-spend-summary.mjs";

test("summarizeSession: counts fires for matching session", () => {
  const sidecar = {
    recent: [
      { sessionId: "95e7030e", toolName: "Read", classifiers: ["isLargeRead"] },
      { sessionId: "95e7030e", toolName: "Bash", classifiers: ["isVerboseBash"] },
      { sessionId: "047e0a72", toolName: "Read", classifiers: ["isLargeRead"] },
    ],
  };
  const s = summarizeSession(sidecar, "95e7030e-full-uuid");
  assert.equal(s.fires, 2);
  assert.equal(s.byTool.Read, 1);
  assert.equal(s.byTool.Bash, 1);
  assert.equal(s.byClassifier.isLargeRead, 1);
  assert.equal(s.byClassifier.isVerboseBash, 1);
});
test("summarizeSession: empty recent → fires=0", () => {
  assert.equal(summarizeSession({ recent: [] }, "x").fires, 0);
});
test("summarizeSession: null sidecar → fires=0", () => {
  assert.equal(summarizeSession(null, "x").fires, 0);
});
test("summarizeSession: missing session prefix → fires=0", () => {
  const sidecar = { recent: [{ sessionId: "abc", toolName: "Read", classifiers: [] }] };
  assert.equal(summarizeSession(sidecar, "").fires, 0);
});

test("formatSpendSummary: zero fires → null", () => {
  assert.equal(formatSpendSummary({ fires: 0 }), null);
  assert.equal(formatSpendSummary(null), null);
});
test("formatSpendSummary: includes fires count + top tool/classifier", () => {
  const s = { fires: 3, byTool: { Read: 2, Bash: 1 }, byClassifier: { isLargeRead: 2 } };
  const out = formatSpendSummary(s);
  assert.ok(out.includes("3"));
  assert.ok(out.includes("Read"));
  assert.ok(out.includes("isLargeRead"));
});
test("formatSpendSummary: includes /r12-audit reference", () => {
  const s = { fires: 1, byTool: { Read: 1 }, byClassifier: { isLargeRead: 1 } };
  assert.ok(formatSpendSummary(s).includes("/r12-audit"));
});
