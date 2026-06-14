import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyResultPattern, formatNudge, THRESHOLDS } from "../posttool-threshold-nudges.mjs";

test("B2: slow Bash → hint", () => {
  const c = classifyResultPattern("Bash", { command: "x" }, "ok", 35000);
  assert.equal(c.gap, "B2");
  assert.ok(c.hint.includes("run_in_background"));
});
test("B2: fast Bash → null", () => {
  assert.equal(classifyResultPattern("Bash", { command: "x" }, "ok", 100), null);
});
test("B3: grep with many hits → narrow hint", () => {
  const result = "x\n".repeat(THRESHOLDS.grepHitsHigh + 10);
  const c = classifyResultPattern("Grep", {}, result, 0);
  assert.equal(c.gap, "B3");
});
test("B3: grep with few hits → null", () => {
  assert.equal(classifyResultPattern("Grep", {}, "1\n2\n3", 0), null);
});
test("B4: Edit oversized → split hint", () => {
  const c = classifyResultPattern("Edit", { new_string: "x\n".repeat(60) }, "", 0);
  assert.equal(c.gap, "B4");
});
test("B4: Edit small → null", () => {
  assert.equal(classifyResultPattern("Edit", { new_string: "x\ny" }, "", 0), null);
});
test("B6: Task oversized return → Ollama summarize hint", () => {
  const c = classifyResultPattern("Task", {}, "x".repeat(6000), 0);
  assert.equal(c.gap, "B6");
  assert.ok(c.hint.includes("prism_dev:ollama_hook_query"));
});
test("B6: Task small return → null", () => {
  assert.equal(classifyResultPattern("Task", {}, "short", 0), null);
});
test("formatNudge: null classification → null", () => {
  assert.equal(formatNudge(null), null);
});
test("formatNudge: includes gap tag", () => {
  const n = formatNudge({ gap: "B2", hint: "x" });
  assert.ok(n.includes("B2"));
  assert.ok(n.includes("PRISM_POSTTOOL_THRESHOLD_DISABLE"));
});
