/**
 * Lathe Wizard facade coherence -- D3 (RPM/Vc incoherence) + D4 (facing enum)
 * ===========================================================================
 * U-LW-FACADE-COHERENCE (whiskey, 2026-07-04). Two P2 defects surfaced by the
 * combinatorial-validation workflow (wf_fc960d11-c3d):
 *
 *   D3 -- a hardcoded 6000-rpm ceiling (calculateRPM) silently dead-capped machine.max_rpm
 *        while the returned cutting_speed_m_min stayed at the UNREACHABLE target Vc. A Swiss
 *        machine (max_rpm 15000) reported Vc 570 while the spindle delivered only 56.5 (10x),
 *        so downstream MRR/cycle-time over-predicted by the spindle-shortfall ratio. Fix =
 *        honor machine.max_rpm upward (6000 is only a default) and, when the spindle saturates,
 *        back-compute the achievable Vc from the capped rpm so Vc/rpm/MRR stay consistent + warn.
 *
 *   D4 -- 'facing' existed only as a tool.type, not an operation.type, so
 *        calculate({operation:{type:'facing'}}) was Zod-rejected. Fix = add 'facing' to the
 *        operation.type enum + map it to general OD-turning physics in the op tables.
 */

import { describe, it, expect } from "vitest";
import { LatheSpeedFeedCalculatorFacadeEngine, type LatheSpeedFeedInput } from "../engines/LatheSpeedFeedCalculatorFacadeEngine.js";

const buildInput = (o: Partial<LatheSpeedFeedInput> = {}): LatheSpeedFeedInput => ({
  material: o.material ?? "4140",
  tool: { type: "turning_insert", diameter_mm: 12, nose_radius_mm: 0.8, ...o.tool },
  operation: { type: "roughing", coolant: "flood", ...o.operation },
  ...(o.machine ? { machine: o.machine } : {}),
  ...(o.workpiece ? { workpiece: o.workpiece } : {}),
});
const calc = (o: Partial<LatheSpeedFeedInput> = {}) => LatheSpeedFeedCalculatorFacadeEngine.calculate(buildInput(o));
const impliedVc = (rpm: number, d_mm: number) => (Math.PI * d_mm * rpm) / 1000;

describe("D3 -- spindle RPM / Vc coherence", () => {
  it("honors machine.max_rpm UPWARD: a Swiss 15000-rpm spindle is NOT dead-capped at 6000", () => {
    // Same small-diameter, high-speed material through a default machine vs a Swiss machine.
    const dflt = calc({ material: "6061", workpiece: { diameter_mm: 6 } });
    const swiss = calc({ material: "6061", workpiece: { diameter_mm: 6 }, machine: { max_rpm: 15000 } });
    expect(dflt.success).toBe(true);
    expect(swiss.success).toBe(true);
    // 6061 at 6mm demands >6000 rpm, so the default machine caps at the 6000 default...
    expect(dflt.recommendation.rpm).toBe(6000);
    // ...but the Swiss spindle is honored upward (the old hardcoded Math.min(6000) killed this).
    expect(swiss.recommendation.rpm).toBeGreaterThan(6000);
    // and the higher reachable rpm yields a higher achievable cutting speed.
    expect(swiss.recommendation.cutting_speed_m_min).toBeGreaterThan(dflt.recommendation.cutting_speed_m_min);
  });

  it("when the spindle saturates, cutting_speed_m_min is the ACHIEVABLE Vc (not the unreachable target) + a warning fires", () => {
    const r = calc({ material: "6061", workpiece: { diameter_mm: 6 } }); // default 6000 ceiling
    expect(r.recommendation.rpm).toBe(6000);
    // achievable Vc at 6mm / 6000 rpm = pi*6*6000/1000 ~= 113.1 m/min -- NOT the (much higher) 6061 target.
    expect(r.recommendation.cutting_speed_m_min).toBeCloseTo(impliedVc(6000, 6), 0);
    expect(r.recommendation.cutting_speed_m_min).toBeLessThan(200);
    expect(r.warnings.some(w => /unreachable|spindle|achievable/i.test(w))).toBe(true);
  });

  it("INVARIANT: reported rpm and cutting_speed_m_min are mutually consistent (saturated OR not)", () => {
    const cases: Array<Partial<LatheSpeedFeedInput>> = [
      { material: "4140", workpiece: { diameter_mm: 6 } },                                 // saturates
      { material: "304", workpiece: { diameter_mm: 20 } },                                 // reachable
      { material: "6061", workpiece: { diameter_mm: 100 }, machine: { max_rpm: 12000 } },  // reachable, high cap
    ];
    for (const c of cases) {
      const r = calc(c);
      expect(r.success).toBe(true);
      const d = c.workpiece!.diameter_mm!;
      // rpm = 1000*Vc/(pi*D)  <=>  Vc = pi*D*rpm/1000. Consistent within integer-rpm rounding.
      expect(Math.abs(impliedVc(r.recommendation.rpm, d) - r.recommendation.cutting_speed_m_min)).toBeLessThan(1.5);
    }
  });

  it("no-regression: a spindle-reachable cut is unchanged and raises NO saturation warning", () => {
    const r = calc({ material: "1045", operation: { type: "finishing" }, workpiece: { diameter_mm: 100 } });
    expect(r.success).toBe(true);
    expect(r.recommendation.rpm).toBeLessThan(6000); // 100mm finishing never approaches the cap
    expect(r.warnings.some(w => /spindle|unreachable/i.test(w))).toBe(false);
  });
});

describe("D4 -- 'facing' is a first-class operation.type", () => {
  it("calculate({operation:{type:'facing'}}) succeeds (was Zod-rejected)", () => {
    const r = calc({ operation: { type: "facing" } });
    expect(r.success).toBe(true);
    expect(r.recommendation.cutting_speed_m_min).toBeGreaterThan(0);
    expect(r.recommendation.feed_mm_rev).toBeGreaterThan(0);
    expect(r.recommendation.depth_of_cut_mm).toBeGreaterThan(0);
  });

  it("facing maps to general OD-turning physics (speed comparable to roughing, not a stub)", () => {
    const facing = calc({ material: "4140", operation: { type: "facing" }, workpiece: { diameter_mm: 80 } });
    const roughing = calc({ material: "4140", operation: { type: "roughing" }, workpiece: { diameter_mm: 80 } });
    expect(facing.success).toBe(true);
    // facing opFactor 1.0 == roughing surface speed at the same (reachable) diameter.
    expect(facing.recommendation.cutting_speed_m_min).toBeCloseTo(roughing.recommendation.cutting_speed_m_min, 0);
  });
});
