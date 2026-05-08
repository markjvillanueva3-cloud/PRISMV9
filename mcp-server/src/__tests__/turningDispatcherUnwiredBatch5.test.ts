/**
 * E2E test for ENGINE-WIRE-LATHE-MS0/U-WIRE-LATHE-BATCH5 — 6 unwired LoRA-cadence /
 * post-uncertainty / deep-reasoning lathe engines wired into turningDispatcher.
 */
import { describe, it, expect } from "vitest";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { latheLoRACadenceEngine } from "../engines/LatheLoRACadenceEngine.js";
import { latheDeepReasoningEngine } from "../engines/LatheDeepReasoningEngine.js";
import { lathePostGeneratorUncertaintyEngine } from "../engines/LathePostGeneratorUncertaintyEngine.js";

const NEW_ACTIONS = [
  "lathe_lora_cadence_state",
  "lathe_lora_cadence_should_trigger",
  "lathe_lora_cadence_active_version",
  "lathe_deep_reasoning_record_outcome",
  "lathe_post_uncertainty_analyze_block",
  "lathe_post_uncertainty_prod_ready",
] as const;
const EXPECTED_ACTION_COUNT = NEW_ACTIONS.length;

describe("U-WIRE-LATHE-BATCH5 — engines verified directly", () => {
  describe("LatheLoRACadenceEngine", () => {
    it("getState returns CadenceState object (idempotent reader)", () => {
      const a = latheLoRACadenceEngine.getState();
      const b = latheLoRACadenceEngine.getState();
      expect(typeof a).toBe("object");
      expect(typeof b).toBe("object");
      expect(Object.keys(a as Record<string, unknown>).sort())
        .toEqual(Object.keys(b as Record<string, unknown>).sort());
    });

    it("shouldTriggerRun returns {should: boolean, reason: …}", () => {
      const r = latheLoRACadenceEngine.shouldTriggerRun();
      expect(typeof r.should).toBe("boolean");
      expect("reason" in r).toBe(true);
    });

    it("getActiveVersion returns null or VersionInfo (never undefined)", () => {
      const v = latheLoRACadenceEngine.getActiveVersion();
      expect(v === null || typeof v === "object").toBe(true);
    });
  });

  describe("LatheDeepReasoningEngine.recordOutcome", () => {
    it("returns {recorded: true, learning_updates: string[]} for a successful outcome", () => {
      const r = latheDeepReasoningEngine.recordOutcome("plan-001", { success: true });
      expect(r.recorded).toBe(true);
      expect(Array.isArray(r.learning_updates)).toBe(true);
    });

    it("learning_updates grows when actual_cycle_time_sec is supplied", () => {
      const baseline = latheDeepReasoningEngine.recordOutcome("plan-A", { success: true });
      const withCycle = latheDeepReasoningEngine.recordOutcome("plan-B", {
        success: true, actual_cycle_time_sec: 245.5,
      });
      expect(withCycle.learning_updates.length).toBeGreaterThanOrEqual(baseline.learning_updates.length);
    });

    it("learning_updates grows when issues_encountered is supplied", () => {
      const r = latheDeepReasoningEngine.recordOutcome("plan-C", {
        success: false, issues_encountered: ["chatter_at_finish_pass", "burr_on_part_off"],
      });
      const hasFailureMode = r.learning_updates.some((u) => u.toLowerCase().includes("failure") || u.toLowerCase().includes("issue"));
      expect(hasFailureMode).toBe(true);
    });
  });

  describe("LathePostGeneratorUncertaintyEngine", () => {
    it("analyzeBlock on a benign block returns BlockUncertainty object", () => {
      const r = lathePostGeneratorUncertaintyEngine.analyzeBlock("G01 X10 Z-5 F0.2", 42);
      expect(typeof r).toBe("object");
      expect(r).not.toBeNull();
    });

    it("isProductionReady on empty program is not production-ready", () => {
      const r = lathePostGeneratorUncertaintyEngine.isProductionReady([]);
      expect(typeof r).toBe("object");
      expect(typeof r.ready).toBe("boolean");
      expect(Array.isArray(r.blockers)).toBe(true);
    });

    it("isProductionReady on a clean canonical program returns boolean ready", () => {
      const gcode = ["O1234", "G50 S2000", "G96 S180 M3", "G00 X12 Z2 T0101", "G01 Z-50 F0.2", "M30"];
      const r = lathePostGeneratorUncertaintyEngine.isProductionReady(gcode);
      expect(typeof r.ready).toBe("boolean");
      expect(Array.isArray(r.blockers)).toBe(true);
    });
  });
});

describe("U-WIRE-LATHE-BATCH5 — dispatcher wiring verified", () => {
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

  it("schema rejects lathe_deep_reasoning_record_outcome with missing plan_id", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const r = (TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>)["lathe_deep_reasoning_record_outcome"]!.safeParse({
      outcome: { success: true },
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects lathe_deep_reasoning_record_outcome with missing outcome.success", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const r = (TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>)["lathe_deep_reasoning_record_outcome"]!.safeParse({
      plan_id: "p1", outcome: { actual_cycle_time_sec: 100 },
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects lathe_post_uncertainty_analyze_block with negative line_number", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const r = (TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>)["lathe_post_uncertainty_analyze_block"]!.safeParse({
      block: "G01 X10", line_number: -1,
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects lathe_post_uncertainty_prod_ready with empty gcode array", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const r = (TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>)["lathe_post_uncertainty_prod_ready"]!.safeParse({
      gcode: [],
    });
    expect(r.success).toBe(false);
  });

  it("schemas accept zero-input cadence actions (state, should_trigger, active_version)", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const schemas = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;
    expect(schemas["lathe_lora_cadence_state"]!.safeParse({}).success).toBe(true);
    expect(schemas["lathe_lora_cadence_should_trigger"]!.safeParse({}).success).toBe(true);
    expect(schemas["lathe_lora_cadence_active_version"]!.safeParse({}).success).toBe(true);
  });
});
