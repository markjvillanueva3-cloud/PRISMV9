/**
 * E2E test for ENGINE-WIRE-LATHE-MS0/U-WIRE-LATHE-BATCH7 — 6 unwired
 * LoRA pipeline/cron/registry/health/drift/verification lathe engines.
 */
import { describe, it, expect } from "vitest";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { latheLoRAPipelineEngine } from "../engines/LatheLoRAPipelineEngine.js";
import { latheLoRACronJobEngine } from "../engines/LatheLoRACronJobEngine.js";
import { latheLoRAModelRegistryEngine } from "../engines/LatheLoRAModelRegistryEngine.js";
import { latheLoRAHealthMonitorEngine } from "../engines/LatheLoRAHealthMonitorEngine.js";
import { latheLoRADriftDetectorEngine } from "../engines/LatheLoRADriftDetectorEngine.js";
import { latheLoRAVerificationEngine } from "../engines/LatheLoRAVerificationEngine.js";

const NEW_ACTIONS = [
  "lathe_lora_pipeline_estimated_duration",
  "lathe_lora_cron_schedule_summary",
  "lathe_lora_registry_stats",
  "lathe_lora_health_summary",
  "lathe_lora_drift_config",
  "lathe_lora_verification_test_cases",
] as const;
const EXPECTED_ACTION_COUNT = NEW_ACTIONS.length;

describe("U-WIRE-LATHE-BATCH7 — engines verified directly", () => {
  describe("LatheLoRAPipelineEngine.getEstimatedDuration", () => {
    it("returns {total_minutes: number, by_stage: Record<stage,number>} with positive total", () => {
      const d = latheLoRAPipelineEngine.getEstimatedDuration();
      expect(typeof d.total_minutes).toBe("number");
      expect(Number.isFinite(d.total_minutes)).toBe(true);
      expect(d.total_minutes).toBeGreaterThan(0);
      expect(typeof d.by_stage).toBe("object");
      const stageVals = Object.values(d.by_stage);
      expect(stageVals.length).toBeGreaterThan(0);
      const sum = stageVals.reduce((a, b) => a + b, 0);
      expect(sum).toBe(d.total_minutes);
      for (const v of stageVals) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThan(0);
      }
    });
  });

  describe("LatheLoRACronJobEngine.getScheduleSummary", () => {
    it("returns non-empty string with header line", () => {
      const s = latheLoRACronJobEngine.getScheduleSummary();
      expect(typeof s).toBe("string");
      expect(s.length).toBeGreaterThan(0);
      expect(s).toContain("Cron Job Schedule");
      expect(s).toContain("Total Jobs:");
    });
  });

  describe("LatheLoRAModelRegistryEngine.getStats", () => {
    it("returns non-negative numeric counters and bucket maps", () => {
      const s = latheLoRAModelRegistryEngine.getStats();
      expect(typeof s.total_models).toBe("number");
      expect(s.total_models).toBeGreaterThanOrEqual(0);
      expect(typeof s.active_deployments).toBe("number");
      expect(s.active_deployments).toBeGreaterThanOrEqual(0);
      expect(typeof s.avg_physics_score).toBe("number");
      expect(typeof s.avg_safety_score).toBe("number");
      expect(typeof s.by_status).toBe("object");
      expect(typeof s.by_type).toBe("object");
    });
  });

  describe("LatheLoRAHealthMonitorEngine.getSummary", () => {
    it("returns non-empty string with header and Models line", () => {
      const s = latheLoRAHealthMonitorEngine.getSummary();
      expect(typeof s).toBe("string");
      expect(s.length).toBeGreaterThan(0);
      expect(s).toContain("LatheLoRA Health Monitor Summary");
      expect(s).toMatch(/Models:\s*\d+\s+total/);
      expect(s).toContain("Active Alerts:");
    });
  });

  describe("LatheLoRADriftDetectorEngine.getConfig", () => {
    it("returns DriftConfig with sane numeric thresholds", () => {
      const c = latheLoRADriftDetectorEngine.getConfig();
      expect(typeof c.window_size).toBe("number");
      expect(c.window_size).toBeGreaterThan(0);
      expect(typeof c.min_samples).toBe("number");
      expect(c.min_samples).toBeGreaterThan(0);
      expect(typeof c.warning_threshold).toBe("number");
      expect(typeof c.critical_threshold).toBe("number");
      expect(c.critical_threshold).toBeGreaterThanOrEqual(c.warning_threshold);
      expect(typeof c.enable_auto_retrain).toBe("boolean");
      expect(typeof c.retrain_cooldown_hours).toBe("number");
      expect(c.retrain_cooldown_hours).toBeGreaterThan(0);
    });
  });

  describe("LatheLoRAVerificationEngine.getTestCases", () => {
    it("returns non-empty array of test cases with id+category fields", () => {
      const cases = latheLoRAVerificationEngine.getTestCases();
      expect(Array.isArray(cases)).toBe(true);
      expect(cases.length).toBeGreaterThan(0);
      for (const tc of cases) {
        expect(typeof tc.id).toBe("string");
        expect(tc.id.length).toBeGreaterThan(0);
        expect(typeof tc.category).toBe("string");
      }
    });

    it("returns isolated copies (mutation-safe)", () => {
      const a = latheLoRAVerificationEngine.getTestCases();
      const lenBefore = a.length;
      a.push({} as any);
      const b = latheLoRAVerificationEngine.getTestCases();
      expect(b.length).toBe(lenBefore);
    });
  });

  describe("All BATCH7 read surfaces are pure", () => {
    it("repeat calls return equal values for every engine", () => {
      const p1 = latheLoRAPipelineEngine.getEstimatedDuration();
      const p2 = latheLoRAPipelineEngine.getEstimatedDuration();
      expect(p1).toEqual(p2);

      const r1 = latheLoRAModelRegistryEngine.getStats();
      const r2 = latheLoRAModelRegistryEngine.getStats();
      expect(r1).toEqual(r2);

      const d1 = latheLoRADriftDetectorEngine.getConfig();
      const d2 = latheLoRADriftDetectorEngine.getConfig();
      expect(d1).toEqual(d2);
    });
  });
});

