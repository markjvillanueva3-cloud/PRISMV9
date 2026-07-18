/**
 * lathe-speed-feed-accuracy-oracle.test.ts
 * =========================================
 *
 * INDEPENDENT ACCURACY ORACLE for the Lathe Wizard speed/feed recommendation.
 *
 * Purpose: cross-check the recommended cutting speed (Vc) and feed (fz/ipr) that
 * LatheSpeedFeedCalculatorFacadeEngine.calculate() emits against *physically
 * accepted* turning ranges from the machining literature — NOT against the
 * engine's own CANONICAL_TURNING_SPEEDS/FEEDS tables. If the wizard's math and
 * the literature agree, every recommendation lands inside the accepted band;
 * a recommendation OUTSIDE the band is a real defect (pinned + // BUG:).
 *
 * This is the exact recommendation path the MCP surface uses:
 *   camDispatcher action "lathe_sf_calculate" → getEngine("latheSFCalc").calculate(params)
 *   (src/tools/dispatchers/camDispatcher.ts:4161-4164) delegates to this same
 *   static .calculate(); calling the facade directly is byte-identical to the
 *   dispatcher's computed result, with no transport noise.
 *
 * Oracle bands (carbide inserts, general OD turning, m/min for Vc, mm/rev for feed):
 *   ISO P steel        Vc 120–320 (rough) / 150–420 (finish)   Machinery's Handbook 30th ed.,
 *                                                               Sandvik Coromant General Turning
 *   ISO M stainless    Vc  90–280                               Sandvik/Kennametal austenitic SS
 *   ISO K gray iron    Vc  80–300                               Machinery's Handbook cast-iron turning
 *   ISO N aluminum     Vc 250–1500                              Sandvik non-ferrous, Kennametal Al
 *   ISO S Ti-6Al-4V    Vc  25–100                               Sandvik Ti turning, ASM Machining Vol.16
 *   ISO S Ni superalloy Vc 12–70                                Sandvik HRSA, ASM Machining Vol.16
 *   feed (all groups)  fz  0.05–0.40 (rough) / 0.03–0.25 (finish)  general turning practice
 *
 * These bounds are DELIBERATELY WIDE (they span multiple vendors + strategies) so
 * that only a genuinely non-physical recommendation trips them; the point is to
 * catch gross errors (unit slips, wrong-ISO speed, feed 10× off), not to re-assert
 * the vendor midpoint the engine already calibrates to.
 *
 * NOTE (test-only, no source edits): a workpiece diameter of 50 mm is supplied on
 * every combo so the RPM stays below the 6000-rpm default spindle ceiling and the
 * recommended Vc is NOT spindle-saturated — we are grading the *target* physics,
 * not machine kinematics. (Verified: max rpm here is aluminum @ Vc 400 / D 50 →
 * n≈2546 rpm, well under the cap, so recommendation.cutting_speed_m_min == target Vc.)
 *
 * @module __tests__/lathe-speed-feed-accuracy-oracle
 * @slot oscar (speed-feed domain expert)
 */

import { describe, it, expect } from "vitest";
import {
  LatheSpeedFeedCalculatorFacadeEngine,
  type LatheSpeedFeedInput,
} from "../engines/LatheSpeedFeedCalculatorFacadeEngine.js";

// ── Accepted physical bands (independent oracle) ────────────────────────────
// Exclusive (min, max) bounds — a recommendation must be STRICTLY interior.
interface Band {
  vcMin: number;
  vcMax: number;
  feedMin: number;
  feedMax: number;
}

const ROUGH_FEED = { feedMin: 0.05, feedMax: 0.4 };
const FINISH_FEED = { feedMin: 0.03, feedMax: 0.25 };

interface Combo {
  name: string;
  input: LatheSpeedFeedInput;
  band: Band;
  /** Sanity: the value we expect the engine's calibration to produce (documentation, not asserted). */
  expectVcApprox: number;
}

// D=50mm workpiece keeps rpm under the 6000 default ceiling → no Vc saturation.
const D50 = { diameter_mm: 50 };

