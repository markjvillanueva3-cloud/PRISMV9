/**
 * Tests for PPGProvenanceWireEngine — U-PPG-SFC-04
 * ================================================
 *
 * Validates PPG provenance citation attachment across ≥5 controller dialects.
 *
 * @module __tests__/engines/ppgProvenanceWireEngine
 * @milestone PSAU-PPG-SFC U-PPG-SFC-04
 */

import { describe, it, expect } from "vitest";
import {
  PPGProvenanceWireEngine,
  ppgProvenanceWireEngine,
} from "../../engines/PPGProvenanceWireEngine.js";
import type { PPGProvenanceWireInput } from "../../schemas/ppgProvenanceSchema.js";

describe("PPGProvenanceWireEngine", () => {
  describe("cite()", () => {
    it("attaches provenance to basic template-only output", () => {
      const input: PPGProvenanceWireInput = {
        engine: "PostProcessorEngine",
        controller: "fanuc",
        post_template_id: "fanuc-generic-mill",
        gcode: "G90 G54\nT1 M6\nS3000 M3\nG0 X0 Y0\nM30",
      };

      const result = PPGProvenanceWireEngine.cite(input);

      expect(result.ok).toBe(true);
      expect(result.provenance.emission_id).toMatch(/^ppg-/);
      expect(result.provenance.engine).toBe("PostProcessorEngine");
      expect(result.provenance.ppg_source).toBe("template");
      expect(result.provenance.dialect_source.controller).toBe("fanuc");
      expect(result.provenance.post_template.template_id).toBe("fanuc-generic-mill");
      expect(result.provenance.citations.length).toBeGreaterThanOrEqual(2);
      expect(result.provenance.audit_hash).toMatch(/^[0-9a-f]{16}$/);
      expect(result.provenance.reasoning_trace).toContain("Controller dialect: fanuc");
    });

    it("generates unique emission IDs", () => {
      const input: PPGProvenanceWireInput = {
        engine: "TestEngine",
        controller: "haas",
      };

      const result1 = PPGProvenanceWireEngine.cite(input);
      const result2 = PPGProvenanceWireEngine.cite(input);

      expect(result1.provenance.emission_id).not.toBe(result2.provenance.emission_id);
    });

    describe("controller dialect coverage (≥5 dialects)", () => {
      const dialects = [
        { controller: "fanuc", expected: "fanuc" },
        { controller: "okuma", expected: "okuma" },
        { controller: "siemens", expected: "siemens" },
        { controller: "haas", expected: "haas" },
        { controller: "heidenhain", expected: "heidenhain" },
        { controller: "mazak", expected: "mazak" },
        { controller: "dmg_mori", expected: "dmg_mori" },
      ];

      for (const { controller, expected } of dialects) {
        it(`handles ${controller} dialect`, () => {
          const input: PPGProvenanceWireInput = {
            engine: "TestEngine",
            controller,
          };

          const result = PPGProvenanceWireEngine.cite(input);

          expect(result.ok).toBe(true);
          expect(result.provenance.dialect_source.controller).toBe(expected);
          expect(result.provenance.citations.some(c => c.source_id === `dialect-${expected}`)).toBe(true);
        });
      }
    });

    describe("dialect alias normalization", () => {
      const aliases = [
        { input: "fanuc_31i", expected: "fanuc" },
        { input: "OSP-P300", expected: "okuma" },
        { input: "Sinumerik 840D", expected: "siemens" },
        { input: "Mazatrol", expected: "mazak" },
        { input: "iTNC 530", expected: "heidenhain" },
        { input: "WinMax", expected: "hurco" },
        { input: "MELDAS", expected: "mitsubishi" },
        { input: "DMG", expected: "dmg_mori" },
      ];

      for (const { input: controllerInput, expected } of aliases) {
        it(`normalizes "${controllerInput}" to "${expected}"`, () => {
          const input: PPGProvenanceWireInput = {
            engine: "TestEngine",
            controller: controllerInput,
          };

          const result = PPGProvenanceWireEngine.cite(input);

          expect(result.ok).toBe(true);
          expect(result.provenance.dialect_source.controller).toBe(expected);
        });
      }

      it("defaults unknown controller to generic", () => {
        const input: PPGProvenanceWireInput = {
          engine: "TestEngine",
          controller: "unknown_controller_xyz",
        };

        const result = PPGProvenanceWireEngine.cite(input);

        expect(result.ok).toBe(true);
        expect(result.provenance.dialect_source.controller).toBe("generic");
      });
    });

    describe("ppg_source determination", () => {
      it("returns 'template' for basic input", () => {
        const input: PPGProvenanceWireInput = {
          engine: "TestEngine",
          controller: "fanuc",
        };

        const result = PPGProvenanceWireEngine.cite(input);

        expect(result.provenance.ppg_source).toBe("template");
      });

      it("returns 'rag' when rag_hits provided", () => {
        const input: PPGProvenanceWireInput = {
          engine: "TestEngine",
          controller: "okuma",
          rag_hits: [
            { program_id: "O1234.NC", similarity: 0.85 },
          ],
        };

        const result = PPGProvenanceWireEngine.cite(input);

        expect(result.provenance.ppg_source).toBe("rag");
        expect(result.provenance.run_log_evidence.length).toBe(1);
        expect(result.provenance.run_log_evidence[0].program_id).toBe("O1234.NC");
      });

      it("returns 'adapter' when adapter_id provided", () => {
        const input: PPGProvenanceWireInput = {
          engine: "TestEngine",
          controller: "haas",
          adapter_id: "haas-vf2-lora-v1",
          adapter_confidence: 0.92,
        };

        const result = PPGProvenanceWireEngine.cite(input);

        expect(result.provenance.ppg_source).toBe("adapter");
        expect(result.provenance.reasoning_trace).toContain("haas-vf2-lora-v1");
      });

      it("returns 'hybrid' when adapter + rag_hits provided", () => {
        const input: PPGProvenanceWireInput = {
          engine: "TestEngine",
          controller: "siemens",
          adapter_id: "siemens-840d-lora",
          rag_hits: [
            { program_id: "PROG_001.mpf", similarity: 0.78 },
          ],
        };

        const result = PPGProvenanceWireEngine.cite(input);

        expect(result.provenance.ppg_source).toBe("hybrid");
      });

      it("returns 'custom' when customizations provided (no adapter/rag)", () => {
        const input: PPGProvenanceWireInput = {
          engine: "TestEngine",
          controller: "fanuc",
          customizations: ["coolant_override", "tool_change_macro"],
        };

        const result = PPGProvenanceWireEngine.cite(input);

        expect(result.provenance.ppg_source).toBe("custom");
      });
    });

    describe("tribal tips handling", () => {
      it("includes tribal tips in provenance", () => {
        const input: PPGProvenanceWireInput = {
          engine: "TestEngine",
          controller: "okuma",
          tribal_tips: [
            { tip_id: "tip-okuma-coolant-01", category: "coolant", confidence: 0.9 },
            { tip_id: "tip-okuma-modal-02", category: "modal", applied_to: "header" },
          ],
        };

        const result = PPGProvenanceWireEngine.cite(input);

        expect(result.ok).toBe(true);
        expect(result.provenance.tribal_tips.length).toBe(2);
        expect(result.provenance.tribal_tips[0].tip_id).toBe("tip-okuma-coolant-01");
        expect(result.provenance.tribal_tips[0].category).toBe("coolant");
        expect(result.provenance.tribal_tips[1].applied_to).toBe("header");
      });

      it("adds tribal tip citations", () => {
        const input: PPGProvenanceWireInput = {
          engine: "TestEngine",
          controller: "mazak",
          tribal_tips: [
            { tip_id: "tip-mazak-turret-01", category: "tool_change" },
          ],
        };

        const result = PPGProvenanceWireEngine.cite(input);

        const tribalCitation = result.provenance.citations.find(
          c => c.source_type === "tribal_tip" && c.source_id === "tip-mazak-turret-01"
        );
        expect(tribalCitation).not.toBe(undefined);
        expect(tribalCitation?.corpus).toBe("tribal-knowledge");
      });
    });

    describe("G-code analysis", () => {
      it("analyzes G-code for metrics when not provided", () => {
        const input: PPGProvenanceWireInput = {
          engine: "TestEngine",
          controller: "fanuc",
          gcode: `%
O0001
G90 G54
T1 M6
S3000 M3
G43 H1 Z1.0
G0 X0 Y0
G1 Z-0.5 F10.0
G1 X1.0 F20.0
T2 M6
S2500 M3
G0 X2.0 Y2.0
M30
%`,
        };

        const result = PPGProvenanceWireEngine.cite(input);

        expect(result.ok).toBe(true);
        expect(result.provenance.output_metrics.block_count).toBeGreaterThan(5);
        expect(result.provenance.output_metrics.tool_changes).toBe(2);
        expect(result.provenance.output_metrics.has_subprograms).toBe(false);
      });

      it("detects subprograms in G-code", () => {
        const input: PPGProvenanceWireInput = {
          engine: "TestEngine",
          controller: "fanuc",
          gcode: "G90\nM98 P1000\nG0 X0\nM30",
        };

        const result = PPGProvenanceWireEngine.cite(input);

        expect(result.provenance.output_metrics.has_subprograms).toBe(true);
      });

      it("uses provided metrics over analyzed values", () => {
        const input: PPGProvenanceWireInput = {
          engine: "TestEngine",
          controller: "fanuc",
          gcode: "G0 X0\nG1 X1",
          block_count: 500,
          tool_changes: 10,
          estimated_cycle_sec: 300,
          has_subprograms: true,
        };

        const result = PPGProvenanceWireEngine.cite(input);

        expect(result.provenance.output_metrics.block_count).toBe(500);
        expect(result.provenance.output_metrics.tool_changes).toBe(10);
        expect(result.provenance.output_metrics.estimated_cycle_sec).toBe(300);
        expect(result.provenance.output_metrics.has_subprograms).toBe(true);
      });
    });

    describe("inline provenance comments", () => {
      it("adds minimal inline provenance by default", () => {
        const input: PPGProvenanceWireInput = {
          engine: "TestEngine",
          controller: "haas",
          gcode: "%\nO0001\nG90 G54\nM30\n%",
        };

        const result = PPGProvenanceWireEngine.cite(input);

        expect(typeof result.gcode_with_provenance).toBe("string");
        expect(result.gcode_with_provenance).toContain("PRISM PROVENANCE");
        expect(result.gcode_with_provenance).toContain("Engine: TestEngine");
        expect(result.gcode_with_provenance).toContain("Controller: haas");
      });

      it("adds full inline provenance when requested", () => {
        const input: PPGProvenanceWireInput = {
          engine: "TestEngine",
          controller: "okuma",
          gcode: "%\nO0001\nG90\nM30\n%",
          inline_comments: "full",
          tribal_tips: [{ tip_id: "tip-01", category: "general" }],
        };

        const result = PPGProvenanceWireEngine.cite(input);

        expect(result.gcode_with_provenance).toContain("Tribal tips: 1");
        expect(result.gcode_with_provenance).toContain("Audit hash:");
      });

      it("skips inline provenance when 'none' specified", () => {
        const input: PPGProvenanceWireInput = {
          engine: "TestEngine",
          controller: "fanuc",
          gcode: "G90\nM30",
          inline_comments: "none",
        };

        const result = PPGProvenanceWireEngine.cite(input);

        expect(result.gcode_with_provenance).toBe(undefined);
      });
    });

    describe("run log evidence", () => {
      it("limits to top 5 RAG hits", () => {
        const input: PPGProvenanceWireInput = {
          engine: "TestEngine",
          controller: "siemens",
          rag_hits: [
            { program_id: "P1", similarity: 0.95 },
            { program_id: "P2", similarity: 0.90 },
            { program_id: "P3", similarity: 0.85 },
            { program_id: "P4", similarity: 0.80 },
            { program_id: "P5", similarity: 0.75 },
            { program_id: "P6", similarity: 0.70 },
            { program_id: "P7", similarity: 0.65 },
          ],
        };

        const result = PPGProvenanceWireEngine.cite(input);

        expect(result.provenance.run_log_evidence.length).toBe(5);
        expect(result.provenance.run_log_evidence[4].program_id).toBe("P5");
      });

      it("includes outcome when provided", () => {
        const input: PPGProvenanceWireInput = {
          engine: "TestEngine",
          controller: "haas",
          rag_hits: [
            { program_id: "PROG_SUCCESS.NC", similarity: 0.88, outcome: "success" },
            { program_id: "PROG_ALARM.NC", similarity: 0.75, outcome: "alarm" },
          ],
        };

        const result = PPGProvenanceWireEngine.cite(input);

        expect(result.provenance.run_log_evidence[0].outcome).toBe("success");
        expect(result.provenance.run_log_evidence[1].outcome).toBe("alarm");
      });

      it("defaults outcome to 'unknown' when not provided", () => {
        const input: PPGProvenanceWireInput = {
          engine: "TestEngine",
          controller: "mazak",
          rag_hits: [
            { program_id: "OLD_PROG.NC", similarity: 0.72 },
          ],
        };

        const result = PPGProvenanceWireEngine.cite(input);

        expect(result.provenance.run_log_evidence[0].outcome).toBe("unknown");
      });
    });

    describe("controller version and machine_id", () => {
      it("includes controller version in provenance", () => {
        const input: PPGProvenanceWireInput = {
          engine: "TestEngine",
          controller: "fanuc",
          controller_version: "31i-B",
        };

        const result = PPGProvenanceWireEngine.cite(input);

        expect(result.provenance.dialect_source.version).toBe("31i-B");
        expect(result.provenance.reasoning_trace).toContain("31i-B");
      });

      it("includes machine_id in provenance", () => {
        const input: PPGProvenanceWireInput = {
          engine: "TestEngine",
          controller: "haas",
          machine_id: "VF-2SS_001",
        };

        const result = PPGProvenanceWireEngine.cite(input);

        expect(result.provenance.dialect_source.machine_id).toBe("VF-2SS_001");
        expect(result.provenance.reasoning_trace).toContain("VF-2SS_001");
      });
    });
  });

  describe("validate()", () => {
    it("validates complete provenance record", () => {
      const input: PPGProvenanceWireInput = {
        engine: "TestEngine",
        controller: "fanuc",
      };

      const { provenance } = PPGProvenanceWireEngine.cite(input);
      const validation = PPGProvenanceWireEngine.validate(provenance);

      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it("rejects null provenance", () => {
      const validation = PPGProvenanceWireEngine.validate(null);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain("Provenance is null or not an object");
    });

    it("reports missing emission_id", () => {
      const validation = PPGProvenanceWireEngine.validate({
        timestamp: new Date().toISOString(),
        engine: "TestEngine",
        ppg_source: "template",
        dialect_source: { controller: "fanuc" },
        post_template: { template_id: "test" },
        citations: [{ source_type: "post_processor", source_id: "test" }],
        audit_hash: "abc123",
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain("Missing emission_id");
    });

    it("reports missing ppg_source", () => {
      const validation = PPGProvenanceWireEngine.validate({
        emission_id: "ppg-test",
        timestamp: new Date().toISOString(),
        engine: "TestEngine",
        dialect_source: { controller: "fanuc" },
        post_template: { template_id: "test" },
        citations: [{ source_type: "post_processor", source_id: "test" }],
        audit_hash: "abc123",
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain("Missing ppg_source");
    });

    it("reports invalid ppg_source value", () => {
      const validation = PPGProvenanceWireEngine.validate({
        emission_id: "ppg-test",
        timestamp: new Date().toISOString(),
        engine: "TestEngine",
        ppg_source: "magic",
        dialect_source: { controller: "fanuc" },
        post_template: { template_id: "test" },
        citations: [{ source_type: "post_processor", source_id: "test" }],
        audit_hash: "abc123",
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain("Invalid ppg_source: magic");
    });

    it("reports missing dialect_source", () => {
      const validation = PPGProvenanceWireEngine.validate({
        emission_id: "ppg-test",
        timestamp: new Date().toISOString(),
        engine: "TestEngine",
        ppg_source: "template",
        post_template: { template_id: "test" },
        citations: [{ source_type: "post_processor", source_id: "test" }],
        audit_hash: "abc123",
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain("Missing dialect_source");
    });

    it("reports missing citations", () => {
      const validation = PPGProvenanceWireEngine.validate({
        emission_id: "ppg-test",
        timestamp: new Date().toISOString(),
        engine: "TestEngine",
        ppg_source: "template",
        dialect_source: { controller: "fanuc" },
        post_template: { template_id: "test" },
        citations: [],
        audit_hash: "abc123",
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain("No citations provided - G-code source unknown");
    });

    it("reports missing audit_hash", () => {
      const validation = PPGProvenanceWireEngine.validate({
        emission_id: "ppg-test",
        timestamp: new Date().toISOString(),
        engine: "TestEngine",
        ppg_source: "template",
        dialect_source: { controller: "fanuc" },
        post_template: { template_id: "test" },
        citations: [{ source_type: "post_processor", source_id: "test" }],
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain("Missing audit_hash - tamper detection disabled");
    });
  });

  describe("summarize()", () => {
    it("produces human-readable summary", () => {
      const input: PPGProvenanceWireInput = {
        engine: "PostProcessorEngine",
        controller: "okuma",
        controller_version: "OSP-P300",
        machine_id: "LB45-II_01",
        post_template_id: "okuma-lathe-live",
        post_template_name: "Okuma Lathe with Live Tooling",
        customizations: ["metric_output", "coolant_override"],
        rag_hits: [
          { program_id: "PART_A.MIN", similarity: 0.92, outcome: "success" },
          { program_id: "PART_B.MIN", similarity: 0.85, outcome: "success" },
        ],
        tribal_tips: [
          { tip_id: "tip-okuma-turret", category: "tool_change" },
        ],
        gcode: "G90\nT0100\nG96 S300\nG0 X50 Z5\nM30",
      };

      const { provenance } = PPGProvenanceWireEngine.cite(input);
      const summary = PPGProvenanceWireEngine.summarize(provenance);

      expect(summary).toContain("PPG Emission ppg-");
      expect(summary).toContain("Engine: PostProcessorEngine");
      expect(summary).toContain("Source: RAG");
      expect(summary).toContain("Controller: okuma");
      expect(summary).toContain("OSP-P300");
      expect(summary).toContain("Machine: LB45-II_01");
      expect(summary).toContain("Template: Okuma Lathe with Live Tooling");
      expect(summary).toContain("Customizations: metric_output, coolant_override");
      expect(summary).toContain("RAG matches: 2");
      expect(summary).toContain("PART_A.MIN");
      expect(summary).toContain("[success]");
      expect(summary).toContain("Tribal tips: 1");
      expect(summary).toContain("tip-okuma-turret");
    });

    it("formats cycle time correctly", () => {
      const input: PPGProvenanceWireInput = {
        engine: "TestEngine",
        controller: "fanuc",
        estimated_cycle_sec: 125,
      };

      const { provenance } = PPGProvenanceWireEngine.cite(input);
      const summary = PPGProvenanceWireEngine.summarize(provenance);

      expect(summary).toContain("2m 5s");
    });
  });

  describe("singleton export", () => {
    it("exports ppgProvenanceWireEngine singleton as instance of class", () => {
      expect(ppgProvenanceWireEngine instanceof PPGProvenanceWireEngine).toBe(true);
    });
  });
});
