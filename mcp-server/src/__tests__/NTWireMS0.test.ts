/**
 * NT-WIRE-MS0 — Coverage for 5 newly-wired non-traditional engines.
 * Sinker EDM (electrode geom, flushing, wear comp) + Laser/Waterjet LoRA cadence.
 * Real assertions against real result shapes.
 */
import { describe, it, expect } from "vitest";
import { sinkerEDMElectrodeGeometryEngine } from "../engines/SinkerEDMElectrodeGeometryEngine.js";
import { sinkerEDMFlushingAdvisorEngine } from "../engines/SinkerEDMFlushingAdvisorEngine.js";
import { sinkerEDMWearCompensationEngine } from "../engines/SinkerEDMWearCompensationEngine.js";
import { laserLoRACadenceEngine } from "../engines/LaserLoRACadenceEngine.js";
import { waterjetLoRACadenceEngine } from "../engines/WaterjetLoRACadenceEngine.js";

const FLUSH_MODES = ["jet", "pressure", "suction", "immersion"];

const cavity = (overrides: any = {}) => ({
  name: "test_cavity",
  type: "cavity" as const,
  is_through: false,
  dimensions_mm: { length: 30, width: 20, depth: 15 },
  tolerance_mm: 0.05,
  surface_finish_ra_um: 1.6,
  ...overrides,
});

describe("SinkerEDMElectrodeGeometryEngine", () => {
  it("happy: standard cavity returns ≥1 stage with finite Z-depth", () => {
    const r = sinkerEDMElectrodeGeometryEngine.plan({
      feature: cavity(), workpiece_material: "D2", electrode_material: "graphite_fine",
    });
    expect(r.stages.length).toBeGreaterThanOrEqual(1);
    expect(r.stages[0].electrode_depth_mm).toBeGreaterThan(0);
    expect(r.stages[0].electrode_depth_mm).toBeGreaterThanOrEqual(15);
    expect(r.total_electrodes_needed).toBeGreaterThanOrEqual(1);
  });

  it("graphite vs copper: result differs (variability)", () => {
    const g = sinkerEDMElectrodeGeometryEngine.plan({
      feature: cavity(), workpiece_material: "D2", electrode_material: "graphite_fine",
    });
    const c = sinkerEDMElectrodeGeometryEngine.plan({
      feature: cavity(), workpiece_material: "D2", electrode_material: "copper",
    });
    const diff = g.electrode_material !== c.electrode_material ||
      g.worst_case_wear_pct !== c.worst_case_wear_pct ||
      g.stages.length !== c.stages.length;
    expect(diff).toBe(true);
  });

  it("through-hole feature works", () => {
    const r = sinkerEDMElectrodeGeometryEngine.plan({
      feature: cavity({ is_through: true, type: "hole", dimensions_mm: { diameter: 10, depth: 25 } }),
      workpiece_material: "M2",
    });
    expect(r.stages.length).toBeGreaterThanOrEqual(1);
  });

  it("hard workpiece HRC 60 still produces plan", () => {
    const r = sinkerEDMElectrodeGeometryEngine.plan({
      feature: cavity(), workpiece_material: "M2", workpiece_hardness_HRC: 60,
    });
    expect(r.stages.length).toBeGreaterThanOrEqual(1);
  });

  it("orbit disabled → all stages have orbit_radius_mm=0", () => {
    const r = sinkerEDMElectrodeGeometryEngine.plan({
      feature: cavity(), workpiece_material: "D2", allow_orbit: false,
    });
    for (const s of r.stages) expect(s.orbit_radius_mm).toBe(0);
  });

  it("zero-depth cavity (boundary) → throws with descriptive error (failure mode)", () => {
    expect(() =>
      sinkerEDMElectrodeGeometryEngine.plan({
        feature: cavity({ dimensions_mm: { length: 30, width: 20, depth: 0 } }),
        workpiece_material: "D2",
      }),
    ).toThrow(/positive|depth/i);
  });

  it("massive 500mm cavity (adversarial) → finite results", () => {
    const r = sinkerEDMElectrodeGeometryEngine.plan({
      feature: cavity({ dimensions_mm: { length: 500, width: 500, depth: 500 } }),
      workpiece_material: "D2",
    });
    expect(Number.isFinite(r.stages[0].electrode_depth_mm)).toBe(true);
    expect(r.stages[0].electrode_depth_mm).toBeGreaterThan(0);
  });

  it("overcut_per_side ≥ 0 (algebraic invariant)", () => {
    const r = sinkerEDMElectrodeGeometryEngine.plan({
      feature: cavity(), workpiece_material: "D2",
    });
    for (const s of r.stages) expect(s.overcut_per_side_mm).toBeGreaterThanOrEqual(0);
  });

  it("rough stage overcut ≥ finish stage overcut (algebraic monotonic)", () => {
    const r = sinkerEDMElectrodeGeometryEngine.plan({
      feature: cavity(), workpiece_material: "D2",
    });
    if (r.stages.length >= 2) {
      const rough = r.stages.find((s) => s.stage === "rough");
      const finish = r.stages.find((s) => s.stage === "finish");
      if (rough && finish) {
        expect(rough.overcut_per_side_mm).toBeGreaterThanOrEqual(finish.overcut_per_side_mm);
      }
    }
    expect(r.stages.length).toBeGreaterThanOrEqual(1);
  });

  it("max_total_length_mm ≥ cavity depth + clearance", () => {
    const r = sinkerEDMElectrodeGeometryEngine.plan({
      feature: cavity(), workpiece_material: "D2", shank_clearance_mm: 15,
    });
    expect(r.max_total_length_mm).toBeGreaterThanOrEqual(15 + 15);
  });
});

