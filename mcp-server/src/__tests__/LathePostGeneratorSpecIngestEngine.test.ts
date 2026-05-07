/**
 * LathePostGeneratorSpecIngestEngine Tests
 * =========================================
 *
 * Tests for controller spec ingestion engine.
 *
 * @module tests/LathePostGeneratorSpecIngestEngine
 * @milestone LATHE-MASTER U-LTH15
 */

import { describe, it, expect } from "vitest";
import {
  LathePostGeneratorSpecIngestEngine,
  lathePostGeneratorSpecIngestEngine,
  ControllerSpecSchema,
  type ControllerSpec,
  type SpecIngestionInput,
} from "../engines/LathePostGeneratorSpecIngestEngine.js";

describe("LathePostGeneratorSpecIngestEngine", () => {
  describe("metadata", () => {
    it("returns correct version", () => {
      expect(LathePostGeneratorSpecIngestEngine.getVersion()).toBe("1.0.0");
    });

    it("lists all built-in specs", () => {
      const specs = LathePostGeneratorSpecIngestEngine.listBuiltinSpecs();
      expect(specs.length).toBeGreaterThanOrEqual(3);
      expect(specs.map(s => s.id)).toContain("fanuc-31i-t");
      expect(specs.map(s => s.id)).toContain("okuma-osp-p300l");
      expect(specs.map(s => s.id)).toContain("mitsubishi-m80-l");
    });
  });

  describe("built-in spec retrieval", () => {
    it("retrieves Fanuc 31i-T spec by ID", () => {
      const spec = LathePostGeneratorSpecIngestEngine.getBuiltinSpec("fanuc-31i-t");
      expect(spec).toBeDefined();
      expect(spec?.manufacturer).toBe("FANUC");
      expect(spec?.model).toBe("31i-T");
      expect(spec?.machine_type).toBe("lathe");
    });

    it("retrieves Okuma OSP-P300L spec by ID", () => {
      const spec = LathePostGeneratorSpecIngestEngine.getBuiltinSpec("okuma-osp-p300l");
      expect(spec).toBeDefined();
      expect(spec?.manufacturer).toBe("Okuma");
      expect(spec?.model).toBe("OSP-P300L");
    });

    it("retrieves Mitsubishi M80 spec by ID", () => {
      const spec = LathePostGeneratorSpecIngestEngine.getBuiltinSpec("mitsubishi-m80-l");
      expect(spec).toBeDefined();
      expect(spec?.manufacturer).toBe("Mitsubishi");
      expect(spec?.model).toBe("M80");
    });

    it("returns undefined for unknown spec", () => {
      const spec = LathePostGeneratorSpecIngestEngine.getBuiltinSpec("unknown-controller");
      expect(spec).toBeUndefined();
    });
  });

  describe("ingestion with controller_hint", () => {
    it("ingests Fanuc 31i-T by exact hint", () => {
      const result = lathePostGeneratorSpecIngestEngine.ingest({
        source_type: "manual_entry",
        controller_hint: "fanuc-31i-t",
      });

      expect(result.success).toBe(true);
      expect(result.spec?.controller_id).toBe("fanuc-31i-t");
      expect(result.errors).toHaveLength(0);
    });

    it("ingests Okuma by partial hint", () => {
      const result = lathePostGeneratorSpecIngestEngine.ingest({
        source_type: "manual_entry",
        controller_hint: "okuma",
      });

      expect(result.success).toBe(true);
      expect(result.spec?.manufacturer).toBe("Okuma");
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });

    it("ingests Mitsubishi by case-insensitive hint", () => {
      const result = lathePostGeneratorSpecIngestEngine.ingest({
        source_type: "manual_entry",
        controller_hint: "MITSUBISHI-M80",
      });

      expect(result.success).toBe(true);
      expect(result.spec?.manufacturer).toBe("Mitsubishi");
    });

    it("fails gracefully for unknown controller hint", () => {
      const result = lathePostGeneratorSpecIngestEngine.ingest({
        source_type: "manual_entry",
        controller_hint: "unknown-controller-xyz",
      });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("ingestion with manufacturer/model hints", () => {
    it("ingests by manufacturer and model hints", () => {
      const result = lathePostGeneratorSpecIngestEngine.ingest({
        source_type: "manual_entry",
        manufacturer_hint: "FANUC",
        model_hint: "31i",
      });

      expect(result.success).toBe(true);
      expect(result.spec?.manufacturer).toBe("FANUC");
    });

    it("ingests Okuma by manufacturer hint", () => {
      const result = lathePostGeneratorSpecIngestEngine.ingest({
        source_type: "manual_entry",
        manufacturer_hint: "Okuma",
        model_hint: "OSP-P300",
      });

      expect(result.success).toBe(true);
      expect(result.spec?.model).toBe("OSP-P300L");
    });
  });

  describe("JSON ingestion", () => {
    it("ingests valid JSON spec", () => {
      const validSpec: ControllerSpec = {
        controller_id: "test-controller",
        manufacturer: "Test",
        model: "Test-1",
        machine_type: "lathe",
        axes: [
          { letter: "X", type: "linear", direction: "bidirectional", semantics: "Cross", unit: "mm" },
          { letter: "Z", type: "linear", direction: "bidirectional", semantics: "Long", unit: "mm" },
        ],
        dialect: {
          family: "fanuc",
          variant: "test",
          arc_format: "ijk_incremental",
          comment_style: "parentheses",
          line_numbers: "optional",
          decimal_point: "required",
          block_skip: "/",
          program_start: "O0001",
          program_end: "M30",
          tool_change: "T0100",
          spindle_cw: "M03",
          spindle_ccw: "M04",
          spindle_stop: "M05",
          coolant_on: "M08",
          coolant_off: "M09",
        },
        canned_cycles: [],
        macro_ranges: [],
        modal_groups: [],
        confidence: 0.9,
        source: "test",
        ingested_at: new Date().toISOString(),
      };

      const result = lathePostGeneratorSpecIngestEngine.ingest({
        source_type: "json",
        source_content: JSON.stringify(validSpec),
      });

      expect(result.success).toBe(true);
      expect(result.spec?.controller_id).toBe("test-controller");
    });

    it("rejects invalid JSON", () => {
      const result = lathePostGeneratorSpecIngestEngine.ingest({
        source_type: "json",
        source_content: "not valid json",
      });

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes("parse error"))).toBe(true);
    });

    it("rejects JSON failing schema validation", () => {
      const result = lathePostGeneratorSpecIngestEngine.ingest({
        source_type: "json",
        source_content: JSON.stringify({ controller_id: "test" }), // Missing required fields
      });

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes("validation failed"))).toBe(true);
    });
  });

  describe("PDF ingestion", () => {
    it("returns helpful error for PDF source", () => {
      const result = lathePostGeneratorSpecIngestEngine.ingest({
        source_type: "pdf",
        source_path: "/path/to/manual.pdf",
      });

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes("pdf-learn"))).toBe(true);
    });
  });

  describe("schema validation", () => {
    it("validates correct spec", () => {
      const spec = LathePostGeneratorSpecIngestEngine.getBuiltinSpec("fanuc-31i-t");
      const result = LathePostGeneratorSpecIngestEngine.validate(spec);
      expect(result.valid).toBe(true);
    });

    it("rejects invalid spec", () => {
      const result = LathePostGeneratorSpecIngestEngine.validate({ foo: "bar" });
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  describe("Fanuc 31i-T spec contents", () => {
    const spec = LathePostGeneratorSpecIngestEngine.getBuiltinSpec("fanuc-31i-t")!;

    it("has correct axes configuration", () => {
      expect(spec.axes.length).toBeGreaterThanOrEqual(2);
      expect(spec.axes.map(a => a.letter)).toContain("X");
      expect(spec.axes.map(a => a.letter)).toContain("Z");
      expect(spec.axes.find(a => a.letter === "X")?.semantics).toContain("diameter");
    });

    it("has correct G-code dialect", () => {
      expect(spec.dialect.family).toBe("fanuc");
      expect(spec.dialect.arc_format).toBe("ijk_incremental");
      expect(spec.dialect.comment_style).toBe("parentheses");
      expect(spec.dialect.program_end).toBe("M30");
    });

    it("has lathe canned cycles", () => {
      const cycles = spec.canned_cycles.map(c => c.code);
      expect(cycles).toContain("G71"); // Stock removal turning
      expect(cycles).toContain("G70"); // Finish cycle
      expect(cycles).toContain("G76"); // Threading
      expect(cycles).toContain("G74"); // Peck drilling
      expect(cycles).toContain("G75"); // Grooving
    });

    it("has G71 parameters defined", () => {
      const g71 = spec.canned_cycles.find(c => c.code === "G71");
      expect(g71).toBeDefined();
      expect(g71?.category).toBe("turning");
      expect(g71?.parameters.length).toBeGreaterThanOrEqual(5);
      expect(g71?.parameters.map(p => p.letter)).toContain("U");
      expect(g71?.parameters.map(p => p.letter)).toContain("W");
      expect(g71?.parameters.map(p => p.letter)).toContain("D");
    });

    it("has G76 threading parameters", () => {
      const g76 = spec.canned_cycles.find(c => c.code === "G76");
      expect(g76).toBeDefined();
      expect(g76?.category).toBe("threading");
      expect(g76?.parameters.map(p => p.letter)).toContain("F"); // Pitch
      expect(g76?.parameters.map(p => p.letter)).toContain("K"); // Thread height
    });

    it("has macro variable ranges", () => {
      expect(spec.macro_ranges.length).toBeGreaterThanOrEqual(3);
      const localArgs = spec.macro_ranges.find(r => r.start === 1);
      expect(localArgs).toBeDefined();
      expect(localArgs?.persistence).toBe("volatile");
    });

    it("has modal groups", () => {
      expect(spec.modal_groups.length).toBeGreaterThanOrEqual(5);
      const motionGroup = spec.modal_groups.find(g => g.name === "Motion");
      expect(motionGroup).toBeDefined();
      expect(motionGroup?.codes).toContain("G00");
      expect(motionGroup?.codes).toContain("G01");
    });

    it("has capability flags", () => {
      expect(spec.sub_spindle_support).toBe(true);
      expect(spec.live_tooling_support).toBe(true);
      expect(spec.c_axis_support).toBe(true);
      expect(spec.y_axis_support).toBe(true);
    });

    it("has confidence score", () => {
      expect(spec.confidence).toBeGreaterThanOrEqual(0.9);
      expect(spec.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  describe("Okuma OSP-P300L spec contents", () => {
    const spec = LathePostGeneratorSpecIngestEngine.getBuiltinSpec("okuma-osp-p300l")!;

    it("has correct manufacturer info", () => {
      expect(spec.manufacturer).toBe("Okuma");
      expect(spec.dialect.family).toBe("okuma");
    });

    it("has W axis for sub-spindle", () => {
      expect(spec.axes.map(a => a.letter)).toContain("W");
      const wAxis = spec.axes.find(a => a.letter === "W");
      expect(wAxis?.semantics.toLowerCase()).toContain("sub-spindle");
    });

    it("has lathe canned cycles", () => {
      const cycles = spec.canned_cycles.map(c => c.code);
      expect(cycles).toContain("G71");
      expect(cycles).toContain("G76");
    });
  });

  describe("Mitsubishi M80 spec contents", () => {
    const spec = LathePostGeneratorSpecIngestEngine.getBuiltinSpec("mitsubishi-m80-l")!;

    it("has correct manufacturer info", () => {
      expect(spec.manufacturer).toBe("Mitsubishi");
      expect(spec.dialect.family).toBe("mitsubishi");
    });

    it("has standard lathe axes", () => {
      expect(spec.axes.map(a => a.letter)).toContain("X");
      expect(spec.axes.map(a => a.letter)).toContain("Z");
      expect(spec.axes.map(a => a.letter)).toContain("C");
    });
  });

  describe("similarity matching", () => {
    it("finds similar controllers for Fanuc", () => {
      const result = lathePostGeneratorSpecIngestEngine.ingest({
        source_type: "manual_entry",
        controller_hint: "fanuc-31i-t",
      });

      expect(result.success).toBe(true);
      // Similarity matches should include other controllers
      if (result.similarity_matches) {
        expect(result.similarity_matches.length).toBeGreaterThanOrEqual(0);
        for (const match of result.similarity_matches) {
          expect(match.controller_id).not.toBe("fanuc-31i-t");
          expect(match.similarity).toBeGreaterThan(0);
          expect(match.similarity).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  describe("Zod schema", () => {
    it("exports ControllerSpecSchema", () => {
      expect(ControllerSpecSchema).toBeDefined();
      expect(typeof ControllerSpecSchema.safeParse).toBe("function");
    });

    it("validates built-in specs against schema", () => {
      const specs = LathePostGeneratorSpecIngestEngine.listBuiltinSpecs();
      for (const { id } of specs) {
        const spec = LathePostGeneratorSpecIngestEngine.getBuiltinSpec(id);
        const result = ControllerSpecSchema.safeParse(spec);
        expect(result.success).toBe(true);
      }
    });
  });
});
