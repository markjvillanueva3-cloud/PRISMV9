// scripts/lib/sfc-taylor-vc-lib.test.mjs
//
// Reference-value tests. Taylor Vc figures hand-computed: Vc(T)=C/T^n.
//   P (C=350,n=0.25): Vc@15 = 350/15^0.25 = 177.85 ; Vc@10 = 196.82 ; Vc@30 = 149.55
//   H (C=120,n=0.15): Vc@15 = 120/15^0.15 = 79.94  ; Vc@10 = 84.95  ; Vc@30 = 72.04
// Run: `node scripts/lib/sfc-taylor-vc-lib.test.mjs`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SFM_TO_MMIN, programmedVcMmin, taylorVc, classifyProgrammedVc,
} from "./sfc-taylor-vc-lib.mjs";

const near = (a, b, tol = 0.5) => Math.abs(a - b) <= tol;

test("taylorVc: C/T^n reference values (carbide steel P, hardened H)", () => {
  assert.ok(near(taylorVc(350, 0.25, 15), 177.85), `got ${taylorVc(350, 0.25, 15)}`);
  assert.ok(near(taylorVc(350, 0.25, 10), 196.82));
  assert.ok(near(taylorVc(350, 0.25, 30), 149.55));
  assert.ok(near(taylorVc(120, 0.15, 15), 79.94));
  assert.equal(taylorVc(350, 0.25, 0), null);   // invalid life
  assert.equal(taylorVc(NaN, 0.25, 15), null);
});

test("programmedVcMmin: sfm->m/min vs metric passthrough, unit labeled", () => {
  const inch = programmedVcMmin(250, "inch");
  assert.ok(near(inch.mmin, 76.2, 0.001));        // 250 sfm * 0.3048
  assert.equal(inch.assumedUnit, "sfm(inch-convention)");
  const unk = programmedVcMmin(250, "unknown");   // JM convention -> sfm
  assert.ok(near(unk.mmin, 76.2, 0.001));
  const met = programmedVcMmin(300, "metric");
  assert.equal(met.mmin, 300);
  assert.equal(met.assumedUnit, "m/min");
  assert.equal(SFM_TO_MMIN, 0.3048);
  assert.equal(programmedVcMmin(NaN, "inch").mmin, null);
});

test("classifyProgrammedVc: same 250 sfm is CONSERVATIVE on steel, IN-BAND on hardened", () => {
  const vc = programmedVcMmin(250, "inch").mmin; // 76.2 m/min
  // vs carbide steel P (rec nominal ~178): 76.2 is well below -> conservative
  const onP = classifyProgrammedVc(vc, 350, 0.25);
  assert.equal(onP.band, "conservative");
  assert.ok(near(onP.ratioNominal, 0.428, 0.01));
  // vs hardened H (rec nominal ~80): 76.2 sits in the 72-85 band -> in-band
  const onH = classifyProgrammedVc(vc, 120, 0.15);
  assert.equal(onH.band, "in-band");
});

test("classifyProgrammedVc: aggressive + very-conservative tails", () => {
  // 250 m/min on steel (rec aggressive ~197) -> too hot
  assert.equal(classifyProgrammedVc(250, 350, 0.25).band, "aggressive");
  // 50 m/min on steel (< 0.5*149.55=74.8) -> very conservative (HSS-like / underutilized)
  assert.equal(classifyProgrammedVc(50, 350, 0.25).band, "very-conservative");
  // non-finite programmed -> unknown, never throws
  assert.equal(classifyProgrammedVc(null, 350, 0.25).band, "unknown");
});
