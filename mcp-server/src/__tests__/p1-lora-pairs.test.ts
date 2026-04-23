/**
 * Tests for CAM-ML-CLOSEDLOOP-MS0 P1 LoRA pairs (U-CMCCL04–U-CMCCL08)
 *   - WEDM     (U-CMCCL04)
 *   - Sinker   (U-CMCCL05)
 *   - Laser    (U-CMCCL06)
 *   - Waterjet (U-CMCCL07)
 *   - Grinding (U-CMCCL08)
 *
 * Each machine type gets its own `describe` block exercising the
 * dataset builder's validate+render+fingerprint logic plus the cadence
 * engine's machine-specific defaults.
 */

import { describe, it, expect } from "vitest";
import { wedmLoRADatasetBuilderEngine } from "../engines/WEDMLoRADatasetBuilderEngine.js";
import { wedmLoRACadenceEngine, createWEDMLoRACadence } from "../engines/WEDMLoRACadenceEngine.js";
import { sinkerEDMLoRADatasetBuilderEngine } from "../engines/SinkerEDMLoRADatasetBuilderEngine.js";
import { sinkerEDMLoRACadenceEngine, createSinkerEDMLoRACadence } from "../engines/SinkerEDMLoRACadenceEngine.js";
import { laserLoRADatasetBuilderEngine } from "../engines/LaserLoRADatasetBuilderEngine.js";
import { laserLoRACadenceEngine, createLaserLoRACadence } from "../engines/LaserLoRACadenceEngine.js";
import { waterjetLoRADatasetBuilderEngine } from "../engines/WaterjetLoRADatasetBuilderEngine.js";
import { waterjetLoRACadenceEngine, createWaterjetLoRACadence } from "../engines/WaterjetLoRACadenceEngine.js";
import { grindingLoRADatasetBuilderEngine } from "../engines/GrindingLoRADatasetBuilderEngine.js";
import { grindingLoRACadenceEngine, createGrindingLoRACadence } from "../engines/GrindingLoRACadenceEngine.js";
import type { RawJob } from "../engines/MachineLoRABaseEngine.js";

// ─────────────────────────────────────────────────────────────────────
// U-CMCCL04 — WEDM
// ─────────────────────────────────────────────────────────────────────

describe("WEDMLoRADatasetBuilderEngine", () => {
  const eng = wedmLoRADatasetBuilderEngine;
  const base = (i: number, override: Partial<RawJob> = {}): RawJob => ({
    id: `w${i}`,
    fingerprint: { material: "d2", thickness: i },
    features: {
      material: "D2",
      thickness_mm: 5 + i,
      taper_deg: 0,
      pass_count: 4,
      wire_diameter_mm: 0.25,
      desired_ra_um: 0.8,
    },
    actual: { achieved_ra_um: 0.8, wire_break_count: 0, cut_speed_mm2_min: 10 },
    ...override,
  });

  it("required schema includes thickness and pass_count", () => {
    const s = eng.requiredSchema();
    expect(s.features).toContain("thickness_mm");
    expect(s.features).toContain("pass_count");
    expect(s.actuals).toContain("wire_break_count");
  });

  it("buckets thickness into sm/md/lg/xl", () => {
    const jobs = [
      base(1, { features: { ...base(0).features, thickness_mm: 5 } }),
      base(2, { features: { ...base(0).features, thickness_mm: 20 } }),
      base(3, { features: { ...base(0).features, thickness_mm: 40 } }),
      base(4, { features: { ...base(0).features, thickness_mm: 80 } }),
    ];
    const r = eng.buildDataset(jobs);
    const buckets = [...r.examples.train, ...r.examples.val, ...r.examples.test].map(
      (e) => e.metadata.fingerprint.thicknessBucket,
    );
    expect(new Set(buckets)).toEqual(new Set(["th_sm", "th_md", "th_lg", "th_xl"]));
  });

  it("flags wire-break jobs", () => {
    const r = eng.buildDataset([base(0, { actual: { achieved_ra_um: 0.9, wire_break_count: 3, cut_speed_mm2_min: 5 } })]);
    const ex = r.examples.train[0] ?? r.examples.val[0] ?? r.examples.test[0];
    expect(ex.metadata.labels).toContain("wire-break");
    expect(ex.metadata.weight).toBeGreaterThanOrEqual(1.5);
  });

  it("rejects invalid actuals", () => {
    const r = eng.buildDataset([base(0, { actual: { achieved_ra_um: -1, wire_break_count: 0, cut_speed_mm2_min: 1 } })]);
    expect(r.stats.validJobs).toBe(0);
  });

  it("renders instruction mentioning pass count and Ra target", () => {
    const r = eng.buildDataset([base(0)]);
    const ex = r.examples.train[0] ?? r.examples.val[0] ?? r.examples.test[0];
    expect(ex.instruction).toMatch(/4-pass/);
    expect(ex.instruction).toMatch(/Ra=0\.80μm/);
  });
});

