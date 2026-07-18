/**
 * SinkerEDMLoRAWiring.test.ts
 *
 * BRIDGE-WIRING/U-WIRE-SINKER-LORA wiring-gate test.
 *
 * Asserts SinkerEDMLoRACadenceEngine + SinkerEDMLoRADatasetBuilderEngine are
 * reachable via prism_data (dataDispatcher) through 5 flat actions that mirror
 * the existing grinding_lora_* wire (same BaseLoRACadence / BaseLoRADatasetBuilder
 * primitives). Verifies the dispatcher case block statically (case-scoped
 * source-grep) and exercises the engine methods for real behavior.
 *
 * Pattern mirror: grinding_lora_cadence_* / grinding_lora_dataset_* in
 * dataDispatcher. Lessons applied: positional-agnostic ACTIONS membership;
 * lazy-imported singleton (NOT new); case-scoped source-grep; the sinker wire
 * ADDS per-action Zod schemas the grinding sibling never carried.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  sinkerEDMLoRACadenceEngine,
  createSinkerEDMLoRACadence,
} from "../engines/SinkerEDMLoRACadenceEngine.js";
import { sinkerEDMLoRADatasetBuilderEngine } from "../engines/SinkerEDMLoRADatasetBuilderEngine.js";
import { ACTION_DATA_SCHEMAS } from "../schemas/dataActionSchemas.js";

const DISPATCHER_PATH = path.resolve(__dirname, "..", "tools", "dispatchers", "dataDispatcher.ts");
const DISPATCHER_SRC: string = fs.readFileSync(DISPATCHER_PATH, "utf8");

// Scope the source-grep to the 5 sinker_lora case blocks. dataDispatcher is
// large — an unscoped grep would false-WIRED match the grinding_lora siblings.
// End-anchor: the next outer case after the sinker block is
// "grinding_replacement_evaluate" (the action that followed grinding_lora
// before this insert).
const SINKER_CASE_BLOCK: string = (() => {
  const start = DISPATCHER_SRC.indexOf('case "sinker_lora_cadence_config":');
  if (start === -1) return "";
  const nextIdx = DISPATCHER_SRC.indexOf('case "grinding_replacement_evaluate":', start);
  return nextIdx === -1 ? DISPATCHER_SRC.slice(start, start + 4000) : DISPATCHER_SRC.slice(start, nextIdx);
})();

const SINKER_ACTIONS = [
  "sinker_lora_cadence_config",
  "sinker_lora_cadence_state",
  "sinker_lora_cadence_record",
  "sinker_lora_dataset_build",
  "sinker_lora_dataset_schema",
] as const;

/** A valid RawJob that clears SinkerEDMLoRADatasetBuilderEngine.validate(). */
function validJob(id: string) {
  return {
    id,
    fingerprint: { material: "D2", depth_bucket: "moderate" },
    features: {
      material: "D2",
      electrode_material: "graphite_fine",
      cavity_depth_mm: 20,
      cavity_width_mm: 10,
      electrode_count: 3,
    },
    actual: {
      total_wear_mm: 0.15,
      achieved_ra_um: 0.8,
      cycle_time_min: 45,
    },
  };
}

