/**
 * CAMToolStickoutDeflectionEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-DEFLECTION
 */
import { describe, it, expect } from "vitest";
import { CAMToolStickoutDeflectionEngine } from "../engines/CAMToolStickoutDeflectionEngine.js";

const engine = new CAMToolStickoutDeflectionEngine();

describe("CAMToolStickoutDeflectionEngine", () => {

  it("carbide 10mm dia, 50mm stickout, 200N → known deflection", () => {
    const r = engine.compute({
      stickoutMm: 50,
      toolDiameterMm: 10,
      forceN: 200,
      toolMaterial: "carbide",
    });
    // I = π × 10^4 / 64 = 490.87 mm^4
    // E = 580 GPa = 580,000 N/mm²
    // δ = (200 × 50³) / (3 × 580000 × 490.87) = 25,000,000 / 854,113,400 ≈ 0.02927 mm
    expect(r.iMm4).toBeCloseTo(Math.PI * Math.pow(10, 4) / 64, 2);
    expect(r.modulusGPa).toBe(580);
    expect(r.deflectionMm).toBeCloseTo(
      (200 * Math.pow(50, 3)) / (3 * 580 * 1000 * Math.PI * Math.pow(10, 4) / 64),
      6,
    );
  });

  it("doubling stickout → 8× deflection (L³ scaling)", () => {
    const short = engine.compute({ stickoutMm: 30, toolDiameterMm: 10, forceN: 100, toolMaterial: "carbide" });
    const long = engine.compute({ stickoutMm: 60, toolDiameterMm: 10, forceN: 100, toolMaterial: "carbide" });
    expect(long.deflectionMm / short.deflectionMm).toBeCloseTo(8, 3);
  });

  it("doubling diameter → 1/16 deflection (d⁴ scaling)", () => {
    const thin = engine.compute({ stickoutMm: 50, toolDiameterMm: 5, forceN: 100, toolMaterial: "carbide" });
    const thick = engine.compute({ stickoutMm: 50, toolDiameterMm: 10, forceN: 100, toolMaterial: "carbide" });
    expect(thin.deflectionMm / thick.deflectionMm).toBeCloseTo(16, 3);
  });

  it("HSS deflects ~2.76× more than carbide (E 210 vs 580 GPa)", () => {
    const c = engine.compute({ stickoutMm: 50, toolDiameterMm: 10, forceN: 100, toolMaterial: "carbide" });
    const h = engine.compute({ stickoutMm: 50, toolDiameterMm: 10, forceN: 100, toolMaterial: "hss" });
    expect(h.deflectionMm / c.deflectionMm).toBeCloseTo(580 / 210, 2);
  });

  it("diamond PCD deflects less than any other tool material", () => {
    const refs = (["carbide", "hss", "tool_steel", "cobalt_hss"] as const).map((m) =>
      engine.compute({ stickoutMm: 50, toolDiameterMm: 10, forceN: 100, toolMaterial: m }).deflectionMm,
    );
    const diamond = engine.compute({ stickoutMm: 50, toolDiameterMm: 10, forceN: 100, toolMaterial: "diamond_pcd" }).deflectionMm;
    for (const v of refs) expect(diamond).toBeLessThan(v);
  });

  it("explicit modulusGPa override wins over toolMaterial", () => {
    const explicit = engine.compute({
      stickoutMm: 50, toolDiameterMm: 10, forceN: 100,
      modulusGPa: 999, toolMaterial: "hss",
    });
    expect(explicit.modulusGPa).toBe(999);
  });

  it("stiffness = F / deflection at force F", () => {
    const r = engine.compute({ stickoutMm: 50, toolDiameterMm: 10, forceN: 100, toolMaterial: "carbide" });
    expect(r.stiffnessNmm).toBeCloseTo(100 / r.deflectionMm, 2);
  });

  it("unstable when deflection/chipThickness > 0.10", () => {
    // Pick a heavy load that overrides chipThickness
    const r = engine.compute({
      stickoutMm: 80, toolDiameterMm: 6, forceN: 800, toolMaterial: "carbide",
      chipThicknessMm: 0.05,
    });
    expect(r.deflectionToChipRatio).toBeGreaterThan(0);
    if (r.deflectionToChipRatio! > 0.10) expect(r.unstable).toBe(true);
    else expect(r.unstable).toBe(false);
  });

  it("stable when chipThickness is large vs deflection", () => {
    const r = engine.compute({
      stickoutMm: 30, toolDiameterMm: 10, forceN: 100, toolMaterial: "carbide",
      chipThicknessMm: 0.5,
    });
    expect(r.unstable).toBe(false);
  });

  it("max_force inverse: deflection at returned F equals limit", () => {
    const allowed = 0.05;
    const Fmax = engine.max_force(50, 10, allowed, undefined, "carbide");
    const r = engine.compute({ stickoutMm: 50, toolDiameterMm: 10, forceN: Fmax, toolMaterial: "carbide" });
    expect(r.deflectionMm).toBeCloseTo(allowed, 4);
  });

  it("zero force → zero deflection", () => {
    const r = engine.compute({ stickoutMm: 50, toolDiameterMm: 10, forceN: 0, toolMaterial: "carbide" });
    expect(r.deflectionMm).toBe(0);
  });

  it("zero diameter clamped to 0.05mm (no infinite deflection)", () => {
    const r = engine.compute({ stickoutMm: 50, toolDiameterMm: 0, forceN: 100, toolMaterial: "carbide" });
    expect(Number.isFinite(r.deflectionMm)).toBe(true);
  });

  it("zero stickout clamped to 0.1mm", () => {
    const r = engine.compute({ stickoutMm: 0, toolDiameterMm: 10, forceN: 100, toolMaterial: "carbide" });
    expect(Number.isFinite(r.deflectionMm)).toBe(true);
    expect(r.deflectionMm).toBeGreaterThanOrEqual(0);
  });

  it("moduli() returns 5 ToolMaterial entries", () => {
    const m = engine.moduli();
    expect(m.carbide).toBe(580);
    expect(m.hss).toBe(210);
    expect(m.tool_steel).toBe(200);
    expect(m.cobalt_hss).toBe(220);
    expect(m.diamond_pcd).toBe(1050);
  });

  it("validate rejects non-object input", () => {
    expect(engine.validate(null)).toMatch(/object/);
    expect(engine.validate({})).toBeNull();
  });

  it("getCapabilities exposes compute + max_force + moduli", () => {
    const names = engine.getCapabilities().map((c) => c.name);
    expect(names).toContain("compute");
    expect(names).toContain("max_force");
    expect(names).toContain("moduli");
  });
});
