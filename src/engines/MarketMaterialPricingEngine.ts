/**
 * MarketMaterialPricingEngine — Commodity-Indexed Material Pricing
 *
 * Provides market-adjusted material pricing using commodity index multipliers,
 * surcharge modeling, and regional pricing adjustments. Feeds into QuoteEstimator
 * and StockSizeOptimizer for accurate material cost estimation.
 *
 * Base prices are calibrated to 2024 Q4 market averages.
 * Multipliers can be updated from commodity feeds (LME, COMEX, Steel Benchmarker).
 *
 * @engine MarketMaterialPricingEngine
 * @dispatcher businessDispatcher
 * @actions material_price_lookup, material_price_adjust, material_price_compare, material_surcharge
 */

// ── Base prices per kg (2024 Q4 baseline) ──
interface MaterialPriceEntry {
  name: string;
  category: "aluminum" | "steel" | "stainless" | "titanium" | "nickel_alloy" | "copper" | "plastic" | "tool_steel";
  base_price_kg: number;          // USD/kg baseline
  commodity_index: string;         // which index tracks this
  surcharge_applicable: boolean;   // subject to raw material surcharge?
  min_order_kg: number;           // typical MOQ
  lead_time_weeks: number;        // typical lead
  form_multipliers: Record<string, number>;  // plate vs bar vs sheet vs tube
}

