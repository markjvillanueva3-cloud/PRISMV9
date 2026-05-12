/**
 * LatheAGICoreEngine Tests
 * =========================
 * Tests for the central AGI orchestrator including:
 * - Unified knowledge graph
 * - Chain-of-thought reasoning
 * - Natural language query
 * - Program analysis
 * - Program synthesis
 * - Learning feedback
 */

import { describe, it, expect } from "vitest";
import { latheAGICoreEngine, LatheAGICoreEngine } from "../engines/LatheAGICoreEngine.js";

const SAMPLE_PROGRAM = `$TEST.MIN%
NAT01 (OD ROUGH .032R)
T010101
G50 S1200
G96 S250 M3
G0 X1.5 Z.05 M8
G1 X-.04 F.005
G85 NTURN D.08 U.01 W.005 F.006
G80
G0 X20 Z20
M1

NAT03 (CENTER DRILL)
T030303
G97 S600 M3
G0 X0 Z.1
G1 Z-.15 F.002
G0 X20 Z20
M1

NAT05 (DRILL .500)
T050505
G97 S800 M3
G74 X0 Z-1.5 D.3 L.3 F.003
G0 X20 Z20
M1

NAT11 (CUTOFF .125)
T111111
G50 S800
G96 S150 M3
G0 X1.5 Z-.5
G1 X-.04 F.0012
G0 X20 Z20
M2%`;

