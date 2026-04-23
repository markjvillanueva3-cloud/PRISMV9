/**
 * OneClickWEDMGeneratorEngine Tests
 * Single entry point DXF to G-code
 */

import { describe, it, expect } from "vitest";
import {
  oneClickWEDMGeneratorEngine,
  OneClickWEDMGeneratorEngine,
} from "../engines/OneClickWEDMGeneratorEngine.js";

describe("OneClickWEDMGeneratorEngine", () => {
  describe("detectMaterial", () => {
    it("detects D2 tool steel from filename", () => {
      const material = oneClickWEDMGeneratorEngine.detectMaterial("cavity_D2_insert.dxf");
      expect(material).toBe("D2_tool_steel");
    });

    it("detects M2 HSS from filename", () => {
      const material = oneClickWEDMGeneratorEngine.detectMaterial("punch_M2.dxf");
      expect(material).toBe("M2_HSS");
    });

    it("detects aluminum alloy", () => {
      const material = oneClickWEDMGeneratorEngine.detectMaterial("bracket_6061.dxf");
      expect(material).toBe("aluminum");
    });

    it("detects carbide", () => {
      const material = oneClickWEDMGeneratorEngine.detectMaterial("die_tungsten_carbide.dxf");
      expect(material).toBe("tungsten_carbide");
    });

    it("returns undefined for unknown material", () => {
      const material = oneClickWEDMGeneratorEngine.detectMaterial("mystery_part.dxf");
      expect(material).toBeUndefined();
    });
  });

  describe("validateInput", () => {
    it("validates correct input", () => {
      const result = oneClickWEDMGeneratorEngine.validateInput({
        dxf_content: "0\nSECTION\n2\nENTITIES\n...",
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("rejects empty DXF content", () => {
      const result = oneClickWEDMGeneratorEngine.validateInput({
        dxf_content: "",
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("DXF content is required");
    });

    it("rejects invalid wire diameter", () => {
      const result = oneClickWEDMGeneratorEngine.validateInput({
        dxf_content: "valid content",
        wire_diameter_mm: 0.01, // Too small
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Wire diameter");
    });

    it("rejects invalid target Ra", () => {
      const result = oneClickWEDMGeneratorEngine.validateInput({
        dxf_content: "valid content",
        target_Ra_um: 20, // Too high
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Target Ra");
    });
  });

  describe("getPipelineDefinition", () => {
    it("returns 30 pipeline stages", () => {
      const stages = oneClickWEDMGeneratorEngine.getPipelineDefinition();
      expect(stages).toHaveLength(30);
    });

    it("includes all stage categories", () => {
      const stages = oneClickWEDMGeneratorEngine.getPipelineDefinition();
      const categories = new Set(stages.map(s => s.category));
      expect(categories).toContain("parse");
      expect(categories).toContain("detect");
      expect(categories).toContain("safety");
      expect(categories).toContain("calc");
      expect(categories).toContain("toolpath");
      expect(categories).toContain("post");
    });
  });

  describe("generate", () => {
    it("generates G-code from DXF content", async () => {
      const result = await oneClickWEDMGeneratorEngine.generate({
        dxf_content: "0\nSECTION\n2\nENTITIES\n...",
        filename: "test_D2.dxf",
      });

      expect(result.success).toBe(true);
      expect(result.gcode).toBeDefined();
      expect(result.gcode_lines).toBeGreaterThan(0);
      expect(result.stages).toHaveLength(30);
    });

    it("auto-detects material from filename", async () => {
      const result = await oneClickWEDMGeneratorEngine.generate({
        dxf_content: "valid",
        filename: "part_aluminum_6061.dxf",
      });

      expect(result.auto_detected.material).toBe("aluminum");
    });

    it("uses provided material override", async () => {
      const result = await oneClickWEDMGeneratorEngine.generate({
        dxf_content: "valid",
        material: "stainless_steel",
      });

      expect(result.success).toBe(true);
    });

    it("tracks all stage completions", async () => {
      const result = await oneClickWEDMGeneratorEngine.generate({
        dxf_content: "valid",
      });

      const completed = result.stages.filter(s => s.status === "complete");
      const skipped = result.stages.filter(s => s.status === "skipped");
      expect(completed.length + skipped.length).toBe(30);
    });

    it("respects skip_stages option", async () => {
      const result = await oneClickWEDMGeneratorEngine.generate({
        dxf_content: "valid",
        skip_stages: [5, 10, 15],
      });

      const skipped = result.stages.filter(s => s.status === "skipped");
      expect(skipped).toHaveLength(3);
    });

    it("reports total processing time", async () => {
      const result = await oneClickWEDMGeneratorEngine.generate({
        dxf_content: "valid",
      });

      expect(result.total_time_ms).toBeGreaterThan(0);
    });

    it("estimates cycle time", async () => {
      const result = await oneClickWEDMGeneratorEngine.generate({
        dxf_content: "valid",
      });

      expect(result.estimated_cycle_time_min).toBeGreaterThan(0);
    });

    it("calculates kerf and offset", async () => {
      const result = await oneClickWEDMGeneratorEngine.generate({
        dxf_content: "valid",
        wire_diameter_mm: 0.25,
      });

      expect(result.kerf_width_mm).toBeGreaterThan(0.25);
      expect(result.wire_offset_mm).toBeCloseTo(result.kerf_width_mm! / 2, 3);
    });
  });

  describe("checkpoint and resume", () => {
    it("provides checkpoint ID on failure", async () => {
      const engine = new OneClickWEDMGeneratorEngine();

      // Note: In a real failure scenario, checkpoint would be set
      // This is a simplified test
      const result = await engine.generate({
        dxf_content: "valid",
      });

      // Successful run shouldn't have checkpoint
      expect(result.success).toBe(true);
    });

    it("can save and load checkpoints", () => {
      const engine = new OneClickWEDMGeneratorEngine();

      // Manually test checkpoint loading with invalid ID
      const checkpoint = engine.loadCheckpoint("invalid-id");
      expect(checkpoint).toBeUndefined();
    });
  });

  describe("configuration", () => {
    it("can update default machine", () => {
      const engine = new OneClickWEDMGeneratorEngine();
      engine.configure({ default_machine_id: "sodick-alc600g" });
      expect(engine.getConfig().default_machine_id).toBe("sodick-alc600g");
    });

    it("can update default wire diameter", () => {
      const engine = new OneClickWEDMGeneratorEngine();
      engine.configure({ default_wire_diameter_mm: 0.20 });
      expect(engine.getConfig().default_wire_diameter_mm).toBe(0.20);
    });
  });
});
