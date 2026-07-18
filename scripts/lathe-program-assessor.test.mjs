// Tests for lathe-program-assessor.mjs — CLOSED-LOOP-MS0/U-CL1
// Real fail-on-revert assertions: machining-content normalization, per-program PROPER
// (lint-clean) verdict, A/B pair verdict (passthrough/improved/regressed/neutral), aggregate.
// Calibrated against real lint behaviour (verified on a JM ALCOA program before authoring).
// Synthetic programs are kept free of INCIDENTAL findings (feed-mode declared via G95, no
// center plunge so partoff-no-peck never fires) so the ONLY finding variable is the G50 cap.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  machiningCodeOf, machiningIdentical, assessProgram, assessABPair, aggregateAssessment,
} from "./lathe-program-assessor.mjs";

// CLEAN: G50 spindle cap + declared feed (G95) + no center plunge → expected ZERO findings.
const CLEAN = "G95\nG50 S2000\nG96 S200 M03\nG01 X2.0 Z-0.5 F0.01\nG00 X5.0\nM30\n";
// CSS_BAD: identical machining minus the G50 cap → exactly one finding: css-no-rpm-cap (ERROR).
const CSS_BAD = "G95\nG96 S200 M03\nG01 X2.0 Z-0.5 F0.01\nG00 X5.0\nM30\n";

test("machiningCodeOf strips Fanuc () and Okuma [] comments + normalizes whitespace", () => {
  assert.equal(machiningCodeOf("G01 X1.0  (rough pass)\n\n  G00 X5 [retract] "), "G01 X1.0\nG00 X5");
  assert.equal(machiningCodeOf(""), "");
  assert.equal(machiningCodeOf(null), "");
});

test("machiningIdentical: comment-only difference is identical; code change is not", () => {
  assert.equal(machiningIdentical("G01 X1 Z0 (rough)\nM30", "(UPGRADED v2)\nG01 X1 Z0 (finish)\nM30"), true);
  assert.equal(machiningIdentical("G01 X1 Z0\nM30", "G01 X2 Z0\nM30"), false);
});

test("assessProgram: G96 without G50 is NOT proper (css-no-rpm-cap ERROR)", () => {
  const r = assessProgram(CSS_BAD, { controller: "okuma" });
  assert.ok(r.ruleSet.includes("css-no-rpm-cap"), `expected css-no-rpm-cap, got ${r.ruleSet}`);
  assert.equal(r.proper, false);
  assert.ok(r.errorCount >= 1);
  assert.equal(r.maxSev, 3); // ERROR rank
});

test("assessProgram: the G50-capped clean program is proper with no findings", () => {
  const r = assessProgram(CLEAN, { controller: "okuma" });
  assert.deepEqual(r.ruleSet, [], `expected no findings, got ${r.ruleSet}`);
  assert.equal(r.proper, true);
  assert.equal(r.errorCount, 0);
});

test("assessProgram: empty/garbage input is handled (proper=true, no findings)", () => {
  const empty = assessProgram("", { controller: "okuma" });
  assert.equal(empty.proper, true);
  assert.equal(empty.errorCount, 0);
  assert.deepEqual(empty.findings, []);
  const nul = assessProgram(null, { controller: "okuma" });
  assert.equal(nul.proper, true);
  assert.deepEqual(nul.ruleSet, []);
});

test("assessABPair: annotation-only B is 'annotation-passthrough' (the iter261 class)", () => {
  const r = assessABPair({ aText: CLEAN, bText: "(PRISM_UPGRADED)\n" + CLEAN, ctx: { controller: "okuma" } });
  assert.equal(r.machiningChanged, false);
  assert.equal(r.verdict, "annotation-passthrough");
});

test("assessABPair: B fixes A's safety ERROR → 'improved'", () => {
  const r = assessABPair({ aText: CSS_BAD, bText: CLEAN, ctx: { controller: "okuma" } });
  assert.equal(r.machiningChanged, true);
  assert.ok(r.fixed.includes("css-no-rpm-cap"), `expected css-no-rpm-cap fixed, got fixed=${r.fixed}`);
  assert.deepEqual(r.introduced, []);
  assert.equal(r.verdict, "improved");
});

test("assessABPair: B introduces a safety ERROR → 'regressed'", () => {
  const r = assessABPair({ aText: CLEAN, bText: CSS_BAD, ctx: { controller: "okuma" } });
  assert.equal(r.machiningChanged, true);
  assert.ok(r.introduced.includes("css-no-rpm-cap"));
  assert.deepEqual(r.fixed, []);
  assert.equal(r.verdict, "regressed");
});

test("assessABPair: machining changed but no net finding delta → 'changed-neutral'", () => {
  const b = CLEAN.replace("X2.0", "X2.5"); // a benign coordinate change; both remain finding-free
  const r = assessABPair({ aText: CLEAN, bText: b, ctx: { controller: "okuma" } });
  assert.equal(r.machiningChanged, true);
  assert.deepEqual(r.fixed, []);
  assert.deepEqual(r.introduced, []);
  assert.equal(r.verdict, "changed-neutral");
});

test("aggregateAssessment: verdict/passthrough/proper rates over a pair set", () => {
  const pairs = [
    assessABPair({ aText: CSS_BAD, bText: CLEAN, ctx: { controller: "okuma" } }),                  // improved, B proper
    assessABPair({ aText: CLEAN, bText: "(c)\n" + CLEAN, ctx: { controller: "okuma" } }),           // passthrough, B proper
    assessABPair({ aText: CLEAN, bText: CSS_BAD, ctx: { controller: "okuma" } }),                   // regressed, B NOT proper
  ];
  const agg = aggregateAssessment({ pairs });
  assert.equal(agg.pairCount, 3);
  assert.equal(agg.verdictCounts["improved"], 1);
  assert.equal(agg.verdictCounts["annotation-passthrough"], 1);
  assert.equal(agg.verdictCounts["regressed"], 1);
  assert.equal(agg.passthroughRate, +(1 / 3).toFixed(3));
  assert.equal(agg.properBRate, +(2 / 3).toFixed(3)); // 2 of 3 B's are lint-clean
});

test("aggregateAssessment: empty input is safe", () => {
  const agg = aggregateAssessment({});
  assert.equal(agg.pairCount, 0);
  assert.equal(agg.passthroughRate, null);
  assert.deepEqual(agg.verdictCounts, {});
});
