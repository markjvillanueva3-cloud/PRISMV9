import { describe, it, expect } from "vitest";
import { NLPCAMParserEngine } from "../engines/NLPCAMParserEngine.js";

const engine = new NLPCAMParserEngine();

describe("NLPCAMParserEngine", () => {
  it("parses pocket with dimensions and material", () => {
    const r = engine.parse("pocket 80x50mm, 15mm deep, P20 steel, DMG DMU 50");
    expect(r.features[0].type).toBe("pocket_rectangular");
    expect(r.features[0].dimensions?.length_mm).toBe(80);
    expect(r.features[0].dimensions?.width_mm).toBe(50);
    expect(r.features[0].dimensions?.depth_mm).toBe(15);
    expect(r.material).toContain("P20");
    expect(r.material_iso_group).toBe("P");
    expect(r.machine_name).toMatch(/DMG DMU/i);
    expect(r.confidence).toBeGreaterThan(0.7);
  });

  it("parses drill hole", () => {
    const r = engine.parse("drill 10mm hole, 30mm deep, 304 stainless");
    expect(r.features[0].type).toBe("through_hole");
    expect(r.features[0].operation).toBe("drilling");
    expect(r.features[0].dimensions?.diameter_mm).toBe(10);
    expect(r.features[0].dimensions?.depth_mm).toBe(30);
    expect(r.material_iso_group).toBe("M");
  });

  it("parses turning operation", () => {
    const r = engine.parse("turn OD 50mm, 80mm long, Ti-6Al-4V");
    expect(r.features[0].operation).toBe("roughing");
    expect(r.material_iso_group).toBe("S");
  });

  it("parses surface finish requirement", () => {
    const r = engine.parse("finish contour Ra 0.8 in aluminum");
    expect(r.features[0].operation).toBe("finishing");
    expect(r.features[0].surface_finish_Ra).toBe(0.8);
    expect(r.material_iso_group).toBe("N");
  });

  it("parses tolerance", () => {
    const r = engine.parse("pocket 50x30mm ±0.02 in hardened H13");
    expect(r.features[0].tolerance_mm).toBe(0.02);
    expect(r.material_iso_group).toBe("H");
  });

  it("parses grinding", () => {
    const r = engine.parse("grind surface, Ra 0.4");
    expect(r.features[0].type).toBe("surface_grind");
  });

  it("parses laser cutting", () => {
    const r = engine.parse("laser cut 6mm steel plate");
    expect(r.features[0].type).toBe("laser_cut");
  });

  it("parses waterjet", () => {
    const r = engine.parse("waterjet cut 25mm titanium");
    expect(r.features[0].type).toBe("waterjet_cut");
    expect(r.material_iso_group).toBe("S");
  });

  it("recognizes Haas machine", () => {
    const r = engine.parse("pocket in aluminum on Haas VF-2");
    expect(r.machine_name).toMatch(/Haas VF.?2/i);
  });

  it("returns confidence score", () => {
    const full = engine.parse("pocket 80x50mm, 15mm deep, P20 steel, DMG DMU 50");
    const minimal = engine.parse("machine something");
    expect(full.confidence).toBeGreaterThan(minimal.confidence);
  });

  it("returns parsed tokens for transparency", () => {
    const r = engine.parse("pocket 80x50mm, 15mm deep, P20");
    expect(r.parsed_tokens.length).toBeGreaterThan(2);
    expect(r.parsed_tokens.some(t => t.startsWith("feature:"))).toBe(true);
    expect(r.parsed_tokens.some(t => t.startsWith("dims:"))).toBe(true);
  });
});