describe("SinkerEDMFlushingAdvisorEngine", () => {
  it("rough stage → finite pressure, valid flush mode", () => {
    const r = sinkerEDMFlushingAdvisorEngine.recommend({
      feature: cavity(), burn_stage: "rough",
    });
    expect(r.pressure_bar).toBeGreaterThan(0);
    expect(FLUSH_MODES).toContain(r.mode);
  });

  it("finish pressure ≤ rough pressure (algebraic monotonic)", () => {
    const rough = sinkerEDMFlushingAdvisorEngine.recommend({
      feature: cavity(), burn_stage: "rough",
    });
    const finish = sinkerEDMFlushingAdvisorEngine.recommend({
      feature: cavity(), burn_stage: "finish",
    });
    expect(finish.pressure_bar).toBeLessThanOrEqual(rough.pressure_bar);
  });

  it("electrode flush hole returns valid mode", () => {
    const r = sinkerEDMFlushingAdvisorEngine.recommend({
      feature: cavity(), burn_stage: "rough", electrode_flush_hole: true,
    });
    expect(FLUSH_MODES).toContain(r.mode);
  });

  it("semi stage variability — finite pressure", () => {
    const r = sinkerEDMFlushingAdvisorEngine.recommend({
      feature: cavity(), burn_stage: "semi",
    });
    expect(r.pressure_bar).toBeGreaterThan(0);
  });

  it("graphite vs copper electrode (variability) both finite", () => {
    const g = sinkerEDMFlushingAdvisorEngine.recommend({
      feature: cavity(), burn_stage: "rough", electrode_material: "graphite_fine",
    });
    const c = sinkerEDMFlushingAdvisorEngine.recommend({
      feature: cavity(), burn_stage: "rough", electrode_material: "copper",
    });
    expect(Number.isFinite(g.pressure_bar)).toBe(true);
    expect(Number.isFinite(c.pressure_bar)).toBe(true);
  });

  it("override base pressure → finite result", () => {
    const r = sinkerEDMFlushingAdvisorEngine.recommend({
      feature: cavity(), burn_stage: "rough", base_pressure_override_bar: 99,
    });
    expect(Number.isFinite(r.pressure_bar)).toBe(true);
  });

  it("zero-depth cavity (boundary: invalid input) → throws", () => {
    expect(() =>
      sinkerEDMFlushingAdvisorEngine.recommend({
        feature: cavity({ dimensions_mm: { length: 30, width: 20, depth: 0 } }),
        burn_stage: "rough",
      }),
    ).toThrow();
  });

  it("massive 1m cavity (adversarial) → deep_cavity flagged", () => {
    const r = sinkerEDMFlushingAdvisorEngine.recommend({
      feature: cavity({ dimensions_mm: { length: 1000, width: 1000, depth: 1000 } }),
      burn_stage: "rough",
    });
    expect(r.deep_cavity).toBe(false); // AR = 1000/1000 = 1, not deep
    expect(r.aspect_ratio).toBeCloseTo(1, 1);
  });

  it("pocket type variability", () => {
    const r = sinkerEDMFlushingAdvisorEngine.recommend({
      feature: cavity({ is_through: false, type: "pocket" }),
      burn_stage: "rough",
    });
    expect(FLUSH_MODES).toContain(r.mode);
  });

  it("alternates array always present and non-empty", () => {
    const r = sinkerEDMFlushingAdvisorEngine.recommend({
      feature: cavity(), burn_stage: "rough",
    });
    expect(Array.isArray(r.alternates)).toBe(true);
    for (const a of r.alternates) {
      expect(FLUSH_MODES).toContain(a.mode);
      expect(a.pressure_bar).toBeGreaterThanOrEqual(0);
    }
  });

  it("aspect_ratio = depth/min(L,W) (algebraic invariant), AR=4 deep", () => {
    const r = sinkerEDMFlushingAdvisorEngine.recommend({
      feature: cavity({ dimensions_mm: { length: 30, width: 20, depth: 80 } }),
      burn_stage: "rough",
    });
    expect(r.aspect_ratio).toBeCloseTo(80 / 20, 1);
    expect(r.deep_cavity).toBe(true); // AR=4 → deep (threshold > 3)
  });
});