describe("LatheAGICoreEngine", () => {
  describe("Engine Status", () => {
    it("should return AGI status", () => {
      const status = latheAGICoreEngine.getStatus();

      expect(status).toBeDefined();
      expect(status.knowledge_nodes).toBeGreaterThan(0);
      expect(status.knowledge_stats).toBeDefined();
      expect(status.confidence_calibration).toBeGreaterThan(0);

      console.log("\n=== AGI Status ===");
      console.log(`Knowledge nodes: ${status.knowledge_nodes}`);
      console.log(`Queries processed: ${status.total_queries_processed}`);
      console.log(`Programs analyzed: ${status.programs_analyzed}`);
      console.log(`Programs synthesized: ${status.programs_synthesized}`);
    });

    it("should have knowledge graph stats", () => {
      const status = latheAGICoreEngine.getStatus();

      expect(status.knowledge_stats.total_nodes).toBeGreaterThan(10);
      expect(status.knowledge_stats.total_connections).toBeGreaterThan(0);
      expect(status.knowledge_stats.by_type).toBeDefined();

      console.log("\n=== Knowledge Graph Stats ===");
      for (const [type, count] of Object.entries(status.knowledge_stats.by_type)) {
        console.log(`  ${type}: ${count}`);
      }
    });

    it("should have material nodes", () => {
      const status = latheAGICoreEngine.getStatus();
      expect(status.knowledge_stats.by_type.material).toBeGreaterThan(0);
    });

    it("should have operation nodes", () => {
      const status = latheAGICoreEngine.getStatus();
      expect(status.knowledge_stats.by_type.operation).toBeGreaterThan(0);
    });

    it("should have rule nodes", () => {
      const status = latheAGICoreEngine.getStatus();
      expect(status.knowledge_stats.by_type.rule).toBeGreaterThan(0);
    });
  });

  describe("Natural Language Query", () => {
    it("should process optimization query", () => {
      const result = latheAGICoreEngine.query("How can I optimize cutting speeds for M2 tool steel?");

      expect(result.query).toContain("optimize");
      expect(result.understanding.intent).toBe("optimization");
      expect(result.understanding.entities.material).toBe("M2");
      expect(result.reasoning.chain.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.explanation).toBeTruthy();

      console.log("\n=== Optimization Query ===");
      console.log(`Intent: ${result.understanding.intent}`);
      console.log(`Confidence: ${(result.reasoning.confidence * 100).toFixed(1)}%`);
      console.log(`Recommendations: ${result.recommendations.length}`);
    });

    it("should process troubleshooting query", () => {
      // Use "fix" or "problem" to trigger troubleshooting intent
      const result = latheAGICoreEngine.query("Fix chatter problem on my boring operation");

      expect(result.understanding.intent).toBe("troubleshooting");
      expect(result.understanding.context).toContain("vibration_issue");
      expect(result.recommendations.some(r => r.action.toLowerCase().includes("depth") || r.action.toLowerCase().includes("overhang"))).toBe(true);

      console.log("\n=== Troubleshooting Query ===");
      console.log(`Context: ${result.understanding.context.join(", ")}`);
      for (const rec of result.recommendations.slice(0, 3)) {
        console.log(`  [${rec.priority}] ${rec.action}`);
      }
    });

    it("should process explanation query", () => {
      const result = latheAGICoreEngine.query("Why do I need G50 before G96?");

      expect(result.understanding.intent).toBe("explanation");
      expect(result.reasoning.chain.some(step => step.evidence.some(e => e.includes("G50") || e.includes("RPM")))).toBe(true);
    });

    it("should process generation query", () => {
      const result = latheAGICoreEngine.query("Create a roughing program for D2 steel");

      expect(result.understanding.intent).toBe("generation");
      expect(result.understanding.entities.material).toBe("D2");
    });

    it("should extract hardened material context", () => {
      const result = latheAGICoreEngine.query("What parameters for hard turning H13?");

      expect(result.understanding.entities.material).toBe("H13");
      expect(result.understanding.context).toContain("hardened_material");
    });

    it("should suggest follow-up questions", () => {
      const result = latheAGICoreEngine.query("I'm having surface finish problems on my finish pass");

      expect(result.follow_up_questions.length).toBeGreaterThan(0);
      expect(result.understanding.context).toContain("finish_critical");

      console.log("\n=== Follow-up Questions ===");
      for (const q of result.follow_up_questions) {
        console.log(`  • ${q}`);
      }
    });

    it("should always recommend G50 safety check", () => {
      const result = latheAGICoreEngine.query("What's the best feed rate for OD turning?");

      const g50Rec = result.recommendations.find(r => r.action.includes("G50"));
      expect(g50Rec).toBeDefined();
      expect(g50Rec?.priority).toBe("critical");
    });
  });

  describe("Chain-of-Thought Reasoning", () => {
    it("should generate multi-step reasoning chain", () => {
      const result = latheAGICoreEngine.query("How do I reduce tool wear when threading M2 steel?");

      expect(result.reasoning.chain.length).toBeGreaterThanOrEqual(5);

      const stepTypes = result.reasoning.chain.map(s => s.type);
      expect(stepTypes).toContain("observe");
      expect(stepTypes).toContain("hypothesize");
      expect(stepTypes).toContain("conclude");

      console.log("\n=== Reasoning Chain ===");
      for (const step of result.reasoning.chain) {
        console.log(`  ${step.step_id}. [${step.type}] ${step.content.slice(0, 60)}...`);
      }
    });

    it("should have confidence scores for each step", () => {
      const result = latheAGICoreEngine.query("What drill speed for hardened steel?");

      for (const step of result.reasoning.chain) {
        expect(step.confidence).toBeGreaterThan(0);
        expect(step.confidence).toBeLessThanOrEqual(1);
      }
    });

    it("should include evidence in reasoning steps", () => {
      const result = latheAGICoreEngine.query("Optimize boring for D2 tool steel");

      for (const step of result.reasoning.chain) {
        expect(Array.isArray(step.evidence)).toBe(true);
      }
    });
  });

  describe("Program Analysis", () => {
    it("should analyze program with full AGI capabilities", () => {
      const result = latheAGICoreEngine.analyzeProgram(SAMPLE_PROGRAM, "test.MIN");

      expect(result.physics).toBeDefined();
      expect(result.intelligence).toBeDefined();
      expect(result.reasoning).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);

      console.log("\n=== Program Analysis ===");
      console.log(`Physics score: ${result.physics.score}/100`);
      console.log(`Reasoning steps: ${result.reasoning.length}`);
      console.log(`Recommendations: ${result.recommendations.length}`);
      console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    });

    it("should identify issues in program", () => {
      const result = latheAGICoreEngine.analyzeProgram(SAMPLE_PROGRAM, "test.MIN");

      expect(Array.isArray(result.physics.issues)).toBe(true);

      if (result.physics.issues.length > 0) {
        console.log("\n=== Issues Found ===");
        for (const issue of result.physics.issues.slice(0, 5)) {
          console.log(`  [${issue.severity}] ${issue.issue}`);
        }
      }
    });

    it("should generate recommendations from issues", () => {
      const result = latheAGICoreEngine.analyzeProgram(SAMPLE_PROGRAM, "test.MIN");

      for (const rec of result.recommendations) {
        expect(rec.action).toBeTruthy();
        expect(rec.priority).toBeTruthy();
        expect(rec.reasoning).toBeTruthy();
      }
    });

    it("should apply chain-of-thought to analysis", () => {
      const result = latheAGICoreEngine.analyzeProgram(SAMPLE_PROGRAM, "test.MIN");

      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.reasoning.some(s => s.type === "observe")).toBe(true);
      expect(result.reasoning.some(s => s.type === "conclude")).toBe(true);
    });
  });

  describe("Program Synthesis", () => {
    it("should synthesize program from part specification", () => {
      const spec = {
        name: "TEST_PART_001",
        material: "M2",
        od_max_mm: 50,
        od_min_mm: 45,
        id_mm: 20,
        length_mm: 75,
        features: [
          { type: "face" as const, location_z: 0, dimension: 50 },
          { type: "turn" as const, location_z: 25, dimension: 45 },
          { type: "bore" as const, location_z: 50, dimension: 20 },
        ],
        surface_finish_ra: 1.6,
        quantity: 10,
      };

      const result = latheAGICoreEngine.synthesizeProgram(spec);

      expect(result.part_spec).toBe(spec);
      expect(result.selected_machine).toBeTruthy();
      expect(result.machine_reasoning).toBeTruthy();
      expect(result.operations.length).toBeGreaterThan(0);
      expect(result.gcode).toContain("%");
      expect(result.confidence).toBeGreaterThan(0);

      console.log("\n=== Synthesized Program ===");
      console.log(`Machine: ${result.selected_machine}`);
      console.log(`Reasoning: ${result.machine_reasoning}`);
      console.log(`Operations: ${result.operations.length}`);
      console.log(`Cycle time: ${result.estimated_cycle_time_min.toFixed(1)} min`);
      console.log(`G-code lines: ${result.gcode.split("\n").length}`);
    });

    it("should select appropriate machine", () => {
      const smallPart = {
        name: "SMALL_PART",
        material: "4140",
        od_max_mm: 30,
        length_mm: 40,
        features: [{ type: "turn" as const, location_z: 20, dimension: 25 }],
        quantity: 1,
      };

      const result = latheAGICoreEngine.synthesizeProgram(smallPart);

      expect(result.selected_machine).toBeTruthy();
      expect(result.machine_reasoning.length).toBeGreaterThan(10);
    });

    it("should plan operations in correct sequence", () => {
      const spec = {
        name: "SEQUENCE_TEST",
        material: "1045",
        od_max_mm: 60,
        od_min_mm: 55,
        id_mm: 25,
        length_mm: 80,
        features: [
          { type: "turn" as const, location_z: 30, dimension: 55 },
          { type: "bore" as const, location_z: 60, dimension: 25 },
        ],
        quantity: 5,
      };

      const result = latheAGICoreEngine.synthesizeProgram(spec);

      // First operation should be face
      expect(result.operations[0].type).toBe("face");

      // Cutoff should be last (if multiple quantity)
      const lastOp = result.operations[result.operations.length - 1];
      expect(lastOp.type).toBe("cutoff");

      // Center drill before drilling
      const drillIdx = result.operations.findIndex(o => o.type === "drill");
      const centerIdx = result.operations.findIndex(o => o.type === "center_drill");
      if (drillIdx >= 0 && centerIdx >= 0) {
        expect(centerIdx).toBeLessThan(drillIdx);
      }
    });

    it("should calculate physics-based parameters", () => {
      const spec = {
        name: "PARAM_TEST",
        material: "D2",
        od_max_mm: 50,
        length_mm: 60,
        features: [{ type: "turn" as const, location_z: 30, dimension: 45 }],
        quantity: 1,
      };

      const result = latheAGICoreEngine.synthesizeProgram(spec);

      for (const op of result.operations) {
        expect(op.parameters.vc_m_min).toBeGreaterThan(0);
        expect(op.parameters.feed_mm_rev).toBeGreaterThan(0);
        expect(op.parameters.doc_mm).toBeGreaterThan(0);
        expect(["CSS", "RPM"]).toContain(op.parameters.spindle_mode);
      }
    });

    it("should set lower speeds for hardened materials", () => {
      const hardened = latheAGICoreEngine.synthesizeProgram({
        name: "HARD",
        material: "M2",
        od_max_mm: 40,
        length_mm: 50,
        features: [{ type: "turn" as const, location_z: 25, dimension: 35 }],
        quantity: 1,
      });

      const soft = latheAGICoreEngine.synthesizeProgram({
        name: "SOFT",
        material: "1045",
        od_max_mm: 40,
        length_mm: 50,
        features: [{ type: "turn" as const, location_z: 25, dimension: 35 }],
        quantity: 1,
      });

      const hardRough = hardened.operations.find(o => o.type === "od_rough");
      const softRough = soft.operations.find(o => o.type === "od_rough");

      expect(hardRough?.parameters.vc_m_min).toBeLessThan(softRough?.parameters.vc_m_min || Infinity);
    });

    it("should generate valid G-code", () => {
      const spec = {
        name: "GCODE_TEST",
        material: "4140",
        od_max_mm: 45,
        length_mm: 55,
        features: [{ type: "turn" as const, location_z: 25, dimension: 40 }],
        quantity: 1,
      };

      const result = latheAGICoreEngine.synthesizeProgram(spec);

      expect(result.gcode).toContain(".MIN%");
      expect(result.gcode).toContain("M2");
      expect(result.gcode).toMatch(/G0|G00/);
      expect(result.gcode).toMatch(/G1|G01/);
      expect(result.gcode).toMatch(/M3|M03/);
    });

    it("should include G50 before G96 in generated code", () => {
      const spec = {
        name: "SAFETY_TEST",
        material: "S7",
        od_max_mm: 50,
        length_mm: 60,
        features: [{ type: "turn" as const, location_z: 30, dimension: 45 }],
        quantity: 1,
      };

      const result = latheAGICoreEngine.synthesizeProgram(spec);

      const lines = result.gcode.split("\n");
      let g50Found = false;
      let g96Found = false;

      for (const line of lines) {
        if (line.includes("G50")) g50Found = true;
        if (line.includes("G96")) {
          expect(g50Found).toBe(true); // G50 must come before G96
          g96Found = true;
        }
      }

      expect(g96Found).toBe(true); // Should have CSS mode
    });
  });

  describe("Learning Feedback", () => {
    it("should process feedback", () => {
      const initialStatus = latheAGICoreEngine.getStatus();
      const initialFeedback = initialStatus.feedback_received;

      latheAGICoreEngine.processFeedback({
        program_id: "test_001",
        actual_outcome: {
          cycle_time_min: 5.2,
          surface_finish_ra: 0.8,
          tool_life_parts: 45,
          success: true,
        },
        operator_notes: "Good finish achieved",
      });

      const newStatus = latheAGICoreEngine.getStatus();
      expect(newStatus.feedback_received).toBe(initialFeedback + 1);
    });

    it("should update learning timestamp", () => {
      const before = latheAGICoreEngine.getStatus().last_learning_update;

      latheAGICoreEngine.processFeedback({
        program_id: "test_002",
        actual_outcome: {
          issues: ["chatter on boring"],
          success: false,
        },
      });

      const after = latheAGICoreEngine.getStatus().last_learning_update;
      expect(after.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe("Integration", () => {
    it("should maintain state across operations", () => {
      const engine = new LatheAGICoreEngine();

      // Query
      engine.query("What feed for roughing?");
      const afterQuery = engine.getStatus();
      expect(afterQuery.total_queries_processed).toBe(1);

      // Analyze
      engine.analyzeProgram(SAMPLE_PROGRAM, "test.MIN");
      const afterAnalyze = engine.getStatus();
      expect(afterAnalyze.programs_analyzed).toBe(1);

      // Synthesize
      engine.synthesizeProgram({
        name: "INT_TEST",
        material: "4140",
        od_max_mm: 40,
        length_mm: 50,
        features: [],
        quantity: 1,
      });
      const afterSynth = engine.getStatus();
      expect(afterSynth.programs_synthesized).toBe(1);

      // Feedback
      engine.processFeedback({
        program_id: "int_test",
        actual_outcome: { success: true },
      });
      const afterFeedback = engine.getStatus();
      expect(afterFeedback.feedback_received).toBe(1);
    });

    it("should track reasoning chains generated", () => {
      const engine = new LatheAGICoreEngine();

      engine.query("Optimize speeds");
      engine.query("Fix chatter");
      engine.query("What feed for finishing?");

      const status = engine.getStatus();
      // Only query() increments reasoning_chains_generated
      expect(status.reasoning_chains_generated).toBe(3);
    });
  });
});
