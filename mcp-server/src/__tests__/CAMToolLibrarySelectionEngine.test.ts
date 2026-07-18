/**
 * CAMToolLibrarySelectionEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-TOOL-LIB
 */
import { describe, it, expect } from "vitest";
import { CAMToolLibrarySelectionEngine } from "../engines/CAMToolLibrarySelectionEngine.js";
import type { ShopToolEntry } from "../engines/CAMToolLibrarySelectionEngine.js";

const engine = new CAMToolLibrarySelectionEngine();

describe("CAMToolLibrarySelectionEngine", () => {

  it("recommend face op → face_mill with 25-200mm range", () => {
    const r = engine.recommend("face", "face", "aluminum");
    expect(r?.family).toBe("face_mill");
    expect(r?.diameterRange.minMm).toBe(25);
    expect(r?.diameterRange.maxMm).toBe(200);
  });

  it("recommend pocket_2d → end_mill_flat", () => {
    const r = engine.recommend("pocket_2d", "pocket_2d", "steel");
    expect(r?.family).toBe("end_mill_flat");
  });

  it("recommend ruled_surface 5-axis → end_mill_ball", () => {
    const r = engine.recommend("swarf_5axis", "ruled_surface", "titanium");
    expect(r?.family).toBe("end_mill_ball");
  });

  it("recommend drill_peck deep_hole → drill_twist", () => {
    const r = engine.recommend("drill_peck", "deep_hole", "steel");
    expect(r?.family).toBe("drill_twist");
    expect(r?.fluteCountRange.min).toBe(2);
    expect(r?.fluteCountRange.max).toBe(2);
  });

  it("recommend turn_rough external_profile → turning_insert_rough", () => {
    const r = engine.recommend("turn_rough", "external_profile", "steel");
    expect(r?.family).toBe("turning_insert_rough");
  });

  it("material → coating routing: aluminum prefers uncoated/diamond", () => {
    const r = engine.recommend("face", "face", "aluminum");
    expect(r?.preferredCoating).toContain("uncoated");
    expect(r?.preferredCoating).toContain("diamond");
  });

  it("material → coating routing: hardened_steel prefers altin_nano", () => {
    const r = engine.recommend("face", "face", "hardened_steel");
    expect(r?.preferredCoating).toContain("altin_nano");
  });

  it("select picks exact-diameter match when available", () => {
    const inventory: ShopToolEntry[] = [
      { id: "EM_10",   family: "end_mill_flat", diameterMm: 10, fluteCount: 4, coating: "tialn" },
      { id: "EM_12",   family: "end_mill_flat", diameterMm: 12, fluteCount: 4, coating: "tialn" },
      { id: "EM_8",    family: "end_mill_flat", diameterMm: 8,  fluteCount: 4, coating: "tialn" },
    ];
    const r = engine.select("pocket_2d", inventory, { featureClass: "pocket_2d", material: "steel", preferredDiameterMm: 10 });
    expect(r.bestToolId).toBe("EM_10");
  });

  it("select skips worn tools", () => {
    const inventory: ShopToolEntry[] = [
      { id: "EM_WORN", family: "end_mill_flat", diameterMm: 10, worn: true },
      { id: "EM_OK",   family: "end_mill_flat", diameterMm: 10, fluteCount: 4, coating: "tialn" },
    ];
    const r = engine.select("pocket_2d", inventory, { material: "steel", preferredDiameterMm: 10 });
    expect(r.bestToolId).toBe("EM_OK");
  });

  it("select returns null + recommendedSpec when no family match", () => {
    const inventory: ShopToolEntry[] = [
      { id: "FACE_MILL_50", family: "face_mill", diameterMm: 50 },
    ];
    const r = engine.select("drill_peck", inventory, { featureClass: "deep_hole" });
    expect(r.bestToolId).toBeNull();
    expect(r.recommendedSpec?.family).toBe("drill_twist");
  });

  it("select rewards coating match", () => {
    const inventory: ShopToolEntry[] = [
      { id: "EM_UNCOATED", family: "end_mill_flat", diameterMm: 10, coating: "uncoated" },
      { id: "EM_ALTIN",    family: "end_mill_flat", diameterMm: 10, coating: "altin_nano" },
    ];
    const r = engine.select("pocket_2d", inventory, { material: "hardened_steel", preferredDiameterMm: 10 });
    expect(r.bestToolId).toBe("EM_ALTIN");
  });

  it("families() returns all 20 ToolFamily values", () => {
    const f = engine.families();
    expect(f.length).toBe(20);
    expect(f).toContain("end_mill_flat");
    expect(f).toContain("turning_insert_rough");
    expect(f).toContain("wire_edm_electrode");
  });

  it("candidates always sorted by descending score", () => {
    const inventory: ShopToolEntry[] = [
      { id: "EM_FAR",  family: "end_mill_flat", diameterMm: 20 },
      { id: "EM_NEAR", family: "end_mill_flat", diameterMm: 10, fluteCount: 4, coating: "tialn" },
      { id: "EM_MID",  family: "end_mill_flat", diameterMm: 14 },
    ];
    const r = engine.select("pocket_2d", inventory, { material: "steel", preferredDiameterMm: 10 });
    for (let i = 1; i < r.candidates.length; i++) {
      expect(r.candidates[i - 1].score).toBeGreaterThanOrEqual(r.candidates[i].score);
    }
  });

  it("validate rejects non-object input", () => {
    expect(engine.validate(null)).toMatch(/object/);
    expect(engine.validate({})).toBeNull();
  });

  it("getCapabilities exposes select + recommend + families", () => {
    const names = engine.getCapabilities().map((c) => c.name);
    expect(names).toContain("select");
    expect(names).toContain("recommend");
    expect(names).toContain("families");
  });
});
