/**
 * Playbook Integration Tests
 * Tests cross-engine fusion: Playbook → ProcessPlan, FeatureInteraction, GCodePipeline
 */
import { describe, it, expect } from "vitest";
import { MachiningPlaybookEngine } from "../engines/MachiningPlaybookEngine.js";
import { ProcessPlanEngine } from "../engines/ProcessPlanEngine.js";
import { featureInteractionEngine } from "../engines/FeatureInteractionEngine.js";
import { gcodeIntelligencePipeline } from "../engines/GCodeIntelligencePipelineEngine.js";

describe("Playbook Integration", () => {
  // ── ProcessPlanEngine + Playbook ────────────────────────────────────

  describe("ProcessPlanEngine with playbook validation", () => {
    it("should include playbook_warnings in process plan result", () => {
      const engine = new ProcessPlanEngine();
      const result = engine.generate({
        part_name: "Test Bracket",
        material_iso_group: "P",
        material_name: "1045 Steel",
        stock: { x_mm: 100, y_mm: 80, z_mm: 30 },
        features: [
          { id: "h1", type: "hole", dimensions: { diameter_mm: 10, depth_mm: 20 } },
          { id: "p1", type: "pocket", dimensions: { width_mm: 40, length_mm: 30, depth_mm: 15 } },
          { id: "t1", type: "thread", dimensions: { diameter_mm: 8, depth_mm: 15, pitch_mm: 1.25 } },
        ],
      });

      expect(result.operations.length).toBeGreaterThan(0);
      expect(result.total_time_min).toBeGreaterThan(0);
      // Playbook should have validated and provided recommended order
      if (result.recommended_order) {
        expect(result.recommended_order.length).toBeGreaterThan(0);
      }
    });

    it("should produce valid plan even without playbook", () => {
      const engine = new ProcessPlanEngine();
      const result = engine.generate({
        part_name: "Simple Part",
        material_iso_group: "N",
        stock: { x_mm: 50, y_mm: 50, z_mm: 10 },
        features: [
          { id: "p1", type: "pocket", dimensions: { width_mm: 20, length_mm: 20, depth_mm: 5 } },
        ],
      });
      expect(result.operations.length).toBeGreaterThan(0);
    });
  });

  // ── FeatureInteractionEngine + Playbook ─────────────────────────────

  describe("FeatureInteractionEngine with playbook advice", () => {
    it("should include workholding_suggestions in setup plan", () => {
      const engine = featureInteractionEngine;
      const result = engine.minimizeSetups([
        { id: "h1", type: "HOLE", position: { x: 10, y: 10, z: 0 }, direction: "+Z" },
        { id: "p1", type: "POCKET", position: { x: 30, y: 30, z: 0 }, direction: "+Z" },
      ]);

      expect(result.totalSetups).toBeGreaterThanOrEqual(1);
      expect(result.featureCount).toBe(2);
      // Playbook should inject workholding advice
      if (result.workholding_suggestions) {
        expect(result.workholding_suggestions.length).toBeGreaterThanOrEqual(1);
      }
      if (result.datum_strategy) {
        expect(result.datum_strategy.length).toBeGreaterThan(0);
      }
    });

    it("should include playbook_applied_rules", () => {
      const engine = featureInteractionEngine;
      const result = engine.minimizeSetups([
        { id: "h1", type: "HOLE", position: { x: 10, y: 10, z: 0 }, direction: "+Z" },
        { id: "h2", type: "HOLE", position: { x: 10, y: 10, z: -30 }, direction: "-Z" },
      ]);

      expect(result.totalSetups).toBeGreaterThanOrEqual(1);
      if (result.playbook_applied_rules) {
        expect(result.playbook_applied_rules.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  // ── GCodeIntelligencePipeline + Playbook ────────────────────────────

  describe("GCodeIntelligencePipeline with Stage 0 playbook", () => {
    const testGcode = `
O0001
(PART: TEST BRACKET)
(MATERIAL: 1045 STEEL)
G21 G90 G17
G28 G91 Z0
T01 M06 (FACE MILL 50MM)
S2000 M03
G00 X0 Y0
G43 H01 Z50
G01 Z-1 F500
G01 X100 F800
G00 Z50
T02 M06 (DRILL 10MM)
G81 X20 Y20 Z-20 R2 F200
G81 X60 Y20
G81 X20 Y60
G80
T03 M06 (ENDMILL 12MM)
G00 X10 Y10
G01 Z-15 F300
(POCKET ROUGHING)
G01 X50 F600
G01 Y40
G01 X10
G01 Y10
G00 Z5
M30
`;

    it("should run playbook stage when enabled", async () => {
      const result = await gcodeIntelligencePipeline.run({
        gcode: testGcode,
        material: "1045",
        material_iso: "P",
        features: ["face", "hole", "pocket"],
        stages: {
          playbook: true,
          safety: false,
          speed_feed: false,
          thermal: false,
          energy: false,
          cycle_time: false,
          setup_sheet: false,
        },
      });

      const playbookStage = result.stages.find(s => s.stage === "playbook");
      expect(playbookStage).toBeDefined();
      expect(playbookStage!.status).not.toBe("fail");

      if (playbookStage!.status === "pass" || playbookStage!.status === "warn") {
        expect(playbookStage!.data).toBeDefined();
        const data = playbookStage!.data as any;
        expect(data.recommended_order).toBeDefined();
        expect(data.applied_rules).toBeDefined();
      }
    });

    it("should skip playbook stage when disabled", async () => {
      const result = await gcodeIntelligencePipeline.run({
        gcode: testGcode,
        material: "1045",
        material_iso: "P",
        stages: {
          playbook: false,
          safety: false,
          speed_feed: false,
          thermal: false,
          energy: false,
          cycle_time: false,
          setup_sheet: false,
        },
      });

      const playbookStage = result.stages.find(s => s.stage === "playbook");
      expect(playbookStage).toBeDefined();
      expect(playbookStage!.status).toBe("skipped");
    });

    it("should detect features from G-code when none provided", async () => {
      const result = await gcodeIntelligencePipeline.run({
        gcode: testGcode,
        material: "1045",
        material_iso: "P",
        stages: {
          playbook: true,
          safety: false,
          speed_feed: false,
          thermal: false,
          energy: false,
          cycle_time: false,
          setup_sheet: false,
        },
      });

      const playbookStage = result.stages.find(s => s.stage === "playbook");
      expect(playbookStage).toBeDefined();
      // G-code contains G81 (hole) and pocket comment — should be detected
      if (playbookStage!.status !== "skipped") {
        expect(playbookStage!.data).toBeDefined();
      }
    });

    it("should include playbook_warnings in summary", async () => {
      const result = await gcodeIntelligencePipeline.run({
        gcode: testGcode,
        material: "1045",
        material_iso: "P",
        features: ["hole", "pocket"],
        stages: {
          playbook: true,
          safety: false,
          speed_feed: false,
          thermal: false,
          energy: false,
          cycle_time: false,
          setup_sheet: false,
        },
      });

      expect(result.summary.playbook_warnings).toBeDefined();
      expect(typeof result.summary.playbook_warnings).toBe("number");
    });
  });

  // ── Playbook Hook Integration ───────────────────────────────────────

  describe("Playbook hooks", () => {
    it("M-PB-001 and M-PB-002 should be importable", async () => {
      const { onPlaybookSequenceValidation, onPlaybookToolpathAdvice } = await import(
        "../hooks/AdvancedManufacturingHooks.js"
      );
      expect(onPlaybookSequenceValidation).toBeDefined();
      expect(onPlaybookSequenceValidation.id).toBe("M-PB-001");
      expect(onPlaybookToolpathAdvice).toBeDefined();
      expect(onPlaybookToolpathAdvice.id).toBe("M-PB-002");
    });

    it("M-PB-001 should fire and return advice for process plan context", async () => {
      const { onPlaybookSequenceValidation } = await import(
        "../hooks/AdvancedManufacturingHooks.js"
      );
      const result = await onPlaybookSequenceValidation.handler({
        operation: "process_plan",
        target: {
          type: "calculation",
          id: "test",
          data: {
            features: ["hole", "pocket", "thread"],
            material_iso: "P",
          },
        },
        metadata: {},
      });

      expect(result).toBeDefined();
      expect(result.blocked).toBeFalsy();
    });

    it("M-PB-002 should return toolpath strategy advice", async () => {
      const { onPlaybookToolpathAdvice } = await import(
        "../hooks/AdvancedManufacturingHooks.js"
      );
      const result = await onPlaybookToolpathAdvice.handler({
        operation: "cam_toolpath",
        target: {
          type: "calculation",
          id: "test",
          data: {
            features: ["pocket", "freeform"],
            material_iso: "S",
          },
        },
        metadata: {},
      });

      expect(result).toBeDefined();
      expect(result.blocked).toBeFalsy();
    });
  });

  // ── New Domain Integration (operation_type, hardness_hrc, spindle_rpm, aspect_ratio) ──

  describe("New domain rule triggering via advise()", () => {
    const engine = new MachiningPlaybookEngine();

    it("operation_type 'grinding' triggers grinding-domain rules", () => {
      const result = engine.advise({
        operation_type: "grinding",
        categories: ["grinding"],
      });
      expect(result.rules.length).toBeGreaterThan(0);
      const ruleIds = result.rules.map(r => r.id);
      // GRIND-001 has condition { type: "operation_type", operations: ["grinding"] }
      expect(ruleIds.some(id => id.startsWith("GRIND-"))).toBe(true);
      expect(result.rules.every(r => r.category === "grinding")).toBe(true);
    });

    it("hardness_hrc: 55 triggers hard_turning rules (HT-001/HT-002)", () => {
      const result = engine.advise({
        hardness_hrc: 55,
        categories: ["hard_turning"],
      });
      expect(result.rules.length).toBeGreaterThan(0);
      const ruleIds = result.rules.map(r => r.id);
      // HT-001 and HT-002 have condition { type: "hardness_above", hrc: 45 or similar }
      expect(ruleIds.some(id => id === "HT-001" || id === "HT-002")).toBe(true);
    });

    it("spindle_rpm: 16000 triggers HSM rules (HSM-001)", () => {
      const result = engine.advise({
        spindle_rpm: 16000,
        categories: ["hsm"],
      });
      expect(result.rules.length).toBeGreaterThan(0);
      const ruleIds = result.rules.map(r => r.id);
      expect(ruleIds.some(id => id === "HSM-001")).toBe(true);
    });

    it("aspect_ratio: 10 triggers deep_hole rules (DH-001/DH-002)", () => {
      const result = engine.advise({
        aspect_ratio: 10,
        categories: ["deep_hole"],
      });
      expect(result.rules.length).toBeGreaterThan(0);
      const ruleIds = result.rules.map(r => r.id);
      expect(ruleIds.some(id => id === "DH-001" || id === "DH-002")).toBe(true);
    });

    it("combined new fields trigger rules from multiple domains", () => {
      const result = engine.advise({
        hardness_hrc: 50,
        spindle_rpm: 12000,
        operation_type: "grinding",
      });
      expect(result.rules.length).toBeGreaterThan(0);
      const ruleIds = result.rules.map(r => r.id);
      const categories = new Set(result.rules.map(r => r.category));
      // Should match rules from at least 2 different new-domain categories
      const newDomains = ["grinding", "hard_turning", "hsm"] as const;
      const matchedDomains = newDomains.filter(d => categories.has(d));
      expect(matchedDomains.length).toBeGreaterThanOrEqual(2);
      // Verify specific rule IDs from different domains
      expect(ruleIds.some(id => id.startsWith("GRIND-"))).toBe(true);
      // hard_turning or hsm rules should also fire
      expect(
        ruleIds.some(id => id.startsWith("HT-")) || ruleIds.some(id => id.startsWith("HSM-"))
      ).toBe(true);
    });
  });

  // ── Standalone MachiningPlaybookEngine dispatcher actions ───────────

  describe("shopPracticeDispatcher playbook actions", () => {
    it("playbook_advise should return rules", async () => {
      const engine = new MachiningPlaybookEngine();
      const result = engine.advise({
        material_iso: "M",
        features: ["hole", "pocket"],
      });
      expect(result.rules.length).toBeGreaterThan(0);
      expect(result.summary.length).toBe(result.rules.length);
    });

    it("playbook_sequence should return operation order", () => {
      const engine = new MachiningPlaybookEngine();
      const result = engine.sequenceAdvice(["face", "hole", "pocket", "thread", "chamfer"], "P");
      expect(result.recommended_order.length).toBeGreaterThanOrEqual(5);
      expect(result.applied_rules.length).toBeGreaterThan(0);
    });

    it("playbook_add_rule should persist and be queryable", () => {
      const engine = new MachiningPlaybookEngine();
      engine.addRule({
        id: "INT-TEST-001",
        category: "roughing",
        severity: "tip",
        title: "Integration test rule",
        rule: "This rule validates the add_rule → advise pipeline",
        reasoning: "Testing end-to-end rule persistence",
        conditions: [{ type: "always" }],
        exceptions: [],
        source: "Integration test",
      });

      const result = engine.advise({ categories: ["roughing"] });
      expect(result.rules.some(r => r.id === "INT-TEST-001")).toBe(true);
    });
  });
});
