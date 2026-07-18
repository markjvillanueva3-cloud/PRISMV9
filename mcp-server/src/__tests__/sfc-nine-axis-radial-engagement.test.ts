/**
 * Nine-axis radial engagement: toolpath.radial_depth_mm/_pct is LIVE in prism_optimized
 * ===================================================================================
 * Regression target (U-OSC-RADIAL-ENGAGEMENT). Before the fix, the prism_optimized branch of
 * SpeedFeedNineAxisOrchestratorEngine.buildModeRecommendation() recomputed ae from the balanced
 * ALTERNATIVE's static table ae_pct -- discarding the operator's radial_depth_mm/_pct that the SFC
 * engine had already resolved into sfc.radial_depth.value. Net effect: MRR was IDENTICAL from 5%
 * to 100% radial engagement (the axis was inert) even though MRR = ap*ae*Vf MUST scale ~20x.
 *
 * The fix reads sfc.radial_depth.value (the engine's resolved, honored ae) when the operator
 * supplies a radial input. Because the SFC engine computes sfc.forces at that SAME ae, the
 * downstream workholding + spindle-power clamps stay force-consistent -- no separate re-derivation.
 *
 * This suite pins:
 *  1. HONORED   -- recommendation.radial_depth_mm tracks the operator's ae/D (not a table value).
 *  2. NOT INERT -- changing radial_depth_pct changes MRR (the exact bug); higher ae -> higher MRR.
 *  3. IDENTITY  -- MRR = ap*ae*Vf/1000 * rigidity * coolant (dimensional consistency, clamp-safe:
 *                  the clamps scale feed AND mrr together, so the identity holds with or without).
 *  4. BACK-COMPAT -- no radial input falls back to the balanced table ae_pct, deterministically.
 *  5. EDGE/ADVERSARIAL -- 0 / NaN / negative radial = "not provided" (engine >0 truthiness), never
 *                  an inert zero-width cut; explicit radial_depth_mm path also honored.
 *  6. SAFETY  -- at a FULL SLOT, a power-limited spindle MUST derate MRR (the spindle-power clamp
 *                engages), proving cutting force is NON-ZERO at full immersion. This is the coupled
 *                guarantee that the UltimateSpeedFeedEngine hex_mm fix delivers: pre-fix hex->0 at
 *                a full slot collapsed Fc->0 so the clamp never fired (silent under-protection).
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  speedFeedNineAxisOrchestratorEngine,
  type NineAxisInput,
} from "../engines/SpeedFeedNineAxisOrchestratorEngine.js";

type NineAxisResult = ReturnType<typeof speedFeedNineAxisOrchestratorEngine.run>;
type Rec = NineAxisResult["recommendation"];

const D = 12; // tool diameter (mm) -- ae/D ratios resolve to round mm: 25%=3.0, 50%=6.0, 100%=12.0

function alRun(radial?: { pct?: number; mm?: number }): NineAxisResult {
  const input: NineAxisInput = {
    material: { iso_group: "N", name: "Aluminum 6061" }, // low forces -> no clamp masks MRR scaling
    tooling: { tool_diameter_mm: D, flutes: 3, tool_material: "carbide" },
    toolpath: {
      operation: "milling",
      cut_type: "roughing",
      axial_depth_mm: 4,
      ...(radial?.pct !== undefined ? { radial_depth_pct: radial.pct } : {}),
      ...(radial?.mm !== undefined ? { radial_depth_mm: radial.mm } : {}),
    },
    mode: "prism_optimized",
  };
  return speedFeedNineAxisOrchestratorEngine.run(input);
}

// Full-slot steel cut, parameterised by spindle power, for the safety/clamp-coupling test.
function steelFullSlot(powerKw: number): Rec {
  const input: NineAxisInput = {
    material: { iso_group: "P", name: "AISI 1045" },
    tooling: { tool_diameter_mm: D, flutes: 4, tool_material: "carbide" },
    toolpath: { operation: "milling", cut_type: "roughing", axial_depth_mm: 6, radial_depth_pct: 100 },
    machine: { power_kw: powerKw },
    mode: "prism_optimized",
  };
  return speedFeedNineAxisOrchestratorEngine.run(input).recommendation;
}

// Memoise: ultimateSpeedFeedEngine.calculate() is ~2.5s/call, so resolve every run ONCE.
let r25: Rec, r50: Rec;
let r30Full: NineAxisResult, rNoneFull: NineAxisResult;
let rNone: Rec, rZero: Rec, rNaN: Rec, rNeg: Rec, rMm: Rec;
let fullHi: Rec, fullLo: Rec;

beforeAll(() => {
  r25 = alRun({ pct: 25 }).recommendation;
  r50 = alRun({ pct: 50 }).recommendation;
  r30Full = alRun({ pct: 30 });
  rNoneFull = alRun();
  rNone = rNoneFull.recommendation;
  rZero = alRun({ pct: 0 }).recommendation;
  rNaN = alRun({ pct: Number.NaN }).recommendation;
  rNeg = alRun({ pct: -10 }).recommendation;
  rMm = alRun({ mm: 2.0 }).recommendation;
  fullHi = steelFullSlot(50); // ample power -> no clamp
  fullLo = steelFullSlot(2); // tiny power -> clamp MUST fire if Fc > 0 at full slot
}, 120_000);

describe("nine-axis radial engagement: radial_depth is LIVE (U-OSC-RADIAL-ENGAGEMENT)", () => {
  it("HONORED: recommendation.radial_depth_mm tracks the operator's ae/D, not a table value", () => {
    // 25% x 12 = 3.0mm, 50% x 12 = 6.0mm (roundSig(2) preserves both exactly).
    expect(r25.radial_depth_mm).toBeCloseTo(3.0, 1);
    expect(r50.radial_depth_mm).toBeCloseTo(6.0, 1);
  });

  it("NOT INERT: changing radial_depth_pct changes MRR (the exact pre-fix bug); higher ae -> higher MRR", () => {
    // Pre-fix these were IDENTICAL (ae frozen at the table value). Doubling ae must move MRR.
    expect(r50.mrr_cm3min).not.toBe(r25.mrr_cm3min);
    expect(r50.mrr_cm3min).toBeGreaterThan(r25.mrr_cm3min);
    // ae doubled (3.0->6.0) -> MRR rises, but SUB-geometric (< 2x): radial chip-thinning raises fz at low
    // immersion (25% ae) and tapers it toward half-immersion (50%), so MRR scales by ~1.7x, NOT 2x.
    // (2026-06-23: corrected from the prior >1.8 bound, which wrongly assumed fz constant across ae and
    // ignored the committed UltimateSpeed chip-thinning; live ratio is ~1.71x. Full-sweep monotonicity
    // 25<50<75<100% (73->125->188->251) confirms the axis scales strongly across the range.)
    expect(r50.mrr_cm3min / r25.mrr_cm3min).toBeGreaterThan(1.5);
    expect(r50.mrr_cm3min / r25.mrr_cm3min).toBeLessThan(2.0);
  });

  it("IDENTITY: MRR = ap * ae * Vf / 1000 * rigidity * coolant (dimensional consistency)", () => {
    // Reconstruct from the reported recommendation fields + the returned axis factors. The clamps
    // (if any) scale feed AND mrr by the same factor, so this identity holds universally; ae/ap are
    // never clamp-scaled, so it directly proves MRR consumed the HONORED ae.
    const f = r30Full.axis_factors;
    const rec = r30Full.recommendation;
    const reconstructed =
      ((rec.axial_depth_mm * rec.radial_depth_mm * rec.feed_rate_mmmin) / 1000) *
      f.machine_rigidity_factor *
      f.coolant_effectiveness;
    expect(rec.radial_depth_mm).toBeCloseTo(0.30 * D, 1); // 30% honored -> 3.6mm
    const relErr = Math.abs(rec.mrr_cm3min - reconstructed) / reconstructed;
    expect(relErr).toBeLessThan(0.03); // within field-rounding tolerance
  });

  it("BACK-COMPAT: no radial input falls back to the balanced table ae_pct and differs from an explicit ae", () => {
    expect(rNone.radial_depth_mm).toBeGreaterThan(0);
    // The honored 25% (3.0mm) must differ from the no-input table fallback (50% balanced = 6.0mm),
    // proving the honoring is real and the fallback is intact (not hardcoding the table value here).
    expect(rNone.radial_depth_mm).not.toBeCloseTo(r25.radial_depth_mm, 1);
    expect(rNone.radial_depth_mm).toBeGreaterThan(r25.radial_depth_mm);
  });

  it("EDGE: 0 / NaN / negative radial_depth_pct = 'not provided' (engine >0 truthiness), never a zero-width cut", () => {
    // All three must fall back to the same positive table default as no-input -- NOT collapse ae to 0.
    expect(rZero.radial_depth_mm).toBeCloseTo(rNone.radial_depth_mm, 3);
    expect(rNaN.radial_depth_mm).toBeCloseTo(rNone.radial_depth_mm, 3);
    expect(rNeg.radial_depth_mm).toBeCloseTo(rNone.radial_depth_mm, 3);
    expect(rZero.mrr_cm3min).toBeGreaterThan(0);
  });

  it("EXPLICIT mm path: toolpath.radial_depth_mm is honored directly", () => {
    expect(rMm.radial_depth_mm).toBeCloseTo(2.0, 1);
    // 2.0mm (16.7% of D12) is well below the balanced table default (6.0mm) -> smaller MRR than no-input.
    expect(rMm.mrr_cm3min).toBeLessThan(rNone.mrr_cm3min);
  });

  it("SAFETY: a power-limited spindle derates MRR at a FULL SLOT -> Fc is non-zero at full immersion", () => {
    // The coupled guarantee of the hex_mm fix. Pre-fix: hex->0 at ae=Dc -> Fc->0 -> reqKw->0 -> the
    // spindle-power clamp NEVER fired -> fullLo.mrr == fullHi.mrr (silent under-protection). Post-fix
    // the clamp engages, so the power-starved spindle yields strictly LESS MRR.
    expect(fullHi.mrr_cm3min).toBeGreaterThan(0);
    expect(fullLo.mrr_cm3min).toBeGreaterThan(0);
    expect(fullLo.mrr_cm3min).toBeLessThan(fullHi.mrr_cm3min);
  });
});
