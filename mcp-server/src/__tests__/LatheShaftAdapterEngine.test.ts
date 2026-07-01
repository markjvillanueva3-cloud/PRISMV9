import { describe, it, expect } from "vitest";
import {
  latheShaftAdapterEngine as adapter,
  LatheShaftAdapterEngine,
  type LatheShaftAdapterInput,
} from "../engines/LatheShaftAdapterEngine.js";

describe("LatheShaftAdapterEngine", () => {
  it("exports a singleton with adapt()", () => {
    expect(adapter).toBeInstanceOf(LatheShaftAdapterEngine);
    expect(typeof adapter.adapt).toBe("function");
  });

  it("throws on missing material or dimensions", () => {
    expect(() => adapter.adapt({ material: "steel" } as LatheShaftAdapterInput)).toThrow(/material \+ length_mm \+ diameter_mm/);
  });

  it("aluminum shaft picks high-speed-turn preset + 800-1800 SFM", () => {
    const r = adapter.adapt({ material: "Aluminum 6061", length_mm: 200, diameter_mm: 40 });
    expect(r.strategy_preset).toBe("aluminum-high-speed-turn");
    expect(r.speed_feed_seed.sfm_min).toBe(800);
    expect(r.speed_feed_seed.sfm_max).toBe(1800);
  });

  it("stainless picks chip-break preset + 100-220 SFM", () => {
    const r = adapter.adapt({ material: "Stainless 304", length_mm: 200, diameter_mm: 40 });
    expect(r.strategy_preset).toBe("stainless-controlled-chip-break");
    expect(r.speed_feed_seed.sfm_min).toBe(100);
    expect(r.speed_feed_seed.sfm_max).toBe(220);
  });

  it("Inconel picks superalloy preset + 30-60 SFM + 0.15mm finishing DOC", () => {
    const r = adapter.adapt({ material: "Inconel 718", length_mm: 200, diameter_mm: 40 });
    expect(r.strategy_preset).toBe("superalloy-rigid-controlled");
    expect(r.speed_feed_seed.sfm_min).toBe(30);
    expect(r.speed_feed_seed.sfm_max).toBe(60);
    expect(r.speed_feed_seed.doc_finishing_mm).toBe(0.15);
  });

  it("L/D > 3 → tailstock required", () => {
    const r = adapter.adapt({ material: "steel", length_mm: 200, diameter_mm: 50 });
    expect(r.tailstock_required).toBe(true);
    expect(r.workholding).toMatch(/tailstock/);
  });

  it("L/D > 10 → steady rest required", () => {
    const r = adapter.adapt({ material: "steel", length_mm: 600, diameter_mm: 40 });
    expect(r.steady_rest_required).toBe(true);
    expect(r.workholding).toMatch(/steady-rest/);
  });

  it("L/D ≤ 3 → no tailstock, simple 3-jaw chuck", () => {
    const r = adapter.adapt({ material: "steel", length_mm: 90, diameter_mm: 50 });
    expect(r.tailstock_required).toBe(false);
    expect(r.workholding).toBe("3-jaw-chuck");
  });

  it("IT6 tolerance class → 16μm budget", () => {
    const r = adapter.adapt({ material: "1144 steel", length_mm: 200, diameter_mm: 30, tolerance_class: "IT6" });
    expect(r.tolerance_budget_um.value).toBe(16);
  });

  it("IT11 tolerance class → 160μm budget", () => {
    const r = adapter.adapt({ material: "1018 steel", length_mm: 200, diameter_mm: 30, tolerance_class: "IT11" });
    expect(r.tolerance_budget_um.value).toBe(160);
  });

  it("safety_tier_override is honored", () => {
    const r = adapter.adapt({
      material: "steel",
      length_mm: 200,
      diameter_mm: 30,
      safety_tier_override: "prototype",
    });
    expect(r.safety_tier).toBe("prototype");
  });

  it("output names ≥7 required engines + Okuma tribal tag", () => {
    const r = adapter.adapt({ material: "1144 steel", length_mm: 200, diameter_mm: 30 });
    expect(r.required_engines.length).toBeGreaterThanOrEqual(7);
    expect(r.required_engines).toContain("TurningPrintToProgramEngine");
    expect(r.required_engines).toContain("BoringBarDeflectionEngine");
    expect(r.tribal_tags).toContain("okuma-osp");
    expect(r.tribal_tags).toContain("jm-die-okuma-corpus");
    expect(r.required_dispatchers).toContain("prism_turning");
  });
});
