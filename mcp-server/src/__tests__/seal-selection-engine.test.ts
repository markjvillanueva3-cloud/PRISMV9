/**
 * SealSelectionEngine — Unit Tests
 * @milestone FORGE-ENGINES-B38
 */
import { describe, it, expect } from "vitest";
import { sealSelectionEngine } from "../engines/SealSelectionEngine.js";

describe("SealSelectionEngine", () => {
  it("groove OD > shaft diameter for o-ring", () => {
    const r = sealSelectionEngine.calculate({
      seal_type: "o_ring",
      shaft_diameter_mm: 50,
    });
    expect(r.groove_od.value).toBeGreaterThan(50);
  });

  it("squeeze percentage in valid range", () => {
    const r = sealSelectionEngine.calculate({});
    expect(r.squeeze_pct.value).toBeGreaterThanOrEqual(15);
    expect(r.squeeze_pct.value).toBeLessThanOrEqual(25);
  });

  it("PV increases with speed", () => {
    const slow = sealSelectionEngine.calculate({ speed_rpm: 500 });
    const fast = sealSelectionEngine.calculate({ speed_rpm: 5000 });
    expect(fast.pv_value.value).toBeGreaterThan(slow.pv_value.value);
  });

  it("PTFE has higher PV limit than nitrile", () => {
    const nbr = sealSelectionEngine.calculate({ material: "nitrile" });
    const ptfe = sealSelectionEngine.calculate({ material: "ptfe" });
    expect(ptfe.pv_limit.value).toBeGreaterThan(nbr.pv_limit.value);
  });

  it("viton has higher max temp than nitrile", () => {
    const nbr = sealSelectionEngine.calculate({ material: "nitrile" });
    const vit = sealSelectionEngine.calculate({ material: "viton" });
    expect(vit.max_temperature.value).toBeGreaterThan(
      nbr.max_temperature.value
    );
  });

  it("warns incompatible material/media", () => {
    const r = sealSelectionEngine.calculate({
      material: "nitrile",
      media: "steam",
    });
    expect(r.material_compatible.unit).toBe("INCOMPATIBLE");
    expect(r.warnings.some(w => w.includes("compatible"))).toBe(true);
  });

  it("PTFE compatible with chemical", () => {
    const r = sealSelectionEngine.calculate({
      material: "ptfe",
      media: "chemical",
    });
    expect(r.material_compatible.unit).toBe("COMPATIBLE");
  });

  it("seal life > 0", () => {
    const r = sealSelectionEngine.calculate({});
    expect(r.seal_life.value).toBeGreaterThan(0);
  });

  it("heat generated > 0 for rotating seal", () => {
    const r = sealSelectionEngine.calculate({
      seal_type: "lip_seal",
      speed_rpm: 3000,
    });
    expect(r.heat_generated.value).toBeGreaterThan(0);
  });

  it("warns PV exceeded at high speed and pressure", () => {
    const r = sealSelectionEngine.calculate({
      material: "silicone",
      pressure_mpa: 3,
      speed_rpm: 5000,
      shaft_diameter_mm: 80,
    });
    expect(r.warnings.some(w => w.includes("PV"))).toBe(true);
  });
});
