// Tests for lathe-template-emitter.mjs — CLOSED-LOOP-MS0/U-CL5
// The CLOSED-LOOP proof: a U-CL2 template → emitted Okuma program → assessed PROPER (U-CL1)
// → PASSES the closed-loop test (U-CL4). Generated programs are PROPER BY CONSTRUCTION
// (G50 cap on G96, declared G95) — the exact defects the assessment found in existing programs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { emitFromTemplate } from "./lathe-template-emitter.mjs";
import { assessProgram } from "../lathe-program-assessor.mjs";
import { closedLoopTest } from "../lathe-closed-loop-test.mjs";

// U-CL2 template shapes (as produced by LatheToolpathTemplateEngine.buildTemplate).
const ROUGH = { category: "rough", cannedCycle: "G71", cssMode: "G96",
  params: [{ param: "vc", default: 220 }, { param: "fn", default: 0.3 }, { param: "ap", default: 2.5 }],
  safetyGates: ["css-no-rpm-cap", "feed-mode-undeclared"] };
const THREAD = { category: "thread", cannedCycle: "G76", cssMode: "G97",
  params: [{ param: "vc", default: 120 }, { param: "fn", default: 0.1 }], safetyGates: ["thread-g76"] };

test("emit (rough/G96) bakes in the G50 cap + G95 feed + the G71 cycle", () => {
  const p = emitFromTemplate(ROUGH, { maxRpm: 3000 });
  assert.match(p, /G50 S3000/);  // spindle cap (fixes css-no-rpm-cap)
  assert.match(p, /G96 S220/);   // CSS at the template's vc
  assert.match(p, /G95/);        // feed-per-rev (fixes feed-mode-undeclared)
  assert.match(p, /G71/);        // roughing cycle
});

test("emit (thread/G97) uses constant-RPM G97 (NOT G96) + the G76 cycle", () => {
  const p = emitFromTemplate(THREAD, { rpm: 800 });
  assert.match(p, /G97 S800/);
  assert.match(p, /G76/);
  assert.doesNotMatch(p, /G96/); // threading is constant-RPM, never CSS
});

test("CLOSED LOOP: template → emit → assessProgram is PROPER (generate a proper program)", () => {
  const program = emitFromTemplate(ROUGH);
  const a = assessProgram(program, { controller: "okuma" });
  assert.equal(a.proper, true, `emitted program must be lint-clean; findings=${a.ruleSet}`);
  assert.equal(a.errorCount, 0);
  // specifically: the two defects the assessment found in existing programs are ABSENT here
  assert.ok(!a.ruleSet.includes("css-no-rpm-cap"));
  assert.ok(!a.ruleSet.includes("feed-mode-undeclared"));
});

test("CLOSED LOOP (full): emitted program PASSES the U-CL4 closed-loop test with tools on hand", () => {
  const program = emitFromTemplate(ROUGH);
  const r = closedLoopTest({ programText: program, purchaseByType: { insert: { count: 212 }, "carbide-blank": { count: 5372 } } });
  assert.equal(r.verdict, "PASS");
  assert.equal(r.proper, true);
  assert.deepEqual(r.toolTypesMissing, []);
});

test("throws on a malformed template (missing cannedCycle/cssMode)", () => {
  assert.throws(() => emitFromTemplate({ category: "rough" }), /missing cannedCycle/);
  assert.throws(() => emitFromTemplate(null), /missing cannedCycle/);
});
