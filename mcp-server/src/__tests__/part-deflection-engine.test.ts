/**
 * PartDeflectionEngine — Unit Tests
 * @milestone FORGE-ENGINES-B24
 */
import { describe, it, expect } from "vitest";
import { partDeflectionEngine } from "../engines/PartDeflectionEngine.js";

describe("PartDeflectionEngine", () => {
  it("calculates wall deflection", () => {
    const r = partDeflectionEngine.calculate({
      wall_thickness_mm: 2,
      wall_height_mm: 50,
      cutting_force_n: 200,
    });
    expect(r.max_deflection.value).toBeGreaterThan(0);
  });

  it("thinner wall deflects more", () => {
    const thick = partDeflectionEngine.calculate({
      wall_thickness_mm: 5,
      wall_height_mm: 50,
    });
    const thin = partDeflectionEngine.calculate({
      wall_thickness_mm: 1,
      wall_height_mm: 50,
    });
    expect(thin.max_deflection.value).toBeGreaterThan(
      thick.max_deflection.value
    );
  });

  it("taller wall deflects more", () => {
    const short = partDeflectionEngine.calculate({
      wall_thickness_mm: 2,
      wall_height_mm: 20,
    });
    const tall = partDeflectionEngine.calculate({
      wall_thickness_mm: 2,
      wall_height_mm: 80,
    });
    expect(tall.max_deflection.value).toBeGreaterThan(
      short.max_deflection.value
    );
  });

  it("aluminum deflects more than steel", () => {
    const steel = partDeflectionEngine.calculate({
      wall_thickness_mm: 2,
      wall_height_mm: 50,
      material: "steel",
    });
    const alu = partDeflectionEngine.calculate({
      wall_thickness_mm: 2,
      wall_height_mm: 50,
      material: "aluminum",
    });
    expect(alu.max_deflection.value).toBeGreaterThan(
      steel.max_deflection.value
    );
  });

  it("clamped support deflects less than cantilever", () => {
    const cant = partDeflectionEngine.calculate({
      wall_thickness_mm: 2,
      wall_height_mm: 50,
      support_type: "cantilever",
    });
    const clamp = partDeflectionEngine.calculate({
      wall_thickness_mm: 2,
      wall_height_mm: 50,
      support_type: "clamped",
    });
    expect(clamp.max_deflection.value).toBeLessThan(
      cant.max_deflection.value
    );
  });

  it("warns when deflection exceeds tolerance", () => {
    const r = partDeflectionEngine.calculate({
      wall_thickness_mm: 1,
      wall_height_mm: 80,
      cutting_force_n: 500,
      tolerance_mm: 0.01,
    });
    expect(
      r.warnings.some(w => w.includes("Deflection") ||
        w.includes("exceeds"))
    ).toBe(true);
  });

  it("spring passes increase with deflection", () => {
    const ok = partDeflectionEngine.calculate({
      wall_thickness_mm: 5,
      wall_height_mm: 30,
      tolerance_mm: 0.1,
    });
    const bad = partDeflectionEngine.calculate({
      wall_thickness_mm: 1,
      wall_height_mm: 80,
      cutting_force_n: 500,
      tolerance_mm: 0.01,
    });
    expect(bad.spring_passes_needed.value).toBeGreaterThan(
      ok.spring_passes_needed.value
    );
  });

  it("max allowable force calculated", () => {
    const r = partDeflectionEngine.calculate({
      wall_thickness_mm: 2,
      wall_height_mm: 50,
      tolerance_mm: 0.05,
    });
    expect(r.max_allowable_force.value).toBeGreaterThan(0);
  });

  it("natural frequency calculated", () => {
    const r = partDeflectionEngine.calculate({
      wall_thickness_mm: 3,
      wall_height_mm: 50,
    });
    expect(r.natural_frequency.value).toBeGreaterThan(0);
  });

  it("warns extreme height/thickness ratio", () => {
    const r = partDeflectionEngine.calculate({
      wall_thickness_mm: 1,
      wall_height_mm: 50,
    });
    expect(
      r.warnings.some(w => w.includes("ratio") ||
        w.includes("Height"))
    ).toBe(true);
  });
});
