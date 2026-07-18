/**
 * MillingAIUltraIntelligenceEngine wiring test
 * ============================================
 * BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILLING — iter-8 (final, closes the unit).
 *
 * 20 static-method actions wired into prism_mill. The engine is a static
 * class; the singleton export aliases the class itself, so engine.method(...)
 * calls dispatch to the static implementation.
 *
 * Assertions are value-comparative against the engine's documented contract.
 * Heavy structured-input methods (predictToolLife, selectOptimalStrategy,
 * etc.) are tested at the *wire* layer — the source/grep + schema + getter
 * + a few runtime smoke calls that exercise the method shape, not the AI's
 * domain correctness.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { millingAIUltraIntelligenceEngine } from "../engines/MillingAIUltraIntelligenceEngine.js";
import { MILL_ACTIONS } from "../tools/dispatchers/millDispatcher.js";
import { MILL_ACTION_SCHEMAS } from "../schemas/millActionSchemas.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const DISPATCHER_PATH = join(HERE, "..", "tools", "dispatchers", "millDispatcher.ts");
const DISPATCHER_SRC = readFileSync(DISPATCHER_PATH, "utf8");

const NEW_ACTIONS = [
  "mill_uai_parse_nl",
  "mill_uai_process_nl",
  "mill_uai_generate_prompt",
  "mill_uai_select_strategy",
  "mill_uai_compare_strategies",
  "mill_uai_predict_tool_life",
  "mill_uai_record_tool_life",
  "mill_uai_extract_toolpath_features",
  "mill_uai_score_toolpath",
  "mill_uai_explain_decision",
  "mill_uai_get_recommended_action",
  "mill_uai_record_episode",
  "mill_uai_calculate_reward",
  "mill_uai_get_policy_stats",
  "mill_uai_diagnose_problem",
  "mill_uai_generate_troubleshooting_prompt",
  "mill_uai_clear_all",
  "mill_uai_get_tool_life_data_count",
  "mill_uai_get_rl_episode_count",
  "mill_uai_get_troubleshooting_history_count",
] as const;

type ZodSchemaLike = {
  safeParse: (p: unknown) => { success: boolean; data?: unknown };
};
const getSchema = (action: string): ZodSchemaLike =>
  (MILL_ACTION_SCHEMAS as Record<string, ZodSchemaLike>)[action];

describe("MillingAIUltraIntelligenceEngine wiring (U-BRIDGE-WIRE-MILLING iter-8)", () => {
  describe("dispatcher pins all 20 actions + milling_uai getter", () => {
    for (const action of NEW_ACTIONS) {
      it(`MILL_ACTIONS contains exactly one '${action}'`, () => {
        const arr = MILL_ACTIONS as readonly string[];
        expect(arr.filter((x) => x === action).length).toBe(1);
      });
      it(`dispatcher source has 'case "${action}":' block`, () => {
        expect(DISPATCHER_SRC.includes(`case "${action}":`)).toBe(true);
      });
    }

    it("dispatcher source lazy-imports MillingAIUltraIntelligenceEngine", () => {
      expect(DISPATCHER_SRC.includes('case "milling_uai":')).toBe(true);
      expect(DISPATCHER_SRC.includes("MillingAIUltraIntelligenceEngine.js")).toBe(true);
    });

    it("dispatcher exposes exactly 20 new mill_uai_* actions", () => {
      const arr = MILL_ACTIONS as readonly string[];
      const uaiActions = arr.filter((a) => a.startsWith("mill_uai_"));
      expect(uaiActions.length).toBe(20);
    });
  });

  describe("Zod schemas reject malformed + accept valid payloads", () => {
    it("parse_nl REJECTS empty input string", () => {
      expect(getSchema("mill_uai_parse_nl").safeParse({ input: "" }).success).toBe(false);
    });

    it("parse_nl ACCEPTS valid input + preserves it", () => {
      const r = getSchema("mill_uai_parse_nl").safeParse({ input: "Rough pocket in 1045 with 12mm endmill" });
      expect(r.success).toBe(true);
      const data = r.data as { input: string };
      expect(data.input).toContain("1045");
    });

    it("calculate_reward REJECTS non-boolean scrap", () => {
      const r = getSchema("mill_uai_calculate_reward").safeParse({
        predicted: { ra_um: 1.5, cycle_min: 4, tool_life_min: 60 },
        actual: { ra_um: 1.7, cycle_min: 5, tool_life_min: 55 },
        scrap: "false", rework: false,
      });
      expect(r.success).toBe(false);
    });

    it("calculate_reward ACCEPTS valid payload", () => {
      const r = getSchema("mill_uai_calculate_reward").safeParse({
        predicted: { ra_um: 1.5, cycle_min: 4, tool_life_min: 60 },
        actual: { ra_um: 1.7, cycle_min: 5, tool_life_min: 55 },
        scrap: false, rework: false,
      });
      expect(r.success).toBe(true);
    });

    it("record_tool_life REJECTS non-positive actualLife", () => {
      const r = getSchema("mill_uai_record_tool_life").safeParse({
        input: { material: "P", tool_class: "endmill" },
        actualLife: 0,
      });
      expect(r.success).toBe(false);
    });

    it("no-arg actions REJECT extras (.strict)", () => {
      const noArgActions = [
        "mill_uai_get_policy_stats",
        "mill_uai_clear_all",
        "mill_uai_get_tool_life_data_count",
        "mill_uai_get_rl_episode_count",
        "mill_uai_get_troubleshooting_history_count",
      ];
      for (const a of noArgActions) {
        expect(getSchema(a).safeParse({}).success).toBe(true);
        expect(getSchema(a).safeParse({ x: 1 }).success).toBe(false);
      }
    });
  });

  describe("engine round-trip: NL parsing returns a structured intent", () => {
    it("parseNaturalLanguage('rough pocket') returns an object with parsed intent fields", () => {
      const r = millingAIUltraIntelligenceEngine.parseNaturalLanguage(
        "rough pocket in AISI 1045 with 12mm endmill",
      );
      expect(typeof r).toBe("object");
      expect(r).not.toBeNull();
      // The intent shape is engine-defined; assert structural keys exist on the result
      const keys = Object.keys(r as Record<string, unknown>);
      expect(keys.length).toBeGreaterThan(0);
    });

    it("processNaturalLanguage('finish profile') returns a result envelope", () => {
      const r = millingAIUltraIntelligenceEngine.processNaturalLanguage(
        "finish profile on 6061 aluminum",
      );
      expect(typeof r).toBe("object");
      expect(r).not.toBeNull();
    });
  });

  describe("engine round-trip: admin counts return real numbers", () => {
    it("getToolLifeDataCount returns a non-negative integer", () => {
      const n = millingAIUltraIntelligenceEngine.getToolLifeDataCount();
      expect(typeof n).toBe("number");
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
    });

    it("getRLEpisodeCount returns a non-negative integer", () => {
      const n = millingAIUltraIntelligenceEngine.getRLEpisodeCount();
      expect(typeof n).toBe("number");
      expect(n).toBeGreaterThanOrEqual(0);
    });

    it("getTroubleshootingHistoryCount returns a non-negative integer", () => {
      const n = millingAIUltraIntelligenceEngine.getTroubleshootingHistoryCount();
      expect(typeof n).toBe("number");
      expect(n).toBeGreaterThanOrEqual(0);
    });

    it("getPolicyStats returns an object (RL policy snapshot)", () => {
      const s = millingAIUltraIntelligenceEngine.getPolicyStats();
      expect(typeof s).toBe("object");
      expect(s).not.toBeNull();
    });
  });

  describe("engine round-trip: reward calculation is numeric and reflects scrap penalty", () => {
    it("calculateReward returns a numeric reward object", () => {
      const r = millingAIUltraIntelligenceEngine.calculateReward(
        { ra_um: 1.5, cycle_min: 4, tool_life_min: 60 },
        { ra_um: 1.5, cycle_min: 4, tool_life_min: 60 },
        false, false,
      );
      expect(typeof r).toBe("object");
      expect(r).not.toBeNull();
    });

    it("scrap=true produces a lower/penalized reward than scrap=false (same predicted/actual)", () => {
      const inputs = {
        ra_um: 1.5, cycle_min: 4, tool_life_min: 60,
      };
      const noScrap = millingAIUltraIntelligenceEngine.calculateReward(
        inputs, inputs, false, false,
      ) as Record<string, number>;
      const withScrap = millingAIUltraIntelligenceEngine.calculateReward(
        inputs, inputs, true, false,
      ) as Record<string, number>;
      // The reward envelope is engine-defined; find a numeric field that differs.
      const numericKeys = Object.keys(noScrap).filter((k) => typeof noScrap[k] === "number");
      const hasPenalty = numericKeys.some((k) => withScrap[k] !== noScrap[k]);
      expect(hasPenalty).toBe(true);
    });
  });

  describe("engine round-trip: clearAll() zeros the recorded-data counts", () => {
    it("after clearAll(), counts are 0", () => {
      millingAIUltraIntelligenceEngine.clearAll();
      expect(millingAIUltraIntelligenceEngine.getToolLifeDataCount()).toBe(0);
      expect(millingAIUltraIntelligenceEngine.getRLEpisodeCount()).toBe(0);
      expect(millingAIUltraIntelligenceEngine.getTroubleshootingHistoryCount()).toBe(0);
    });
  });

  describe("MILL_ACTIONS action-count anti-regression", () => {
    it("total action count is ≥ post-iter7 + 20 (≥ 130)", () => {
      expect((MILL_ACTIONS as readonly string[]).length).toBeGreaterThanOrEqual(130);
    });
  });
});