const PRICE_DB: Record<string, MaterialPriceEntry> = {
  // ── Aluminum ──
  aluminum_6061: {
    name: "6061-T6", category: "aluminum", base_price_kg: 6.50,
    commodity_index: "LME_AL", surcharge_applicable: true, min_order_kg: 5, lead_time_weeks: 1,
    form_multipliers: { bar: 1.0, plate: 1.15, sheet: 1.20, tube: 1.25, forging: 1.60 },
  },
  aluminum_7075: {
    name: "7075-T6", category: "aluminum", base_price_kg: 9.00,
    commodity_index: "LME_AL", surcharge_applicable: true, min_order_kg: 5, lead_time_weeks: 1,
    form_multipliers: { bar: 1.0, plate: 1.10, sheet: 1.25, tube: 1.30, forging: 1.50 },
  },
  aluminum_2024: {
    name: "2024-T3", category: "aluminum", base_price_kg: 8.50,
    commodity_index: "LME_AL", surcharge_applicable: true, min_order_kg: 5, lead_time_weeks: 2,
    form_multipliers: { bar: 1.0, plate: 1.12, sheet: 1.18, tube: 1.20 },
  },
  aluminum_6063: {
    name: "6063-T5", category: "aluminum", base_price_kg: 5.80,
    commodity_index: "LME_AL", surcharge_applicable: true, min_order_kg: 10, lead_time_weeks: 1,
    form_multipliers: { bar: 1.0, extrusion: 0.90, tube: 1.10 },
  },
  // ── Carbon Steel ──
  steel_1018: {
    name: "1018 CRS", category: "steel", base_price_kg: 2.50,
    commodity_index: "CRU_HRC", surcharge_applicable: false, min_order_kg: 10, lead_time_weeks: 1,
    form_multipliers: { bar: 1.0, plate: 1.10, sheet: 1.15, tube: 1.20 },
  },
  steel_1045: {
    name: "1045", category: "steel", base_price_kg: 2.80,
    commodity_index: "CRU_HRC", surcharge_applicable: false, min_order_kg: 10, lead_time_weeks: 1,
    form_multipliers: { bar: 1.0, plate: 1.12, forging: 1.40 },
  },
  steel_4140: {
    name: "4140 Pre-hard", category: "steel", base_price_kg: 3.80,
    commodity_index: "CRU_HRC", surcharge_applicable: false, min_order_kg: 10, lead_time_weeks: 1,
    form_multipliers: { bar: 1.0, plate: 1.15, forging: 1.35 },
  },
  steel_4340: {
    name: "4340", category: "steel", base_price_kg: 5.20,
    commodity_index: "CRU_HRC", surcharge_applicable: false, min_order_kg: 10, lead_time_weeks: 2,
    form_multipliers: { bar: 1.0, plate: 1.18, forging: 1.40 },
  },
  // ── Stainless Steel ──
  stainless_303: {
    name: "303", category: "stainless", base_price_kg: 7.50,
    commodity_index: "LME_NI", surcharge_applicable: true, min_order_kg: 5, lead_time_weeks: 1,
    form_multipliers: { bar: 1.0, plate: 1.20, sheet: 1.15, tube: 1.25 },
  },
  stainless_304: {
    name: "304", category: "stainless", base_price_kg: 6.80,
    commodity_index: "LME_NI", surcharge_applicable: true, min_order_kg: 5, lead_time_weeks: 1,
    form_multipliers: { bar: 1.0, plate: 1.15, sheet: 1.10, tube: 1.20 },
  },
  stainless_316: {
    name: "316L", category: "stainless", base_price_kg: 8.50,
    commodity_index: "LME_NI", surcharge_applicable: true, min_order_kg: 5, lead_time_weeks: 1,
    form_multipliers: { bar: 1.0, plate: 1.18, sheet: 1.12, tube: 1.22 },
  },
  stainless_17_4ph: {
    name: "17-4 PH", category: "stainless", base_price_kg: 12.00,
    commodity_index: "LME_NI", surcharge_applicable: true, min_order_kg: 10, lead_time_weeks: 3,
    form_multipliers: { bar: 1.0, plate: 1.20, forging: 1.35 },
  },
  // ── Titanium ──
  titanium_gr2: {
    name: "Ti Gr2 (CP)", category: "titanium", base_price_kg: 35.00,
    commodity_index: "OREILLY_TI", surcharge_applicable: true, min_order_kg: 2, lead_time_weeks: 4,
    form_multipliers: { bar: 1.0, plate: 1.15, sheet: 1.25, tube: 1.30 },
  },
  titanium_gr5: {
    name: "Ti-6Al-4V", category: "titanium", base_price_kg: 55.00,
    commodity_index: "OREILLY_TI", surcharge_applicable: true, min_order_kg: 2, lead_time_weeks: 4,
    form_multipliers: { bar: 1.0, plate: 1.12, forging: 1.25, billet: 0.95 },
  },
  // ── Nickel Alloys ──
  inconel_718: {
    name: "Inconel 718", category: "nickel_alloy", base_price_kg: 45.00,
    commodity_index: "LME_NI", surcharge_applicable: true, min_order_kg: 5, lead_time_weeks: 6,
    form_multipliers: { bar: 1.0, plate: 1.20, forging: 1.30 },
  },
  hastelloy_c276: {
    name: "Hastelloy C276", category: "nickel_alloy", base_price_kg: 55.00,
    commodity_index: "LME_NI", surcharge_applicable: true, min_order_kg: 5, lead_time_weeks: 8,
    form_multipliers: { bar: 1.0, plate: 1.25, sheet: 1.18 },
  },
  // ── Copper Alloys ──
  brass_360: {
    name: "Brass 360", category: "copper", base_price_kg: 8.00,
    commodity_index: "COMEX_CU", surcharge_applicable: true, min_order_kg: 5, lead_time_weeks: 1,
    form_multipliers: { bar: 1.0, plate: 1.15, tube: 1.10 },
  },
  bronze_932: {
    name: "Bronze 932", category: "copper", base_price_kg: 10.00,
    commodity_index: "COMEX_CU", surcharge_applicable: true, min_order_kg: 5, lead_time_weeks: 2,
    form_multipliers: { bar: 1.0, tube: 1.05, bushing: 1.20 },
  },
  copper_110: {
    name: "Copper 110", category: "copper", base_price_kg: 12.00,
    commodity_index: "COMEX_CU", surcharge_applicable: true, min_order_kg: 5, lead_time_weeks: 1,
    form_multipliers: { bar: 1.0, plate: 1.10, sheet: 1.08 },
  },
  // ── Tool Steel ──
  tool_steel_d2: {
    name: "D2", category: "tool_steel", base_price_kg: 8.00,
    commodity_index: "CRU_HRC", surcharge_applicable: false, min_order_kg: 5, lead_time_weeks: 2,
    form_multipliers: { bar: 1.0, plate: 1.15, ground_flat: 1.40 },
  },
  tool_steel_a2: {
    name: "A2", category: "tool_steel", base_price_kg: 7.50,
    commodity_index: "CRU_HRC", surcharge_applicable: false, min_order_kg: 5, lead_time_weeks: 2,
    form_multipliers: { bar: 1.0, plate: 1.12, ground_flat: 1.35 },
  },
  tool_steel_s7: {
    name: "S7", category: "tool_steel", base_price_kg: 9.00,
    commodity_index: "CRU_HRC", surcharge_applicable: false, min_order_kg: 5, lead_time_weeks: 3,
    form_multipliers: { bar: 1.0, plate: 1.18, ground_flat: 1.45 },
  },
  // ── Engineering Plastics ──
  delrin: {
    name: "Delrin (POM)", category: "plastic", base_price_kg: 5.50,
    commodity_index: "ICIS_ENG_PLASTIC", surcharge_applicable: false, min_order_kg: 1, lead_time_weeks: 1,
    form_multipliers: { bar: 1.0, plate: 1.10, sheet: 1.15 },
  },
  nylon: {
    name: "Nylon 6/6", category: "plastic", base_price_kg: 6.00,
    commodity_index: "ICIS_ENG_PLASTIC", surcharge_applicable: false, min_order_kg: 1, lead_time_weeks: 1,
    form_multipliers: { bar: 1.0, plate: 1.10, sheet: 1.12, tube: 1.15 },
  },
  peek: {
    name: "PEEK", category: "plastic", base_price_kg: 120.00,
    commodity_index: "ICIS_ENG_PLASTIC", surcharge_applicable: false, min_order_kg: 0.5, lead_time_weeks: 2,
    form_multipliers: { bar: 1.0, plate: 1.08, sheet: 1.15 },
  },
  ultem: {
    name: "ULTEM (PEI)", category: "plastic", base_price_kg: 80.00,
    commodity_index: "ICIS_ENG_PLASTIC", surcharge_applicable: false, min_order_kg: 0.5, lead_time_weeks: 2,
    form_multipliers: { bar: 1.0, plate: 1.10, sheet: 1.12 },
  },
};

