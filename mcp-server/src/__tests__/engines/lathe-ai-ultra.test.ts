/**
 * LatheAIUltraEngine Tests
 * ========================
 *
 * Tests for Claude Opus-level intelligence for all lathe CNCs:
 * - 22 controller models across 8 families
 * - 4 programming modes (hard_code, macro, conversational, cam_toolpath)
 * - Deep reasoning chains
 * - LLM CLI interface
 * - Post processor profiles
 *
 * @milestone LATHE-AI-ULTRA
 */

import { describe, it, expect } from "vitest";
import {
  latheAIUltraEngine,
  LatheControllerModel,
  LatheControllerFamily,
} from "../../engines/LatheAIUltraEngine.js";

describe("LatheAIUltraEngine", () => {
  // ============================================================================
  // Controller Intelligence Tests
  // ============================================================================

  describe("getControllerCapabilities", () => {
    it("returns capabilities for Fanuc 0i-TF", () => {
      const result = latheAIUltraEngine.getControllerCapabilities("fanuc_0i_tf");

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.controller).toBe("fanuc_0i_tf");
      expect(result.data!.family).toBe("fanuc");
      expect(result.data!.supportsMacro).toBe(true);
      expect(result.data!.macroDialect).toBe("fanuc_b");
      expect(result.data!.supportedCycles).toContain("G71");
    });

    it("returns capabilities for Okuma OSP-P300L", () => {
      const result = latheAIUltraEngine.getControllerCapabilities("okuma_osp_p300l");

      expect(result.success).toBe(true);
      expect(result.data!.family).toBe("okuma");
      expect(result.data!.supportsConversational).toBe(true);
      expect(result.data!.supportsBAxis).toBe(true);
      expect(result.data!.maxAxes).toBe(7);
      expect(result.data!.postExtension).toBe(".min");
    });

    it("returns capabilities for Siemens 840D sl", () => {
      const result = latheAIUltraEngine.getControllerCapabilities("siemens_840d_sl");

      expect(result.success).toBe(true);
      expect(result.data!.family).toBe("siemens");
      expect(result.data!.macroDialect).toBe("siemens");
      expect(result.data!.maxAxes).toBe(31);
      expect(result.data!.supportedCycles).toContain("CYCLE95");
    });

    it("returns capabilities for Mazak SmoothG", () => {
      const result = latheAIUltraEngine.getControllerCapabilities("mazak_smooth_g");

      expect(result.success).toBe(true);
      expect(result.data!.family).toBe("mazak");
      expect(result.data!.lookAheadBlocks).toBe(2500);
      expect(result.data!.memoryMB).toBe(2048);
    });

    it("returns capabilities for Haas NGC", () => {
      const result = latheAIUltraEngine.getControllerCapabilities("haas_ngc");

      expect(result.success).toBe(true);
      expect(result.data!.family).toBe("haas");
      expect(result.data!.macroDialect).toBe("haas");
      expect(result.data!.supportsConversational).toBe(true);
    });

    it("returns capabilities for DMG CELOS MAPPS5", () => {
      const result = latheAIUltraEngine.getControllerCapabilities("dmg_celos_mapps5");

      expect(result.success).toBe(true);
      expect(result.data!.family).toBe("dmg");
      expect(result.data!.maxAxes).toBe(10);
      expect(result.data!.supportsMultiTurret).toBe(true);
    });

    it("returns error for unknown controller", () => {
      const result = latheAIUltraEngine.getControllerCapabilities("unknown_controller" as LatheControllerModel);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown controller");
    });
  });

  describe("listControllers", () => {
    it("lists all controllers when no family specified", () => {
      const result = latheAIUltraEngine.listControllers();

      expect(result.success).toBe(true);
      expect(result.data!.controllers.length).toBe(21);
      expect(result.data!.controllers).toContain("fanuc_0i_tf");
      expect(result.data!.controllers).toContain("okuma_osp_p300l");
      expect(result.data!.controllers).toContain("siemens_840d_sl");
    });

    it("filters controllers by Fanuc family", () => {
      const result = latheAIUltraEngine.listControllers("fanuc");

      expect(result.success).toBe(true);
      expect(result.data!.controllers.length).toBe(6);
      expect(result.data!.controllers.every(c => c.startsWith("fanuc"))).toBe(true);
    });

    it("filters controllers by Okuma family", () => {
      const result = latheAIUltraEngine.listControllers("okuma");

      expect(result.success).toBe(true);
      expect(result.data!.controllers.length).toBe(3);
      expect(result.data!.controllers.every(c => c.startsWith("okuma"))).toBe(true);
    });

    it("returns capabilities for each controller", () => {
      const result = latheAIUltraEngine.listControllers("siemens");

      expect(result.success).toBe(true);
      expect(Object.keys(result.data!.capabilities)).toHaveLength(2);
      expect(result.data!.capabilities["siemens_828d"]).toBeDefined();
      expect(result.data!.capabilities["siemens_840d_sl"]).toBeDefined();
    });
  });

  describe("compareControllers", () => {
    it("compares Fanuc 30i-B vs Okuma OSP-P500L for B-axis work", () => {
      const result = latheAIUltraEngine.compareControllers(
        "fanuc_30i_b",
        "okuma_osp_p500l",
        { needsBAxis: true, needsMultiTurret: true }
      );

      expect(result.success).toBe(true);
      expect(result.data!.recommendation).toBeDefined();
      expect(result.data!.scores).toBeDefined();
      expect(result.data!.comparison.length).toBeGreaterThan(0);
    });

    it("compares basic controllers for simple requirements", () => {
      const result = latheAIUltraEngine.compareControllers(
        "fanuc_0i_tf",
        "haas_ngc",
        { needsCAxis: true, needsMacro: true }
      );

      expect(result.success).toBe(true);
      expect(typeof result.data!.scores["fanuc_0i_tf"]).toBe("number");
      expect(typeof result.data!.scores["haas_ngc"]).toBe("number");
    });

    it("includes reasoning in comparison", () => {
      const result = latheAIUltraEngine.compareControllers(
        "siemens_828d",
        "siemens_840d_sl",
        { needsBAxis: true, programmingMode: "conversational" }
      );

      expect(result.success).toBe(true);
      expect(result.data!.reasoning).toBeDefined();
      expect(result.data!.reasoning.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Hard Code Assistance Tests
  // ============================================================================

  describe("assistHardCode", () => {
    it("generates Fanuc-style roughing code", () => {
      const result = latheAIUltraEngine.assistHardCode("fanuc_30i_b", {
        operation: "od_rough",
        material: "steel_4140",
        toolDiameter_mm: 12.7,
        partDiameter_mm: 50,
        cuttingDepth_mm: 2,
      });

      expect(result.success).toBe(true);
      expect(result.data!.suggestedCode.length).toBeGreaterThan(0);
      expect(result.data!.suggestedCode.some(l => l.includes("G96"))).toBe(true);
      expect(result.data!.suggestedCode.some(l => l.includes("G71"))).toBe(true);
    });

    it("generates Okuma-style code", () => {
      const result = latheAIUltraEngine.assistHardCode("okuma_osp_p300l", {
        operation: "od_rough",
        material: "aluminum",
        toolDiameter_mm: 12.7,
        partDiameter_mm: 75,
      });

      expect(result.success).toBe(true);
      expect(result.data!.suggestedCode.some(l => l.includes("SFM"))).toBe(true);
      expect(result.data!.suggestedCode.some(l => l.includes("GROU"))).toBe(true);
    });

    it("generates Siemens-style code", () => {
      const result = latheAIUltraEngine.assistHardCode("siemens_840d_sl", {
        operation: "od_rough",
        material: "stainless_304",
        toolDiameter_mm: 10,
        partDiameter_mm: 40,
      });

      expect(result.success).toBe(true);
      expect(result.data!.suggestedCode.some(l => l.includes("LIMS"))).toBe(true);
      expect(result.data!.suggestedCode.some(l => l.includes("CYCLE95"))).toBe(true);
    });

    it("includes warnings for deep cuts", () => {
      const result = latheAIUltraEngine.assistHardCode("fanuc_0i_tf", {
        operation: "od_rough",
        material: "titanium",
        toolDiameter_mm: 8,
        partDiameter_mm: 25,
        cuttingDepth_mm: 8,
      });

      expect(result.success).toBe(true);
      expect(result.data!.warnings.length).toBeGreaterThan(0);
      expect(result.data!.warnings.some(w => w.toLowerCase().includes("deep") || w.toLowerCase().includes("chatter"))).toBe(true);
    });

    it("provides optimizations and alternatives", () => {
      const result = latheAIUltraEngine.assistHardCode("mazak_smooth_g", {
        operation: "od_finish",
        material: "brass",
        toolDiameter_mm: 6,
        partDiameter_mm: 30,
      });

      expect(result.success).toBe(true);
      expect(result.data!.optimizations.length).toBeGreaterThan(0);
      expect(result.data!.alternativeApproaches.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Macro Programming Tests
  // ============================================================================

  describe("generateMacroTemplate", () => {
    it("generates Fanuc threading macro", () => {
      const result = latheAIUltraEngine.generateMacroTemplate("fanuc_30i_b", "thread", {
        majorDiameter: 25,
        pitch: 1.5,
        length: 30,
      });

      expect(result.success).toBe(true);
      expect(result.data!.dialect).toBe("fanuc_b");
      expect(result.data!.variables.length).toBeGreaterThan(0);
      expect(result.data!.code.some(l => l.includes("G76"))).toBe(true);
      expect(result.data!.usage).toBeDefined();
    });

    it("generates Siemens threading macro", () => {
      const result = latheAIUltraEngine.generateMacroTemplate("siemens_840d_sl", "thread", {
        majorDiameter: 20,
        pitch: 2,
      });

      expect(result.success).toBe(true);
      expect(result.data!.dialect).toBe("siemens");
      expect(result.data!.variables.some(v => v.symbol.startsWith("R"))).toBe(true);
      expect(result.data!.code.some(l => l.includes("CYCLE97"))).toBe(true);
    });

    it("generates grooving macro", () => {
      const result = latheAIUltraEngine.generateMacroTemplate("haas_ngc", "groove", {
        grooveDia: 40,
        width: 3,
      });

      expect(result.success).toBe(true);
      expect(result.data!.macroName).toContain("GROOVE");
      expect(result.data!.variables.length).toBeGreaterThan(0);
    });

    it("generates taper macro", () => {
      const result = latheAIUltraEngine.generateMacroTemplate("fanuc_0i_tf_plus", "taper", {
        startDia: 50,
        endDia: 40,
        length: 100,
      });

      expect(result.success).toBe(true);
      expect(result.data!.macroName).toContain("TAPER");
      expect(result.data!.code.some(l => l.includes("ATAN") || l.includes("G71"))).toBe(true);
    });

    it("returns error for controller without macro support", () => {
      const result = latheAIUltraEngine.generateMacroTemplate("hurco_max5", "thread", {});

      expect(result.success).toBe(false);
      expect(result.error).toContain("does not support macro");
    });
  });

  // ============================================================================
  // Conversational Programming Tests
  // ============================================================================

  describe("translateConversational", () => {
    it("translates roughing command to Fanuc G-code", () => {
      const result = latheAIUltraEngine.translateConversational(
        "fanuc_30i_b",
        "rough 50mm diameter with 2mm depth of cut"
      );

      expect(result.success).toBe(true);
      expect(result.data!.parsedIntent).toBe("od_roughing");
      expect(result.data!.parameters.diameter).toBe(50);
      expect(result.data!.generatedCode.length).toBeGreaterThan(0);
    });

    it("translates threading command", () => {
      const result = latheAIUltraEngine.translateConversational(
        "haas_ngc",
        "M12x1.5 thread 25mm long"
      );

      expect(result.success).toBe(true);
      expect(result.data!.parsedIntent).toBe("threading");
      expect(result.data!.parameters.majorDia).toBe(12);
      expect(result.data!.parameters.pitch).toBe(1.5);
      expect(result.data!.generatedCode.some(l => l.includes("G76"))).toBe(true);
    });

    it("translates facing command", () => {
      const result = latheAIUltraEngine.translateConversational(
        "okuma_osp_p200l",
        "face the part"
      );

      expect(result.success).toBe(true);
      expect(result.data!.parsedIntent).toBe("facing");
      expect(result.data!.generatedCode.length).toBeGreaterThan(0);
    });

    it("translates drilling command", () => {
      const result = latheAIUltraEngine.translateConversational(
        "mazak_smooth_c",
        "drill 10mm hole 30mm deep"
      );

      expect(result.success).toBe(true);
      expect(result.data!.parsedIntent).toBe("drilling");
      expect(result.data!.parameters.drillDia).toBe(10);
      expect(result.data!.parameters.depth).toBe(30);
      expect(result.data!.generatedCode.some(l => l.includes("G83"))).toBe(true);
    });

    it("translates grooving command", () => {
      const result = latheAIUltraEngine.translateConversational(
        "fanuc_0i_tf",
        "groove the part"
      );

      expect(result.success).toBe(true);
      expect(result.data!.parsedIntent).toBe("grooving");
    });

    it("handles unknown commands gracefully", () => {
      const result = latheAIUltraEngine.translateConversational(
        "siemens_828d",
        "do something weird"
      );

      expect(result.success).toBe(true);
      expect(result.data!.parsedIntent).toBe("unknown");
      expect(result.data!.warnings.length).toBeGreaterThan(0);
    });

    it("uses material context for speed calculation", () => {
      const result = latheAIUltraEngine.translateConversational(
        "fanuc_30i_b",
        "rough the part",
        { material: "aluminum", odMax_mm: 60, length_mm: 100, features: [], tolerances: [] }
      );

      expect(result.success).toBe(true);
      expect(result.data!.generatedCode.some(l => l.includes("300"))).toBe(true); // aluminum SFM
    });
  });

  // ============================================================================
  // CAM Toolpath Recommendation Tests
  // ============================================================================

  describe("recommendCAMStrategy", () => {
    it("recommends roughing strategy with canned cycle", () => {
      const result = latheAIUltraEngine.recommendCAMStrategy("fanuc_30i_b", {
        type: "od_rough",
        material: "steel_4140",
        partDiameter_mm: 50,
      });

      expect(result.success).toBe(true);
      expect(result.data!.strategy).toBe("canned_rough_cycle");
      expect(result.data!.parameters.speed_mMin).toBeGreaterThan(0);
      expect(result.data!.parameters.feed_mmRev).toBeGreaterThan(0);
      expect(result.data!.reasoning).toContain("roughing");
    });

    it("recommends finishing strategy for tight Ra", () => {
      const result = latheAIUltraEngine.recommendCAMStrategy("okuma_osp_p300l", {
        type: "od_finish",
        material: "aluminum",
        partDiameter_mm: 40,
        targetRa_um: 0.8,
      });

      expect(result.success).toBe(true);
      expect(result.data!.strategy).toBe("spring_passes");
      expect(result.data!.parameters.doc_mm).toBeLessThan(0.5);
    });

    it("recommends threading strategy", () => {
      const result = latheAIUltraEngine.recommendCAMStrategy("siemens_840d_sl", {
        type: "thread",
        material: "steel_1018",
        partDiameter_mm: 25,
      });

      expect(result.success).toBe(true);
      expect(result.data!.strategy).toContain("thread");
    });

    it("includes quality prediction", () => {
      const result = latheAIUltraEngine.recommendCAMStrategy("haas_ngc", {
        type: "od_finish",
        material: "brass",
        partDiameter_mm: 30,
        targetRa_um: 1.6,
      });

      expect(result.success).toBe(true);
      expect(result.data!.qualityPrediction).toBeDefined();
      expect(typeof result.data!.qualityPrediction.surfaceRoughness_Ra).toBe("number");
      expect(typeof result.data!.qualityPrediction.confidence).toBe("number");
    });

    it("provides alternative strategies", () => {
      const result = latheAIUltraEngine.recommendCAMStrategy("mazak_smooth_g", {
        type: "od_rough",
        material: "titanium",
        partDiameter_mm: 60,
      });

      expect(result.success).toBe(true);
      expect(result.data!.alternatives.length).toBeGreaterThan(0);
    });

    it("recommends NURBS for contour on capable controller", () => {
      const result = latheAIUltraEngine.recommendCAMStrategy("siemens_840d_sl", {
        type: "contour",
        material: "aluminum",
        partDiameter_mm: 45,
      });

      expect(result.success).toBe(true);
      expect(result.data!.strategy).toBe("nurbs_contour");
    });
  });

  // ============================================================================
  // Deep Reasoning Tests
  // ============================================================================

  describe("executeDeepReasoning", () => {
    it("executes process planning chain", () => {
      const result = latheAIUltraEngine.executeDeepReasoning(
        "process_planning",
        { features: ["od", "thread", "groove"], material: "steel_4140" },
        "fanuc_30i_b"
      );

      expect(result.success).toBe(true);
      expect(result.data!.chainType).toBe("process_planning");
      expect(result.data!.steps.length).toBeGreaterThan(0);
      expect(result.data!.conclusion).toBeDefined();
      expect(result.data!.confidence).toBeGreaterThan(0);
    });

    it("executes troubleshooting chain", () => {
      const result = latheAIUltraEngine.executeDeepReasoning(
        "troubleshooting",
        { issue: "chatter" },
        "okuma_osp_p200l"
      );

      expect(result.success).toBe(true);
      expect(result.data!.chainType).toBe("troubleshooting");
      expect(result.data!.steps.some(s => s.action === "identify_symptoms")).toBe(true);
      expect(result.data!.conclusion.toLowerCase()).toContain("chatter");
    });

    it("includes reasoning steps with confidence", () => {
      const result = latheAIUltraEngine.executeDeepReasoning(
        "process_planning",
        { features: ["face", "bore"] },
        "siemens_828d"
      );

      expect(result.success).toBe(true);
      result.data!.steps.forEach(step => {
        expect(step.stepNumber).toBeGreaterThan(0);
        expect(step.reasoning).toBeDefined();
        expect(step.confidence).toBeGreaterThan(0);
        expect(step.confidence).toBeLessThanOrEqual(1);
      });
    });

    it("provides alternative conclusions", () => {
      const result = latheAIUltraEngine.executeDeepReasoning(
        "process_planning",
        { features: ["od", "id"] },
        "mazak_smooth_c"
      );

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data!.alternativeConclusions)).toBe(true);
    });
  });

  // ============================================================================
  // LLM CLI Interface Tests
  // ============================================================================

  describe("processLLMQuery", () => {
    it("answers question about G96/CSS", async () => {
      const result = await latheAIUltraEngine.processLLMQuery({
        query: "What is G96 constant surface speed?",
        controller: "fanuc_30i_b",
        programmingMode: "hard_code",
      });

      expect(result.success).toBe(true);
      expect(result.data!.answer).toContain("G96");
      expect(result.data!.answer.toLowerCase()).toContain("surface speed") ||
        expect(result.data!.answer.toLowerCase()).toContain("css");
      expect(result.data!.gcode).toBeDefined();
    });

    it("answers question about G71 roughing cycle", async () => {
      const result = await latheAIUltraEngine.processLLMQuery({
        query: "Explain G71 roughing cycle",
        controller: "haas_ngc",
        programmingMode: "hard_code",
      });

      expect(result.success).toBe(true);
      expect(result.data!.answer).toContain("G71");
      expect(result.data!.followUpQuestions.length).toBeGreaterThan(0);
    });

    it("answers question about macro programming", async () => {
      const result = await latheAIUltraEngine.processLLMQuery({
        query: "What is macro programming?",
        controller: "fanuc_0i_tf_plus",
        programmingMode: "macro",
      });

      expect(result.success).toBe(true);
      expect(result.data!.answer.toLowerCase()).toContain("macro") ||
        expect(result.data!.answer.toLowerCase()).toContain("parametric");
      expect(result.data!.gcode).toBeDefined();
    });

    it("provides threading programming help", async () => {
      const result = await latheAIUltraEngine.processLLMQuery({
        query: "How to program a thread?",
        controller: "siemens_840d_sl",
        programmingMode: "hard_code",
      });

      expect(result.success).toBe(true);
      expect(result.data!.answer.toLowerCase()).toContain("thread");
      expect(result.data!.gcode).toBeDefined();
    });

    it("provides troubleshooting assistance", async () => {
      const result = await latheAIUltraEngine.processLLMQuery({
        query: "How do I troubleshoot chatter?",
        controller: "okuma_osp_p300l",
        programmingMode: "hard_code",
      });

      expect(result.success).toBe(true);
      expect(result.data!.confidence).toBeGreaterThan(0);
      expect(result.data!.relatedTopics.length).toBeGreaterThan(0);
    });

    it("handles generic queries with guidance", async () => {
      const result = await latheAIUltraEngine.processLLMQuery({
        query: "help",
        controller: "mazak_matrix_2",
        programmingMode: "conversational",
      });

      expect(result.success).toBe(true);
      expect(result.data!.followUpQuestions.length).toBeGreaterThan(0);
    });

    it("includes sources and related topics", async () => {
      const result = await latheAIUltraEngine.processLLMQuery({
        query: "What is G96?",
        controller: "dmg_celos_mapps5",
        programmingMode: "hard_code",
      });

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data!.sources)).toBe(true);
      expect(Array.isArray(result.data!.relatedTopics)).toBe(true);
    });
  });

  // ============================================================================
  // Post Processor Profile Tests
  // ============================================================================

  describe("getPostProcessorProfile", () => {
    it("returns Fanuc post processor profile", () => {
      const result = latheAIUltraEngine.getPostProcessorProfile("fanuc_30i_b");

      expect(result.success).toBe(true);
      expect(result.data!.controller).toBe("fanuc_30i_b");
      expect(result.data!.name).toContain("FANUC");
      expect(result.data!.lineNumbers).toBe(true);
      expect(result.data!.programStart).toContain("%");
      expect(result.data!.programEnd).toContain("M30");
    });

    it("returns Okuma post processor profile", () => {
      const result = latheAIUltraEngine.getPostProcessorProfile("okuma_osp_p500l");

      expect(result.success).toBe(true);
      expect(result.data!.name).toContain("OKUMA");
      expect(result.data!.lineNumbers).toBe(false);
      expect(result.data!.safeReturnPosition).toContain("RPID");
    });

    it("returns Siemens post processor profile", () => {
      const result = latheAIUltraEngine.getPostProcessorProfile("siemens_840d_sl");

      expect(result.success).toBe(true);
      expect(result.data!.name).toContain("SIEMENS");
      expect(result.data!.programStart.some(l => l.startsWith(";"))).toBe(true);
      expect(result.data!.toolChangeSequence.some(l => l.includes("LIMS"))).toBe(true);
    });

    it("includes special features based on controller capabilities", () => {
      const result = latheAIUltraEngine.getPostProcessorProfile("mazak_smooth_g");

      expect(result.success).toBe(true);
      expect(result.data!.specialFeatures).toContain("C-axis milling");
      expect(result.data!.specialFeatures).toContain("Y-axis milling");
      expect(result.data!.specialFeatures).toContain("Sub-spindle operations");
    });

    it("returns correct decimal places based on format", () => {
      const result5 = latheAIUltraEngine.getPostProcessorProfile("fanuc_30i_b");
      const result3 = latheAIUltraEngine.getPostProcessorProfile("fanuc_35i_b");

      expect(result5.data!.decimalPlaces).toBe(5);
      expect(result3.data!.decimalPlaces).toBe(3);
    });
  });

  // ============================================================================
  // Dispatcher Action Tests
  // ============================================================================

  describe("executeAction", () => {
    it("executes lathe_ultra_get_controller action", async () => {
      const result = await latheAIUltraEngine.executeAction("lathe_ultra_get_controller", {
        controller: "fanuc_0i_tf",
      });

      expect(result.success).toBe(true);
    });

    it("executes lathe_ultra_list_controllers action", async () => {
      const result = await latheAIUltraEngine.executeAction("lathe_ultra_list_controllers", {
        family: "okuma",
      });

      expect(result.success).toBe(true);
    });

    it("executes lathe_ultra_compare_controllers action", async () => {
      const result = await latheAIUltraEngine.executeAction("lathe_ultra_compare_controllers", {
        controller1: "fanuc_30i_b",
        controller2: "siemens_840d_sl",
        requirements: { needsBAxis: true },
      });

      expect(result.success).toBe(true);
    });

    it("executes lathe_ultra_assist_hardcode action", async () => {
      const result = await latheAIUltraEngine.executeAction("lathe_ultra_assist_hardcode", {
        controller: "haas_ngc",
        context: {
          operation: "od_rough",
          material: "aluminum",
          toolDiameter_mm: 12,
          partDiameter_mm: 50,
        },
      });

      expect(result.success).toBe(true);
    });

    it("executes lathe_ultra_generate_macro action", async () => {
      const result = await latheAIUltraEngine.executeAction("lathe_ultra_generate_macro", {
        controller: "fanuc_31i_b",
        macroType: "thread",
        parameters: { majorDia: 20 },
      });

      expect(result.success).toBe(true);
    });

    it("executes lathe_ultra_translate_nl action", async () => {
      const result = await latheAIUltraEngine.executeAction("lathe_ultra_translate_nl", {
        controller: "mazak_smooth_c",
        command: "rough 40mm diameter",
      });

      expect(result.success).toBe(true);
    });

    it("executes lathe_ultra_recommend_cam action", async () => {
      const result = await latheAIUltraEngine.executeAction("lathe_ultra_recommend_cam", {
        controller: "okuma_osp_p200l",
        operation: {
          type: "od_finish",
          material: "steel_1018",
          partDiameter_mm: 35,
        },
      });

      expect(result.success).toBe(true);
    });

    it("executes lathe_ultra_deep_reason action", async () => {
      const result = await latheAIUltraEngine.executeAction("lathe_ultra_deep_reason", {
        chainType: "troubleshooting",
        input: { issue: "vibration" },
        controller: "dmg_celos_mapps4",
      });

      expect(result.success).toBe(true);
    });

    it("executes lathe_ultra_llm_query action", async () => {
      const result = await latheAIUltraEngine.executeAction("lathe_ultra_llm_query", {
        query: "What is CSS?",
        controller: "doosan_fanuc",
        programmingMode: "hard_code",
      });

      expect(result.success).toBe(true);
    });

    it("executes lathe_ultra_get_post action", async () => {
      const result = await latheAIUltraEngine.executeAction("lathe_ultra_get_post", {
        controller: "hurco_winmax",
      });

      expect(result.success).toBe(true);
    });

    it("returns error for unknown action", async () => {
      const result = await latheAIUltraEngine.executeAction("unknown_action", {});

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown action");
    });
  });

  // ============================================================================
  // Controller Coverage Tests
  // ============================================================================

  describe("Controller Coverage", () => {
    const allControllers: LatheControllerModel[] = [
      "fanuc_0i_tf", "fanuc_0i_tf_plus", "fanuc_30i_b", "fanuc_31i_b", "fanuc_32i_b", "fanuc_35i_b",
      "okuma_osp_p200l", "okuma_osp_p300l", "okuma_osp_p500l",
      "mazak_smooth_g", "mazak_smooth_c", "mazak_matrix_2",
      "haas_ngc",
      "siemens_828d", "siemens_840d_sl",
      "dmg_celos_mapps4", "dmg_celos_mapps5",
      "hurco_max5", "hurco_winmax",
      "doosan_fanuc", "doosan_siemens",
    ];

    it("supports all 21 controller models", () => {
      expect(allControllers.length).toBe(21);

      allControllers.forEach(controller => {
        const result = latheAIUltraEngine.getControllerCapabilities(controller);
        expect(result.success).toBe(true);
        expect(result.data!.controller).toBe(controller);
      });
    });

    it("covers all 8 controller families", () => {
      const families: LatheControllerFamily[] = ["fanuc", "okuma", "mazak", "haas", "siemens", "dmg", "hurco", "doosan"];

      families.forEach(family => {
        const result = latheAIUltraEngine.listControllers(family);
        expect(result.success).toBe(true);
        expect(result.data!.controllers.length).toBeGreaterThan(0);
      });
    });
  });
});