describe("SinkerEDM LoRA — dispatcher wiring gate", () => {
  // ── ACTIONS enum + schema exports ────────────────────────────────────
  it("ACTIONS enum contains all 5 sinker_lora actions (positional-agnostic)", () => {
    for (const a of SINKER_ACTIONS) {
      expect(DISPATCHER_SRC).toMatch(new RegExp(`"${a}"(,|\\] as const;)`));
    }
  });

  it("ACTION_DATA_SCHEMAS exports a Zod schema for every sinker_lora action", () => {
    for (const a of SINKER_ACTIONS) {
      expect(ACTION_DATA_SCHEMAS).toHaveProperty(a);
      expect(typeof ACTION_DATA_SCHEMAS[a].safeParse).toBe("function");
    }
  });

  // ── schema behavior ──────────────────────────────────────────────────
  it("cadence_config schema accepts an empty object (getConfig path) and a partial config", () => {
    const sch = ACTION_DATA_SCHEMAS.sinker_lora_cadence_config;
    expect(sch.parse({})).toEqual({});
    // passthrough keeps the config field so the dispatcher's
    // Object.keys(p).length>0 branch routes to setConfig.
    expect(sch.parse({ minNewJobs: 20 }).minNewJobs).toBe(20);
    expect(sch.parse({ interval: "biweekly" }).interval).toBe("biweekly");
  });

  it("cadence_config schema rejects an interval outside the CadenceInterval enum", () => {
    const sch = ACTION_DATA_SCHEMAS.sinker_lora_cadence_config;
    expect(() => sch.parse({ interval: "fortnightly" })).toThrow();
    expect(() => sch.parse({ dayOfMonth: 31 })).toThrow(); // 1..28 only
  });

  it("cadence_record schema requires a non-negative integer 'n'", () => {
    const sch = ACTION_DATA_SCHEMAS.sinker_lora_cadence_record;
    expect(sch.parse({ n: 5 }).n).toBe(5);
    expect(() => sch.parse({})).toThrow();
    expect(() => sch.parse({ n: -1 })).toThrow();
    expect(() => sch.parse({ n: 2.5 })).toThrow();
  });

  it("dataset_build schema requires a non-empty jobs array", () => {
    const sch = ACTION_DATA_SCHEMAS.sinker_lora_dataset_build;
    expect(() => sch.parse({})).toThrow();
    expect(() => sch.parse({ jobs: [] })).toThrow();
    const r = sch.parse({ jobs: [validJob("J1")] });
    expect(r.jobs).toHaveLength(1);
    expect(r.jobs[0].id).toBe("J1");
  });

  it("cadence_state and dataset_schema schemas accept an empty object (no params)", () => {
    expect(ACTION_DATA_SCHEMAS.sinker_lora_cadence_state.parse({})).toEqual({});
    expect(ACTION_DATA_SCHEMAS.sinker_lora_dataset_schema.parse({})).toEqual({});
  });

  // ── dispatcher case block ────────────────────────────────────────────
  it("dispatcher has a case for all 5 sinker_lora actions", () => {
    expect(SINKER_CASE_BLOCK).not.toBe("");
    for (const a of SINKER_ACTIONS) {
      expect(SINKER_CASE_BLOCK).toContain(`case "${a}":`);
    }
  });

  it("dispatcher binds the cadence + dataset singletons (not class instantiation)", () => {
    expect(SINKER_CASE_BLOCK).toContain('await import("../../engines/SinkerEDMLoRACadenceEngine.js")');
    expect(SINKER_CASE_BLOCK).toContain("{ sinkerEDMLoRACadenceEngine }");
    expect(SINKER_CASE_BLOCK).toContain('await import("../../engines/SinkerEDMLoRADatasetBuilderEngine.js")');
    expect(SINKER_CASE_BLOCK).toContain("{ sinkerEDMLoRADatasetBuilderEngine }");
    expect(SINKER_CASE_BLOCK).not.toMatch(/new\s+SinkerEDMLoRA\w+\s*\(/);
  });

  it("cadence_config case routes empty params → getConfig, populated → setConfig", () => {
    expect(SINKER_CASE_BLOCK).toContain("Object.keys(p).length > 0");
    expect(SINKER_CASE_BLOCK).toContain("sinkerEDMLoRACadenceEngine.setConfig(p)");
    expect(SINKER_CASE_BLOCK).toContain("sinkerEDMLoRACadenceEngine.getConfig()");
  });

  it("cadence_record case wraps the recordJobs total and reads params.n", () => {
    expect(SINKER_CASE_BLOCK).toContain("sinkerEDMLoRACadenceEngine.recordJobs((params as any).n)");
    expect(SINKER_CASE_BLOCK).toContain("total:");
  });

  // ── real behavior: cadence engine ────────────────────────────────────
  it("getConfig() returns the SinkerEDM monthly cadence defaults", () => {
    const e = createSinkerEDMLoRACadence(() => new Date("2026-01-15T03:00:00Z"));
    const cfg = e.getConfig();
    // SINKEREDM_DEFAULTS override DEFAULT_CADENCE — monthly, day 1, hour 3.
    expect(cfg.interval).toBe("monthly");
    expect(cfg.dayOfMonth).toBe(1);
    expect(cfg.hour).toBe(3);
    expect(cfg.minNewJobs).toBe(8);
  });

  it("setConfig() merges a partial config and getConfig() reflects it", () => {
    const e = createSinkerEDMLoRACadence(() => new Date("2026-01-15T03:00:00Z"));
    const merged = e.setConfig({ minNewJobs: 25 });
    expect(merged.minNewJobs).toBe(25);
    // interval untouched by the partial — still the SinkerEDM default.
    expect(merged.interval).toBe("monthly");
    expect(e.getConfig().minNewJobs).toBe(25);
  });

  it("recordJobs() accumulates and getState() reports jobsSinceLastRun", () => {
    const e = createSinkerEDMLoRACadence(() => new Date("2026-01-15T03:00:00Z"));
    expect(e.recordJobs(3)).toBe(3);
    expect(e.recordJobs(5)).toBe(8);
    expect(e.getState().jobsSinceLastRun).toBe(8);
  });

  it("getState() returns a CadenceState with config + runs + versions", () => {
    const e = createSinkerEDMLoRACadence(() => new Date("2026-01-15T03:00:00Z"));
    const st = e.getState();
    expect(st.config.interval).toBe("monthly");
    expect(Array.isArray(st.runs)).toBe(true);
    expect(Array.isArray(st.versions)).toBe(true);
    expect(st.jobsSinceLastRun).toBe(0);
  });

  it("the cadence singleton is exported with the wired methods", () => {
    expect(typeof sinkerEDMLoRACadenceEngine.getConfig).toBe("function");
    expect(typeof sinkerEDMLoRACadenceEngine.getState).toBe("function");
    expect(typeof sinkerEDMLoRACadenceEngine.recordJobs).toBe("function");
  });

  // ── real behavior: dataset builder ───────────────────────────────────
  it("requiredSchema() reports the 5 feature keys and 3 actual keys", () => {
    const s = sinkerEDMLoRADatasetBuilderEngine.requiredSchema();
    expect(s.features).toContain("material");
    expect(s.features).toContain("electrode_count");
    expect(s.features).toContain("cavity_depth_mm");
    expect(s.features).toHaveLength(5);
    expect(s.actuals).toContain("total_wear_mm");
    expect(s.actuals).toContain("achieved_ra_um");
    expect(s.actuals).toHaveLength(3);
  });

  it("buildDataset() counts every well-formed job as valid", () => {
    const jobs = [validJob("A"), validJob("B"), validJob("C"), validJob("D")];
    const r = sinkerEDMLoRADatasetBuilderEngine.buildDataset(jobs);
    expect(r.stats.totalJobs).toBe(4);
    expect(r.stats.validJobs).toBe(4);
    expect(typeof r.datasetFingerprint).toBe("string");
    expect(r.datasetFingerprint.length).toBeGreaterThan(0);
  });

  it("buildDataset() rejects a job missing a required feature key", () => {
    const bad = validJob("BAD");
    delete (bad.features as Record<string, unknown>).electrode_count;
    const jobs = [validJob("A"), validJob("B"), validJob("C"), bad];
    const r = sinkerEDMLoRADatasetBuilderEngine.buildDataset(jobs);
    expect(r.stats.totalJobs).toBe(4);
    // the malformed job is excluded — 3 of 4 survive validation.
    expect(r.stats.validJobs).toBe(3);
  });

  it("buildDataset() rejects a job with a non-numeric actual", () => {
    const bad = validJob("BAD2");
    (bad.actual as Record<string, unknown>).total_wear_mm = "lots";
    const r = sinkerEDMLoRADatasetBuilderEngine.buildDataset([validJob("A"), bad]);
    expect(r.stats.totalJobs).toBe(2);
    expect(r.stats.validJobs).toBe(1);
  });
});