describe("U-WIRE-LATHE-BATCH7 — dispatcher wiring verified", () => {
  it("registers all 6 new actions in turningDispatcher source (enum + case)", async () => {
    const dispatcherPath = path.resolve(
      __dirname,
      "..",
      "tools",
      "dispatchers",
      "turningDispatcher.ts",
    );
    const src = await fsp.readFile(dispatcherPath, "utf8");
    const present = NEW_ACTIONS.filter((a) => src.includes(`"${a}"`));
    expect(present.length).toBe(EXPECTED_ACTION_COUNT);
    for (const a of NEW_ACTIONS) {
      const occurrences = src.split(`"${a}"`).length - 1;
      expect(occurrences).toBeGreaterThanOrEqual(2);
    }
  });

  it("registers all 6 schemas in TURNING_ACTION_SCHEMAS", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const present = NEW_ACTIONS.filter(
      (a) => typeof (TURNING_ACTION_SCHEMAS as Record<string, { safeParse?: unknown }>)[a]?.safeParse === "function",
    );
    expect(present.length).toBe(EXPECTED_ACTION_COUNT);
  });

  it("schemas accept zero-input for all 6 BATCH7 actions", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const schemas = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;
    for (const a of NEW_ACTIONS) {
      expect(schemas[a]!.safeParse({}).success).toBe(true);
    }
  });

  it("schemas pass-through extra fields without rejecting", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const schemas = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;
    for (const a of NEW_ACTIONS) {
      const r = schemas[a]!.safeParse({ extra_field: "ignored" });
      expect(r.success).toBe(true);
    }
  });
});
