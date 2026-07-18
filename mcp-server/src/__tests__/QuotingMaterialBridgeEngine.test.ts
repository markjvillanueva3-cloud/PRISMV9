/**
 * QuotingMaterialBridgeEngine.test.ts —
 * QUOTING-SYNERGY-MS0/U-QP-BRIDGE-MATERIAL-WIRE (slot:charlie iter44 2026-05-26).
 *
 * Tests the smallest-possible material registry → quoting bridge. Verifies:
 *   - Resolution via canonical resolver (mocked-in PipelineRegistryBridge)
 *   - $/kg fallback to ISO-group defaults
 *   - $/kg override beats default
 *   - Buy-to-fly factor: override beats ISO-default
 *   - Weight + spend derivation from volume + density
 *   - Volume-missing → null spend + warning
 *   - Confidence chain (context.confidence × cost-source confidence)
 *   - Warnings propagate from PipelineRegistryBridge context
 *
 * Per CLAUDE.md test discipline: real reference values from canonical
 * physics constants, no toBeDefined() stubs.
 */

import { describe, it, expect, vi } from "vitest";

// Hoisted vi.mock — must be top-level for vitest. Stubs PipelineRegistryBridge
// so the bridge is testable without spinning up the registry singletons.
vi.mock("../engines/PipelineRegistryBridge.js", () => {
  return {
    resolveMaterial: vi.fn(async (input: { name: string }) => {
      // Canonical aluminum 6061 — ISO group N, density 2700 kg/m³.
      if (/al(uminum)?[\s_-]?6061/i.test(input.name)) {
        return {
          name: "aluminum_6061",
          iso_group: "N",
          kc1_1: 700, mc: 0.22,
          taylor_C: 600, taylor_n: 0.40,
          k_thermal: 167, sigma_y_MPa: 276,
          density_kg_m3: 2700,
          hardness_HB: 95,
          vc_base_roughing: 600, vc_base_finishing: 800,
          machinability_factor: 1.4,
          cp_J_kgK: 896, E_GPa: 69,
          source: "registry",
          confidence: 0.95,
          warnings: [],
        };
      }
      // Canonical Inconel 718 — ISO group S, density 8190 kg/m³.
      if (/inconel|inco/i.test(input.name)) {
        return {
          name: "inconel_718",
          iso_group: "S",
          kc1_1: 2800, mc: 0.27,
          taylor_C: 80, taylor_n: 0.15,
          k_thermal: 11.4, sigma_y_MPa: 1100,
          density_kg_m3: 8190,
          hardness_HB: 360,
          vc_base_roughing: 50, vc_base_finishing: 80,
          machinability_factor: 0.3,
          cp_J_kgK: 435, E_GPa: 200,
          source: "registry",
          confidence: 0.95,
          warnings: [],
        };
      }
      // Canonical generic steel — ISO P, density 7850.
      if (/steel/i.test(input.name)) {
        return {
          name: "steel_1018",
          iso_group: "P",
          kc1_1: 1800, mc: 0.25,
          taylor_C: 350, taylor_n: 0.25,
          k_thermal: 51.9, sigma_y_MPa: 370,
          density_kg_m3: 7850,
          hardness_HB: 126,
          vc_base_roughing: 180, vc_base_finishing: 250,
          machinability_factor: 1.0,
          cp_J_kgK: 486, E_GPa: 200,
          source: "registry",
          confidence: 0.95,
          warnings: [],
        };
      }
      // Unrecognized → ISO-default fallback with warning.
      return {
        name: input.name,
        iso_group: "P",
        kc1_1: 1800, mc: 0.25,
        taylor_C: 350, taylor_n: 0.25,
        k_thermal: 51.9, sigma_y_MPa: 370,
        density_kg_m3: 7850,
        hardness_HB: 126,
        vc_base_roughing: 180, vc_base_finishing: 250,
        machinability_factor: 1.0,
        cp_J_kgK: 486, E_GPa: 200,
        source: "iso_default",
        confidence: 0.5,
        warnings: ["material not found in registry — falling back to ISO-P default"],
      };
    }),
  };
});

