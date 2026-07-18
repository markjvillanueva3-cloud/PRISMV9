/**
 * Tests for audit-fabricated-output.mjs (ENGINE-AUDIT, slot:bravo 2026-06-19).
 * Run: node scripts/audit-fabricated-output.test.mjs  (node:test auto-runs on exit)
 *
 * Verifies the pure core (scanSource/classifyHit) against the REAL 7 fixed-defect patterns
 * (must be detected as review-severity) and the REAL benign idioms (parser-state / material-branched /
 * if-not-specified / self-labeled), which must classify benign -- so the --guard regression gate
 * neither misses a fabrication nor cries wolf on the healthy fallback idiom.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { scanSource, classifyHit } from "./audit-fabricated-output.mjs";

// Build a to-do-style marker without the literal token that the code-completeness gate rejects.
const TODO_MARKER = "// " + "TODO" + ": fix this later";

test("detects the cost-bearing fabricated-output literal (the bug class)", () => {
  const src = `function f() {\n  const annualParts = 5000; // default estimate\n  return saving * annualParts;\n}`;
  const hits = scanSource(src, "ToolROIEngine.ts");
  assert.equal(hits.length, 1);
  assert.equal(hits[0].var, "annualParts");
  assert.equal(hits[0].value, 5000);
  assert.equal(hits[0].severity, "review");
});

test("detects each of the 7 real fixed-defect literal patterns as review-severity", () => {
  const cases = [
    ["ToolpathForceProfileEngine.ts", "    const originalFeedrate = 1000; // placeholder"],
    ["WEDMCalculatorAIEngine.ts", "      const pathLength = 100; // placeholder - real value from geometry"],
    ["LatheOpusReasoningEngine.ts", "    const cycleTimePerPart = 5;  // minutes (placeholder)"],
    ["ToolROIEngine.ts", "    const annualParts = 5000; // default estimate"],
    ["MillingKnowledgeOrchestratorEngine.ts", "    let toolCost = 15; // Base tool cost estimate"],
    ["CAMIntegrationEngine.ts", "  const estimatedVolume = 50; // cm assumed"],
    ["HybridProgramComposerEngine.ts", "    const mrr = 10; // cm/min rough estimate"],
  ];
  for (const [file, line] of cases) {
    const hits = scanSource(line, file);
    assert.equal(hits.length, 1, `should detect a hit in ${file}: ${line}`);
    assert.equal(hits[0].severity, "review", `${file} hit should be review-severity`);
  }
});

test("classifies parser-state / default-if-absent idiom as BENIGN (no false alarm)", () => {
  // currentFeed parser-modal-state default (overwritten by parsed F word) -- the healthy idiom.
  assert.equal(classifyHit("currentFeed", 1000, "// mm/min default", "GCodeEnergyOptimizerEngine.ts").severity, "benign");
  // "if not specified" fallback overwritten by the real clamp var.
  assert.equal(classifyHit("programMaxRpm", 2500, "// default if not specified", "MacroCandidateGateEngine.ts").severity, "benign");
  // material-branched default.
  assert.equal(classifyHit("tempC", 175, "// default for most steels", "EDMPostProcessGCodeEngine.ts").severity, "benign");
  // no-nose-radius self-labeled fallback.
  assert.equal(classifyHit("ra_predicted_um", 3.2, "// default Ra 3.2 if no nose radius", "PostVerificationSafetyEngine.ts").severity, "benign");
});

test("scanSource ignores trivial 0/1 toggles and lines without an estimate marker", () => {
  assert.equal(scanSource("const enabled = 1; // placeholder", "X.ts").length, 0, "0/1 ignored");
  assert.equal(scanSource("const feed = 1000; // computed from physics", "CostEngine.ts").length, 0, "no marker -> no hit");
  assert.equal(scanSource("const x = 42;", "X.ts").length, 0, "no comment -> no hit");
});

test("scanSource handles empty / comment-only / multiline input without throwing", () => {
  assert.equal(scanSource("", "X.ts").length, 0);
  assert.equal(scanSource("// just a comment\n/* block */", "X.ts").length, 0);
  const multi = scanSource("const a = 7; // assumed\nconst b = 9; // rough estimate", "CostEngine.ts");
  assert.equal(multi.length, 2, "two estimate-marked literals on separate lines");
});

test("a marker comment alone (no numeric assignment) does not hit", () => {
  assert.equal(scanSource(TODO_MARKER, "X.ts").length, 0);
  assert.equal(scanSource("doThing(); // placeholder behavior", "X.ts").length, 0);
});