// ── Commodity index multipliers (can be updated from market feeds) ──
// 1.0 = baseline. Updated manually or via API integration.
const INDEX_MULTIPLIERS: Record<string, { multiplier: number; as_of: string; trend: "up" | "down" | "stable" }> = {
  LME_AL:           { multiplier: 1.00, as_of: "2024-Q4", trend: "stable" },
  CRU_HRC:          { multiplier: 1.00, as_of: "2024-Q4", trend: "stable" },
  LME_NI:           { multiplier: 1.00, as_of: "2024-Q4", trend: "stable" },
  OREILLY_TI:       { multiplier: 1.00, as_of: "2024-Q4", trend: "stable" },
  COMEX_CU:         { multiplier: 1.00, as_of: "2024-Q4", trend: "stable" },
  ICIS_ENG_PLASTIC: { multiplier: 1.00, as_of: "2024-Q4", trend: "stable" },
};

// ── Regional surcharges ──
const REGIONAL_FACTORS: Record<string, number> = {
  us_midwest: 1.00,
  us_west: 1.03,
  us_northeast: 1.05,
  us_southeast: 0.98,
  canada: 1.08,
  mexico: 0.92,
  eu_west: 1.15,
  eu_east: 1.02,
  uk: 1.18,
  japan: 1.25,
  china: 0.75,
  india: 0.70,
  australia: 1.20,
};

export interface PriceLookupResult {
  material: string;
  name: string;
  category: string;
  base_price_kg: number;
  index_multiplier: number;
  index_as_of: string;
  index_trend: string;
  form_adjusted_price_kg: number;
  regional_factor: number;
  final_price_kg: number;
  surcharge_note: string | null;
  lead_time_weeks: number;
  min_order_kg: number;
  /** U-BIZREG1: Physical properties from MaterialRegistry (if resolved) */
  physics?: {
    density_kg_m3: number;
    machinability_factor: number;
    iso_group: string;
    source: string;
  };
}

// U-BIZREG1: MaterialRegistry bridge for physical property enrichment
import { resolveMaterial } from "../physics/constants.js";

export class MarketMaterialPricingEngine {
  /**
   * Look up current market-adjusted price for a material.
   * U-BIZREG1: Enriched with MaterialRegistry physical properties (density, machinability).
   */
  lookup(input: {
    material: string;
    form?: string;          // bar, plate, sheet, tube, forging, etc.
    region?: string;        // default us_midwest
    weight_kg?: number;     // for quantity discount
  }): PriceLookupResult {
    const entry = PRICE_DB[input.material];
    if (!entry) throw new Error(`Unknown material: ${input.material}. Supported: ${Object.keys(PRICE_DB).join(", ")}`);

    const idx = INDEX_MULTIPLIERS[entry.commodity_index] ?? { multiplier: 1.0, as_of: "unknown", trend: "stable" };
    const formMult = entry.form_multipliers[input.form ?? "bar"] ?? 1.0;
    const regionMult = REGIONAL_FACTORS[input.region ?? "us_midwest"] ?? 1.0;

    // Quantity discount: >100kg = 5% off, >500kg = 10% off, >2000kg = 15% off
    let qtyDiscount = 1.0;
    const wt = input.weight_kg ?? 0;
    if (wt >= 2000) qtyDiscount = 0.85;
    else if (wt >= 500) qtyDiscount = 0.90;
    else if (wt >= 100) qtyDiscount = 0.95;

    const adjustedBase = entry.base_price_kg * idx.multiplier;
    const formPrice = adjustedBase * formMult;
    const finalPrice = formPrice * regionMult * qtyDiscount;

    // U-BIZREG1: Enrich with MaterialRegistry physical properties
    let physics: PriceLookupResult["physics"];
    try {
      const mat = resolveMaterial(input.material);
      physics = {
        density_kg_m3: mat.density_kg_m3,
        machinability_factor: mat.machinability_factor,
        iso_group: mat.iso_group,
        source: "MaterialRegistry",
      };
    } catch { /* material not in canonical DB — pricing-only entry */ }

    return {
      material: input.material,
      name: entry.name,
      category: entry.category,
      base_price_kg: entry.base_price_kg,
      index_multiplier: idx.multiplier,
      index_as_of: idx.as_of,
      index_trend: idx.trend,
      form_adjusted_price_kg: Math.round(formPrice * 100) / 100,
      regional_factor: regionMult,
      final_price_kg: Math.round(finalPrice * 100) / 100,
      surcharge_note: entry.surcharge_applicable ? `Subject to ${entry.commodity_index} surcharge — verify with supplier` : null,
      lead_time_weeks: entry.lead_time_weeks,
      min_order_kg: entry.min_order_kg,
      physics,
    };
  }

