/**
 * CADPartTypeClassifierEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-PART-CLASSIFIER
 */
import { describe, it, expect } from "vitest";
import { CADPartTypeClassifierEngine } from "../engines/CADPartTypeClassifierEngine.js";

const engine = new CADPartTypeClassifierEngine();

describe("CADPartTypeClassifierEngine", () => {

  it("part name 'turbine_blade_001' → turbine_blade with high confidence", () => {
    const r = engine.classify({ features: [], partNameHint: "turbine_blade_001" });
    expect(r.partType).toBe("turbine_blade");
    expect(r.confidence).toBeGreaterThan(0.7);
  });

  it("part name 'impeller_compressor' → impeller", () => {
    const r = engine.classify({ features: [], partNameHint: "impeller_compressor" });
    expect(r.partType).toBe("impeller");
  });

  it("part name 'mold_block_A' → mold_block", () => {
    const r = engine.classify({ features: [], partNameHint: "mold_block_A" });
    expect(r.partType).toBe("mold_block");
  });

  it("part name 'graphite_electrode' + graphite material → electrode", () => {
    const r = engine.classify({
      features: [],
      partNameHint: "graphite_electrode_05",
      materialHint: "graphite",
    });
    expect(r.partType).toBe("electrode");
    expect(r.confidence).toBeGreaterThan(0.9);
  });

  it("impeller_blade feature alone → impeller (no name needed)", () => {
    const r = engine.classify({ features: ["impeller_blade"] });
    expect(r.partType).toBe("impeller");
  });

  it("ruled_surface feature + no name → turbine_blade (mid confidence)", () => {
    const r = engine.classify({ features: ["ruled_surface"] });
    expect(r.partType).toBe("turbine_blade");
    expect(r.confidence).toBeGreaterThan(0.4);
  });

  it("long aspect-ratio bbox → shaft inferred from geometry", () => {
    const r = engine.classify({
      features: [],
      bbox: { x: 500, y: 50, z: 50 }, // 10:1 aspect
    });
    expect(r.partType).toBe("shaft");
  });

  it("cubic bbox → prismatic_block fallback", () => {
    const r = engine.classify({
      features: [],
      bbox: { x: 200, y: 200, z: 150 },
    });
    expect(r.partType).toBe("prismatic_block");
  });

  it("tool steel material + no other hints → die_section preferred over mold_block (higher weight)", () => {
    const r = engine.classify({
      features: [],
      materialHint: "D2 tool steel",
    });
    expect(r.partType).toBe("die_section");
  });

  it("conflicting hints: name 'shaft' wins over short bbox", () => {
    const r = engine.classify({
      features: [],
      bbox: { x: 100, y: 100, z: 100 },
      partNameHint: "drive_shaft",
    });
    expect(r.partType).toBe("shaft");
  });

  it("no signals at all → unknown", () => {
    const r = engine.classify({ features: [] });
    expect(r.partType).toBe("unknown");
    expect(r.confidence).toBe(0);
  });

  it("weak single signal below 0.4 → unknown", () => {
    const r = engine.classify({
      features: [],
      bbox: { x: 100, y: 100, z: 100 }, // small cubic — only adds 0.3
    });
    expect(r.partType).toBe("unknown");
  });

  it("rulesFired list records every fired rule", () => {
    const r = engine.classify({
      features: ["impeller_blade"],
      partNameHint: "impeller_v3",
    });
    expect(r.rulesFired.length).toBeGreaterThan(1);
    expect(r.rulesFired.some((s) => s.includes("name-match"))).toBe(true);
    expect(r.rulesFired.some((s) => s.includes("feature"))).toBe(true);
  });

  it("confidence capped at 1.0", () => {
    const r = engine.classify({
      features: ["impeller_blade"],
      partNameHint: "impeller_blade",
    });
    expect(r.confidence).toBeLessThanOrEqual(1.0);
  });

  it("gear name → gear", () => {
    const r = engine.classify({ features: [], partNameHint: "spur_gear_24t" });
    expect(r.partType).toBe("gear");
  });

  it("bracket name → bracket", () => {
    const r = engine.classify({ features: [], partNameHint: "mount_bracket_L" });
    expect(r.partType).toBe("bracket");
  });

  it("fastener name → fastener", () => {
    const r = engine.classify({ features: [], partNameHint: "hex_bolt_M8" });
    expect(r.partType).toBe("fastener");
  });

  it("housing name → housing", () => {
    const r = engine.classify({ features: [], partNameHint: "gearbox_housing" });
    expect(r.partType).toBe("housing");
  });

  it("types() returns 20 PartTypes", () => {
    const t = engine.types();
    expect(t.length).toBe(20);
    expect(t).toContain("turbine_blade");
    expect(t).toContain("electrode");
    expect(t).toContain("unknown");
  });

  it("validate rejects non-object input", () => {
    expect(engine.validate(null)).toMatch(/object/);
    expect(engine.validate({})).toBeNull();
  });

  it("getCapabilities exposes classify + types", () => {
    const names = engine.getCapabilities().map((c) => c.name);
    expect(names).toContain("classify");
    expect(names).toContain("types");
  });
});
