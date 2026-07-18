import { describe, it, expect } from "vitest";
import { FusionToolExportEngine } from "../engines/FusionToolExportEngine.js";

const engine = new FusionToolExportEngine();

describe("FusionToolExportEngine", () => {
  it("exports tool library with correct Fusion format", () => {
    const lib = engine.export({ max_tools: 10 });
    expect(lib.version).toBe(2);
    expect(lib.tools.length).toBeGreaterThan(0);
    expect(lib.metadata.generated_by).toContain("PRISM");
  });

  it("each tool has geometry fields", () => {
    const lib = engine.export({ max_tools: 5 });
    for (const tool of lib.tools) {
      expect(tool.geometry.DC).toBeGreaterThan(0);
      expect(tool.geometry.LCF).toBeGreaterThan(0);
      expect(tool.geometry.OAL).toBeGreaterThan(0);
      expect(tool.geometry.NOF).toBeGreaterThanOrEqual(1);
      expect(tool.unit).toBe("millimeters");
    }
  });

  it("generates 6 material presets per tool", () => {
    const lib = engine.export({ max_tools: 3 });
    for (const tool of lib.tools) {
      const presets = tool["start-values"].presets;
      expect(presets.length).toBe(6);
      expect(presets[0].name).toContain("Steel");
      expect(presets[3].name).toContain("Aluminum");
      for (const p of presets) {
        expect(p.f_n).toBeGreaterThan(0);
        expect(p.n).toBeGreaterThan(0);
        expect(p.stepdown).toBeGreaterThan(0);
        expect(p.stepover).toBeGreaterThan(0);
      }
    }
  });

  it("includes holder geometry with segments", () => {
    const lib = engine.export({ max_tools: 3 });
    for (const tool of lib.tools) {
      expect(tool.holder).toBeDefined();
      expect(tool.holder!.geometry.DC).toBeGreaterThan(0);
      expect(tool.holder!.geometry.LB).toBeGreaterThan(0);
      expect(tool.holder!.geometry.connection).toBeTruthy();
      expect(tool.holder!.segments!.length).toBeGreaterThan(0);
    }
  });

  it("includes shaft geometry", () => {
    const lib = engine.export({ max_tools: 3 });
    for (const tool of lib.tools) {
      expect(tool.shaft).toBeDefined();
      expect(tool.shaft!.segments.length).toBeGreaterThan(0);
      for (const seg of tool.shaft!.segments) {
        expect(seg["upper-diameter"]).toBeGreaterThan(0);
        expect(seg.height).toBeGreaterThan(0);
      }
    }
  });

  it("aluminum presets have higher speed than steel", () => {
    const lib = engine.export({ max_tools: 1 });
    const presets = lib.tools[0]["start-values"].presets;
    const steel = presets.find(p => p.name.includes("Steel"));
    const alum = presets.find(p => p.name.includes("Aluminum"));
    expect(alum!.n).toBeGreaterThan(steel!.n);
  });

  it("exports single tool with holder", () => {
    const tool = engine.exportSingleTool({
      diameter_mm: 12,
      flute_count: 4,
      flute_length_mm: 36,
      overall_length_mm: 80,
      corner_radius_mm: 0,
      coating: "TiAlN",
      manufacturer: "OSG",
      designation: "AE-VMS-12",
    });
    expect(tool.geometry.DC).toBe(12);
    expect(tool.vendor).toBe("OSG");
    expect(tool.holder).toBeDefined();
    expect(tool.shaft).toBeDefined();
    expect(tool.BMC).toBe("carbide");
  });

  it("maps tool types correctly", () => {
    const ball = engine.exportSingleTool({
      diameter_mm: 10, flute_count: 2,
      flute_length_mm: 20, overall_length_mm: 50,
      corner_radius_mm: 5, // R = D/2 → ball
    });
    expect(ball.type).toBe("ball end mill");

    const flat = engine.exportSingleTool({
      diameter_mm: 10, flute_count: 3,
      flute_length_mm: 30, overall_length_mm: 60,
      corner_radius_mm: 0,
    });
    expect(flat.type).toBe("flat end mill");
  });

  it("selects appropriate ER collet by shank diameter", () => {
    const small = engine.exportSingleTool({
      diameter_mm: 4, flute_count: 3,
      flute_length_mm: 12, overall_length_mm: 40,
    });
    expect(small.holder!.geometry.connection).toBe("ER16");

    const medium = engine.exportSingleTool({
      diameter_mm: 12, flute_count: 4,
      flute_length_mm: 36, overall_length_mm: 80,
    });
    expect(medium.holder!.geometry.connection).toBe("ER20");
  });
});