import { QuotingMaterialBridgeEngine } from "../engines/QuotingMaterialBridgeEngine.js";

describe("QuotingMaterialBridgeEngine", () => {
  it("resolves aluminum 6061 with ISO-N defaults — $5/kg, 3.0× buy-to-fly, 250cm³ × 2.7g/cc = 0.675kg finished", async () => {
    const r = await QuotingMaterialBridgeEngine.getMaterialForQuote({
      material: "aluminum_6061",
      volume_cm3: 250,
    });
    expect(r.context.iso_group).toBe("N");
    expect(r.context.density_kg_m3).toBe(2700);
    expect(r.usd_per_kg).toBeCloseTo(5.00, 2);
    expect(r.buy_to_fly_factor).toBeCloseTo(3.0, 2);
    expect(r.finished_weight_kg).toBeCloseTo(0.675, 3); // 250 × 2700 × 1e-6
    expect(r.stock_weight_kg).toBeCloseTo(2.025, 3);    // 0.675 × 3.0
    expect(r.estimated_material_spend_usd).toBeCloseTo(10.125, 3); // 2.025 × $5
    expect(r.cost_source).toBe("iso_default");
    expect(r.confidence).toBeCloseTo(0.95 * 0.6, 3);    // context.95 × cost.6
  });

  it("Inconel 718 hits ISO-S defaults — $32/kg, 4.5× buy-to-fly (aerospace ratio)", async () => {
    const r = await QuotingMaterialBridgeEngine.getMaterialForQuote({
      material: "inconel_718",
      volume_cm3: 100,
    });
    expect(r.context.iso_group).toBe("S");
    expect(r.context.density_kg_m3).toBe(8190);
    expect(r.usd_per_kg).toBeCloseTo(32.00, 2);
    expect(r.buy_to_fly_factor).toBeCloseTo(4.5, 2);
    expect(r.finished_weight_kg).toBeCloseTo(0.819, 3);
    expect(r.stock_weight_kg).toBeCloseTo(3.6855, 3);
    expect(r.estimated_material_spend_usd).toBeCloseTo(117.936, 2); // 3.6855 × 32
  });

  it("steel hits ISO-P defaults — $1.20/kg, 2.0× buy-to-fly", async () => {
    const r = await QuotingMaterialBridgeEngine.getMaterialForQuote({
      material: "steel_1018",
      volume_cm3: 500,
    });
    expect(r.context.iso_group).toBe("P");
    expect(r.usd_per_kg).toBeCloseTo(1.20, 2);
    expect(r.buy_to_fly_factor).toBeCloseTo(2.0, 2);
    expect(r.finished_weight_kg).toBeCloseTo(3.925, 3); // 500 × 7850 × 1e-6
    expect(r.stock_weight_kg).toBeCloseTo(7.85, 3);
    expect(r.estimated_material_spend_usd).toBeCloseTo(9.42, 2);
  });

  it("usd_per_kg_override beats ISO-default and bumps cost_source to override", async () => {
    const r = await QuotingMaterialBridgeEngine.getMaterialForQuote({
      material: "aluminum_6061",
      volume_cm3: 250,
      usd_per_kg_override: 12.50, // e.g. 7075 alloy premium
    });
    expect(r.usd_per_kg).toBeCloseTo(12.50, 2);
    expect(r.cost_source).toBe("override");
    expect(r.confidence).toBeCloseTo(0.95 * 1.0, 3); // override → 1.0 cost-confidence
    expect(r.estimated_material_spend_usd).toBeCloseTo(2.025 * 12.50, 3);
  });

  it("buy_to_fly_factor override beats ISO-default", async () => {
    const r = await QuotingMaterialBridgeEngine.getMaterialForQuote({
      material: "aluminum_6061",
      volume_cm3: 250,
      buy_to_fly_factor: 1.5, // near-net stock
    });
    expect(r.buy_to_fly_factor).toBeCloseTo(1.5, 2);
    expect(r.stock_weight_kg).toBeCloseTo(0.675 * 1.5, 3);
  });

  it("missing volume → null weight/spend + explicit warning", async () => {
    const r = await QuotingMaterialBridgeEngine.getMaterialForQuote({
      material: "aluminum_6061",
    });
    expect(r.finished_weight_kg).toBeNull();
    expect(r.stock_weight_kg).toBeNull();
    expect(r.estimated_material_spend_usd).toBeNull();
    expect(r.warnings.some((w) => w.includes("volume_cm3 not provided"))).toBe(true);
    // Confidence chain still runs — context.95 × cost-iso_default.6
    expect(r.confidence).toBeCloseTo(0.95 * 0.6, 3);
  });

  it("unrecognized material falls through to ISO-P with low confidence + propagated warning", async () => {
    const r = await QuotingMaterialBridgeEngine.getMaterialForQuote({
      material: "unobtanium_9000",
      volume_cm3: 100,
    });
    expect(r.context.iso_group).toBe("P");
    expect(r.context.source).toBe("iso_default");
    expect(r.confidence).toBeCloseTo(0.5 * 0.6, 3); // both low
    expect(r.warnings.some((w) => /not found in registry/i.test(w))).toBe(true);
  });

  it("ISO_GROUP_USD_PER_KG_DEFAULT exposes all 6 ISO groups", () => {
    const d = QuotingMaterialBridgeEngine.DEFAULTS.usd_per_kg;
    expect(d.P).toBeGreaterThan(0);
    expect(d.M).toBeGreaterThan(0);
    expect(d.K).toBeGreaterThan(0);
    expect(d.N).toBeGreaterThan(0);
    expect(d.S).toBeGreaterThan(0);
    expect(d.H).toBeGreaterThan(0);
    // ISO-S (Inconel/Ti) is the most expensive bracket
    expect(d.S).toBeGreaterThan(d.N);
    expect(d.S).toBeGreaterThan(d.M);
    expect(d.S).toBeGreaterThan(d.P);
    // ISO-P (steel) and ISO-K (cast iron) are the cheapest brackets
    expect(d.P).toBeLessThan(d.N);
    expect(d.K).toBeLessThan(d.N);
  });

  it("buy-to-fly defaults reflect machining-physics reality (Ti/Inco >> Al >> steel)", () => {
    const b = QuotingMaterialBridgeEngine.DEFAULTS.buy_to_fly;
    // Ti/Inco buy-to-fly is aerospace-class (4-6×)
    expect(b.S).toBeGreaterThan(b.N);
    // Aluminum is pocketed aggressively → higher buy-to-fly than steel
    expect(b.N).toBeGreaterThan(b.P);
    // All factors > 1.0 (you always start with more stock than the finished part)
    expect(b.P).toBeGreaterThan(1.0);
    expect(b.M).toBeGreaterThan(1.0);
    expect(b.K).toBeGreaterThan(1.0);
    expect(b.N).toBeGreaterThan(1.0);
    expect(b.S).toBeGreaterThan(1.0);
    expect(b.H).toBeGreaterThan(1.0);
  });

  it("adversarial: volume_cm3 = 0 → null spend (zero-volume guard)", async () => {
    const r = await QuotingMaterialBridgeEngine.getMaterialForQuote({
      material: "aluminum_6061",
      volume_cm3: 0,
    });
    expect(r.finished_weight_kg).toBeNull();
    expect(r.estimated_material_spend_usd).toBeNull();
  });

  it("adversarial: volume_cm3 = NaN → null spend", async () => {
    const r = await QuotingMaterialBridgeEngine.getMaterialForQuote({
      material: "aluminum_6061",
      volume_cm3: NaN,
    });
    expect(r.finished_weight_kg).toBeNull();
    expect(r.estimated_material_spend_usd).toBeNull();
  });

  it("adversarial: usd_per_kg_override <= 0 ignored, falls back to ISO-default", async () => {
    const r = await QuotingMaterialBridgeEngine.getMaterialForQuote({
      material: "aluminum_6061",
      volume_cm3: 250,
      usd_per_kg_override: -5,
    });
    expect(r.cost_source).toBe("iso_default");
    expect(r.usd_per_kg).toBeCloseTo(5.00, 2); // ISO-N default
  });
});
