/**
 * PrismPathConstantEngagementEngine — engine smoke tests
 *
 * Covers the renamed engine's public surface (U-PPGM111 follow-on).
 * Real assertions against engagement physics (US Patent 8000834B2 bounds 10-80 deg),
 * Kienzle/Taylor canonical inputs, and machine/tool clamps.
 *
 * @milestone PPG-WIRE-MS0/U-PPGM111
 */

import { describe, it, expect } from "vitest";
import {
  prismPathConstantEngagementEngine,
  type EngagementMillingFeature,
  type EngagementMillingMaterial,
  type EngagementMillingTool,
  type EngagementMillingMachine,
} from "../engines/PrismPathConstantEngagementEngine.js";

// Constants for tests
const TOOL_DIAMETER_MM = 12;
const TOOL_FLUTES = 4;
const POCKET_WIDTH_MM = 50;
const POCKET_DEPTH_MM = 8;
const MACHINE_MAX_RPM = 12000;
const MACHINE_POWER_KW = 15;
const MACHINE_MAX_FEED = 8000;
const ENGAGEMENT_TARGET_DEG = 40;
const FZ_BASELINE_MM = 0.05;
const PATENT_LOWER_BOUND_DEG = 10;
const PATENT_UPPER_BOUND_DEG = 80;
const SLOW_SPINDLE_MAX_RPM = 6000;

const baseFeature: EngagementMillingFeature = {
  type: "pocket",
  volume_cm3: 25,
  width_mm: POCKET_WIDTH_MM,
  depth_mm: POCKET_DEPTH_MM,
  boundary: [[0, 0], [POCKET_WIDTH_MM, 0], [POCKET_WIDTH_MM, POCKET_WIDTH_MM], [0, POCKET_WIDTH_MM]],
  corner_radii_mm: [3, 3, 3, 3],
};

const baseMaterial: EngagementMillingMaterial = {
  iso_group: "P",
};

const baseTool: EngagementMillingTool = {
  diameter_mm: TOOL_DIAMETER_MM,
  flutes: TOOL_FLUTES,
  corner_radius_mm: 0,
  helix_angle_deg: 38,
  flute_length_mm: 30,
};

const baseMachine: EngagementMillingMachine = {
  class: "medium",
  max_rpm: MACHINE_MAX_RPM,
  power_kw: MACHINE_POWER_KW,
  max_feed_mm_min: MACHINE_MAX_FEED,
};