describe("WEDMLoRACadenceEngine", () => {
  it("defaults to weekly Sunday 2am", () => {
    expect(wedmLoRACadenceEngine.getConfig().interval).toBe("weekly");
    expect(wedmLoRACadenceEngine.getConfig().dayOfWeek).toBe(0);
  });
  it("fires on 15 jobs recorded Sunday 2am+", () => {
    const c = createWEDMLoRACadence(() => new Date("2026-04-26T03:00:00Z"));
    c.recordJobs(15);
    expect(c.shouldTriggerRun().should).toBe(true);
  });
  it("drift threshold 0.15 rejects 10% drop", () => {
    const c = createWEDMLoRACadence(() => new Date());
    expect(c.checkDrift(90, 100).drifted).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// U-CMCCL05 — Sinker EDM
// ─────────────────────────────────────────────────────────────────────

describe("SinkerEDMLoRADatasetBuilderEngine", () => {
  const eng = sinkerEDMLoRADatasetBuilderEngine;
  const base = (depth: number, width: number, override: Partial<RawJob> = {}): RawJob => ({
    id: `s-${depth}-${width}`,
    fingerprint: {},
    features: {
      material: "H13",
      electrode_material: "graphite",
      cavity_depth_mm: depth,
      cavity_width_mm: width,
      electrode_count: 3,
    },
    actual: { total_wear_mm: 0.1, achieved_ra_um: 1.2, cycle_time_min: 45 },
    ...override,
  });

  it("buckets by aspect ratio (simple/moderate/deep)", () => {
    const r = eng.buildDataset([base(2, 10), base(10, 4), base(50, 5)]);
    const complexities = [...r.examples.train, ...r.examples.val, ...r.examples.test].map(
      (e) => e.metadata.fingerprint.complexity,
    );
    expect(complexities).toContain("simple");
    expect(complexities).toContain("moderate");
    expect(complexities).toContain("deep");
  });

  it("weight-boosts deep cavities (aspect>5)", () => {
    const r = eng.buildDataset([base(60, 5)]);
    const ex = r.examples.train[0] ?? r.examples.val[0] ?? r.examples.test[0];
    expect(ex.metadata.labels).toContain("deep-cavity");
    expect(ex.metadata.weight).toBeGreaterThanOrEqual(2.0);
  });

  it("rejects missing electrode_count", () => {
    const bad = base(5, 10);
    delete (bad.features as Record<string, unknown>).electrode_count;
    const r = eng.buildDataset([bad]);
    expect(r.stats.validJobs).toBe(0);
  });

  it("rejects negative wear", () => {
    const r = eng.buildDataset([base(5, 10, { actual: { total_wear_mm: -0.1, achieved_ra_um: 1.2, cycle_time_min: 45 } })]);
    expect(r.stats.validJobs).toBe(0);
  });

  it("renders instruction naming electrode material and count", () => {
    const r = eng.buildDataset([base(5, 10)]);
    const ex = r.examples.train[0] ?? r.examples.val[0] ?? r.examples.test[0];
    expect(ex.instruction).toMatch(/3 graphite electrodes/);
  });
});

describe("SinkerEDMLoRACadenceEngine", () => {
  it("defaults to monthly", () => {
    expect(sinkerEDMLoRACadenceEngine.getConfig().interval).toBe("monthly");
  });
  it("fires on day 1 of month with ≥8 jobs", () => {
    const c = createSinkerEDMLoRACadence(() => new Date("2026-05-02T04:00:00Z"));
    c.recordJobs(10);
    expect(c.shouldTriggerRun().should).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// U-CMCCL06 — Laser
// ─────────────────────────────────────────────────────────────────────

describe("LaserLoRADatasetBuilderEngine", () => {
  const eng = laserLoRADatasetBuilderEngine;
  const base = (t: number, pierce: boolean, override: Partial<RawJob> = {}): RawJob => ({
    id: `l-${t}`,
    fingerprint: {},
    features: {
      material: "mild-steel",
      thickness_mm: t,
      laser_power_w: 4000,
      assist_gas: "O2",
      pierce_type: "ramped",
    },
    actual: {
      pierce_success: pierce,
      edge_quality_score: 7,
      dross_events: 0,
    },
    ...override,
  });

  it("buckets thickness into thin/medium/thick/heavy", () => {
    const r = eng.buildDataset([base(1, true), base(5, true), base(15, true), base(30, true)]);
    const buckets = [...r.examples.train, ...r.examples.val, ...r.examples.test].map(
      (e) => e.metadata.fingerprint.thicknessBucket,
    );
    expect(new Set(buckets)).toEqual(new Set(["thin", "medium", "thick", "heavy"]));
  });

  it("flags pierce-fail and weight-boosts to 3.0", () => {
    const r = eng.buildDataset([base(5, false)]);
    const ex = r.examples.train[0] ?? r.examples.val[0] ?? r.examples.test[0];
    expect(ex.metadata.labels).toContain("pierce-fail");
    expect(ex.metadata.weight).toBeGreaterThanOrEqual(3.0);
  });

  it("rejects edge_quality_score out of range (>10)", () => {
    const r = eng.buildDataset([base(5, true, { actual: { pierce_success: true, edge_quality_score: 15, dross_events: 0 } })]);
    expect(r.stats.validJobs).toBe(0);
  });

  it("rejects non-boolean pierce_success", () => {
    const bad = base(5, true);
    bad.actual.pierce_success = 1 as unknown as boolean;
    const r = eng.buildDataset([bad]);
    expect(r.stats.validJobs).toBe(0);
  });

  it("renders instruction mentioning assist gas", () => {
    const r = eng.buildDataset([base(5, true)]);
    const ex = r.examples.train[0] ?? r.examples.val[0] ?? r.examples.test[0];
    expect(ex.instruction).toMatch(/O2/);
  });
});

describe("LaserLoRACadenceEngine", () => {
  it("defaults to weekly", () => {
    expect(laserLoRACadenceEngine.getConfig().interval).toBe("weekly");
  });
  it("fires on 20+ jobs Sunday 2am+", () => {
    const c = createLaserLoRACadence(() => new Date("2026-04-26T03:00:00Z"));
    c.recordJobs(25);
    expect(c.shouldTriggerRun().should).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// U-CMCCL07 — Waterjet
// ─────────────────────────────────────────────────────────────────────

describe("WaterjetLoRADatasetBuilderEngine", () => {
  const eng = waterjetLoRADatasetBuilderEngine;
  const base = (q: number, override: Partial<RawJob> = {}): RawJob => ({
    id: `wj-Q${q}`,
    fingerprint: {},
    features: {
      material: "al-6061",
      thickness_mm: 12,
      quality_level: q,
      abrasive_flow_g_min: 200,
      orifice_mm: 0.76,
    },
    actual: { edge_taper_deg: 0.5, cycle_time_s: 30, achieved_quality: q },
    ...override,
  });

  it("stratifies by Q level (Q1..Q5)", () => {
    const r = eng.buildDataset([1, 2, 3, 4, 5].map((q) => base(q)));
    const qs = [...r.examples.train, ...r.examples.val, ...r.examples.test].map(
      (e) => e.metadata.fingerprint.quality,
    );
    expect(new Set(qs)).toEqual(new Set(["Q1", "Q2", "Q3", "Q4", "Q5"]));
  });

  it("rejects Q-level outside 1-5", () => {
    const r = eng.buildDataset([base(0)]);
    expect(r.stats.validJobs).toBe(0);
    const r2 = eng.buildDataset([base(6)]);
    expect(r2.stats.validJobs).toBe(0);
  });

  it("rejects negative taper", () => {
    const r = eng.buildDataset([base(3, { actual: { edge_taper_deg: -1, cycle_time_s: 30, achieved_quality: 3 } })]);
    expect(r.stats.validJobs).toBe(0);
  });

  it("renders instruction mentioning Q-level", () => {
    const r = eng.buildDataset([base(3)]);
    const ex = r.examples.train[0] ?? r.examples.val[0] ?? r.examples.test[0];
    expect(ex.instruction).toMatch(/Q3/);
  });

  it("empty input yields empty result", () => {
    const r = eng.buildDataset([]);
    expect(r.stats.validJobs).toBe(0);
  });
});

describe("WaterjetLoRACadenceEngine", () => {
  it("defaults to weekly with min 20 jobs", () => {
    expect(waterjetLoRACadenceEngine.getConfig().interval).toBe("weekly");
    expect(waterjetLoRACadenceEngine.getConfig().minNewJobs).toBe(20);
  });
  it("fires when 20+ jobs recorded Sunday 2am+", () => {
    const c = createWaterjetLoRACadence(() => new Date("2026-04-26T03:00:00Z"));
    c.recordJobs(30);
    expect(c.shouldTriggerRun().should).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// U-CMCCL08 — Grinding
// ─────────────────────────────────────────────────────────────────────

describe("GrindingLoRADatasetBuilderEngine", () => {
  const eng = grindingLoRADatasetBuilderEngine;
  const base = (mode: string, burn: boolean, override: Partial<RawJob> = {}): RawJob => ({
    id: `g-${mode}`,
    fingerprint: {},
    features: {
      material: "tool-steel",
      wheel_grit: 60,
      grinding_mode: mode,
      wheel_diameter_mm: 300,
      coolant_type: "oil",
    },
    actual: { achieved_ra_um: 0.4, wheel_wear_mm: 0.01, burn_event: burn },
    ...override,
  });

  it("accepts traverse/plunge/creep-feed modes", () => {
    const r = eng.buildDataset([base("traverse", false), base("plunge", false), base("creep-feed", false)]);
    expect(r.stats.validJobs).toBe(3);
  });

  it("rejects unknown grinding_mode", () => {
    const r = eng.buildDataset([base("cylindrical", false)]);
    expect(r.stats.validJobs).toBe(0);
  });

  it("flags burn events and weight-boosts to 2.5", () => {
    const r = eng.buildDataset([base("creep-feed", true)]);
    const ex = r.examples.train[0] ?? r.examples.val[0] ?? r.examples.test[0];
    expect(ex.metadata.labels).toContain("burn");
    expect(ex.metadata.weight).toBeGreaterThanOrEqual(2.5);
  });

  it("rejects non-boolean burn_event", () => {
    const bad = base("traverse", false);
    bad.actual.burn_event = "no" as unknown as boolean;
    const r = eng.buildDataset([bad]);
    expect(r.stats.validJobs).toBe(0);
  });

  it("renders instruction mentioning grinding mode", () => {
    const r = eng.buildDataset([base("creep-feed", false)]);
    const ex = r.examples.train[0] ?? r.examples.val[0] ?? r.examples.test[0];
    expect(ex.instruction).toMatch(/creep-feed/);
  });
});

describe("GrindingLoRACadenceEngine", () => {
  it("defaults to weekly, 12 jobs", () => {
    expect(grindingLoRACadenceEngine.getConfig().interval).toBe("weekly");
    expect(grindingLoRACadenceEngine.getConfig().minNewJobs).toBe(12);
  });
  it("fires on 12+ jobs Sunday 2am+", () => {
    const c = createGrindingLoRACadence(() => new Date("2026-04-26T03:00:00Z"));
    c.recordJobs(15);
    expect(c.shouldTriggerRun().should).toBe(true);
  });
});
