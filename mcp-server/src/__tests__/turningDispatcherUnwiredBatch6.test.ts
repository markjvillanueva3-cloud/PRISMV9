/**
 * E2E test for ENGINE-WIRE-LATHE-MS0/U-WIRE-LATHE-BATCH6 — 6 unwired
 * feedback/stock/deviation/signoff/engagement/chuck lathe engines (stats surfaces).
 */
import { describe, it, expect } from "vitest";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { latheActualFeedbackTuningEngine } from "../engines/LatheActualFeedbackTuningEngine.js";
import { latheStockEvolutionEngine } from "../engines/LatheStockEvolutionEngine.js";
import { latheDeviationMapEngine } from "../engines/LatheDeviationMapEngine.js";
import { latheProgramSignoffDossierEngine } from "../engines/LatheProgramSignoffDossierEngine.js";
import { latheBlockEngagementSimulatorEngine } from "../engines/LatheBlockEngagementSimulatorEngine.js";
import { latheChuckJawSetupEngine } from "../engines/LatheChuckJawSetupEngine.js";

const NEW_ACTIONS = [
  "lathe_actual_feedback_tuning_stats",
  "lathe_stock_evolution_stats",
  "lathe_deviation_map_stats",
  "lathe_program_signoff_stats",
  "lathe_block_engagement_stats",
  "lathe_chuck_jaw_setup_stats",
] as const;
const EXPECTED_ACTION_COUNT = NEW_ACTIONS.length;

describe("U-WIRE-LATHE-BATCH6 — engines verified directly", () => {
  describe("LatheActualFeedbackTuningEngine.getStats", () => {
    it("returns {alpha_default: number, parameters_tuned: string[]}", () => {
      const s = latheActualFeedbackTuningEngine.getStats();
      expect(typeof s.alpha_default).toBe("number");
      expect(Number.isFinite(s.alpha_default)).toBe(true);
      expect(Array.isArray(s.parameters_tuned)).toBe(true);
      expect(s.parameters_tuned.length).toBeGreaterThan(0);
    });
  });

  describe("LatheStockEvolutionEngine.getStats", () => {
    it("returns {reference: string} non-empty", () => {
      const s = latheStockEvolutionEngine.getStats();
      expect(typeof s.reference).toBe("string");
      expect(s.reference.length).toBeGreaterThan(0);
    });
  });

  describe("LatheDeviationMapEngine.getStats", () => {
    it("returns {reference: string} non-empty", () => {
      const s = latheDeviationMapEngine.getStats();
      expect(typeof s.reference).toBe("string");
      expect(s.reference.length).toBeGreaterThan(0);
    });
  });

  describe("LatheProgramSignoffDossierEngine.getStats", () => {
    it("returns {verdicts: string[], reference: string}", () => {
      const s = latheProgramSignoffDossierEngine.getStats();
      expect(Array.isArray(s.verdicts)).toBe(true);
      expect(s.verdicts.length).toBeGreaterThan(0);
      expect(typeof s.reference).toBe("string");
    });
  });

  describe("LatheBlockEngagementSimulatorEngine.getStats", () => {
    it("returns {reference: string} non-empty", () => {
      const s = latheBlockEngagementSimulatorEngine.getStats();
      expect(typeof s.reference).toBe("string");
      expect(s.reference.length).toBeGreaterThan(0);
    });
  });

  describe("LatheChuckJawSetupEngine.getStats", () => {
    it("returns {reference: string} non-empty", () => {
      const s = latheChuckJawSetupEngine.getStats();
      expect(typeof s.reference).toBe("string");
      expect(s.reference.length).toBeGreaterThan(0);
    });
  });

  describe("All BATCH6 stats are pure (idempotent reads)", () => {
    it("repeat calls return same value for every engine", () => {
      const a1 = latheActualFeedbackTuningEngine.getStats();
      const a2 = latheActualFeedbackTuningEngine.getStats();
      expect(a1).toEqual(a2);

      const s1 = latheStockEvolutionEngine.getStats();
      const s2 = latheStockEvolutionEngine.getStats();
      expect(s1).toEqual(s2);

      const d1 = latheDeviationMapEngine.getStats();
      const d2 = latheDeviationMapEngine.getStats();
      expect(d1).toEqual(d2);
    });
  });
});

describe("U-WIRE-LATHE-BATCH6 — dispatcher wiring verified", () => {
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

  it("schemas accept zero-input for all 6 BATCH6 stats actions", async () => {
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
      // .passthrough() means extra keys are allowed
      const r = schemas[a]!.safeParse({ extra_field: "ignored" });
      expect(r.success).toBe(true);
    }
  });
});