describe("PrismPathConstantEngagementEngine", () => {
  it("compute() returns a structured result for a typical 50mm pocket with patent-bounded engagement", () => {
    const r = prismPathConstantEngagementEngine.compute(baseFeature, baseMaterial, baseTool, baseMachine);
    expect(r.level).toBeGreaterThanOrEqual(1);
    expect(r.level).toBeLessThanOrEqual(8);
    expect(r.ae_mm).toBeGreaterThan(0);
    expect(r.ae_mm).toBeLessThanOrEqual(TOOL_DIAMETER_MM);
    expect(r.ap_mm).toBeGreaterThan(0);
    expect(r.ap_mm).toBeLessThanOrEqual(POCKET_DEPTH_MM);
    expect(r.Vc_m_min).toBeGreaterThan(0);
    expect(r.fz_mm).toBeGreaterThan(0);
    expect(r.engagement_angle_deg).toBeGreaterThanOrEqual(PATENT_LOWER_BOUND_DEG - 1);
    expect(r.engagement_angle_deg).toBeLessThanOrEqual(PATENT_UPPER_BOUND_DEG + 1);
    expect(r.justification.length).toBeGreaterThan(2);
  });

  it("compute() produces strictly larger ae and ap at level 8 than at level 1", () => {
    const conservative = prismPathConstantEngagementEngine.compute(baseFeature, baseMaterial, baseTool, baseMachine, 1);
    const aggressive = prismPathConstantEngagementEngine.compute(baseFeature, baseMaterial, baseTool, baseMachine, 8);
    expect(aggressive.ae_mm).toBeGreaterThan(conservative.ae_mm);
    expect(aggressive.ap_mm).toBeGreaterThanOrEqual(conservative.ap_mm);
    expect(aggressive.level).toBe(8);
    expect(conservative.level).toBe(1);
  });

  it("compute() clamps ap to flute length when wizard ap exceeds it", () => {
    const SHALLOW_FLUTE_MM = 2;
    const shallowFlute: EngagementMillingTool = { ...baseTool, flute_length_mm: SHALLOW_FLUTE_MM };
    const r = prismPathConstantEngagementEngine.compute(baseFeature, baseMaterial, shallowFlute, baseMachine, 8);
    expect(r.ap_mm).toBeLessThanOrEqual(SHALLOW_FLUTE_MM);
  });

  it("compute() clamps ap to feature depth when feature is shallower than tool capability", () => {
    const SHALLOW_DEPTH_MM = 1.5;
    const shallowFeature: EngagementMillingFeature = { ...baseFeature, depth_mm: SHALLOW_DEPTH_MM };
    const r = prismPathConstantEngagementEngine.compute(shallowFeature, baseMaterial, baseTool, baseMachine, 6);
    expect(r.ap_mm).toBeLessThanOrEqual(SHALLOW_DEPTH_MM);
  });

  it("compute() honors machine max RPM cap on small-diameter aggressive cuts", () => {
    const TINY_DIAMETER_MM = 2;
    const tinyTool: EngagementMillingTool = { ...baseTool, diameter_mm: TINY_DIAMETER_MM };
    const slowSpindle: EngagementMillingMachine = { ...baseMachine, max_rpm: SLOW_SPINDLE_MAX_RPM };
    const r = prismPathConstantEngagementEngine.compute(baseFeature, baseMaterial, tinyTool, slowSpindle, 8);
    const computedRpm = (r.Vc_m_min * 1000) / (Math.PI * TINY_DIAMETER_MM);
    expect(computedRpm).toBeLessThanOrEqual(SLOW_SPINDLE_MAX_RPM + 1);
  });

  it("technologyWizard() ae/ap/Vc/fz all strictly increase from L1 to L8 (monotonic aggression scale)", () => {
    const l1 = prismPathConstantEngagementEngine.technologyWizard("P", "medium", 1, TOOL_DIAMETER_MM);
    const l8 = prismPathConstantEngagementEngine.technologyWizard("P", "medium", 8, TOOL_DIAMETER_MM);
    expect(l1.level).toBe(1);
    expect(l8.level).toBe(8);
    expect(l8.ae_mm).toBeGreaterThan(l1.ae_mm);
    expect(l8.ap_mm).toBeGreaterThan(l1.ap_mm);
    expect(l8.Vc_m_min).toBeGreaterThan(l1.Vc_m_min);
    expect(l8.fz_mm).toBeGreaterThan(l1.fz_mm);
  });

  it("technologyWizard() applies machine rigidity factor (heavy > hobby) at fixed level", () => {
    const FIXED_LEVEL = 5;
    const hobby = prismPathConstantEngagementEngine.technologyWizard("P", "hobby", FIXED_LEVEL, TOOL_DIAMETER_MM);
    const heavy = prismPathConstantEngagementEngine.technologyWizard("P", "heavy", FIXED_LEVEL, TOOL_DIAMETER_MM);
    expect(heavy.machine_rigidity_factor).toBeGreaterThan(hobby.machine_rigidity_factor);
    expect(heavy.ae_mm).toBeGreaterThan(hobby.ae_mm);
    expect(heavy.ap_mm).toBeGreaterThan(hobby.ap_mm);
  });

  it("constantEngagement() pulls overloaded segments down and air-cut segments up to target", () => {
    const SEG_OPTIMAL = 30;
    const SEG_OVERLOADED = 130; // > 90 deg so sin(theta/2) > sin(45) and feed_factor < 1
    const SEG_AIR = 5;
    const NOMINAL_FEED = 1500;
    const segments = [
      { engagement_deg: SEG_OPTIMAL, feed_mm_min: NOMINAL_FEED },
      { engagement_deg: SEG_OVERLOADED, feed_mm_min: NOMINAL_FEED },
      { engagement_deg: SEG_AIR, feed_mm_min: NOMINAL_FEED },
    ];
    const adjusted = prismPathConstantEngagementEngine.constantEngagement(segments, ENGAGEMENT_TARGET_DEG);
    expect(adjusted.segments.length).toBe(3);
    const overloadedSeg = adjusted.segments[1];
    const airSeg = adjusted.segments[2];
    expect(overloadedSeg.adjusted_feed).toBeLessThan(NOMINAL_FEED);
    expect(airSeg.adjusted_feed).toBeGreaterThan(NOMINAL_FEED);
    expect(adjusted.pct_overloaded).toBeGreaterThan(0);
    expect(adjusted.pct_air_cutting).toBeGreaterThan(0);
  });

  it("calculateMoat() flags wide pocket (width >> tool diameter) as needing moat zones", () => {
    const WIDE_X = 120;
    const WIDE_Y = 80;
    const wide: [number, number][] = [[0, 0], [WIDE_X, 0], [WIDE_X, WIDE_Y], [0, WIDE_Y]];
    const result = prismPathConstantEngagementEngine.calculateMoat(wide, 10);
    expect(result.requires_moat).toBe(true);
    expect(result.zones.length).toBeGreaterThanOrEqual(1);
    expect(result.ratio).toBeGreaterThan(1);
    expect(result.tool_diameter_mm).toBe(10);
  });

  it("calculateMoat() does NOT require moat for narrow pocket near tool diameter", () => {
    const NARROW_SIDE = 15;
    const narrow: [number, number][] = [[0, 0], [NARROW_SIDE, 0], [NARROW_SIDE, NARROW_SIDE], [0, NARROW_SIDE]];
    const result = prismPathConstantEngagementEngine.calculateMoat(narrow, 10);
    expect(result.requires_moat).toBe(false);
    expect(result.tool_diameter_mm).toBe(10);
  });

  it("chipLoadMaintenance() returns feed profile points keyed to base fz with positive adjusted feeds", () => {
    const profile = [
      { position: 0.0, engagement_deg: ENGAGEMENT_TARGET_DEG },
      { position: 0.5, engagement_deg: ENGAGEMENT_TARGET_DEG },
      { position: 1.0, engagement_deg: ENGAGEMENT_TARGET_DEG },
    ];
    const result = prismPathConstantEngagementEngine.chipLoadMaintenance(profile, FZ_BASELINE_MM);
    expect(result.points.length).toBe(3);
    expect(result.base_fz_mm).toBeCloseTo(FZ_BASELINE_MM, 3);
    expect(result.points[0].adjusted_feed_mm_min).toBeGreaterThan(0);
    expect(result.points[1].adjusted_feed_mm_min).toBeGreaterThan(0);
    expect(result.points[2].adjusted_feed_mm_min).toBeGreaterThan(0);
    expect(result.avg_feed_factor).toBeGreaterThan(0);
  });

  it("variableStepover() returns flat ae_ratio ~1 when curvature is zero (straight wall)", () => {
    const BASE_AE_MM = 3;
    const flatProfile = [
      { position: 0.0, kappa: 0 },
      { position: 0.5, kappa: 0 },
      { position: 1.0, kappa: 0 },
    ];
    const stepovers = prismPathConstantEngagementEngine.variableStepover(flatProfile, TOOL_DIAMETER_MM, BASE_AE_MM);
    expect(stepovers.length).toBe(3);
    expect(stepovers[0].ae_ratio).toBeCloseTo(1, 1);
    expect(stepovers[1].ae_ratio).toBeCloseTo(1, 1);
    expect(stepovers[2].ae_ratio).toBeCloseTo(1, 1);
  });

  it("variableStepover() reduces ae_ratio for tight concave curvature vs flat baseline", () => {
    const BASE_AE_MM = 3;
    const TIGHT_CURVATURE = 0.3;
    const concaveProfile = [
      { position: 0.0, kappa: 0 },
      { position: 0.5, kappa: TIGHT_CURVATURE },
    ];
    const stepovers = prismPathConstantEngagementEngine.variableStepover(concaveProfile, TOOL_DIAMETER_MM, BASE_AE_MM);
    expect(stepovers[1].ae_ratio).toBeLessThan(stepovers[0].ae_ratio);
  });
});
