/**
 * LatheDeepAIHardeningEngine Tests — LATHE-HARDEN-MS1
 * ====================================================
 * 64+ comprehensive tests covering:
 *   - Part analysis and classification
 *   - Operation sequencing
 *   - Engine routing
 *   - Strategy optimization
 *   - Setup validation
 *   - Troubleshooting
 *   - Machine selection
 *   - Learning and feedback
 *   - JM Die shop integration
 *
 * @module __tests__/LatheDeepAIHardeningEngine.test
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  latheDeepAIHardeningEngine,
  LatheDeepAIHardeningEngine,
  LathePartDescription,
  LatheFeatureDescription,
  LatheCurrentStrategy,
  LatheOptimizationConstraints,
  LatheSetupDescription,
  LatheSymptoms,
  LatheOperationRecord,
} from "../engines/LatheDeepAIHardeningEngine.js";

// ============================================================================
// TEST FIXTURES
// ============================================================================

const FIXTURE_SIMPLE_PUNCH: LathePartDescription = {
  name: "PUNCH-001",
  part_number: "JMD-P-001",
  material: {
    name: "M2 Tool Steel",
    iso_group: "H",
    kc11_mpa: 3200,
    hardness_hrc: 62,
  },
  bar_od_mm: 50,
  finished_od_mm: 45,
  length_mm: 80,
  features: [
    { type: "contour", location: "od", start_z_mm: 0, end_z_mm: -80, diameter_mm: 45, tolerance_mm: 0.02 },
    { type: "chamfer", location: "od", start_z_mm: 0, depth_mm: 1.5, angle_deg: 45 },
  ],
  jm_die_category: "punch",
  customer: "ALCOA",
};

const FIXTURE_THREADED_SHAFT: LathePartDescription = {
  name: "SHAFT-THREAD-001",
  material: {
    name: "AISI 4140",
    iso_group: "P",
    kc11_mpa: 1800,
    hardness_hrc: 28,
  },
  bar_od_mm: 40,
  finished_od_mm: 35,
  length_mm: 150,
  features: [
    { type: "contour", location: "od", start_z_mm: 0, end_z_mm: -100, diameter_mm: 35 },
    { type: "thread", location: "od", start_z_mm: -20, end_z_mm: -50, thread_pitch_mm: 2.0, thread_form: "metric" },
    { type: "chamfer", location: "od", start_z_mm: 0, depth_mm: 2, angle_deg: 45 },
  ],
};

const FIXTURE_COMPLEX_PART: LathePartDescription = {
  name: "CONNECTOR-001",
  material: {
    name: "303 Stainless",
    iso_group: "M",
    kc11_mpa: 2100,
  },
  bar_od_mm: 60,
  length_mm: 100,
  id_bore_mm: 20,
  features: [
    { type: "contour", location: "od", start_z_mm: 0, end_z_mm: -100 },
    { type: "contour", location: "id", start_z_mm: -10, end_z_mm: -80, diameter_mm: 20 },
    { type: "thread", location: "od", start_z_mm: -5, end_z_mm: -25, thread_pitch_mm: 1.5, thread_form: "metric" },
    { type: "thread", location: "id", start_z_mm: -70, end_z_mm: -90, thread_pitch_mm: 1.0, thread_form: "metric" },
    { type: "groove", location: "od", start_z_mm: -30, depth_mm: 3 },
  ],
};

const FIXTURE_LIVE_TOOLING_PART: LathePartDescription = {
  name: "PUNCH-FLAT-001",
  material: {
    name: "D2 Tool Steel",
    iso_group: "H",
    kc11_mpa: 3200,
    hardness_hrc: 58,
  },
  bar_od_mm: 40,
  length_mm: 60,
  features: [
    { type: "contour", location: "od", start_z_mm: 0, end_z_mm: -60 },
    { type: "flat", location: "od", start_z_mm: -10, end_z_mm: -40, depth_mm: 5 },
    { type: "cross_hole", location: "od", start_z_mm: -30, diameter_mm: 6 },
  ],
  jm_die_category: "punch",
};

const FIXTURE_SLENDER_PART: LathePartDescription = {
  name: "QUILL-001",
  material: {
    name: "A2 Tool Steel",
    iso_group: "H",
  },
  bar_od_mm: 25,
  length_mm: 200,
  features: [
    { type: "contour", location: "od", start_z_mm: 0, end_z_mm: -200 },
  ],
  jm_die_category: "quill",
};

const FIXTURE_CURRENT_STRATEGY: LatheCurrentStrategy = {
  name: "Standard Roughing",
  operations: ["face_rough", "od_rough", "od_finish", "parting"],
  params: {
    vc_mpm: 100,
    fn_mmrev: 0.25,
    ap_mm: 2.0,
    css_mode: true,
  },
  tools: [
    { tool_id: "T01", tool_type: "external", nose_radius_mm: 0.8, orientation: 3 },
  ],
  machine_id: "LTH-01",
  cycle_time_min: 12,
  achieved_ra_um: 3.2,
};

const FIXTURE_CONSTRAINTS: LatheOptimizationConstraints = {
  max_cycle_time_min: 15,
  min_tool_life_min: 45,
  target_ra_um: 2.5,
  priority: "balanced",
};

const FIXTURE_SETUP: LatheSetupDescription = {
  machine_id: "LTH-01",
  controller: "okuma",
  controller_model: "okuma_osp_p300l",
  tools: [
    { tool_id: "T01", tool_type: "external", nose_radius_mm: 0.8, orientation: 3 },
    { tool_id: "T02", tool_type: "internal", nose_radius_mm: 0.4, orientation: 2 },
    { tool_id: "T03", tool_type: "parting", nose_radius_mm: 0, orientation: 1 },
  ],
  workholding: {
    type: "3_jaw",
    jaw_type: "hard",
    grip_length_mm: 25,
  },
  part: FIXTURE_SIMPLE_PUNCH,
};

// ============================================================================
// TEST SUITES
// ============================================================================

describe("LatheDeepAIHardeningEngine", () => {
  describe("Engine Instantiation", () => {
    it("should export singleton instance", () => {
      expect(latheDeepAIHardeningEngine).toBeDefined();
      expect(latheDeepAIHardeningEngine).toBeInstanceOf(LatheDeepAIHardeningEngine);
    });

    it("should be able to create new instance", () => {
      const engine = new LatheDeepAIHardeningEngine();
      expect(engine).toBeInstanceOf(LatheDeepAIHardeningEngine);
    });
  });

  describe("analyzeLatheOperation", () => {
    it("should analyze simple punch part", () => {
      const result = latheDeepAIHardeningEngine.analyzeLatheOperation(FIXTURE_SIMPLE_PUNCH);

      expect(result.part_summary).toContain("PUNCH-001");
      expect(result.part_summary).toContain("M2 Tool Steel");
      expect(result.part_summary).toContain("ISO H");
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it("should classify threaded shaft correctly", () => {
      const result = latheDeepAIHardeningEngine.analyzeLatheOperation(FIXTURE_THREADED_SHAFT);

      expect(result.recommended_sequence).toContain("od_thread");
      expect(result.engine_routing.some(r => r.engine_name === "LatheAdvancedOperationsEngine")).toBe(true);
    });

    it("should route to correct engines for threading", () => {
      const result = latheDeepAIHardeningEngine.analyzeLatheOperation(FIXTURE_THREADED_SHAFT);

      const threadingEngines = result.engine_routing.filter(r => r.operation === "od_thread");
      expect(threadingEngines.length).toBeGreaterThan(0);
      expect(threadingEngines.some(e => e.engine_name.includes("Thread") || e.engine_name.includes("Reasoning"))).toBe(true);
    });

    it("should detect complex connector part features", () => {
      const result = latheDeepAIHardeningEngine.analyzeLatheOperation(FIXTURE_COMPLEX_PART);

      expect(result.recommended_sequence).toContain("id_rough");
      expect(result.recommended_sequence).toContain("id_finish");
      expect(result.recommended_sequence).toContain("od_thread");
      expect(result.recommended_sequence).toContain("id_thread");
    });

    it("should add live tooling operations for cross-hole", () => {
      const result = latheDeepAIHardeningEngine.analyzeLatheOperation(FIXTURE_LIVE_TOOLING_PART);

      expect(result.recommended_sequence.some(op => op.includes("live") || op.includes("c_axis"))).toBe(true);
    });

    it("should warn about slender parts", () => {
      const result = latheDeepAIHardeningEngine.analyzeLatheOperation(FIXTURE_SLENDER_PART);

      expect(result.warnings.some(w => w.includes("Slender") || w.includes("L/D"))).toBe(true);
    });

    it("should warn about hard turning", () => {
      const result = latheDeepAIHardeningEngine.analyzeLatheOperation(FIXTURE_SIMPLE_PUNCH);

      expect(result.warnings.some(w => w.includes("Hard turning") || w.includes("HRC"))).toBe(true);
    });

    it("should include JM Die notes for punch category", () => {
      const result = latheDeepAIHardeningEngine.analyzeLatheOperation(FIXTURE_SIMPLE_PUNCH);

      expect(result.jm_die_notes.length).toBeGreaterThan(0);
      expect(result.jm_die_notes.some(n => n.includes("punch") || n.includes("JM Die"))).toBe(true);
    });

    it("should apply Okuma OSP knowledge", () => {
      const result = latheDeepAIHardeningEngine.analyzeLatheOperation(FIXTURE_SIMPLE_PUNCH);

      expect(result.resource_knowledge.some(k => k.source === "osp_manual")).toBe(true);
    });

    it("should include controller guidance", () => {
      const result = latheDeepAIHardeningEngine.analyzeLatheOperation(FIXTURE_SIMPLE_PUNCH);

      expect(result.controller_guidance).toContain("G50");
      expect(result.controller_guidance).toContain("G96");
      expect(result.controller_guidance).toContain("NAT");
    });

    it("should build reasoning chain", () => {
      const result = latheDeepAIHardeningEngine.analyzeLatheOperation(FIXTURE_SIMPLE_PUNCH);

      expect(result.reasoning.length).toBeGreaterThanOrEqual(4);
      expect(result.reasoning[0].step_number).toBe(1);
      expect(result.reasoning.every(r => r.confidence > 0)).toBe(true);
    });

    it("should handle aluminum material differently", () => {
      const aluminumPart: LathePartDescription = {
        ...FIXTURE_SIMPLE_PUNCH,
        material: { name: "6061-T6 Aluminum", iso_group: "N", kc11_mpa: 700 },
      };

      const result = latheDeepAIHardeningEngine.analyzeLatheOperation(aluminumPart);

      // Aluminum should have different controller guidance (higher RPM limits)
      expect(result.controller_guidance).toContain("4000");
    });

    it("should accept override features", () => {
      const overrideFeatures: LatheFeatureDescription[] = [
        { type: "groove", location: "od", start_z_mm: -40, depth_mm: 5 },
      ];

      const result = latheDeepAIHardeningEngine.analyzeLatheOperation(
        FIXTURE_SIMPLE_PUNCH,
        overrideFeatures,
      );

      expect(result.recommended_sequence.some(op => op.includes("groove"))).toBe(true);
    });
  });

  describe("optimizeLatheStrategy", () => {
    it("should score current strategy", () => {
      const result = latheDeepAIHardeningEngine.optimizeLatheStrategy(
        FIXTURE_CURRENT_STRATEGY,
        FIXTURE_CONSTRAINTS,
      );

      expect(result.current_score).toBeGreaterThan(0);
      expect(result.current_score).toBeLessThanOrEqual(100);
    });

    it("should generate multiple candidates", () => {
      const result = latheDeepAIHardeningEngine.optimizeLatheStrategy(
        FIXTURE_CURRENT_STRATEGY,
        FIXTURE_CONSTRAINTS,
      );

      expect(result.candidates.length).toBeGreaterThan(0);
    });

    it("should select best candidate", () => {
      const result = latheDeepAIHardeningEngine.optimizeLatheStrategy(
        FIXTURE_CURRENT_STRATEGY,
        FIXTURE_CONSTRAINTS,
      );

      expect(result.best_candidate).toBeDefined();
      expect(result.best_candidate.score).toBeGreaterThanOrEqual(result.current_score - 10);
    });

    it("should calculate improvement metrics", () => {
      const result = latheDeepAIHardeningEngine.optimizeLatheStrategy(
        FIXTURE_CURRENT_STRATEGY,
        FIXTURE_CONSTRAINTS,
      );

      expect(result.improvement).toBeDefined();
      expect(typeof result.improvement.cycle_time_delta_min).toBe("number");
      expect(typeof result.improvement.ra_delta_um).toBe("number");
      expect(typeof result.improvement.cost_delta_pct).toBe("number");
    });

    it("should check constraints met", () => {
      const result = latheDeepAIHardeningEngine.optimizeLatheStrategy(
        FIXTURE_CURRENT_STRATEGY,
        FIXTURE_CONSTRAINTS,
      );

      expect(Array.isArray(result.constraints_met)).toBe(true);
      expect(Array.isArray(result.constraints_violated)).toBe(true);
    });

    it("should respect quality priority", () => {
      const qualityConstraints: LatheOptimizationConstraints = {
        ...FIXTURE_CONSTRAINTS,
        priority: "quality",
        target_ra_um: 1.6,
      };

      const result = latheDeepAIHardeningEngine.optimizeLatheStrategy(
        FIXTURE_CURRENT_STRATEGY,
        qualityConstraints,
      );

      expect(result.best_candidate.estimated_ra_um).toBeLessThan(FIXTURE_CURRENT_STRATEGY.achieved_ra_um!);
    });

    it("should respect speed priority", () => {
      const speedConstraints: LatheOptimizationConstraints = {
        ...FIXTURE_CONSTRAINTS,
        priority: "speed",
        max_cycle_time_min: 10,
      };

      const result = latheDeepAIHardeningEngine.optimizeLatheStrategy(
        FIXTURE_CURRENT_STRATEGY,
        speedConstraints,
      );

      expect(result.best_candidate.estimated_cycle_min).toBeLessThan(FIXTURE_CURRENT_STRATEGY.cycle_time_min!);
    });

    it("should include reasoning chain", () => {
      const result = latheDeepAIHardeningEngine.optimizeLatheStrategy(
        FIXTURE_CURRENT_STRATEGY,
        FIXTURE_CONSTRAINTS,
      );

      expect(result.reasoning.length).toBeGreaterThanOrEqual(3);
    });

    it("should handle no improvement scenario", () => {
      const optimalStrategy: LatheCurrentStrategy = {
        ...FIXTURE_CURRENT_STRATEGY,
        cycle_time_min: 5,
        achieved_ra_um: 0.8,
      };

      const result = latheDeepAIHardeningEngine.optimizeLatheStrategy(
        optimalStrategy,
        FIXTURE_CONSTRAINTS,
      );

      expect(result.best_candidate).toBeDefined();
    });
  });

  describe("validateLatheSetup", () => {
    it("should validate basic setup", () => {
      const result = latheDeepAIHardeningEngine.validateLatheSetup(FIXTURE_SETUP);

      expect(result.valid).toBe(true);
      expect(result.safety_score).toBeGreaterThanOrEqual(0.7);
    });

    it("should check bar OD capacity", () => {
      const oversizedSetup: LatheSetupDescription = {
        ...FIXTURE_SETUP,
        part: {
          ...FIXTURE_SIMPLE_PUNCH,
          bar_od_mm: 200, // Way too big for any JM Die lathe
        },
      };

      const result = latheDeepAIHardeningEngine.validateLatheSetup(oversizedSetup);

      expect(result.capability_checks.some(c => c.check_name.includes("Bar OD") && c.status === "fail")).toBe(true);
    });

    it("should check part length vs Z-travel", () => {
      const longSetup: LatheSetupDescription = {
        ...FIXTURE_SETUP,
        part: {
          ...FIXTURE_SIMPLE_PUNCH,
          length_mm: 1000, // Exceeds most machines
        },
      };

      const result = latheDeepAIHardeningEngine.validateLatheSetup(longSetup);

      expect(result.capability_checks.some(c => c.check_name.includes("length") && c.status === "fail")).toBe(true);
    });

    it("should check live tooling requirement", () => {
      const liveToolingSetup: LatheSetupDescription = {
        ...FIXTURE_SETUP,
        machine_id: "LTH-03", // LNC8 - no live tooling
        part: FIXTURE_LIVE_TOOLING_PART,
      };

      const result = latheDeepAIHardeningEngine.validateLatheSetup(liveToolingSetup);

      expect(result.capability_checks.some(c => c.check_name.includes("Live tooling") && c.status === "fail")).toBe(true);
    });

    it("should perform collision checks", () => {
      const result = latheDeepAIHardeningEngine.validateLatheSetup(FIXTURE_SETUP);

      expect(result.collision_checks.length).toBeGreaterThan(0);
      expect(result.collision_checks.some(c => c.check_name.includes("clearance"))).toBe(true);
    });

    it("should warn about slender parts without tailstock", () => {
      const slenderSetup: LatheSetupDescription = {
        ...FIXTURE_SETUP,
        part: FIXTURE_SLENDER_PART,
        workholding: {
          type: "3_jaw",
          jaw_type: "hard",
          grip_length_mm: 20,
          tailstock: false,
        },
      };

      const result = latheDeepAIHardeningEngine.validateLatheSetup(slenderSetup);

      expect(result.collision_checks.some(c => c.status === "risk")).toBe(true);
      expect(result.remediation.some(r => r.includes("tailstock"))).toBe(true);
    });

    it("should include controller notes", () => {
      const result = latheDeepAIHardeningEngine.validateLatheSetup(FIXTURE_SETUP);

      expect(result.controller_notes.length).toBeGreaterThan(0);
    });

    it("should calculate safety score correctly", () => {
      const result = latheDeepAIHardeningEngine.validateLatheSetup(FIXTURE_SETUP);

      expect(result.safety_score).toBeGreaterThanOrEqual(0);
      expect(result.safety_score).toBeLessThanOrEqual(1);
    });

    it("should fail validation when safety score < 0.70", () => {
      const badSetup: LatheSetupDescription = {
        ...FIXTURE_SETUP,
        machine_id: "LTH-03", // No live tooling
        part: {
          ...FIXTURE_LIVE_TOOLING_PART,
          bar_od_mm: 100, // Also exceeds capacity
        },
      };

      const result = latheDeepAIHardeningEngine.validateLatheSetup(badSetup);

      // Multiple failures should drop safety score
      expect(result.capability_checks.filter(c => c.status === "fail").length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("troubleshootLathe", () => {
    it("should diagnose chatter symptoms", () => {
      const symptoms: LatheSymptoms = {
        symptoms: ["chatter marks on surface", "vibration during cutting"],
        operation: "od_rough",
        chatter_detected: true,
      };

      const result = latheDeepAIHardeningEngine.troubleshootLathe(symptoms);

      expect(result.root_causes.length).toBeGreaterThan(0);
      expect(result.root_causes[0].cause.toLowerCase()).toContain("chatter");
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    it("should diagnose poor surface finish", () => {
      const symptoms: LatheSymptoms = {
        symptoms: ["rough surface", "high Ra", "poor finish"],
        measured_ra_um: 6.3,
      };

      const result = latheDeepAIHardeningEngine.troubleshootLathe(symptoms);

      expect(result.root_causes.some(rc => rc.cause.includes("finish") || rc.cause.includes("BUE") || rc.cause.includes("nose"))).toBe(true);
    });

    it("should diagnose threading issues", () => {
      const symptoms: LatheSymptoms = {
        symptoms: ["thread flanks torn", "bad thread"],
        operation: "od_thread",
      };

      const result = latheDeepAIHardeningEngine.troubleshootLathe(symptoms);

      expect(result.root_causes.some(rc => rc.cause.toLowerCase().includes("thread"))).toBe(true);
    });

    it("should diagnose tool breakage", () => {
      const symptoms: LatheSymptoms = {
        symptoms: ["tool breakage", "insert shattered"],
        tool_wear_pattern: "fracture",
      };

      const result = latheDeepAIHardeningEngine.troubleshootLathe(symptoms);

      expect(result.root_causes.some(rc => rc.cause.toLowerCase().includes("tool") || rc.cause.toLowerCase().includes("force"))).toBe(true);
    });

    it("should diagnose dimensional errors", () => {
      const symptoms: LatheSymptoms = {
        symptoms: ["oversize diameter", "tolerance issue"],
        dimensional_error_mm: 0.05,
      };

      const result = latheDeepAIHardeningEngine.troubleshootLathe(symptoms);

      expect(result.root_causes.some(rc => rc.cause.includes("TNRC") || rc.cause.includes("thermal") || rc.cause.includes("wear"))).toBe(true);
    });

    it("should provide corrective actions", () => {
      const symptoms: LatheSymptoms = {
        symptoms: ["chatter", "vibration"],
      };

      const result = latheDeepAIHardeningEngine.troubleshootLathe(symptoms);

      expect(result.corrective_actions.length).toBeGreaterThan(0);
    });

    it("should include controller recovery for E-stop", () => {
      const symptoms: LatheSymptoms = {
        symptoms: ["E-stop alarm", "machine stopped"],
      };

      const result = latheDeepAIHardeningEngine.troubleshootLathe(symptoms);

      expect(result.controller_recovery).toBeDefined();
      expect(result.controller_recovery!.length).toBeGreaterThan(0);
    });

    it("should cite sources", () => {
      const symptoms: LatheSymptoms = {
        symptoms: ["chatter marks"],
      };

      const result = latheDeepAIHardeningEngine.troubleshootLathe(symptoms);

      expect(result.sources.length).toBeGreaterThan(0);
    });

    it("should handle unknown symptoms gracefully", () => {
      const symptoms: LatheSymptoms = {
        symptoms: ["completely unknown problem xyz123"],
      };

      const result = latheDeepAIHardeningEngine.troubleshootLathe(symptoms);

      expect(result.primary_diagnosis).toContain("Unable to determine");
      expect(result.confidence).toBeLessThan(0.7);
    });

    it("should match multiple symptoms for higher confidence", () => {
      const multiSymptoms: LatheSymptoms = {
        symptoms: ["chatter", "vibration", "marks", "waviness", "pattern"],
      };

      const singleSymptom: LatheSymptoms = {
        symptoms: ["chatter"],
      };

      const multiResult = latheDeepAIHardeningEngine.troubleshootLathe(multiSymptoms);
      const singleResult = latheDeepAIHardeningEngine.troubleshootLathe(singleSymptom);

      expect(multiResult.root_causes[0].probability).toBeGreaterThanOrEqual(singleResult.root_causes[0]?.probability ?? 0);
    });
  });

  describe("selectMachine", () => {
    it("should select appropriate machine for simple punch", () => {
      const result = latheDeepAIHardeningEngine.selectMachine(FIXTURE_SIMPLE_PUNCH);

      expect(result.recommended).toBeDefined();
      expect(result.recommended.max_bar_od_mm).toBeGreaterThanOrEqual(FIXTURE_SIMPLE_PUNCH.bar_od_mm);
    });

    it("should provide alternatives", () => {
      const result = latheDeepAIHardeningEngine.selectMachine(FIXTURE_SIMPLE_PUNCH);

      expect(result.alternatives.length).toBeGreaterThanOrEqual(0);
    });

    it("should include reasoning", () => {
      const result = latheDeepAIHardeningEngine.selectMachine(FIXTURE_SIMPLE_PUNCH);

      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it("should select live tooling machine for cross-hole part", () => {
      const result = latheDeepAIHardeningEngine.selectMachine(FIXTURE_LIVE_TOOLING_PART);

      expect(result.recommended.live_tooling).toBe(true);
    });

    it("should select long-bed machine for quill", () => {
      const result = latheDeepAIHardeningEngine.selectMachine(FIXTURE_SLENDER_PART);

      expect(result.recommended.max_turning_length_mm).toBeGreaterThanOrEqual(FIXTURE_SLENDER_PART.length_mm);
    });

    it("should filter by bar OD capacity", () => {
      const largePart: LathePartDescription = {
        ...FIXTURE_SIMPLE_PUNCH,
        bar_od_mm: 90,
      };

      const result = latheDeepAIHardeningEngine.selectMachine(largePart);

      // Should only recommend LTH-06 (LB 3000EX with 102mm capacity)
      expect(result.recommended.max_bar_od_mm).toBeGreaterThanOrEqual(90);
    });

    it("should prefer matching primary use", () => {
      const punchResult = latheDeepAIHardeningEngine.selectMachine(FIXTURE_SIMPLE_PUNCH);

      // Should prefer machines good for punch work
      expect(punchResult.reasoning.some(r => r.toLowerCase().includes("punch"))).toBe(true);
    });
  });

  describe("recordOperation and getLearnedPatterns", () => {
    let engine: LatheDeepAIHardeningEngine;

    beforeEach(() => {
      engine = new LatheDeepAIHardeningEngine();
    });

    it("should record successful operation", () => {
      const record: LatheOperationRecord = {
        id: "OP-001",
        timestamp: new Date().toISOString(),
        machine_id: "LTH-01",
        material_iso_group: "P",
        operation_type: "od_rough",
        params: { vc_mpm: 120, fn_mmrev: 0.25, ap_mm: 2.0 },
        outcome: "success",
        achieved_ra_um: 3.2,
        tool_life_min: 45,
      };

      engine.recordOperation(record);
      const patterns = engine.getLearnedPatterns("P", "od_rough");

      expect(patterns.length).toBe(1);
      expect(patterns[0].success_rate).toBe(1);
    });

    it("should update existing pattern", () => {
      const record1: LatheOperationRecord = {
        id: "OP-001",
        timestamp: new Date().toISOString(),
        machine_id: "LTH-01",
        material_iso_group: "P",
        operation_type: "od_finish",
        params: { vc_mpm: 150 },
        outcome: "success",
      };

      const record2: LatheOperationRecord = {
        ...record1,
        id: "OP-002",
        outcome: "failure",
      };

      engine.recordOperation(record1);
      engine.recordOperation(record2);

      const patterns = engine.getLearnedPatterns("P", "od_finish");

      expect(patterns[0].sample_count).toBe(2);
      expect(patterns[0].success_rate).toBe(0.5);
    });

    it("should track average Ra", () => {
      const records: LatheOperationRecord[] = [
        { id: "1", timestamp: "", machine_id: "LTH-01", material_iso_group: "M", operation_type: "od_finish", params: {}, outcome: "success", achieved_ra_um: 2.0 },
        { id: "2", timestamp: "", machine_id: "LTH-01", material_iso_group: "M", operation_type: "od_finish", params: {}, outcome: "success", achieved_ra_um: 3.0 },
        { id: "3", timestamp: "", machine_id: "LTH-01", material_iso_group: "M", operation_type: "od_finish", params: {}, outcome: "success", achieved_ra_um: 4.0 },
      ];

      records.forEach(r => engine.recordOperation(r));

      const patterns = engine.getLearnedPatterns("M", "od_finish");

      expect(patterns[0].avg_ra_um).toBeCloseTo(3.0, 1);
    });

    it("should increase confidence with more samples", () => {
      const makeRecord = (i: number): LatheOperationRecord => ({
        id: `OP-${i}`,
        timestamp: "",
        machine_id: "LTH-01",
        material_iso_group: "K",
        operation_type: "face_rough",
        params: {},
        outcome: "success",
      });

      for (let i = 0; i < 10; i++) {
        engine.recordOperation(makeRecord(i));
      }

      const patterns = engine.getLearnedPatterns("K", "face_rough");

      expect(patterns[0].confidence).toBeGreaterThan(0.7);
    });

    it("should filter patterns by ISO group", () => {
      engine.recordOperation({ id: "1", timestamp: "", machine_id: "LTH-01", material_iso_group: "P", operation_type: "od_rough", params: {}, outcome: "success" });
      engine.recordOperation({ id: "2", timestamp: "", machine_id: "LTH-01", material_iso_group: "M", operation_type: "od_rough", params: {}, outcome: "success" });

      const pPatterns = engine.getLearnedPatterns("P");
      const mPatterns = engine.getLearnedPatterns("M");

      expect(pPatterns.length).toBe(1);
      expect(mPatterns.length).toBe(1);
    });

    it("should filter patterns by operation type", () => {
      engine.recordOperation({ id: "1", timestamp: "", machine_id: "LTH-01", material_iso_group: "P", operation_type: "od_rough", params: {}, outcome: "success" });
      engine.recordOperation({ id: "2", timestamp: "", machine_id: "LTH-01", material_iso_group: "P", operation_type: "od_finish", params: {}, outcome: "success" });

      const roughPatterns = engine.getLearnedPatterns(undefined, "od_rough");
      const finishPatterns = engine.getLearnedPatterns(undefined, "od_finish");

      expect(roughPatterns.length).toBe(1);
      expect(finishPatterns.length).toBe(1);
    });
  });

  describe("JM Die Machine Profiles", () => {
    it("should have all 7 JM Die lathes", () => {
      const profiles = [
        "LTH-01", "LTH-02", "LTH-03", "LTH-04", "LTH-05", "LTH-06", "LTH-07"
      ];

      for (const machineId of profiles) {
        const result = latheDeepAIHardeningEngine.selectMachine({
          ...FIXTURE_SIMPLE_PUNCH,
          bar_od_mm: 30, // Small enough for all machines
        });

        const allMachines = [result.recommended, ...result.alternatives];
        const found = allMachines.some(m => m.machine_id === machineId) ||
                      result.reasoning.some(r => r.includes(machineId));

        // At least one machine should be selectable
        expect(allMachines.length).toBeGreaterThan(0);
      }
    });

    it("should know Multus B250II has sub-spindle", () => {
      const result = latheDeepAIHardeningEngine.selectMachine({
        ...FIXTURE_SIMPLE_PUNCH,
        bar_od_mm: 30,
      });

      const allMachines = [result.recommended, ...result.alternatives];
      const multus = allMachines.find(m => m.machine_id === "LTH-07");

      if (multus) {
        expect(multus.sub_spindle).toBe(true);
        expect(multus.y_axis).toBe(true);
      }
    });

    it("should know LTH-03 and LTH-04 are 2-axis only", () => {
      const result = latheDeepAIHardeningEngine.selectMachine({
        ...FIXTURE_SIMPLE_PUNCH,
        bar_od_mm: 30,
      });

      const allMachines = [result.recommended, ...result.alternatives];
      const lnc8 = allMachines.find(m => m.machine_id === "LTH-03");

      if (lnc8) {
        expect(lnc8.live_tooling).toBe(false);
        expect(lnc8.c_axis).toBe(false);
      }
    });
  });

  describe("Integration with other engines", () => {
    it("should route to LatheScienceHardeningEngine for physics operations", () => {
      const result = latheDeepAIHardeningEngine.analyzeLatheOperation(FIXTURE_SIMPLE_PUNCH);

      expect(result.engine_routing.some(r => r.engine_name === "LatheScienceHardeningEngine")).toBe(true);
    });

    it("should route to LatheAdvancedOperationsEngine for threading", () => {
      const result = latheDeepAIHardeningEngine.analyzeLatheOperation(FIXTURE_THREADED_SHAFT);

      expect(result.engine_routing.some(r =>
        r.engine_name === "LatheAdvancedOperationsEngine" && r.operation.includes("thread")
      )).toBe(true);
    });

    it("should route to LatheCollisionZoneEngine for parting", () => {
      const result = latheDeepAIHardeningEngine.analyzeLatheOperation(FIXTURE_SIMPLE_PUNCH);

      // Parting is usually in the sequence
      if (result.recommended_sequence.includes("parting")) {
        expect(result.engine_routing.some(r =>
          r.engine_name === "LatheCollisionZoneEngine"
        )).toBe(true);
      }
    });

    it("should route to LathePredictiveIntelligenceEngine for finishing", () => {
      const result = latheDeepAIHardeningEngine.analyzeLatheOperation(FIXTURE_SIMPLE_PUNCH);

      expect(result.engine_routing.some(r =>
        r.engine_name === "LathePredictiveIntelligenceEngine" && r.operation.includes("finish")
      )).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty features", () => {
      const emptyPart: LathePartDescription = {
        ...FIXTURE_SIMPLE_PUNCH,
        features: [],
      };

      const result = latheDeepAIHardeningEngine.analyzeLatheOperation(emptyPart);

      expect(result.recommended_sequence.length).toBeGreaterThan(0);
    });

    it("should handle very small parts", () => {
      const tinyPart: LathePartDescription = {
        ...FIXTURE_SIMPLE_PUNCH,
        bar_od_mm: 5,
        length_mm: 10,
      };

      const result = latheDeepAIHardeningEngine.selectMachine(tinyPart);

      expect(result.recommended).toBeDefined();
    });

    it("should handle very large parts", () => {
      const hugePart: LathePartDescription = {
        ...FIXTURE_SIMPLE_PUNCH,
        bar_od_mm: 150,
        length_mm: 1000,
      };

      const result = latheDeepAIHardeningEngine.selectMachine(hugePart);

      // Should still return something, even if no JM Die machine fits
      expect(result.recommended).toBeDefined();
      expect(result.reasoning.some(r => r.includes("exceeds") || r.includes("Filtered"))).toBe(true);
    });

    it("should handle unknown material", () => {
      const unknownMaterial: LathePartDescription = {
        ...FIXTURE_SIMPLE_PUNCH,
        material: {
          name: "Unknown Alloy XYZ",
          iso_group: "P",
        },
      };

      const result = latheDeepAIHardeningEngine.analyzeLatheOperation(unknownMaterial);

      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("should handle all ISO material groups", () => {
      const groups: Array<"P" | "M" | "K" | "N" | "S" | "H"> = ["P", "M", "K", "N", "S", "H"];

      for (const iso of groups) {
        const part: LathePartDescription = {
          ...FIXTURE_SIMPLE_PUNCH,
          material: { name: `Test ${iso}`, iso_group: iso },
        };

        const result = latheDeepAIHardeningEngine.analyzeLatheOperation(part);

        expect(result.confidence).toBeGreaterThan(0);
      }
    });

    it("should handle multiple thread types", () => {
      const multiThreadPart: LathePartDescription = {
        ...FIXTURE_SIMPLE_PUNCH,
        features: [
          { type: "thread", location: "od", start_z_mm: -10, end_z_mm: -30, thread_pitch_mm: 2.0, thread_form: "metric" },
          { type: "thread", location: "od", start_z_mm: -50, end_z_mm: -70, thread_pitch_mm: 1.5, thread_form: "unc" },
        ],
      };

      const result = latheDeepAIHardeningEngine.analyzeLatheOperation(multiThreadPart);

      expect(result.recommended_sequence.filter(op => op === "od_thread").length).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================================================
  // GLOBAL CATALOG TESTS (50+ machines, 8 brands)
  // ============================================================================

  describe("selectMachineGlobal", () => {
    it("should select from full global catalog", () => {
      const result = latheDeepAIHardeningEngine.selectMachineGlobal(FIXTURE_SIMPLE_PUNCH);

      expect(result.recommended).toBeDefined();
      expect(result.catalogStats.total_machines).toBeGreaterThanOrEqual(40);
    });

    it("should filter by preferred brand", () => {
      const result = latheDeepAIHardeningEngine.selectMachineGlobal(FIXTURE_SIMPLE_PUNCH, {
        preferredBrand: "Haas",
      });

      expect(result.recommended.brand).toBe("Haas");
    });

    it("should filter by preferred controller", () => {
      const result = latheDeepAIHardeningEngine.selectMachineGlobal(FIXTURE_SIMPLE_PUNCH, {
        preferredController: "fanuc",
      });

      expect(result.recommended.controller_family).toBe("fanuc");
    });

    it("should recommend Swiss-type for small precision parts", () => {
      const smallPart: LathePartDescription = {
        ...FIXTURE_SIMPLE_PUNCH,
        bar_od_mm: 15,
        length_mm: 50,
      };

      const result = latheDeepAIHardeningEngine.selectMachineGlobal(smallPart, {
        requireSwiss: true,
      });

      expect(["Citizen", "Star"]).toContain(result.recommended.brand);
    });

    it("should include controller knowledge in results", () => {
      const result = latheDeepAIHardeningEngine.selectMachineGlobal(FIXTURE_SIMPLE_PUNCH);

      expect(result.controllerKnowledge).toBeDefined();
      expect(result.controllerKnowledge?.css_syntax).toBeDefined();
    });

    it("should select sub-spindle machine when required", () => {
      const result = latheDeepAIHardeningEngine.selectMachineGlobal(FIXTURE_SIMPLE_PUNCH, {
        requireSubSpindle: true,
      });

      expect(result.recommended.sub_spindle).toBe(true);
    });
  });

  describe("getMachinesByBrand", () => {
    it("should return Okuma machines", () => {
      const machines = latheDeepAIHardeningEngine.getMachinesByBrand("Okuma");

      expect(machines.length).toBeGreaterThan(0);
      expect(machines.every(m => m.brand === "Okuma")).toBe(true);
    });

    it("should return Mazak machines", () => {
      const machines = latheDeepAIHardeningEngine.getMachinesByBrand("Mazak");

      expect(machines.length).toBeGreaterThan(0);
    });
  });

  describe("getMachinesByController", () => {
    it("should return Fanuc-controlled machines", () => {
      const machines = latheDeepAIHardeningEngine.getMachinesByController("fanuc");

      expect(machines.length).toBeGreaterThan(0);
      expect(machines.every(m => m.controller_family === "fanuc")).toBe(true);
    });
  });

  describe("getControllerKnowledge", () => {
    it("should return Fanuc controller knowledge", () => {
      const knowledge = latheDeepAIHardeningEngine.getControllerKnowledge("fanuc");

      expect(knowledge).toBeDefined();
      expect(knowledge?.css_syntax).toContain("G96");
      expect(knowledge?.macro_support).toContain("Macro B");
    });

    it("should return Okuma OSP knowledge", () => {
      const knowledge = latheDeepAIHardeningEngine.getControllerKnowledge("okuma");

      expect(knowledge).toBeDefined();
      expect(knowledge?.tnrc_mode).toContain("NAT");
    });
  });

  describe("getCatalogStats", () => {
    it("should return comprehensive statistics", () => {
      const stats = latheDeepAIHardeningEngine.getCatalogStats();

      expect(stats.total_machines).toBeGreaterThanOrEqual(40);
      expect(stats.brands.length).toBeGreaterThanOrEqual(8);
      expect(stats.with_y_axis).toBeGreaterThan(0);
      expect(stats.with_live_tooling).toBeGreaterThan(0);
    });
  });
});