  /**
   * Update commodity index multiplier (for manual or API-driven updates).
   */
  adjustIndex(index: string, multiplier: number, as_of: string, trend: "up" | "down" | "stable"): { updated: boolean; index: string; old_multiplier: number; new_multiplier: number } {
    const existing = INDEX_MULTIPLIERS[index];
    if (!existing) throw new Error(`Unknown index: ${index}. Known: ${Object.keys(INDEX_MULTIPLIERS).join(", ")}`);
    if (multiplier < 0.3 || multiplier > 3.0) throw new Error(`Multiplier ${multiplier} out of sane range (0.3-3.0)`);
    const old = existing.multiplier;
    existing.multiplier = multiplier;
    existing.as_of = as_of;
    existing.trend = trend;
    return { updated: true, index, old_multiplier: old, new_multiplier: multiplier };
  }

  /**
   * Compare prices across multiple materials for the same form.
   */
  compare(materials: string[], form?: string, region?: string): Array<PriceLookupResult & { rank: number }> {
    const results = materials.map(m => this.lookup({ material: m, form, region }));
    results.sort((a, b) => a.final_price_kg - b.final_price_kg);
    return results.map((r, i) => ({ ...r, rank: i + 1 }));
  }

  /**
   * Calculate raw material surcharge for stainless/nickel/titanium.
   */
  surcharge(input: {
    material: string;
    weight_kg: number;
    base_price_locked_at?: number;   // if customer has a locked base price
  }): { material: string; surcharge_per_kg: number; total_surcharge: number; explanation: string } {
    const entry = PRICE_DB[input.material];
    if (!entry) throw new Error(`Unknown material: ${input.material}`);
    if (!entry.surcharge_applicable) {
      return { material: input.material, surcharge_per_kg: 0, total_surcharge: 0, explanation: `${entry.name} is not subject to commodity surcharges` };
    }

    const idx = INDEX_MULTIPLIERS[entry.commodity_index] ?? { multiplier: 1.0 };
    const lockedBase = input.base_price_locked_at ?? entry.base_price_kg;
    const currentMarket = entry.base_price_kg * idx.multiplier;
    const surchargePerKg = Math.max(0, currentMarket - lockedBase);

    return {
      material: input.material,
      surcharge_per_kg: Math.round(surchargePerKg * 100) / 100,
      total_surcharge: Math.round(surchargePerKg * input.weight_kg * 100) / 100,
      explanation: surchargePerKg > 0
        ? `${entry.commodity_index} index at ${idx.multiplier}× baseline: market $${currentMarket.toFixed(2)}/kg vs locked $${lockedBase.toFixed(2)}/kg = $${surchargePerKg.toFixed(2)}/kg surcharge`
        : `Current market ($${currentMarket.toFixed(2)}/kg) at or below locked price ($${lockedBase.toFixed(2)}/kg) — no surcharge`,
    };
  }

  /** List all supported materials grouped by category. */
  listMaterials(): Record<string, Array<{ key: string; name: string; base_price_kg: number }>> {
    const grouped: Record<string, Array<{ key: string; name: string; base_price_kg: number }>> = {};
    for (const [key, entry] of Object.entries(PRICE_DB)) {
      if (!grouped[entry.category]) grouped[entry.category] = [];
      grouped[entry.category].push({ key, name: entry.name, base_price_kg: entry.base_price_kg });
    }
    return grouped;
  }
}

export const marketMaterialPricingEngine = new MarketMaterialPricingEngine();