const COMBOS: Combo[] = [
  {
    name: "CNMG-432 P25 carbide / AISI 4140 alloy steel (HB~197) — roughing",
    input: {
      material: "4140",
      tool: { type: "turning_insert", nose_radius_mm: 0.8, grade: "P25" },
      operation: { type: "roughing", coolant: "flood" },
      workpiece: { ...D50, hardness_hb: 197 },
    },
    band: { vcMin: 120, vcMax: 320, ...ROUGH_FEED },
    expectVcApprox: 220,
  },
  {
    name: "DCGT alu-geometry / Aluminum 6061-T6 — roughing",
    input: {
      material: "6061",
      tool: { type: "turning_insert", nose_radius_mm: 0.4, grade: "N (uncoated)" },
      operation: { type: "roughing", coolant: "flood" },
      workpiece: { ...D50 },
    },
    band: { vcMin: 250, vcMax: 1500, ...ROUGH_FEED },
    expectVcApprox: 400,
  },
  {
    name: "VBMT S-grade / Ti-6Al-4V — roughing",
    input: {
      material: "Ti-6Al-4V",
      tool: { type: "turning_insert", nose_radius_mm: 0.4, grade: "S (coated carbide)" },
      operation: { type: "roughing", coolant: "flood" },
      workpiece: { ...D50, hardness_hb: 334 },
    },
    band: { vcMin: 25, vcMax: 100, ...ROUGH_FEED },
    expectVcApprox: 35,
  },
  {
    name: "CCMT K-grade / Gray cast iron (HB~200) — roughing",
    input: {
      material: "gray_iron",
      tool: { type: "turning_insert", nose_radius_mm: 0.8, grade: "K10" },
      operation: { type: "roughing", coolant: "flood" },
      workpiece: { ...D50, hardness_hb: 200 },
    },
    band: { vcMin: 80, vcMax: 300, ...ROUGH_FEED },
    expectVcApprox: 180,
  },
  {
    name: "CNMG P-grade / AISI 1045 carbon steel (HB~170) — roughing",
    input: {
      material: "1045",
      tool: { type: "turning_insert", nose_radius_mm: 0.8, grade: "P15" },
      operation: { type: "roughing", coolant: "flood" },
      workpiece: { ...D50, hardness_hb: 170 },
    },
    band: { vcMin: 120, vcMax: 320, ...ROUGH_FEED },
    expectVcApprox: 220,
  },
  {
    name: "VNMG M-grade / AISI 316 austenitic stainless — roughing",
    input: {
      material: "316",
      tool: { type: "turning_insert", nose_radius_mm: 0.8, grade: "M25" },
      operation: { type: "roughing", coolant: "flood" },
      workpiece: { ...D50, hardness_hb: 180 },
    },
    band: { vcMin: 90, vcMax: 280, ...ROUGH_FEED },
    expectVcApprox: 150,
  },
  {
    name: "VBMT S-grade / Inconel 718 (Ni superalloy) — roughing",
    input: {
      material: "Inconel 718",
      tool: { type: "turning_insert", nose_radius_mm: 0.4, grade: "S (SiAlON possible)" },
      operation: { type: "roughing", coolant: "flood" },
      workpiece: { ...D50, hardness_hb: 331 },
    },
    band: { vcMin: 12, vcMax: 70, ...ROUGH_FEED },
    expectVcApprox: 35,
  },
  {
    name: "CNMG P-grade / AISI 4140 alloy steel — FINISHING",
    input: {
      material: "4140",
      tool: { type: "turning_insert", nose_radius_mm: 0.8, grade: "P10" },
      operation: { type: "finishing", coolant: "flood", target_ra_um: 1.6 },
      workpiece: { ...D50, hardness_hb: 197 },
    },
    band: { vcMin: 150, vcMax: 420, ...FINISH_FEED },
    expectVcApprox: 320,
  },
];

describe("Lathe Wizard speed/feed ACCURACY oracle (independent physical-range cross-check)", () => {
  for (const combo of COMBOS) {
    describe(combo.name, () => {
      const result = LatheSpeedFeedCalculatorFacadeEngine.calculate(combo.input);

      it("returns a successful recommendation", () => {
        expect(result.success).toBe(true);
        expect(result.recommendation.rpm).toBeGreaterThan(0);
        // Guard the oracle premise: the recommended Vc must be the (un-saturated)
        // target speed, else we'd be grading spindle kinematics, not the physics.
        const saturated = result.warnings.some((w) => /spindle-unreachable/i.test(w));
        expect(saturated).toBe(false);
      });

      it("recommends a cutting speed inside the accepted turning band", () => {
        const vc = result.recommendation.cutting_speed_m_min;
        // Numeric bound assertions (NOT toBeDefined) — a value outside the band is a defect.
        expect(vc).toBeGreaterThan(combo.band.vcMin);
        expect(vc).toBeLessThan(combo.band.vcMax);
      });

      it("recommends a feed inside the accepted per-rev band", () => {
        const feed = result.recommendation.feed_mm_rev;
        expect(feed).toBeGreaterThan(combo.band.feedMin);
        expect(feed).toBeLessThan(combo.band.feedMax);
      });
    });
  }

  // Cross-combo physical ordering invariants (independent of absolute bands):
  // a real turning DB must rank cutting speed N(alu) > P(steel) > M(stainless) > S(Ti).
  it("preserves ISO-group cutting-speed ordering N > P > M > S", () => {
    const roughing = (material: string): number =>
      LatheSpeedFeedCalculatorFacadeEngine.calculate({
        material,
        tool: { type: "turning_insert", nose_radius_mm: 0.8 },
        operation: { type: "roughing", coolant: "flood" },
        workpiece: { diameter_mm: 50 },
      }).recommendation.cutting_speed_m_min;

    const vcAlu = roughing("6061");
    const vcSteel = roughing("4140");
    const vcStainless = roughing("316");
    const vcTi = roughing("Ti-6Al-4V");

    expect(vcAlu).toBeGreaterThan(vcSteel);
    expect(vcSteel).toBeGreaterThan(vcStainless);
    expect(vcStainless).toBeGreaterThan(vcTi);
  });
});
