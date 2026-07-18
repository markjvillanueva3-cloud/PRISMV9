import { describe, it, expect } from "vitest";
import {
  wireEDMPunchDieAdapterEngine as adapter,
  WireEDMPunchDieAdapterEngine,
  type WireEDMPunchDieAdapterInput,
} from "../engines/WireEDMPunchDieAdapterEngine.js";

describe("WireEDMPunchDieAdapterEngine", () => {
  it("exports a singleton with adapt()", () => {
    expect(adapter).toBeInstanceOf(WireEDMPunchDieAdapterEngine);
    expect(typeof adapter.adapt).toBe("function");
  });

  it("throws on missing material/thickness/min_radius", () => {
    expect(() => adapter.adapt({ material: "D2" } as WireEDMPunchDieAdapterInput))
      .toThrow(/material \+ thickness_mm \+ min_radius_mm/);
  });

  it("carbide picks 4-pass preset", () => {
    const r = adapter.adapt({ material: "Tungsten Carbide", thickness_mm: 15, min_radius_mm: 0.3 });
    expect(r.strategy_preset).toBe("carbide-aggressive-4-pass-finer-fluid");
  });

  it("tool steel picks 3-pass preset", () => {
    const r = adapter.adapt({ material: "D2 tool steel", thickness_mm: 15, min_radius_mm: 0.3 });
    expect(r.strategy_preset).toBe("tool-steel-3-pass-standard");
  });

  it("stainless picks controlled-burn preset", () => {
    const r = adapter.adapt({ material: "Stainless 304", thickness_mm: 12, min_radius_mm: 0.3 });
    expect(r.strategy_preset).toBe("stainless-controlled-burn-3-pass");
  });

  it("IT5 default tolerance → 8μm budget", () => {
    const r = adapter.adapt({ material: "D2 tool steel", thickness_mm: 10, min_radius_mm: 0.2 });
    expect(r.tolerance_budget_um.value).toBe(8);
    expect(r.tolerance_budget_um.source).toMatch(/ISO 286/);
  });

  it("Ra ≤ 0.4μm requests trim3 mirror-finish pass", () => {
    const r = adapter.adapt({
      material: "D2 tool steel",
      thickness_mm: 10,
      min_radius_mm: 0.2,
      surface_finish_ra_um: 0.2,
    });
    expect(r.cut_passes.trim3_optional).not.toBeNull();
    expect(r.cut_passes.trim3_optional?.ie).toBe(1);
  });

  it("Ra > 0.4μm skips trim3", () => {
    const r = adapter.adapt({
      material: "D2 tool steel",
      thickness_mm: 10,
      min_radius_mm: 0.2,
      surface_finish_ra_um: 1.6,
    });
    expect(r.cut_passes.trim3_optional).toBeNull();
  });

  it("thick punch (>25mm) uses IE=4 main pass", () => {
    const r = adapter.adapt({ material: "D2 tool steel", thickness_mm: 50, min_radius_mm: 0.3 });
    expect(r.cut_passes.main.ie).toBe(4);
  });

  it("thin punch (≤25mm) uses IE=3 main pass", () => {
    const r = adapter.adapt({ material: "D2 tool steel", thickness_mm: 10, min_radius_mm: 0.3 });
    expect(r.cut_passes.main.ie).toBe(3);
  });

  it("wire fits constraint: default 0.25mm works for radius ≥ 0.1mm", () => {
    const r = adapter.adapt({ material: "D2", thickness_mm: 10, min_radius_mm: 0.15 });
    expect(r.wire_recommendation).toMatch(/0\.25mm brass/);
  });

  it("min radius too tight → wire recommendation reduces wire diameter", () => {
    const r = adapter.adapt({
      material: "D2",
      thickness_mm: 10,
      min_radius_mm: 0.05,
      wire_diameter_mm: 0.25,
    });
    expect(r.wire_recommendation).toMatch(/Reduce to|violates/);
  });

  it("output names ≥4 required engines + WEDM tribal tag", () => {
    const r = adapter.adapt({ material: "D2 tool steel", thickness_mm: 15, min_radius_mm: 0.2 });
    expect(r.required_engines.length).toBeGreaterThanOrEqual(4);
    expect(r.required_engines).toContain("WireEDMAIPrintToProgramEngine");
    expect(r.required_dispatchers).toContain("prism_edm");
    expect(r.tribal_tags).toContain("wire-edm:punch-die");
    expect(r.tribal_tags).toContain("guitrau-§6");
    expect(r.tribal_tags).toContain("wedm-svi-0.875");
  });
});