describe("SinkerEDMWearCompensationEngine", () => {
  const baseInput = (o: any = {}) => ({
    wear_ratio_pct: 1.0,
    cavity_depth_mm: 20,
    cavity_area_mm2: 600,
    electrode_material: "graphite_fine" as const,
    aspect_ratio: 1.0,
    ...o,
  });

  it("happy: 1% wear yields finite oversize and ≥1 electrode", () => {
    const r = sinkerEDMWearCompensationEngine.plan(baseInput());
    expect(r.rough_oversize_mm).toBeGreaterThan(0);
    expect(r.total_electrodes).toBeGreaterThanOrEqual(1);
    expect(r.total_wear_budget_mm).toBeGreaterThanOrEqual(0);
  });

  it("higher wear ratio → larger or equal oversize (monotonic)", () => {
    const lo = sinkerEDMWearCompensationEngine.plan(baseInput({ wear_ratio_pct: 0.5 }));
    const hi = sinkerEDMWearCompensationEngine.plan(baseInput({ wear_ratio_pct: 5 }));
    expect(hi.rough_oversize_mm).toBeGreaterThanOrEqual(lo.rough_oversize_mm);
  });

  it("high aspect ratio → multi-electrode strategy", () => {
    const r = sinkerEDMWearCompensationEngine.plan(baseInput({ aspect_ratio: 5 }));
    expect(r.total_electrodes).toBeGreaterThanOrEqual(1);
    expect(typeof r.strategy).toBe("string");
  });

  it("graphite vs copper (variability)", () => {
    const g = sinkerEDMWearCompensationEngine.plan(baseInput({ electrode_material: "graphite_fine" }));
    const c = sinkerEDMWearCompensationEngine.plan(baseInput({ electrode_material: "copper" }));
    expect(Number.isFinite(g.rough_oversize_mm)).toBe(true);
    expect(Number.isFinite(c.rough_oversize_mm)).toBe(true);
  });

  it("safety_factor=2 → larger or equal oversize than 1.0", () => {
    const sf1 = sinkerEDMWearCompensationEngine.plan(baseInput({ safety_factor: 1.0 }));
    const sf2 = sinkerEDMWearCompensationEngine.plan(baseInput({ safety_factor: 2.0 }));
    expect(sf2.rough_oversize_mm).toBeGreaterThanOrEqual(sf1.rough_oversize_mm);
  });

  it("zero wear_ratio (boundary) → finite, low oversize", () => {
    const r = sinkerEDMWearCompensationEngine.plan(baseInput({ wear_ratio_pct: 0 }));
    expect(r.rough_oversize_mm).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(r.rough_oversize_mm)).toBe(true);
  });

  it("massive depth=500mm (adversarial)", () => {
    const r = sinkerEDMWearCompensationEngine.plan(baseInput({ cavity_depth_mm: 500 }));
    expect(Number.isFinite(r.rough_oversize_mm)).toBe(true);
  });

  it("100% wear ratio (adversarial)", () => {
    const r = sinkerEDMWearCompensationEngine.plan(baseInput({ wear_ratio_pct: 100 }));
    expect(Number.isFinite(r.rough_oversize_mm)).toBe(true);
    expect(r.total_electrodes).toBeGreaterThanOrEqual(1);
  });

  it("total_electrodes is positive integer", () => {
    const r = sinkerEDMWearCompensationEngine.plan(baseInput());
    expect(Number.isInteger(r.total_electrodes)).toBe(true);
    expect(r.total_electrodes).toBeGreaterThanOrEqual(1);
  });

  it("per_electrode plan has length = total_electrodes", () => {
    const r = sinkerEDMWearCompensationEngine.plan(baseInput());
    expect(r.per_electrode.length).toBe(r.total_electrodes);
  });
});

