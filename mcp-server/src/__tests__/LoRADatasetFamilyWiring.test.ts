/**
 * LoRA dataset-builder FAMILY wiring test
 * =======================================
 * U-LORA-MACHINE-DATASET-WIRE (slot:india). Completes the MachineLoRABaseEngine
 * sibling family in prism_edm: sinker-EDM, laser, and waterjet each already had a
 * `*_lora_dataset_schema` action (requiredSchema reachable) but their buildDataset()
 * was UNREACHABLE via the dispatcher -- no `*_lora_build_dataset` action existed.
 * This is the R15 "apply-to-all" sibling of WEDMLoRADatasetBuilderWiring.test.ts.
 *
 * Verifies the 3 new prism_edm actions:
 *   - sinker_lora_build_dataset
 *   - laser_lora_build_dataset
 *   - waterjet_lora_build_dataset
 *
 * Two real-behavior assertion layers (no toBeDefined-only):
 *   1) SOURCE-GREP -- ACTIONS membership + case-block presence + inline-import pin
 *      (edmDispatcher does not export ACTIONS, so grep the src)
 *   2) RUNTIME -- invoke each singleton against valid + invalid machine-specific
 *      RawJob sets; verify Alpaca-format examples carry the engine-required feature
 *      + actual keys and the machine-specific render() instruction.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { sinkerEDMLoRADatasetBuilderEngine } from "../engines/SinkerEDMLoRADatasetBuilderEngine.js";
import { laserLoRADatasetBuilderEngine } from "../engines/LaserLoRADatasetBuilderEngine.js";
import { waterjetLoRADatasetBuilderEngine } from "../engines/WaterjetLoRADatasetBuilderEngine.js";
import type { RawJob } from "../engines/MachineLoRABaseEngine.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const DISPATCHER_PATH = join(HERE, "..", "tools", "dispatchers", "edmDispatcher.ts");
const DISPATCHER_SRC = readFileSync(DISPATCHER_PATH, "utf8");

const NEW_ACTIONS = [
  "sinker_lora_build_dataset",
  "laser_lora_build_dataset",
  "waterjet_lora_build_dataset",
] as const;

const ENGINE_PATHS = [
  "SinkerEDMLoRADatasetBuilderEngine.js",
  "LaserLoRADatasetBuilderEngine.js",
  "WaterjetLoRADatasetBuilderEngine.js",
] as const;

// ---------------------------------------------------------------------------
// LAYER 1 -- dispatcher source pins
// ---------------------------------------------------------------------------
describe("LoRA dataset family wiring -- edmDispatcher source pins (U-LORA-MACHINE-DATASET-WIRE)", () => {
  for (const action of NEW_ACTIONS) {
    it(`registers '${action}' (ACTIONS entry + case label = exactly 2)`, () => {
      // each action appears EXACTLY twice: once in the ACTIONS array, once as a case label.
      // toBe(2) catches a missing ACTIONS registration OR a missing case handler (R9).
      const occurrences = DISPATCHER_SRC.split(`"${action}"`).length - 1;
      expect(occurrences).toBe(2);
    });
    it(`has 'case "${action}":' handler block`, () => {
      expect(DISPATCHER_SRC.includes(`case "${action}":`)).toBe(true);
    });
  }

  for (const p of ENGINE_PATHS) {
    it(`inline-imports ${p}`, () => {
      expect(DISPATCHER_SRC.includes(p)).toBe(true);
    });
  }

  it("build cases call buildDataset (not just requiredSchema)", () => {
    expect(DISPATCHER_SRC.includes("sinkerEDMLoRADatasetBuilderEngine.buildDataset(")).toBe(true);
    expect(DISPATCHER_SRC.includes("laserLoRADatasetBuilderEngine.buildDataset(")).toBe(true);
    expect(DISPATCHER_SRC.includes("waterjetLoRADatasetBuilderEngine.buildDataset(")).toBe(true);
  });

  it("build cases use typed RawJob[] casts (no 'as any' arg bypass)", () => {
    // anti-pattern guard: the build cases must NOT reintroduce `as any` arg casts.
    expect(DISPATCHER_SRC.includes("buildDataset(p.jobs as any")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// LAYER 2 -- engine round-trips (real machine-specific jobs)
// ---------------------------------------------------------------------------
describe("sinker-EDM LoRA builder round-trip", () => {
  function mkJob(overrides: Partial<RawJob> = {}): RawJob {
    return {
      id: "SJOB-001",
      fingerprint: { material: "H13 tool steel" },
      features: {
        material: "H13 tool steel",
        electrode_material: "copper",
        cavity_depth_mm: 25,
        cavity_width_mm: 5,
        electrode_count: 2,
      },
      actual: { total_wear_mm: 0.12, achieved_ra_um: 0.4, cycle_time_min: 90 },
      ...overrides,
    };
  }

  it("requiredSchema() exposes the documented sinker feature + actual keys", () => {
    const r = sinkerEDMLoRADatasetBuilderEngine.requiredSchema();
    expect([...r.features].sort()).toEqual(
      ["cavity_depth_mm", "cavity_width_mm", "electrode_count", "electrode_material", "material"].sort(),
    );
    expect([...r.actuals].sort()).toEqual(["achieved_ra_um", "cycle_time_min", "total_wear_mm"].sort());
  });

  it("buildDataset() with 1 valid job -> >=1 example, validJobs=1, render names electrode/material/depth", () => {
    const r = sinkerEDMLoRADatasetBuilderEngine.buildDataset([mkJob()]);
    const all = [...r.examples.train, ...r.examples.val, ...r.examples.test];
    expect(all.length).toBeGreaterThanOrEqual(1);
    expect(r.stats.totalJobs).toBe(1);
    expect(r.stats.validJobs).toBe(1);
    const ex = all[0];
    expect(ex.instruction).toContain("sinker-EDM");
    expect(ex.instruction).toContain("H13 tool steel");
    expect(ex.instruction).toContain("copper");
    expect(JSON.parse(ex.output).total_wear_mm).toBe(0.12);
  });

  it("drops a job missing a required feature (electrode_material)", () => {
    const bad = mkJob({
      features: { material: "H13 tool steel", cavity_depth_mm: 25, cavity_width_mm: 5, electrode_count: 2 },
    });
    const r = sinkerEDMLoRADatasetBuilderEngine.buildDataset([bad, mkJob({ id: "SJOB-002" })]);
    expect(r.stats.totalJobs).toBe(2);
    expect(r.stats.validJobs).toBe(1);
  });

  it("drops a job with a negative actual (total_wear_mm=-1)", () => {
    const bad = mkJob({ id: "SJOB-003", actual: { total_wear_mm: -1, achieved_ra_um: 0.4, cycle_time_min: 90 } });
    const r = sinkerEDMLoRADatasetBuilderEngine.buildDataset([bad]);
    expect(r.stats.validJobs).toBe(0);
  });
});

describe("laser LoRA builder round-trip", () => {
  function mkJob(overrides: Partial<RawJob> = {}): RawJob {
    return {
      id: "LJOB-001",
      fingerprint: { material: "mild steel" },
      features: {
        material: "mild steel",
        thickness_mm: 6,
        laser_power_w: 4000,
        assist_gas: "O2",
        pierce_type: "ramp",
      },
      actual: { pierce_success: true, edge_quality_score: 8, dross_events: 0 },
      ...overrides,
    };
  }

  it("buildDataset() with 1 valid job -> render names material/thickness/assist gas", () => {
    const r = laserLoRADatasetBuilderEngine.buildDataset([mkJob()]);
    const all = [...r.examples.train, ...r.examples.val, ...r.examples.test];
    expect(all.length).toBeGreaterThanOrEqual(1);
    expect(r.stats.validJobs).toBe(1);
    const ex = all[0];
    expect(ex.instruction).toContain("laser pierce");
    expect(ex.instruction).toContain("mild steel");
    expect(ex.instruction).toContain("6.0mm");
    expect(ex.instruction).toContain("O2");
    expect(JSON.parse(ex.output).pierce_success).toBe(true);
  });

  it("drops a job whose pierce_success is non-boolean (engine-specific validation)", () => {
    const bad = mkJob({ id: "LJOB-002", actual: { pierce_success: 1, edge_quality_score: 8, dross_events: 0 } });
    const r = laserLoRADatasetBuilderEngine.buildDataset([bad]);
    expect(r.stats.validJobs).toBe(0);
  });

  it("drops a job with edge_quality_score out of the 0-10 range", () => {
    const bad = mkJob({ id: "LJOB-003", actual: { pierce_success: true, edge_quality_score: 42, dross_events: 0 } });
    const r = laserLoRADatasetBuilderEngine.buildDataset([bad]);
    expect(r.stats.validJobs).toBe(0);
  });
});

describe("waterjet LoRA builder round-trip", () => {
  function mkJob(overrides: Partial<RawJob> = {}): RawJob {
    return {
      id: "WJJOB-001",
      fingerprint: { material: "aluminum" },
      features: {
        material: "aluminum",
        thickness_mm: 12,
        quality_level: 3,
        abrasive_flow_g_min: 340,
        orifice_mm: 0.3,
      },
      actual: { edge_taper_deg: 0.5, cycle_time_s: 120, achieved_quality: 3 },
      ...overrides,
    };
  }

  it("buildDataset() with 1 valid job -> render names material/thickness/quality", () => {
    const r = waterjetLoRADatasetBuilderEngine.buildDataset([mkJob()]);
    const all = [...r.examples.train, ...r.examples.val, ...r.examples.test];
    expect(all.length).toBeGreaterThanOrEqual(1);
    expect(r.stats.validJobs).toBe(1);
    const ex = all[0];
    expect(ex.instruction).toContain("waterjet feed");
    expect(ex.instruction).toContain("aluminum");
    expect(ex.instruction).toContain("12.0mm");
    expect(ex.instruction).toContain("Q3");
    expect(JSON.parse(ex.output).cycle_time_s).toBe(120);
  });

  it("drops a job with quality_level out of the 1-5 range", () => {
    const bad = mkJob({ id: "WJJOB-002", features: { material: "aluminum", thickness_mm: 12, quality_level: 9, abrasive_flow_g_min: 340, orifice_mm: 0.3 } });
    const r = waterjetLoRADatasetBuilderEngine.buildDataset([bad]);
    expect(r.stats.validJobs).toBe(0);
  });

  it("drops a job with a negative actual (edge_taper_deg=-1)", () => {
    const bad = mkJob({ id: "WJJOB-003", actual: { edge_taper_deg: -1, cycle_time_s: 120, achieved_quality: 3 } });
    const r = waterjetLoRADatasetBuilderEngine.buildDataset([bad]);
    expect(r.stats.validJobs).toBe(0);
  });
});
