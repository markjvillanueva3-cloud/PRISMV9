/**
 * build-lathe-lora-dataset.test.ts -- U-LORA-LATHE-CORPUS-POPULATE (slot:india).
 * Run via tsx: npx tsx --test scripts/build-lathe-lora-dataset.test.ts
 *
 * Hermetic R9 tests for the CORPUS QUALITY GATE (the part india owns). Real reference values
 * pinned to the actual lathe-builder output shapes observed in the live run:
 *  - empty code-analysis ("performs:\n\n**Suggestions") -> dropped
 *  - grounded code-analysis (>=1 bullet) -> kept
 *  - "sequence" operation-order template (hallucinates ops) -> dropped
 *  - too-short output -> dropped
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { hasAnalysisContent, isQualityExample, substantiveLines, dedupRows } from "./build-lathe-lora-dataset.js";

// Real shapes from the 2026-06-18 live run (state/shared/lora/machine-lathe-dataset.jsonl).
const BROKEN = "**Code Analysis:**\n\nThis G-code segment performs:\n\n**Suggestions:**\n- Verify coolant is active before cutting operations\n- Check tool life counters if using tool groups";
const GROUNDED = "**Code Analysis:**\n\nThis G-code segment performs:\n- Constant surface speed (CSS) mode for consistent cutting\n- Maximum spindle speed clamp (G50 S) for safety\n\n**Suggestions:**\n- Verify coolant is active before cutting operations\n- Check tool life counters if using tool groups";
const NON_REVIEW = "**Recommended Operation Sequence:**\n\n1. roughing\n2. drilling\n\n**Rationale:**\n- Start with roughing to remove bulk material efficiently";

test("hasAnalysisContent: empty performs section -> false", () => {
  assert.equal(hasAnalysisContent(BROKEN), false);
});
test("hasAnalysisContent: performs section with >=1 bullet -> true", () => {
  assert.equal(hasAnalysisContent(GROUNDED), true);
});
test("hasAnalysisContent: non-code_review output (no performs section) -> true", () => {
  assert.equal(hasAnalysisContent(NON_REVIEW), true);
});

test("isQualityExample: grounded code_review -> kept", () => {
  assert.equal(isQualityExample({ output: GROUNDED, metadata: { operation_type: "code_review" } }), true);
});
test("isQualityExample: empty-analysis code_review -> dropped", () => {
  assert.equal(isQualityExample({ output: BROKEN, metadata: { operation_type: "code_review" } }), false);
});
test("isQualityExample: 'sequence' op (hallucinates ops not in input) -> dropped even if long", () => {
  assert.equal(isQualityExample({ output: NON_REVIEW + " padded ".repeat(40), metadata: { operation_type: "sequence" } }), false);
});
test("isQualityExample: too-short output -> dropped", () => {
  assert.equal(isQualityExample({ output: "**Analysis:** ok", metadata: { operation_type: "general" } }), false);
});
test("isQualityExample: grounded general op above content floor -> kept", () => {
  assert.equal(isQualityExample({ output: GROUNDED, metadata: { operation_type: "general" } }), true);
});

// Arm-B 3-of-3 finding: the speed_feed template emits an empty Recommendations section (only the
// static "Always verify" line) when tribal tips=0 -- the SAME hollow defect as empty code_review,
// but with no "performs:" section so the old gate missed it.
const HOLLOW_SPEEDFEED = "**Analysis:**\n\n**Recommendations:**\n\n- Always verify with Kienzle force calculations before heavy roughing\n- Verify coolant is active before cutting operations";
const GROUNDED_SPEEDFEED = "**Analysis:**\n- Spindle speed: 800 RPM is standard for general turning\n- Feed rate: 0.005 IPR is light, suitable for finishing passes\n\n**Recommendations:**\n- Always verify with Kienzle force calculations before heavy roughing";

test("substantiveLines: strips boilerplate, keeps program-specific bullets", () => {
  assert.equal(substantiveLines(HOLLOW_SPEEDFEED).length, 0);           // only static lines
  assert.ok(substantiveLines(GROUNDED_SPEEDFEED).length >= 2);          // real S/F analysis bullets
  assert.ok(substantiveLines(GROUNDED).length >= 2);                    // CSS/G50 bullets
});
test("isQualityExample: hollow speed_feed (only boilerplate) -> dropped (the arm-B gap)", () => {
  assert.equal(isQualityExample({ output: HOLLOW_SPEEDFEED, metadata: { operation_type: "speed_feed" } }), false);
});
test("isQualityExample: grounded speed_feed -> kept", () => {
  assert.equal(isQualityExample({ output: GROUNDED_SPEEDFEED, metadata: { operation_type: "speed_feed" } }), true);
});

test("dedupRows: collapses identical (instruction,output) pairs", () => {
  const r = (i: string, o: string) => ({ instruction: i, input: "", output: o, galaxy: "lathe" });
  const rows = [r("a", "x"), r("a", "x"), r("a", "y"), r("b", "x")];
  const out = dedupRows(rows);
  assert.equal(out.length, 3);                                          // (a,x) deduped
  assert.deepEqual(out.map((q) => q.output), ["x", "y", "x"]);
});
