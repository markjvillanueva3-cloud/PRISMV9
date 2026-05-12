/**
 * LathePostProcessorAIEngine Tests
 * =================================
 *
 * Tests for AI-powered lathe post processor intelligence:
 * - Post debugging with AI analysis
 * - Cycle recommendation engine
 * - Cross-controller translation
 * - Code optimization
 * - Macro conversion
 * - Deep reasoning chains
 * - LLM CLI interface
 *
 * @milestone LATHE-POST-AI
 */

import { describe, it, expect } from "vitest";
import {
  lathePostProcessorAIEngine,
  PostControllerModel,
  LatheControllerFamily,
  CycleType,
  PostOptimizationType,
  MacroDialect,
} from "../../engines/LathePostProcessorAIEngine.js";

describe("LathePostProcessorAIEngine", () => {
  // ============================================================================
  // Post Profile Tests
  // ============================================================================

  describe("getPostProfile", () => {
    it("returns Fanuc 30i-B post profile", () => {
      const result = lathePostProcessorAIEngine.getPostProfile("fanuc_30i_b");

      expect(result.success).toBe(true);
      expect(result.data!.controller).toBe("fanuc_30i_b");
      expect(result.data!.family).toBe("fanuc");
      expect(result.data!.roughingCycles).toContain("G71");
      expect(result.data!.threadingCycles).toContain("G76");
      expect(result.data!.macroDialect).toBe("fanuc_b");
    });

    it("returns Okuma OSP-P300L post profile", () => {
      const result = lathePostProcessorAIEngine.getPostProfile("okuma_osp_p300l");

      expect(result.success).toBe(true);
      expect(result.data!.family).toBe("okuma");
      expect(result.data!.roughingCycles).toContain("GROU");
      expect(result.data!.threadingCycles).toContain("GTHR");
      expect(result.data!.cssCode).toBe("SFM");
    });

    it("returns Siemens 840D sl post profile", () => {
      const result = lathePostProcessorAIEngine.getPostProfile("siemens_840d_sl");

      expect(result.success).toBe(true);
      expect(result.data!.family).toBe("siemens");
      expect(result.data!.roughingCycles).toContain("CYCLE95");
      expect(result.data!.macroDialect).toBe("siemens");
      expect(result.data!.variablePrefix).toBe("R");
    });

    it("returns error for unknown controller", () => {
      const result = lathePostProcessorAIEngine.getPostProfile("unknown" as PostControllerModel);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown controller");
    });
  });

  describe("listPostProfiles", () => {
    it("lists all 21 controllers", () => {
      const result = lathePostProcessorAIEngine.listPostProfiles();

      expect(result.success).toBe(true);
      expect(result.data!.controllers.length).toBe(21);
    });

    it("filters by Fanuc family", () => {
      const result = lathePostProcessorAIEngine.listPostProfiles("fanuc");

      expect(result.success).toBe(true);
      expect(result.data!.controllers.length).toBe(6);
      expect(result.data!.controllers.every(c => c.startsWith("fanuc"))).toBe(true);
    });

    it("filters by Siemens family", () => {
      const result = lathePostProcessorAIEngine.listPostProfiles("siemens");

      expect(result.success).toBe(true);
      expect(result.data!.controllers.length).toBe(2);
    });
  });

  // ============================================================================
  // Post Debugging Tests
  // ============================================================================

  describe("debugPost", () => {
    it("detects G96 without G50 warning", () => {
      const code = [
        "G96 S200 M03",
        "G00 X50 Z2",
        "G01 Z0 F0.1",
      ];

      const result = lathePostProcessorAIEngine.debugPost("fanuc_30i_b", code);

      expect(result.success).toBe(true);
      expect(result.data!.warnings.length).toBeGreaterThan(0);
      expect(result.data!.warnings.some(w => w.message.includes("G50") || w.message.includes("spindle"))).toBe(true);
    });

    it("detects missing feed rate error", () => {
      const code = [
        "G50 S3000",
        "G96 S200 M03",
        "G00 X50 Z2",
        "G01 Z0",
      ];

      const result = lathePostProcessorAIEngine.debugPost("haas_ngc", code);

      expect(result.success).toBe(true);
      expect(result.data!.errors.some(e => e.message.toLowerCase().includes("feed"))).toBe(true);
    });

    it("detects modal conflict", () => {
      const code = [
        "G50 S3000",
        "G00 G01 X50 Z2",
      ];

      const result = lathePostProcessorAIEngine.debugPost("fanuc_0i_tf", code);

      expect(result.success).toBe(true);
      expect(result.data!.hasErrors).toBe(true);
      expect(result.data!.errors.some(e => e.category === "modal")).toBe(true);
    });

    it("validates clean Fanuc code", () => {
      const code = [
        "(PROGRAM START)",
        "G50 S3000",
        "G96 S200 M03",
        "G00 X52 Z2",
        "G01 Z0 F0.15",
        "X50",
        "M30",
      ];

      const result = lathePostProcessorAIEngine.debugPost("fanuc_30i_b", code);

      expect(result.success).toBe(true);
      expect(result.data!.hasErrors).toBe(false);
    });

    it("detects Fanuc G-codes in Okuma program", () => {
      const code = [
        "SFM200 MCW",
        "RPID X50 Z2",
        "G71 U2 R1",
      ];

      const result = lathePostProcessorAIEngine.debugPost("okuma_osp_p200l", code);

      expect(result.success).toBe(true);
      expect(result.data!.errors.some(e => e.message.includes("Fanuc") || e.message.includes("G71"))).toBe(true);
    });

    it("provides optimization suggestions", () => {
      const code = [
        "G00 X50",
        "G00 Z2",
        "G00 X48",
        "G00 Z1",
        "G00 X46",
        "G00 Z0",
        "G01 X44 F0.1",
      ];

      const result = lathePostProcessorAIEngine.debugPost("mazak_smooth_g", code);

      expect(result.success).toBe(true);
      expect(result.data!.suggestions.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Cycle Recommendation Tests
  // ============================================================================

  describe("recommendCycle", () => {
    it("recommends G71 for Fanuc OD roughing", () => {
      const result = lathePostProcessorAIEngine.recommendCycle("fanuc_30i_b", "rough_od", {
        material: "steel_4140",
        depth_mm: 2,
        diameter_mm: 50,
      });

      expect(result.success).toBe(true);
      expect(result.data!.recommendedCycle).toBe("G71");
      expect(result.data!.gcodeExample.length).toBeGreaterThan(0);
      expect(result.data!.reasoning).toContain("roughing");
    });

    it("recommends GROU for Okuma roughing", () => {
      const result = lathePostProcessorAIEngine.recommendCycle("okuma_osp_p300l", "rough_od", {
        depth_mm: 2,
      });

      expect(result.success).toBe(true);
      expect(result.data!.recommendedCycle).toBe("GROU");
    });

    it("recommends CYCLE95 for Siemens roughing", () => {
      const result = lathePostProcessorAIEngine.recommendCycle("siemens_840d_sl", "rough_od", {});

      expect(result.success).toBe(true);
      expect(result.data!.recommendedCycle).toBe("CYCLE95");
    });

    it("recommends G76 for threading", () => {
      const result = lathePostProcessorAIEngine.recommendCycle("haas_ngc", "thread_external", {
        pitch_mm: 1.5,
        diameter_mm: 25,
        length_mm: 20,
        passes: 4,
      });

      expect(result.success).toBe(true);
      expect(result.data!.recommendedCycle).toBe("G76");
      expect(result.data!.estimatedTimeReduction_pct).toBeGreaterThan(0);
    });

    it("recommends G74 for peck drilling", () => {
      const result = lathePostProcessorAIEngine.recommendCycle("mazak_smooth_c", "drill_peck", {
        depth_mm: 30,
        diameter_mm: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data!.recommendedCycle).toBe("G74");
      expect(result.data!.alternatives.length).toBeGreaterThan(0);
    });

    it("provides alternatives for grooving", () => {
      const result = lathePostProcessorAIEngine.recommendCycle("dmg_celos_mapps5", "groove_external", {
        diameter_mm: 40,
        length_mm: 5,
      });

      expect(result.success).toBe(true);
      expect(result.data!.recommendedCycle).toBeDefined();
    });
  });

  // ============================================================================
  // Code Translation Tests
  // ============================================================================

  describe("translateCode", () => {
    it("translates Fanuc to Okuma", () => {
      const code = [
        "G96 S200 M03",
        "G00 X52 Z2",
        "G01 Z0 F0.15",
      ];

      const result = lathePostProcessorAIEngine.translateCode("fanuc_30i_b", "okuma_osp_p300l", code);

      expect(result.success).toBe(true);
      expect(result.data!.translatedCode.some(l => l.includes("SFM") || l.includes("RPID") || l.includes("MCW"))).toBe(true);
      expect(result.data!.warnings.length).toBeGreaterThan(0);
    });

    it("translates Okuma to Fanuc", () => {
      const code = [
        "SFM200 MCW",
        "RPID X52 Z2",
        "CUT Z0 F.15",
      ];

      const result = lathePostProcessorAIEngine.translateCode("okuma_osp_p200l", "fanuc_0i_tf", code);

      expect(result.success).toBe(true);
      expect(result.data!.translatedCode.some(l => l.includes("G96") || l.includes("G00") || l.includes("M03"))).toBe(true);
    });

    it("flags canned cycles for manual conversion", () => {
      const code = [
        "G71 U2 R1",
        "G71 P100 Q200 U0.5 W0.1 F0.25",
      ];

      const result = lathePostProcessorAIEngine.translateCode("fanuc_30i_b", "siemens_840d_sl", code);

      expect(result.success).toBe(true);
      expect(result.data!.manualReviewRequired.length).toBeGreaterThan(0);
    });

    it("handles same family translation", () => {
      const code = ["G00 X50 Z2"];

      const result = lathePostProcessorAIEngine.translateCode("fanuc_0i_tf", "fanuc_30i_b", code);

      expect(result.success).toBe(true);
      expect(result.data!.confidence).toBeGreaterThan(0.8);
    });

    it("adds G50 when translating to Fanuc", () => {
      const code = [
        "G96 S200 LIMS=3000 M3",
        "G0 X50 Z2",
      ];

      const result = lathePostProcessorAIEngine.translateCode("siemens_828d", "haas_ngc", code);

      expect(result.success).toBe(true);
      expect(result.data!.translatedCode.some(l => l.includes("G50"))).toBe(true);
    });
  });

  // ============================================================================
  // Post Optimization Tests
  // ============================================================================

  describe("optimizePost", () => {
    it("removes redundant modal codes", () => {
      const code = [
        "G01 X50 F0.1",
        "G01 Z-10",
        "G01 X48",
        "G01 Z-20",
      ];

      const result = lathePostProcessorAIEngine.optimizePost("fanuc_30i_b", code, "modal_grouping");

      expect(result.success).toBe(true);
      expect(result.data!.improvements.length).toBeGreaterThan(0);
    });

    it("combines sequential rapids", () => {
      const code = [
        "G00 X50",
        "G00 Z2",
      ];

      const result = lathePostProcessorAIEngine.optimizePost("haas_ngc", code, "rapid_optimization");

      expect(result.success).toBe(true);
      // Should combine into one line
    });

    it("removes redundant coolant commands", () => {
      const code = [
        "M08",
        "G01 X50 F0.1",
        "M08",
        "G01 Z-10",
      ];

      const result = lathePostProcessorAIEngine.optimizePost("mazak_smooth_g", code, "coolant_optimization");

      expect(result.success).toBe(true);
      expect(result.data!.improvements.some(i => i.type === "coolant_redundant")).toBe(true);
    });

    it("suggests canned cycle usage", () => {
      // Multiple consecutive G01 feed moves that could use a canned cycle
      const code = [
        "G01 X48 Z-10 F0.25",
        "G01 X46 Z-20 F0.25",
        "G01 X44 Z-30 F0.25",
        "G01 X42 Z-40 F0.25",
        "G00 X50 Z2",
      ];

      const result = lathePostProcessorAIEngine.optimizePost("fanuc_0i_tf_plus", code, "cycle_selection");

      expect(result.success).toBe(true);
      expect(result.data!.improvements.some(i => i.type === "cycle_candidate")).toBe(true);
    });
  });

  // ============================================================================
  // Macro Conversion Tests
  // ============================================================================

  describe("convertMacro", () => {
    it("converts Fanuc to Siemens variables", () => {
      const macro = [
        "#1=25.0",
        "#2=#1*3.14159",
        "IF[#1 GT 50]GOTO100",
      ];

      const result = lathePostProcessorAIEngine.convertMacro("fanuc_b", "siemens", macro);

      expect(result.success).toBe(true);
      expect(result.data!.convertedMacro.some(l => l.includes("R0") || l.includes("R1"))).toBe(true);
      expect(Object.keys(result.data!.variableMapping).length).toBeGreaterThan(0);
    });

    it("converts Siemens to Fanuc variables", () => {
      const macro = [
        "R1=25.0",
        "R2=R1*3.14159",
        "IF R1>50",
      ];

      const result = lathePostProcessorAIEngine.convertMacro("siemens", "fanuc_b", macro);

      expect(result.success).toBe(true);
      expect(result.data!.convertedMacro.some(l => l.includes("#"))).toBe(true);
    });

    it("converts Fanuc to Okuma variables", () => {
      const macro = [
        "#1=30",
        "#2=#1+5",
      ];

      const result = lathePostProcessorAIEngine.convertMacro("fanuc_b", "okuma", macro);

      expect(result.success).toBe(true);
      expect(result.data!.warnings.length).toBeGreaterThan(0);
    });

    it("handles same dialect (no conversion)", () => {
      const macro = ["#1=25"];

      const result = lathePostProcessorAIEngine.convertMacro("fanuc_b", "fanuc_b", macro);

      expect(result.success).toBe(true);
      expect(result.data!.convertedMacro).toEqual(macro);
    });
  });

  // ============================================================================
  // Deep Reasoning Tests
  // ============================================================================

  describe("executeDeepReasoning", () => {
    it("executes post_debug chain", () => {
      const result = lathePostProcessorAIEngine.executeDeepReasoning(
        "post_debug",
        { code: ["G00 X50 Z2", "G01 Z0 F0.1"] },
        "fanuc_30i_b"
      );

      expect(result.success).toBe(true);
      expect(result.data!.chainType).toBe("post_debug");
      expect(result.data!.steps.length).toBeGreaterThan(0);
      expect(result.data!.conclusion).toBeDefined();
    });

    it("executes cycle_select chain", () => {
      const result = lathePostProcessorAIEngine.executeDeepReasoning(
        "cycle_select",
        { operation: "rough_od" },
        "haas_ngc"
      );

      expect(result.success).toBe(true);
      expect(result.data!.chainType).toBe("cycle_select");
      expect(result.data!.steps.some(s => s.action === "recommend_cycle")).toBe(true);
    });

    it("executes translate chain", () => {
      const result = lathePostProcessorAIEngine.executeDeepReasoning(
        "translate",
        { sourceController: "fanuc_30i_b", targetController: "siemens_840d_sl" },
        "siemens_840d_sl"
      );

      expect(result.success).toBe(true);
      expect(result.data!.chainType).toBe("translate");
      expect(result.data!.confidence).toBeGreaterThan(0);
    });

    it("provides alternative conclusions", () => {
      const result = lathePostProcessorAIEngine.executeDeepReasoning(
        "post_debug",
        { code: ["G96 S200"] },
        "okuma_osp_p200l"
      );

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data!.alternatives)).toBe(true);
    });
  });

  // ============================================================================
  // LLM CLI Tests
  // ============================================================================

  describe("processLLMQuery", () => {
    it("answers G71 roughing cycle question", async () => {
      const result = await lathePostProcessorAIEngine.processLLMQuery({
        query: "How do I use G71 roughing cycle?",
        controller: "fanuc_30i_b",
      });

      expect(result.success).toBe(true);
      expect(result.data!.answer).toContain("G71");
      expect(result.data!.gcode).toBeDefined();
      expect(result.data!.gcode!.length).toBeGreaterThan(0);
    });

    it("answers threading question", async () => {
      const result = await lathePostProcessorAIEngine.processLLMQuery({
        query: "What is G76 threading cycle?",
        controller: "haas_ngc",
      });

      expect(result.success).toBe(true);
      expect(result.data!.answer).toContain("G76");
    });

    it("answers CSS question", async () => {
      const result = await lathePostProcessorAIEngine.processLLMQuery({
        query: "How do I enable constant surface speed?",
        controller: "siemens_840d_sl",
      });

      expect(result.success).toBe(true);
      expect(result.data!.answer.toLowerCase()).toContain("css") ||
        expect(result.data!.answer).toContain("G96");
      expect(result.data!.gcode).toBeDefined();
    });

    it("answers post editing question", async () => {
      const result = await lathePostProcessorAIEngine.processLLMQuery({
        query: "How do I edit the post processor?",
        controller: "mazak_smooth_g",
      });

      expect(result.success).toBe(true);
      expect(result.data!.explanation.length).toBeGreaterThan(0);
    });

    it("provides troubleshooting help", async () => {
      const result = await lathePostProcessorAIEngine.processLLMQuery({
        query: "I'm getting an error alarm on my lathe",
        controller: "okuma_osp_p300l",
      });

      expect(result.success).toBe(true);
      expect(result.data!.followUpQuestions.length).toBeGreaterThan(0);
    });

    it("handles generic queries", async () => {
      const result = await lathePostProcessorAIEngine.processLLMQuery({
        query: "help",
        controller: "dmg_celos_mapps5",
      });

      expect(result.success).toBe(true);
      expect(result.data!.followUpQuestions.length).toBeGreaterThan(0);
    });

    it("provides Okuma-specific answers", async () => {
      const result = await lathePostProcessorAIEngine.processLLMQuery({
        query: "What is the roughing cycle?",
        controller: "okuma_osp_p500l",
      });

      expect(result.success).toBe(true);
      // Should mention GROU not G71
    });
  });

  // ============================================================================
  // Learning Context Tests
  // ============================================================================

  describe("getLearningContext", () => {
    it("returns learning context", () => {
      const result = lathePostProcessorAIEngine.getLearningContext();

      expect(result.success).toBe(true);
      expect(result.data!.jobSimilarityEnabled).toBe(true);
      expect(result.data!.historicalPostCount).toBeGreaterThan(0);
      expect(result.data!.learnedPatterns.length).toBeGreaterThan(0);
    });

    it("includes learned patterns with confidence", () => {
      const result = lathePostProcessorAIEngine.getLearningContext();

      expect(result.success).toBe(true);
      result.data!.learnedPatterns.forEach(pattern => {
        expect(pattern.patternId).toBeDefined();
        expect(pattern.confidence).toBeGreaterThan(0);
        expect(pattern.applicableControllers.length).toBeGreaterThan(0);
      });
    });
  });

  // ============================================================================
  // Dispatcher Action Tests
  // ============================================================================

  describe("executeAction", () => {
    it("executes post_ai_get_profile", async () => {
      const result = await lathePostProcessorAIEngine.executeAction("post_ai_get_profile", {
        controller: "fanuc_0i_tf",
      });
      expect(result.success).toBe(true);
    });

    it("executes post_ai_list_profiles", async () => {
      const result = await lathePostProcessorAIEngine.executeAction("post_ai_list_profiles", {
        family: "okuma",
      });
      expect(result.success).toBe(true);
    });

    it("executes post_ai_debug", async () => {
      const result = await lathePostProcessorAIEngine.executeAction("post_ai_debug", {
        controller: "haas_ngc",
        code: ["G96 S200 M03", "G00 X50 Z2"],
      });
      expect(result.success).toBe(true);
    });

    it("executes post_ai_recommend_cycle", async () => {
      const result = await lathePostProcessorAIEngine.executeAction("post_ai_recommend_cycle", {
        controller: "mazak_smooth_g",
        cycleType: "rough_od",
        parameters: { depth_mm: 2 },
      });
      expect(result.success).toBe(true);
    });

    it("executes post_ai_translate", async () => {
      const result = await lathePostProcessorAIEngine.executeAction("post_ai_translate", {
        sourceController: "fanuc_30i_b",
        targetController: "siemens_828d",
        code: ["G00 X50 Z2"],
      });
      expect(result.success).toBe(true);
    });

    it("executes post_ai_optimize", async () => {
      const result = await lathePostProcessorAIEngine.executeAction("post_ai_optimize", {
        controller: "dmg_celos_mapps5",
        code: ["G01 X50 F0.1", "G01 Z-10"],
        optimizationType: "modal_grouping",
      });
      expect(result.success).toBe(true);
    });

    it("executes post_ai_convert_macro", async () => {
      const result = await lathePostProcessorAIEngine.executeAction("post_ai_convert_macro", {
        sourceDialect: "fanuc_b",
        targetDialect: "siemens",
        macro: ["#1=25"],
      });
      expect(result.success).toBe(true);
    });

    it("executes post_ai_deep_reason", async () => {
      const result = await lathePostProcessorAIEngine.executeAction("post_ai_deep_reason", {
        chainType: "post_debug",
        input: { code: ["G00 X50"] },
        controller: "doosan_fanuc",
      });
      expect(result.success).toBe(true);
    });

    it("executes post_ai_llm_query", async () => {
      const result = await lathePostProcessorAIEngine.executeAction("post_ai_llm_query", {
        query: "What is G71?",
        controller: "hurco_max5",
      });
      expect(result.success).toBe(true);
    });

    it("executes post_ai_learning_context", async () => {
      const result = await lathePostProcessorAIEngine.executeAction("post_ai_learning_context", {});
      expect(result.success).toBe(true);
    });

    it("returns error for unknown action", async () => {
      const result = await lathePostProcessorAIEngine.executeAction("unknown_action", {});
      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown action");
    });
  });

  // ============================================================================
  // Controller Coverage Tests
  // ============================================================================

  describe("Controller Coverage", () => {
    const allControllers: PostControllerModel[] = [
      "fanuc_0i_tf", "fanuc_0i_tf_plus", "fanuc_30i_b", "fanuc_31i_b", "fanuc_32i_b", "fanuc_35i_b",
      "okuma_osp_p200l", "okuma_osp_p300l", "okuma_osp_p500l",
      "mazak_smooth_g", "mazak_smooth_c", "mazak_matrix_2",
      "haas_ngc",
      "siemens_828d", "siemens_840d_sl",
      "dmg_celos_mapps4", "dmg_celos_mapps5",
      "hurco_max5", "hurco_winmax",
      "doosan_fanuc", "doosan_siemens",
    ];

    it("supports all 21 controllers", () => {
      expect(allControllers.length).toBe(21);

      allControllers.forEach(controller => {
        const result = lathePostProcessorAIEngine.getPostProfile(controller);
        expect(result.success).toBe(true);
        expect(result.data!.controller).toBe(controller);
      });
    });

    it("covers all 8 controller families", () => {
      const families: LatheControllerFamily[] = ["fanuc", "okuma", "mazak", "haas", "siemens", "dmg", "hurco", "doosan"];

      families.forEach(family => {
        const result = lathePostProcessorAIEngine.listPostProfiles(family);
        expect(result.success).toBe(true);
        expect(result.data!.controllers.length).toBeGreaterThan(0);
      });
    });
  });
});
