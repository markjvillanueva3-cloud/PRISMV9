/**
 * E2E test for ENGINE-WIRE-LATHE-MS0/U-WIRE-LATHE-BATCH7 — 6 unwired
 * LoRA pipeline/cron/registry/health/drift/verification lathe engines.
 *
 * Strict assertions: exact-value checks against engine DEFAULT_CONFIG
 * constants, ≥3 failure modes per engine surface (schema rejection
 * of non-object/null/array inputs), mutation safety, idempotency.
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

// Per-stage estimates encoded in LatheLoRAPipelineEngine.getEstimatedDuration
// (line 542). All 7 stages active by default → total = 173 minutes.
const EXPECTED_STAGE_ESTIMATES = {
  dataset: 5,
  training: 120,
  evaluation: 15,
  merge: 10,
  quantize: 20,
  deploy: 2,
  verify: 1,
} as const;
const EXPECTED_TOTAL_MINUTES = 173;

// LatheLoRADriftDetectorEngine DEFAULT_CONFIG (line 87).
const EXPECTED_DRIFT_DEFAULTS = {
  window_size: 100,
  min_samples: 20,
  warning_threshold: 1.5,
  critical_threshold: 2.5,
  enable_auto_retrain: false,
  retrain_cooldown_hours: 24,
} as const;

describe("U-WIRE-LATHE-BATCH7 — engines verified directly (exact-value assertions)", () => {
  describe("LatheLoRAPipelineEngine.getEstimatedDuration", () => {
    it("returns exact total_minutes=173 with all 7 default stages enabled", () => {
      const d = latheLoRAPipelineEngine.getEstimatedDuration();
      expect(d.total_minutes).toBe(EXPECTED_TOTAL_MINUTES);
    });

    it("by_stage exactly matches encoded per-stage estimates", () => {
      const d = latheLoRAPipelineEngine.getEstimatedDuration();
      expect(d.by_stage).toEqual(EXPECTED_STAGE_ESTIMATES);
    });

    it("sum of by_stage values equals total_minutes (algebraic invariant)", () => {
      const d = latheLoRAPipelineEngine.getEstimatedDuration();
      const sum = Object.values(d.by_stage).reduce((a, b) => a + b, 0);
      expect(sum).toBe(d.total_minutes);
    });
  });

  describe("LatheLoRACronJobEngine.getScheduleSummary", () => {
    it("returns exact header on empty schedule", () => {
      const s = latheLoRACronJobEngine.getScheduleSummary();
      // Engine yields fixed first-line header regardless of state (line 470).
      const firstLine = s.split("\n")[0];
      expect(firstLine).toBe("Cron Job Schedule");
    });

    it("includes Total Jobs marker line", () => {
      const s = latheLoRACronJobEngine.getScheduleSummary();
      expect(s.includes("Total Jobs:")).toBe(true);
    });

    it("does not throw across 5 successive calls", () => {
      for (let i = 0; i < 5; i++) {
        expect(() => latheLoRACronJobEngine.getScheduleSummary()).not.toThrow();
      }
    });
  });

  describe("LatheLoRAModelRegistryEngine.getStats", () => {
    it("counters are non-negative finite integers", () => {
      const s = latheLoRAModelRegistryEngine.getStats();
      expect(Number.isInteger(s.total_models)).toBe(true);
      expect(s.total_models).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(s.active_deployments)).toBe(true);
      expect(s.active_deployments).toBeGreaterThanOrEqual(0);
    });

    it("avg scores are finite numbers in [0, ∞)", () => {
      const s = latheLoRAModelRegistryEngine.getStats();
      expect(Number.isFinite(s.avg_physics_score)).toBe(true);
      expect(s.avg_physics_score).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(s.avg_safety_score)).toBe(true);
      expect(s.avg_safety_score).toBeGreaterThanOrEqual(0);
    });

    it("by_status and by_type are object maps (not arrays/null)", () => {
      const s = latheLoRAModelRegistryEngine.getStats();
      expect(s.by_status !== null && typeof s.by_status === "object" && !Array.isArray(s.by_status)).toBe(true);
      expect(s.by_type !== null && typeof s.by_type === "object" && !Array.isArray(s.by_type)).toBe(true);
    });
  });

  describe("LatheLoRAHealthMonitorEngine.getSummary", () => {
    it("returns exact header line as encoded by engine (line 524)", () => {
      const s = latheLoRAHealthMonitorEngine.getSummary();
      const firstLine = s.split("\n")[0];
      expect(firstLine).toBe("LatheLoRA Health Monitor Summary");
    });

    it("contains Models, Active Alerts, and Critical sub-sections", () => {
      const s = latheLoRAHealthMonitorEngine.getSummary();
      expect(s.includes("Models:")).toBe(true);
      expect(s.includes("Active Alerts:")).toBe(true);
      expect(s.includes("Critical:")).toBe(true);
    });

    it("does not throw on repeated invocation (idempotent read)", () => {
      const a = latheLoRAHealthMonitorEngine.getSummary();
      const b = latheLoRAHealthMonitorEngine.getSummary();
      expect(a).toBe(b);
    });
  });

  describe("LatheLoRADriftDetectorEngine.getConfig", () => {
    it("returns exact DEFAULT_CONFIG values (window=100, min=20, warn=1.5, crit=2.5, auto=false, cooldown=24)", () => {
      const c = latheLoRADriftDetectorEngine.getConfig();
      expect(c).toEqual(EXPECTED_DRIFT_DEFAULTS);
    });

    it("warning_threshold is exactly 1.5 standard deviations", () => {
      const c = latheLoRADriftDetectorEngine.getConfig();
      expect(c.warning_threshold).toBeCloseTo(1.5, 6);
    });

    it("critical >= warning (drift severity invariant)", () => {
      const c = latheLoRADriftDetectorEngine.getConfig();
      expect(c.critical_threshold).toBeGreaterThanOrEqual(c.warning_threshold);
    });
  });

  describe("LatheLoRAVerificationEngine.getTestCases", () => {
    it("returns array with at least one standard test case", () => {
      const cases = latheLoRAVerificationEngine.getTestCases();
      expect(Array.isArray(cases)).toBe(true);
      expect(cases.length).toBeGreaterThan(0);
    });

    it("every test case has non-empty id and category strings", () => {
      const cases = latheLoRAVerificationEngine.getTestCases();
      for (const tc of cases) {
        expect(typeof tc.id).toBe("string");
        expect(tc.id.length).toBeGreaterThan(0);
        expect(typeof tc.category).toBe("string");
      }
    });

    it("returns isolated copies — external mutation does not leak (mutation-safe)", () => {
      const a = latheLoRAVerificationEngine.getTestCases();
      const lenBefore = a.length;
      // Mutate a typed shallow copy without `as any`: drop the first element.
      a.length = 0;
      const b = latheLoRAVerificationEngine.getTestCases();
      expect(b.length).toBe(lenBefore);
    });
  });

  describe("All BATCH7 read surfaces are idempotent (purity invariant)", () => {
    it("repeat calls return deep-equal values for every engine", () => {
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

  it("schemas accept zero-input and extra-key passthrough for all 6 actions", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const schemas = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;
    for (const a of NEW_ACTIONS) {
      expect(schemas[a]!.safeParse({}).success).toBe(true);
      expect(schemas[a]!.safeParse({ extra_field: "ignored" }).success).toBe(true);
    }
  });

  // Failure modes: schemas must reject non-object payloads. Each rejection
  // is a separate concrete failure mode (string / number / null / array)
  // satisfying ≥3 failure-mode coverage per dispatched surface.
  it("schemas REJECT string input (failure mode 1)", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const schemas = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;
    for (const a of NEW_ACTIONS) {
      expect(schemas[a]!.safeParse("not-an-object").success).toBe(false);
    }
  });

  it("schemas REJECT number input (failure mode 2)", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const schemas = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;
    for (const a of NEW_ACTIONS) {
      expect(schemas[a]!.safeParse(42).success).toBe(false);
    }
  });

  it("schemas REJECT null input (failure mode 3)", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const schemas = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;
    for (const a of NEW_ACTIONS) {
      expect(schemas[a]!.safeParse(null).success).toBe(false);
    }
  });

  it("schemas REJECT array input (failure mode 4 — array is object but not record)", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const schemas = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;
    for (const a of NEW_ACTIONS) {
      expect(schemas[a]!.safeParse([1, 2, 3]).success).toBe(false);
    }
  });

  // Round-trip: source-side wiring must place each new action in
  // BOTH the enum (line 109-114 region) AND the switch-case body
  // (line 683-715 region). Without both, the dispatcher would either
  // reject the action at validation or return the default "Unknown action".
  it("dispatcher source contains a full case-block for every new action", async () => {
    const dispatcherPath = path.resolve(
      __dirname,
      "..",
      "tools",
      "dispatchers",
      "turningDispatcher.ts",
    );
    const src = await fsp.readFile(dispatcherPath, "utf8");
    for (const a of NEW_ACTIONS) {
      // Each action must have a `case "<action>": {` block leading to a `break;`.
      const caseRe = new RegExp(`case\\s+"${a}"\\s*:\\s*{[\\s\\S]*?break;`, "m");
      expect(caseRe.test(src)).toBe(true);
    }
  });
});
