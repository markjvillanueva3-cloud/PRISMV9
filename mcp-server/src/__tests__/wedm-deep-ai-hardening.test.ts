/**
 * WireEDMDeepAIHardeningEngine Tests — WEDM-HARDEN-MS1
 *
 * Comprehensive tests for the Wire EDM AI hardening layer:
 *   - Operation analysis with reasoning chains
 *   - Strategy optimization with candidate scoring
 *   - Setup validation with H-register checks
 *   - Troubleshooting with root cause diagnosis
 *   - Wire selection with physics rationale
 *   - Cycle time calculation
 *   - JM Die profile retrieval
 *   - Tribal knowledge queries
 *
 * @module __tests__/wedm-deep-ai-hardening
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  wireEDMDeepAIHardeningEngine,
  WireEDMDeepAIHardeningEngine,
  type WEDMPartDescription,
  type WEDMMaterialSpec,
  type WEDMPartGeometry,
  type WEDMCuttingParams,
  type WEDMMachineSetup,
  type WEDMOptimizationConstraints,
  type WEDMSymptoms,
  type WireSpecification,
} from "../engines/WireEDMDeepAIHardeningEngine.js";

describe("WireEDMDeepAIHardeningEngine", () => {
  let engine: WireEDMDeepAIHardeningEngine;

  beforeEach(() => {
    engine = wireEDMDeepAIHardeningEngine;
  });

  describe("Engine Instantiation", () => {
    it("should export a singleton instance", () => {
      expect(wireEDMDeepAIHardeningEngine).toBeDefined();
      expect(wireEDMDeepAIHardeningEngine).toBeInstanceOf(WireEDMDeepAIHardeningEngine);
    });

    it("should have all required methods", () => {
      expect(typeof engine.analyzeWEDMOperation).toBe("function");
      expect(typeof engine.optimizeWEDMStrategy).toBe("function");
      expect(typeof engine.validateWEDMSetup).toBe("function");
      expect(typeof engine.troubleshootWEDM).toBe("function");
      expect(typeof engine.selectWireType).toBe("function");
      expect(typeof engine.calculateCycleTime).toBe("function");
      expect(typeof engine.getJMDieMachineProfile).toBe("function");
      expect(typeof engine.queryTribalKnowledge).toBe("function");
    });
  });

  describe("analyzeWEDMOperation", () => {
    it("should analyze a standard 2-axis cut", () => {
      const part: WEDMPartDescription = {
        name: "Punch Profile",
        material: { name: "D2 Tool Steel", iso_group: "H", hardness_hrc: 60 },
        geometry: {
          thickness_mm: 25,
          taper_angle_deg: 0,
          cut_length_mm: 150,
        },
        tolerance_mm: 0.01,
        target_ra_um: 0.8,
        jm_die_category: "punch",
      };

      const result = engine.analyzeWEDMOperation(part);

      expect(result.part_summary).toContain("D2 Tool Steel");
      expect(result.part_summary).toContain("25mm");
      expect(result.engine_routing.length).toBeGreaterThan(0);
      expect(result.reasoning.length).toBeGreaterThanOrEqual(5);
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.jm_die_notes).toContain("JM Die part category: punch");
    });

    it("should recommend ACU 7-pass for ultra-fine finish", () => {
      const part: WEDMPartDescription = {
        name: "Precision Die Insert",
        material: { name: "A2 Tool Steel", iso_group: "H", hardness_hrc: 58 },
        geometry: { thickness_mm: 15, taper_angle_deg: 0 },
        tolerance_mm: 0.002,
        target_ra_um: 0.15, // Ultra-fine
        jm_die_category: "die", // Need JM Die category to get ACU note
      };

      const result = engine.analyzeWEDMOperation(part, "acu_precision");

      expect(result.e_code_family).toBeDefined();
      expect(result.e_code_family!.id).toContain("acu");
      expect(result.e_code_family!.num_passes).toBe(7);
      // JM Die notes require jm_die_category to be set
      const hasAcuNote = result.jm_die_notes.some(n => n.includes("ACU") || n.includes("Ra < 0.2"));
      expect(hasAcuNote).toBe(true);
    });

    it("should include taper engine routing for tapered cuts", () => {
      const part: WEDMPartDescription = {
        name: "Tapered Punch",
        material: { name: "S7 Tool Steel", iso_group: "H" },
        geometry: { thickness_mm: 30, taper_angle_deg: 3.5 },
        tolerance_mm: 0.01,
        target_ra_um: 0.6,
      };

      const result = engine.analyzeWEDMOperation(part);

      const taperEngine = result.engine_routing.find(r => r.engine_name === "EDMWireSlugCornerTaperEngine");
      expect(taperEngine).toBeDefined();
      expect(taperEngine!.operation).toBe("taper_calculation");
    });

    it("should warn about thick section flushing", () => {
      const part: WEDMPartDescription = {
        name: "Thick Die Block",
        material: { name: "H13 Tool Steel", iso_group: "H" },
        geometry: { thickness_mm: 120, taper_angle_deg: 0 },
        tolerance_mm: 0.01,
        target_ra_um: 0.8,
      };

      const result = engine.analyzeWEDMOperation(part);

      const flushWarning = result.warnings.find(w => w.includes("flushing efficiency"));
      expect(flushWarning).toBeDefined();
      expect(flushWarning).toContain("8-10 bar");
    });

    it("should warn about sharp corners", () => {
      const part: WEDMPartDescription = {
        name: "Sharp Corner Part",
        material: { name: "D2 Tool Steel", iso_group: "H" },
        geometry: { thickness_mm: 25, taper_angle_deg: 0, min_corner_radius_mm: 0.3 },
        tolerance_mm: 0.01,
        target_ra_um: 0.8,
      };

      const result = engine.analyzeWEDMOperation(part);

      const cornerWarning = result.warnings.find(w => w.includes("Sharp corners"));
      expect(cornerWarning).toBeDefined();
      expect(cornerWarning).toContain("60%");
    });

    it("should include controller guidance for Mitsubishi M800", () => {
      const part: WEDMPartDescription = {
        name: "Test Part",
        material: { name: "D2", iso_group: "H" },
        geometry: { thickness_mm: 25, taper_angle_deg: 0 },
        tolerance_mm: 0.01,
        target_ra_um: 0.8,
      };

      const result = engine.analyzeWEDMOperation(part);

      expect(result.controller_guidance).toContain("H175 master offset pattern");
    });
  });

  describe("optimizeWEDMStrategy", () => {
    const basePart: WEDMPartDescription = {
      name: "Test Part",
      material: { name: "D2 Tool Steel", iso_group: "H", hardness_hrc: 60 },
      geometry: { thickness_mm: 25, taper_angle_deg: 0 },
      tolerance_mm: 0.005,
      target_ra_um: 0.4,
    };

    it("should generate multiple candidate strategies", () => {
      const params: WEDMCuttingParams = { num_passes: 4 };
      const constraints: WEDMOptimizationConstraints = { priority: "balanced" };

      const result = engine.optimizeWEDMStrategy(basePart, params, constraints);

      expect(result.candidates.length).toBeGreaterThan(0);
      expect(result.best_candidate).toBeDefined();
      expect(result.reasoning.length).toBeGreaterThanOrEqual(2);
    });

    it("should score current strategy", () => {
      const params: WEDMCuttingParams = { num_passes: 5, e_code_family: "E12xx_heavy_5pass" };
      const constraints: WEDMOptimizationConstraints = { priority: "quality" };

      const result = engine.optimizeWEDMStrategy(basePart, params, constraints);

      expect(result.current_score).toBeGreaterThan(0);
      expect(result.current_score).toBeLessThanOrEqual(100);
    });

    it("should recommend ACU for quality priority", () => {
      const params: WEDMCuttingParams = { num_passes: 4 };
      const constraints: WEDMOptimizationConstraints = { priority: "quality", target_ra_um: 0.15 };

      const result = engine.optimizeWEDMStrategy(basePart, params, constraints);

      const acuCandidate = result.candidates.find(c => c.name.includes("ACU"));
      expect(acuCandidate).toBeDefined();
    });

    it("should recommend standard 4-pass for speed priority", () => {
      const params: WEDMCuttingParams = { num_passes: 5 };
      const constraints: WEDMOptimizationConstraints = { priority: "speed" };

      const result = engine.optimizeWEDMStrategy(basePart, params, constraints);

      const standardCandidate = result.candidates.find(c => c.name.includes("4-Pass"));
      expect(standardCandidate).toBeDefined();
    });

    it("should include taper family for tapered parts", () => {
      const taperPart: WEDMPartDescription = {
        ...basePart,
        geometry: { thickness_mm: 25, taper_angle_deg: 2.5 },
      };
      const params: WEDMCuttingParams = { num_passes: 4 };
      const constraints: WEDMOptimizationConstraints = { priority: "balanced" };

      const result = engine.optimizeWEDMStrategy(taperPart, params, constraints);

      const taperCandidate = result.candidates.find(c => c.name.includes("Taper"));
      expect(taperCandidate).toBeDefined();
    });

    it("should calculate improvement metrics", () => {
      const params: WEDMCuttingParams = { num_passes: 4 };
      const constraints: WEDMOptimizationConstraints = { priority: "balanced" };

      const result = engine.optimizeWEDMStrategy(basePart, params, constraints);

      expect(result.improvement).toBeDefined();
      expect(typeof result.improvement.cycle_time_delta_min).toBe("number");
      expect(typeof result.improvement.ra_delta_um).toBe("number");
    });
  });

  describe("validateWEDMSetup", () => {
    const baseSetup: WEDMMachineSetup = {
      machine_id: "mitsubishi_fa20s",
      controller: "mitsubishi_m800",
      wire: { type: "plain_brass", diameter_mm: 0.25 },
      part: {
        name: "Test Part",
        material: { name: "D2", iso_group: "H" },
        geometry: { thickness_mm: 25, taper_angle_deg: 0 },
        tolerance_mm: 0.01,
        target_ra_um: 0.8,
      },
      params: { num_passes: 4 },
      workholding: "magnetic_chuck",
      uses_h_registers: true,
    };

    it("should pass validation for valid setup", () => {
      const result = engine.validateWEDMSetup(baseSetup);

      expect(result.valid).toBe(true);
      expect(result.safety_score).toBeGreaterThanOrEqual(0.7);
    });

    it("should check wire diameter vs thickness", () => {
      const result = engine.validateWEDMSetup(baseSetup);

      const wireCheck = result.capability_checks.find(c => c.check_name === "Wire diameter vs thickness");
      expect(wireCheck).toBeDefined();
      expect(wireCheck!.status).toBe("pass");
    });

    it("should fail for excessive thickness with small wire", () => {
      const thickSetup: WEDMMachineSetup = {
        ...baseSetup,
        wire: { type: "plain_brass", diameter_mm: 0.20 },
        part: {
          ...baseSetup.part,
          geometry: { thickness_mm: 150, taper_angle_deg: 0 },
        },
      };

      const result = engine.validateWEDMSetup(thickSetup);

      const wireCheck = result.capability_checks.find(c => c.check_name === "Wire diameter vs thickness");
      expect(wireCheck).toBeDefined();
      expect(wireCheck!.status).toBe("fail");
      expect(result.remediation.length).toBeGreaterThan(0);
    });

    it("should warn about low water resistivity", () => {
      const lowWaterSetup: WEDMMachineSetup = {
        ...baseSetup,
        water_resistivity_mohm_cm: 2.5,
      };

      const result = engine.validateWEDMSetup(lowWaterSetup);

      const waterCheck = result.capability_checks.find(c => c.check_name === "Water resistivity");
      expect(waterCheck).toBeDefined();
      expect(waterCheck!.status).toBe("fail");
    });

    it("should warn about suboptimal wire type for carbide", () => {
      const carbideSetup: WEDMMachineSetup = {
        ...baseSetup,
        part: {
          ...baseSetup.part,
          material: { name: "Tungsten Carbide", iso_group: "K" },
        },
      };

      const result = engine.validateWEDMSetup(carbideSetup);

      const wireTypeCheck = result.capability_checks.find(c => c.check_name === "Wire type for material");
      expect(wireTypeCheck).toBeDefined();
      expect(wireTypeCheck!.status).toBe("warn");
      // Check remediation contains advice about coated wire
      const hasCoatedAdvice = result.remediation.some(r => r.toLowerCase().includes("coated") || r.toLowerCase().includes("zinc"));
      expect(hasCoatedAdvice).toBe(true);
    });

    it("should include H-register validation for JM Die setup", () => {
      const result = engine.validateWEDMSetup(baseSetup);

      expect(result.h_register_validation).toBeDefined();
      expect(result.h_register_validation!.uses_h175_master).toBe(true);
      expect(result.h_register_validation!.h_registers_used).toContain("H175");
    });
  });

  describe("troubleshootWEDM", () => {
    it("should diagnose wire breaks at corners", () => {
      const symptoms: WEDMSymptoms = {
        symptoms: ["wire break", "corner"],
        wire_breaks_per_hour: 5,
        break_location: "corners",
      };

      const result = engine.troubleshootWEDM(symptoms);

      expect(result.root_causes.length).toBeGreaterThan(0);
      expect(result.primary_diagnosis).toContain("corner");
      // Check corrective actions contain something about corners or feed
      const hasCornerAction = result.corrective_actions.some(a => a.toLowerCase().includes("corner") || a.toLowerCase().includes("feed"));
      expect(hasCornerAction).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("should diagnose flushing issues in thick sections", () => {
      const symptoms: WEDMSymptoms = {
        symptoms: ["wire break", "thick section"],
        wire_breaks_per_hour: 4,
        break_location: "thick_section",
      };

      const result = engine.troubleshootWEDM(symptoms);

      expect(result.root_causes.length).toBeGreaterThan(0);
      const flushCause = result.root_causes.find(rc => rc.cause.toLowerCase().includes("flush"));
      expect(flushCause).toBeDefined();
      // Check corrective actions contain something about flushing or pressure
      const hasFlushAction = result.corrective_actions.some(a => a.toLowerCase().includes("flush") || a.toLowerCase().includes("pressure") || a.toLowerCase().includes("bar"));
      expect(hasFlushAction).toBe(true);
    });

    it("should diagnose surface finish issues from water resistivity", () => {
      const symptoms: WEDMSymptoms = {
        symptoms: ["poor surface finish", "Ra"],
        measured_ra_um: 0.6,
        water_resistivity_mohm_cm: 2.0,
      };

      const result = engine.troubleshootWEDM(symptoms);

      expect(result.root_causes.length).toBeGreaterThan(0);
      const waterCause = result.root_causes.find(rc => rc.cause.toLowerCase().includes("water") || rc.cause.toLowerCase().includes("resistivity"));
      expect(waterCause).toBeDefined();
      // Check corrective actions contain something about resin or deionizer
      const hasWaterAction = result.corrective_actions.some(a => a.toLowerCase().includes("resin") || a.toLowerCase().includes("deioniz"));
      expect(hasWaterAction).toBe(true);
    });

    it("should cite sources for diagnoses", () => {
      const symptoms: WEDMSymptoms = {
        symptoms: ["wire break"],
        wire_breaks_per_hour: 6,
        break_location: "random",
      };

      const result = engine.troubleshootWEDM(symptoms);

      expect(result.sources.length).toBeGreaterThan(0);
    });

    it("should build reasoning chain", () => {
      const symptoms: WEDMSymptoms = {
        symptoms: ["wire break", "corners"],
        wire_breaks_per_hour: 3,
      };

      const result = engine.troubleshootWEDM(symptoms);

      expect(result.reasoning.length).toBeGreaterThanOrEqual(2);
      expect(result.reasoning[0].type).toBe("lookup_knowledge");
    });
  });

  describe("selectWireType", () => {
    it("should select plain brass for hardened steel", () => {
      const material: WEDMMaterialSpec = { name: "D2 Tool Steel", iso_group: "H", hardness_hrc: 60 };

      const result = engine.selectWireType(material, 25);

      expect(result.wire.type).toBe("plain_brass");
      expect(result.rationale).toContain("brass");
    });

    it("should select zinc-coated for carbide", () => {
      const material: WEDMMaterialSpec = { name: "Tungsten Carbide", iso_group: "K" };

      const result = engine.selectWireType(material, 25);

      expect(result.wire.type).toBe("zinc_coated");
      expect(result.rationale).toContain("carbide");
    });

    it("should recommend larger diameter for thick sections", () => {
      const material: WEDMMaterialSpec = { name: "D2", iso_group: "H" };

      const thinResult = engine.selectWireType(material, 30);
      const thickResult = engine.selectWireType(material, 180);

      expect(thickResult.wire.diameter_mm).toBeGreaterThan(thinResult.wire.diameter_mm);
    });

    it("should recommend diffusion-annealed for ultra-fine finish", () => {
      const material: WEDMMaterialSpec = { name: "D2", iso_group: "H" };

      const result = engine.selectWireType(material, 25, 0.15);

      expect(["diffusion_annealed", "zinc_coated", "gamma_coated"]).toContain(result.wire.type);
    });

    it("should provide alternative wire types", () => {
      const material: WEDMMaterialSpec = { name: "D2", iso_group: "H" };

      const result = engine.selectWireType(material, 25);

      expect(result.alternatives.length).toBeGreaterThan(0);
    });
  });

  describe("calculateCycleTime", () => {
    const basePart: WEDMPartDescription = {
      name: "Test Part",
      material: { name: "D2", iso_group: "H" },
      geometry: { thickness_mm: 25, taper_angle_deg: 0, cut_length_mm: 100 },
      tolerance_mm: 0.01,
      target_ra_um: 0.8,
    };

    it("should calculate total cycle time", () => {
      const params: WEDMCuttingParams = { num_passes: 4 };
      const wire: WireSpecification = { type: "plain_brass", diameter_mm: 0.25 };

      const result = engine.calculateCycleTime(basePart, params, wire);

      expect(result.total_min).toBeGreaterThan(0);
      expect(result.breakdown).toBeDefined();
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("should break down time by phase", () => {
      const params: WEDMCuttingParams = { num_passes: 5 };
      const wire: WireSpecification = { type: "plain_brass", diameter_mm: 0.25 };

      const result = engine.calculateCycleTime(basePart, params, wire);

      expect(result.breakdown.rough_cut).toBeGreaterThan(0);
      expect(result.breakdown.skim_passes).toBeGreaterThan(0);
      expect(result.breakdown.threading).toBeGreaterThan(0);
      expect(result.breakdown.setup).toBeGreaterThan(0);
    });

    it("should increase time for thicker sections", () => {
      const thinPart: WEDMPartDescription = {
        ...basePart,
        geometry: { thickness_mm: 10, taper_angle_deg: 0, cut_length_mm: 100 },
      };
      const thickPart: WEDMPartDescription = {
        ...basePart,
        geometry: { thickness_mm: 100, taper_angle_deg: 0, cut_length_mm: 100 },
      };
      const params: WEDMCuttingParams = { num_passes: 4 };
      const wire: WireSpecification = { type: "plain_brass", diameter_mm: 0.25 };

      const thinResult = engine.calculateCycleTime(thinPart, params, wire);
      const thickResult = engine.calculateCycleTime(thickPart, params, wire);

      expect(thickResult.total_min).toBeGreaterThan(thinResult.total_min);
    });

    it("should factor in wire type speed", () => {
      const params: WEDMCuttingParams = { num_passes: 4 };
      const brassWire: WireSpecification = { type: "plain_brass", diameter_mm: 0.25 };
      const zincWire: WireSpecification = { type: "zinc_coated", diameter_mm: 0.25 };

      const brassResult = engine.calculateCycleTime(basePart, params, brassWire);
      const zincResult = engine.calculateCycleTime(basePart, params, zincWire);

      // Zinc-coated is faster
      expect(zincResult.total_min).toBeLessThan(brassResult.total_min);
    });
  });

  describe("getJMDieMachineProfile", () => {
    it("should return JM Die Mitsubishi FA-20S profile", () => {
      const profile = engine.getJMDieMachineProfile();

      expect(profile.machine_id).toBe("mitsubishi_fa20s");
      expect(profile.display_name).toBe("Mitsubishi FA-20S");
      expect(profile.controller).toBe("mitsubishi_m800");
      expect(profile.has_uv_axis).toBe(true);
    });

    it("should include standard wire specification", () => {
      const profile = engine.getJMDieMachineProfile();

      expect(profile.standard_wire.type).toBe("plain_brass");
      expect(profile.standard_wire.diameter_mm).toBe(0.25);
    });

    it("should include primary materials", () => {
      const profile = engine.getJMDieMachineProfile();

      expect(profile.primary_materials).toContain("D2");
      expect(profile.primary_materials).toContain("A2");
      expect(profile.primary_materials).toContain("S7");
    });

    it("should include shop notes", () => {
      const profile = engine.getJMDieMachineProfile();

      expect(profile.shop_notes.length).toBeGreaterThan(0);
      // Check that some note mentions H175 or master offset
      const hasH175Note = profile.shop_notes.some(n => n.includes("H175") || n.includes("master offset"));
      expect(hasH175Note).toBe(true);
    });

    it("should specify CAM system", () => {
      const profile = engine.getJMDieMachineProfile();

      expect(profile.cam_system).toBe("Mastercam Wire X8");
    });
  });

  describe("queryTribalKnowledge", () => {
    it("should return matching tip IDs for wire break query", () => {
      // "wire_break" is the indexed keyword (with underscore)
      const tips = engine.queryTribalKnowledge("wire_break");

      expect(tips.length).toBeGreaterThan(0);
      expect(tips[0]).toContain("wedm-kb");
    });

    it("should return matching tips for surface finish query", () => {
      // Use indexed keyword "surface_finish"
      const tips = engine.queryTribalKnowledge("surface_finish ra");

      expect(tips.length).toBeGreaterThan(0);
    });

    it("should return matching tips for carbide query", () => {
      const tips = engine.queryTribalKnowledge("carbide");

      expect(tips.length).toBeGreaterThan(0);
    });

    it("should return matching tips for flushing query", () => {
      const tips = engine.queryTribalKnowledge("flushing");

      expect(tips.length).toBeGreaterThan(0);
    });

    it("should return empty array for unmatched query", () => {
      const tips = engine.queryTribalKnowledge("xyzunknownterm123");

      expect(tips).toEqual([]);
    });
  });

  describe("AI Reasoning Chain Quality", () => {
    it("should produce coherent reasoning chains", () => {
      const part: WEDMPartDescription = {
        name: "Complex Part",
        material: { name: "M2 HSS", iso_group: "H", hardness_hrc: 64 },
        geometry: { thickness_mm: 35, taper_angle_deg: 2, min_corner_radius_mm: 0.4 },
        tolerance_mm: 0.003,
        target_ra_um: 0.25,
      };

      const result = engine.analyzeWEDMOperation(part);

      // Check reasoning chain structure
      for (let i = 0; i < result.reasoning.length; i++) {
        const step = result.reasoning[i];
        expect(step.step_number).toBe(i + 1);
        expect(step.type).toBeDefined();
        expect(step.content).toBeTruthy();
        expect(step.engine_source).toBeTruthy();
        expect(step.confidence).toBeGreaterThan(0);
        expect(step.confidence).toBeLessThanOrEqual(1);
        expect(step.evidence).toBeDefined();
      }
    });

    it("should include evidence for each reasoning step", () => {
      const part: WEDMPartDescription = {
        name: "Evidence Test Part",
        material: { name: "D2", iso_group: "H" },
        geometry: { thickness_mm: 50, taper_angle_deg: 0 },
        tolerance_mm: 0.01,
        target_ra_um: 0.8,
      };

      const result = engine.analyzeWEDMOperation(part);

      for (const step of result.reasoning) {
        if (step.type !== "lookup_knowledge") {
          expect(step.evidence.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("Resource Knowledge Application", () => {
    it("should apply thickness-based knowledge for thick sections", () => {
      const part: WEDMPartDescription = {
        name: "Thick Part",
        material: { name: "D2", iso_group: "H" },
        geometry: { thickness_mm: 100, taper_angle_deg: 0 },
        tolerance_mm: 0.01,
        target_ra_um: 0.8,
      };

      const result = engine.analyzeWEDMOperation(part);

      const thicknessKnowledge = result.resource_knowledge.find(k =>
        k.title.includes("Thick section") || k.title.includes("flushing")
      );
      expect(thicknessKnowledge).toBeDefined();
    });

    it("should apply carbide-specific knowledge", () => {
      const part: WEDMPartDescription = {
        name: "WC Part",
        material: { name: "Tungsten Carbide", iso_group: "K" },
        geometry: { thickness_mm: 25, taper_angle_deg: 0 },
        tolerance_mm: 0.01,
        target_ra_um: 0.4,
      };

      const result = engine.analyzeWEDMOperation(part);

      const carbideKnowledge = result.resource_knowledge.find(k =>
        k.title.toLowerCase().includes("carbide")
      );
      expect(carbideKnowledge).toBeDefined();
    });

    it("should apply ACU knowledge for ultra-fine finish", () => {
      const part: WEDMPartDescription = {
        name: "Mirror Finish Part",
        material: { name: "D2", iso_group: "H" },
        geometry: { thickness_mm: 15, taper_angle_deg: 0 },
        tolerance_mm: 0.002,
        target_ra_um: 0.15,
      };

      const result = engine.analyzeWEDMOperation(part);

      const acuKnowledge = result.resource_knowledge.find(k =>
        k.title.includes("finish") || k.title.includes("ACU")
      );
      expect(acuKnowledge).toBeDefined();
    });
  });

  describe("E-Code Family Selection", () => {
    it("should select ACU thin for thin ultra-fine parts", () => {
      const part: WEDMPartDescription = {
        name: "Thin ACU Part",
        material: { name: "D2", iso_group: "H" },
        geometry: { thickness_mm: 12, taper_angle_deg: 0 },
        tolerance_mm: 0.002,
        target_ra_um: 0.15,
      };

      const result = engine.analyzeWEDMOperation(part);

      expect(result.e_code_family?.id).toBe("E952_acu_7pass_thin");
    });

    it("should select ACU thick for thick ultra-fine parts", () => {
      const part: WEDMPartDescription = {
        name: "Thick ACU Part",
        material: { name: "D2", iso_group: "H" },
        geometry: { thickness_mm: 30, taper_angle_deg: 0 },
        tolerance_mm: 0.002,
        target_ra_um: 0.15,
      };

      const result = engine.analyzeWEDMOperation(part);

      expect(result.e_code_family?.id).toBe("E56xx_acu_7pass_thick");
    });

    it("should select taper family for taper work", () => {
      const part: WEDMPartDescription = {
        name: "Taper Part",
        material: { name: "D2", iso_group: "H" },
        geometry: { thickness_mm: 25, taper_angle_deg: 3.0 },
        tolerance_mm: 0.01,
        target_ra_um: 0.6,
      };

      const result = engine.analyzeWEDMOperation(part);

      expect(result.e_code_family?.id).toBe("E28xx_taper_5pass");
    });

    it("should select heavy 5-pass for tight tolerance", () => {
      const part: WEDMPartDescription = {
        name: "Tight Tolerance Part",
        material: { name: "D2", iso_group: "H" },
        geometry: { thickness_mm: 25, taper_angle_deg: 0 },
        tolerance_mm: 0.004,
        target_ra_um: 0.6,
      };

      const result = engine.analyzeWEDMOperation(part);

      expect(result.e_code_family?.id).toBe("E12xx_heavy_5pass");
    });

    it("should select standard 4-pass for normal work", () => {
      const part: WEDMPartDescription = {
        name: "Normal Part",
        material: { name: "D2", iso_group: "H" },
        geometry: { thickness_mm: 25, taper_angle_deg: 0 },
        tolerance_mm: 0.015,
        target_ra_um: 0.8,
      };

      const result = engine.analyzeWEDMOperation(part);

      expect(result.e_code_family?.id).toBe("E12xx_standard_4pass");
    });
  });
});
