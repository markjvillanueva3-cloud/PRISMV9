import { describe, it, expect } from "vitest";
import {
  millPrismaticAdapterEngine as adapter,
  MillPrismaticAdapterEngine,
  type MillPrismaticAdapterInput,
} from "../engines/MillPrismaticAdapterEngine.js";

describe("MillPrismaticAdapterEngine", () => {
  it("exports a singleton with adapt() method", () => {
    expect(adapter).toBeInstanceOf(MillPrismaticAdapterEngine);
    expect(typeof adapter.adapt).toBe("function");
  });

  it("throws on missing material or bbox", () => {
    expect(() => adapter.adapt({} as MillPrismaticAdapterInput)).toThrow(/material \+ bbox_mm/);
  });

  it("aluminum picks HSM preset + 1500-3000 SFM seed", () => {
    const r = adapter.adapt({ material: "Aluminum 6061", bbox_mm: { x: 100, y: 100, z: 50 } });
    expect(r.strategy_preset).toBe("aluminum-hsm-trochoidal");
    expect(r.speed_feed_seed.sfm_min).toBe(1500);
    expect(r.speed_feed_seed.sfm_max).toBe(3000);
  });

  it("stainless picks stable-engagement preset + 150-280 SFM", () => {
    const r = adapter.adapt({ material: "Stainless 316", bbox_mm: { x: 100, y: 100, z: 50 } });
    expect(r.strategy_preset).toBe("stainless-stable-engagement");
    expect(r.speed_feed_seed.sfm_min).toBe(150);
    expect(r.speed_feed_seed.sfm_max).toBe(280);
  });

  it("tool steel picks rigid-roughing preset + 80-180 SFM", () => {
    const r = adapter.adapt({ material: "H13 tool steel", bbox_mm: { x: 100, y: 100, z: 50 } });
    expect(r.strategy_preset).toBe("tool-steel-rigid-roughing");
    expect(r.speed_feed_seed.sfm_min).toBe(80);
    expect(r.speed_feed_seed.sfm_max).toBe(180);
  });

  it("HSM-capable (5-axis + ≥15K RPM) uses trochoidal narrow WOC (0.1)", () => {
    const r = adapter.adapt({
      material: "Aluminum 7075",
      bbox_mm: { x: 100, y: 100, z: 50 },
      machine_caps: { axes: 5, rpm_max: 24000 },
    });
    expect(r.speed_feed_seed.woc_ratio_max).toBe(0.1);
    expect(r.speed_feed_seed.doc_ratio_max).toBe(1.0);
  });

  it("non-HSM 3-axis uses conventional WOC (0.4)", () => {
    const r = adapter.adapt({
      material: "Stainless 304",
      bbox_mm: { x: 100, y: 100, z: 50 },
      machine_caps: { axes: 3, rpm_max: 8000 },
    });
    expect(r.speed_feed_seed.woc_ratio_max).toBe(0.4);
    expect(r.speed_feed_seed.doc_ratio_max).toBe(0.5);
  });

  it("IT6 tolerance class → 19μm budget", () => {
    const r = adapter.adapt({ material: "P20", bbox_mm: { x: 100, y: 100, z: 50 }, tolerance_class: "IT6" });
    expect(r.tolerance_budget_um.value).toBe(19);
    expect(r.tolerance_budget_um.unit).toBe("μm");
  });

  it("IT11 tolerance class → 190μm budget", () => {
    const r = adapter.adapt({ material: "1018 steel", bbox_mm: { x: 100, y: 100, z: 50 }, tolerance_class: "IT11" });
    expect(r.tolerance_budget_um.value).toBe(190);
  });

  it("safety tier override propagates", () => {
    const r = adapter.adapt({
      material: "Aluminum 6061",
      bbox_mm: { x: 100, y: 100, z: 50 },
      safety_tier_override: "shop_floor",
    });
    expect(r.safety_tier).toBe("shop_floor");
  });

  it("output always names ≥6 required engines + ≥3 dispatchers", () => {
    const r = adapter.adapt({ material: "Aluminum 6061", bbox_mm: { x: 100, y: 100, z: 50 } });
    expect(r.required_engines.length).toBeGreaterThanOrEqual(6);
    expect(r.required_dispatchers.length).toBeGreaterThanOrEqual(3);
    expect(r.required_engines).toContain("CuttingForceEngine");
    expect(r.required_engines).toContain("ChatterStabilityLobeEngine");
    expect(r.required_dispatchers).toContain("prism_calc");
    expect(r.required_dispatchers).toContain("prism_safety");
  });

  it("tribal tags include material, tolerance, axes, regime", () => {
    const r = adapter.adapt({
      material: "Aluminum 6061",
      bbox_mm: { x: 100, y: 100, z: 50 },
      tolerance_class: "IT7",
      machine_caps: { axes: 5, rpm_max: 20000 },
    });
    expect(r.tribal_tags).toContain("mill:prismatic");
    expect(r.tribal_tags).toContain("material:aluminum 6061");
    expect(r.tribal_tags).toContain("tolerance:IT7");
    expect(r.tribal_tags).toContain("axes:5");
    expect(r.tribal_tags).toContain("hsm");
  });
});