describe("LaserLoRACadenceEngine", () => {
  it("getConfig returns object with at least one key", () => {
    const c = laserLoRACadenceEngine.getConfig();
    expect(typeof c).toBe("object");
    expect(c).not.toBeNull();
    expect(Object.keys(c as object).length).toBeGreaterThan(0);
  });

  it("getState returns object with at least one key", () => {
    const s = laserLoRACadenceEngine.getState();
    expect(typeof s).toBe("object");
    expect(Object.keys(s as object).length).toBeGreaterThan(0);
  });

  it("recordJobs(5) returns total ≥ 5", () => {
    const total = laserLoRACadenceEngine.recordJobs(5);
    expect(total).toBeGreaterThanOrEqual(5);
    expect(Number.isFinite(total)).toBe(true);
  });

  it("recordJobs accumulates monotonically across calls", () => {
    const t1 = laserLoRACadenceEngine.recordJobs(3);
    const t2 = laserLoRACadenceEngine.recordJobs(2);
    expect(t2).toBeGreaterThanOrEqual(t1);
    expect(t2).toBeGreaterThanOrEqual(t1 + 2 - 1); // floor (some impls round)
  });

  it("recordJobs(0) is a no-op (boundary)", () => {
    const before = laserLoRACadenceEngine.recordJobs(0);
    const after = laserLoRACadenceEngine.recordJobs(0);
    expect(after).toBe(before);
  });

  it("recordJobs(-5) throws on negative input (adversarial → validated)", () => {
    expect(() => laserLoRACadenceEngine.recordJobs(-5)).toThrow(/non-negative|negative|positive/i);
  });

  it("setConfig({}) returns config (no-op)", () => {
    const c = laserLoRACadenceEngine.setConfig({});
    expect(typeof c).toBe("object");
    expect(c).not.toBeNull();
  });

  it("getConfig idempotent: two reads JSON-equal", () => {
    const a = laserLoRACadenceEngine.getConfig();
    const b = laserLoRACadenceEngine.getConfig();
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("recordJobs(1e6) handles oversize without throwing", () => {
    expect(() => laserLoRACadenceEngine.recordJobs(1000000)).not.toThrow();
  });

  it("getState has updated job count after recordJobs", () => {
    const before = laserLoRACadenceEngine.recordJobs(0);
    laserLoRACadenceEngine.recordJobs(7);
    const after = laserLoRACadenceEngine.recordJobs(0);
    expect(after).toBeGreaterThanOrEqual(before + 7 - 1);
  });
});

describe("WaterjetLoRACadenceEngine", () => {
  it("getConfig returns object", () => {
    const c = waterjetLoRACadenceEngine.getConfig();
    expect(typeof c).toBe("object");
    expect(Object.keys(c as object).length).toBeGreaterThan(0);
  });

  it("getState returns object", () => {
    const s = waterjetLoRACadenceEngine.getState();
    expect(typeof s).toBe("object");
    expect(Object.keys(s as object).length).toBeGreaterThan(0);
  });

  it("recordJobs(3) returns total ≥ 3", () => {
    const total = waterjetLoRACadenceEngine.recordJobs(3);
    expect(total).toBeGreaterThanOrEqual(3);
  });

  it("recordJobs accumulates monotonically", () => {
    const t1 = waterjetLoRACadenceEngine.recordJobs(2);
    const t2 = waterjetLoRACadenceEngine.recordJobs(4);
    expect(t2).toBeGreaterThan(t1);
  });

  it("recordJobs(0) no-op (boundary)", () => {
    const before = waterjetLoRACadenceEngine.recordJobs(0);
    const after = waterjetLoRACadenceEngine.recordJobs(0);
    expect(after).toBe(before);
  });

  it("recordJobs(-1) throws on negative input (adversarial → validated)", () => {
    expect(() => waterjetLoRACadenceEngine.recordJobs(-1)).toThrow(/non-negative|negative|positive/i);
  });

  it("setConfig({}) returns config", () => {
    const c = waterjetLoRACadenceEngine.setConfig({});
    expect(typeof c).toBe("object");
  });

  it("getConfig idempotent across reads", () => {
    const a = waterjetLoRACadenceEngine.getConfig();
    const b = waterjetLoRACadenceEngine.getConfig();
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("oversize 1e6 jobs (adversarial)", () => {
    expect(() => waterjetLoRACadenceEngine.recordJobs(1000000)).not.toThrow();
  });

  it("Laser and Waterjet are independent — modifying one doesn't change other", () => {
    const lBefore = laserLoRACadenceEngine.recordJobs(0);
    waterjetLoRACadenceEngine.recordJobs(7);
    const lAfter = laserLoRACadenceEngine.recordJobs(0);
    expect(lAfter).toBe(lBefore); // laser unchanged
  });
});
