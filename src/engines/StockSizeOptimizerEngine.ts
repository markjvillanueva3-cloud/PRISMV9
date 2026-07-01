/**
 * StockSizeOptimizerEngine — Optimal Raw Material Stock Selection
 *
 * Given part dimensions + material, finds the optimal bar/plate/billet/tube from
 * standard catalog sizes. Minimizes waste while ensuring machinability.
 * Considers: machining allowance, saw kerf, chuck grip, cutoff, nesting on bar.
 *
 * @engine StockSizeOptimizerEngine
 * @dispatcher businessDispatcher
 * @actions stock_size_optimize, stock_size_catalog, stock_size_nesting
 */

// ── Standard catalog sizes (inches converted to mm for internal use) ──
interface StockSize {
  form: "round_bar" | "hex_bar" | "square_bar" | "flat_bar" | "plate" | "tube" | "sheet";
  dimension_mm: number[];        // [OD] for round, [W,H] for flat/plate, [OD,ID] for tube
  standard_lengths_mm: number[]; // available lengths
  description: string;
}

// Round bar stock (common sizes in mm)
const ROUND_BAR_SIZES = [
  6.35, 7.94, 9.53, 12.7, 15.88, 19.05, 22.23, 25.4, 28.58, 31.75,
  34.93, 38.1, 44.45, 50.8, 57.15, 63.5, 69.85, 76.2, 82.55, 88.9,
  95.25, 101.6, 114.3, 127, 139.7, 152.4, 165.1, 177.8, 190.5, 203.2,
  228.6, 254, 279.4, 304.8,
];

const FLAT_BAR_SIZES = [
  [12.7, 3.18], [12.7, 6.35], [19.05, 3.18], [19.05, 6.35], [19.05, 9.53],
  [25.4, 3.18], [25.4, 6.35], [25.4, 9.53], [25.4, 12.7],
  [31.75, 6.35], [31.75, 9.53], [31.75, 12.7],
  [38.1, 6.35], [38.1, 9.53], [38.1, 12.7], [38.1, 19.05],
  [50.8, 6.35], [50.8, 9.53], [50.8, 12.7], [50.8, 19.05], [50.8, 25.4],
  [63.5, 9.53], [63.5, 12.7], [63.5, 19.05], [63.5, 25.4],
  [76.2, 9.53], [76.2, 12.7], [76.2, 19.05], [76.2, 25.4], [76.2, 38.1],
  [101.6, 12.7], [101.6, 19.05], [101.6, 25.4], [101.6, 38.1], [101.6, 50.8],
  [127, 12.7], [127, 19.05], [127, 25.4], [127, 38.1], [127, 50.8],
  [152.4, 12.7], [152.4, 19.05], [152.4, 25.4], [152.4, 38.1], [152.4, 50.8],
  [203.2, 19.05], [203.2, 25.4], [203.2, 38.1], [203.2, 50.8],
];

const PLATE_THICKNESSES_MM = [3.18, 4.76, 6.35, 9.53, 12.7, 15.88, 19.05, 25.4, 31.75, 38.1, 44.45, 50.8, 63.5, 76.2, 88.9, 101.6, 127, 152.4, 177.8, 203.2];
const STANDARD_PLATE_SIZES_MM: [number, number][] = [[609.6, 609.6], [609.6, 1219.2], [914.4, 914.4], [914.4, 1219.2], [1219.2, 1219.2], [1219.2, 2438.4], [1524, 3048]];

const STANDARD_LENGTHS_MM = [304.8, 609.6, 914.4, 1219.2, 1828.8, 2438.4, 3048, 3657.6, 6096];

// U-BIZREG1: Fallback tables — used only when registry/engine lookup fails
const _FALLBACK_COST_KG: Record<string, number> = {
  aluminum_6061: 6.50, aluminum_7075: 9.00, aluminum_2024: 8.50,
  steel_1018: 2.50, steel_4140: 3.80, steel_4340: 5.20, steel_1045: 2.80,
  stainless_303: 7.50, stainless_304: 6.80, stainless_316: 8.50, stainless_17_4ph: 12.00,
  titanium_gr2: 35.00, titanium_gr5: 55.00,
  brass_360: 8.00, bronze_932: 10.00, copper_110: 12.00,
  inconel_718: 45.00, hastelloy_c276: 55.00,
  delrin: 5.50, nylon: 6.00, peek: 120.00, ultem: 80.00,
  cast_iron: 2.00, tool_steel_d2: 8.00, tool_steel_a2: 7.50, tool_steel_s7: 9.00,
};

const _FALLBACK_DENSITY: Record<string, number> = {
  aluminum_6061: 2710, aluminum_7075: 2810, aluminum_2024: 2780,
  steel_1018: 7870, steel_4140: 7850, steel_4340: 7850, steel_1045: 7870,
  stainless_303: 8000, stainless_304: 8000, stainless_316: 8000, stainless_17_4ph: 7800,
  titanium_gr2: 4510, titanium_gr5: 4430,
  brass_360: 8500, bronze_932: 8800, copper_110: 8940,
  inconel_718: 8190, hastelloy_c276: 8890,
  delrin: 1410, nylon: 1140, peek: 1300, ultem: 1270,
  cast_iron: 7200, tool_steel_d2: 7700, tool_steel_a2: 7860, tool_steel_s7: 7800,
};

import { resolveMaterial } from "../physics/constants.js";

/**
 * U-BIZREG1: Resolve density from MaterialRegistry (canonical, ISO-group-aware).
 * Falls back to hardcoded table for materials not in the canonical DB (plastics, exotics).
 */
function _resolveDensity(material: string): { density: number; source: string } {
  try {
    const mat = resolveMaterial(material);
    if (mat.density_kg_m3 > 0) return { density: mat.density_kg_m3, source: "MaterialRegistry" };
  } catch { /* fall through */ }
  const fb = _FALLBACK_DENSITY[material];
  if (fb) return { density: fb, source: "fallback_table" };
  return { density: 7850, source: "default_steel" };
}

/**
 * U-BIZREG1: Resolve cost/kg from MarketMaterialPricingEngine (40 materials, commodity-indexed).
 * Falls back to hardcoded table.
 */
function _resolveCostKg(material: string): { costKg: number; source: string } {
  try {
    const mod = require("./MarketMaterialPricingEngine.js");
    const engine: { lookup: (i: { material: string }) => { final_price_kg: number } } =
      mod.marketMaterialPricingEngine;
    const result = engine.lookup({ material });
    return { costKg: result.final_price_kg, source: "MarketMaterialPricingEngine" };
  } catch { /* fall through */ }
  const fb = _FALLBACK_COST_KG[material];
  if (fb) return { costKg: fb, source: "fallback_table" };
  return { costKg: 5.00, source: "default" };
}

export interface StockOptimizeInput {
  part_dims_mm: { length: number; width: number; height: number };
  material: string;
  quantity: number;
  machining_allowance_mm?: number;   // per side (default: 1.5mm aluminum, 2.0mm steel)
  saw_kerf_mm?: number;             // default 3.2mm (1/8")
  chuck_grip_mm?: number;           // default 25mm for lathe, 0 for mill
  is_turning?: boolean;             // round stock preferred
  min_stock_coverage_pct?: number;   // min 100% (all dims covered), default 100
}

export interface StockOptimizeResult {
  recommendations: Array<{
    rank: number;
    form: string;
    dimensions_mm: number[];
    stock_length_mm: number;
    parts_per_length: number;
    total_lengths_needed: number;
    material_utilization_pct: number;
    waste_pct: number;
    weight_per_part_kg: number;
    material_cost_per_part: number;
    total_material_cost: number;
    description: string;
  }>;
  part_volume_cm3: number;
  stock_volume_cm3_best: number;
  buy_to_fly_ratio: number;
  warnings: string[];
}

export class StockSizeOptimizerEngine {
  /**
   * Find optimal stock size for given part dimensions and material.
   */
  optimize(input: StockOptimizeInput): StockOptimizeResult {
    const dims = input.part_dims_mm;
    const partVol = (dims.length * dims.width * dims.height) / 1000; // cm³

    // U-BIZREG1: Registry-backed density and cost resolution
    // Reject truly unknown materials — generic fallback defaults are unsafe for stock sizing.
    // A material must exist in at least the fallback table or the MarketMaterialPricingEngine.
    const knownInFallback = input.material in _FALLBACK_COST_KG;
    let knownInPricingEngine = false;
    try {
      const mod = require("./MarketMaterialPricingEngine.js");
      mod.marketMaterialPricingEngine.lookup({ material: input.material });
      knownInPricingEngine = true;
    } catch { /* not found */ }
    if (!knownInFallback && !knownInPricingEngine) {
      throw new Error(`Unknown material: ${input.material}. Supported: ${Object.keys(_FALLBACK_COST_KG).join(", ")}`);
    }
    const densityRes = _resolveDensity(input.material);
    const costRes = _resolveCostKg(input.material);
    const density = densityRes.density;
    const costKg = costRes.costKg;

    const warnings: string[] = [];

    // Machining allowance per side
    const isAluminum = input.material.startsWith("aluminum") || input.material === "brass_360";
    const allowance = input.machining_allowance_mm ?? (isAluminum ? 1.5 : 2.0);
    const kerf = input.saw_kerf_mm ?? 3.2;
    const grip = input.is_turning ? (input.chuck_grip_mm ?? 25) : 0;

    // Required stock dimensions (part + 2× allowance per axis)
    const reqL = dims.length + 2 * allowance;
    const reqW = dims.width + 2 * allowance;
    const reqH = dims.height + 2 * allowance;

    const candidates: StockOptimizeResult["recommendations"] = [];

    if (input.is_turning || (dims.width === dims.height && dims.length > dims.width * 2)) {
      // ── Round bar candidates ──
      const maxCross = Math.max(reqW, reqH);
      const minDia = Math.sqrt(maxCross * maxCross + maxCross * maxCross); // diagonal for non-round cross-section
      const fitDia = input.is_turning ? maxCross : minDia;

      for (const dia of ROUND_BAR_SIZES) {
        if (dia < fitDia) continue;
        if (dia > fitDia * 2.5) break; // skip overly large

        for (const barLen of STANDARD_LENGTHS_MM) {
          const cutLen = reqL + grip + kerf;
          const partsPerBar = Math.floor(barLen / cutLen);
          if (partsPerBar < 1) continue;

          const barsNeeded = Math.ceil(input.quantity / partsPerBar);
          const stockVolPerPart = (Math.PI * (dia / 2) ** 2 * cutLen) / 1000; // cm³
          const utilization = (partVol / stockVolPerPart) * 100;
          const weightPerPart = (stockVolPerPart / 1000) * (density / 1000); // kg
          const costPerPart = weightPerPart * costKg;

          candidates.push({
            rank: 0,
            form: "round_bar",
            dimensions_mm: [dia],
            stock_length_mm: barLen,
            parts_per_length: partsPerBar,
            total_lengths_needed: barsNeeded,
            material_utilization_pct: Math.round(utilization * 10) / 10,
            waste_pct: Math.round((100 - utilization) * 10) / 10,
            weight_per_part_kg: Math.round(weightPerPart * 1000) / 1000,
            material_cost_per_part: Math.round(costPerPart * 100) / 100,
            total_material_cost: Math.round(costPerPart * input.quantity * 100) / 100,
            description: `Ø${dia}mm × ${barLen}mm round bar`,
          });
        }
      }
    }

    // ── Flat bar candidates ──
    for (const [w, h] of FLAT_BAR_SIZES) {
      // Try both orientations
      const fits = (w >= reqW && h >= reqH) || (w >= reqH && h >= reqW);
      if (!fits) continue;
      if (w > Math.max(reqW, reqH) * 3) continue; // skip way too large

      for (const barLen of STANDARD_LENGTHS_MM) {
        const cutLen = reqL + kerf;
        const partsPerBar = Math.floor(barLen / cutLen);
        if (partsPerBar < 1) continue;

        const barsNeeded = Math.ceil(input.quantity / partsPerBar);
        const stockVolPerPart = (w * h * cutLen) / 1000;
        const utilization = (partVol / stockVolPerPart) * 100;
        const weightPerPart = (stockVolPerPart / 1000) * (density / 1000);
        const costPerPart = weightPerPart * costKg;

        candidates.push({
          rank: 0,
          form: "flat_bar",
          dimensions_mm: [w, h],
          stock_length_mm: barLen,
          parts_per_length: partsPerBar,
          total_lengths_needed: barsNeeded,
          material_utilization_pct: Math.round(utilization * 10) / 10,
          waste_pct: Math.round((100 - utilization) * 10) / 10,
          weight_per_part_kg: Math.round(weightPerPart * 1000) / 1000,
          material_cost_per_part: Math.round(costPerPart * 100) / 100,
          total_material_cost: Math.round(costPerPart * input.quantity * 100) / 100,
          description: `${w}×${h}mm flat bar × ${barLen}mm`,
        });
      }
    }

    // ── Plate candidates (for wide/flat parts) ──
    if (Math.max(dims.width, dims.height) < 50) {
      // Part is thin — plate is appropriate
      for (const thick of PLATE_THICKNESSES_MM) {
        if (thick < reqH && thick < reqW) continue;
        if (thick > Math.min(reqH, reqW) * 3) break;

        for (const [pw, pl] of STANDARD_PLATE_SIZES_MM) {
          // How many parts can we nest on this plate?
          const fitW = Math.max(reqL, reqW);
          const fitL = Math.max(reqL, reqW) === reqL ? reqW : reqL;
          const partsAcrossW = Math.floor(pw / (fitW + kerf));
          const partsAcrossL = Math.floor(pl / (fitL + kerf));
          const partsPerPlate = partsAcrossW * partsAcrossL;
          if (partsPerPlate < 1) continue;

          const platesNeeded = Math.ceil(input.quantity / partsPerPlate);
          const stockVolPerPart = (fitW + kerf) * (fitL + kerf) * thick / 1000;
          const utilization = (partVol / stockVolPerPart) * 100;
          const weightPerPart = (stockVolPerPart / 1000) * (density / 1000);
          const costPerPart = weightPerPart * costKg;

          candidates.push({
            rank: 0,
            form: "plate",
            dimensions_mm: [pw, pl, thick],
            stock_length_mm: thick,
            parts_per_length: partsPerPlate,
            total_lengths_needed: platesNeeded,
            material_utilization_pct: Math.round(utilization * 10) / 10,
            waste_pct: Math.round((100 - utilization) * 10) / 10,
            weight_per_part_kg: Math.round(weightPerPart * 1000) / 1000,
            material_cost_per_part: Math.round(costPerPart * 100) / 100,
            total_material_cost: Math.round(costPerPart * input.quantity * 100) / 100,
            description: `${pw}×${pl}×${thick}mm plate`,
          });
        }
      }
    }

    // ── Rank by total material cost (lower = better) ──
    candidates.sort((a, b) => a.total_material_cost - b.total_material_cost);
    // Deduplicate similar options — keep top 8
    const seen = new Set<string>();
    const top: typeof candidates = [];
    for (const c of candidates) {
      const key = `${c.form}-${c.dimensions_mm.join("x")}`;
      if (seen.has(key)) continue;
      seen.add(key);
      c.rank = top.length + 1;
      top.push(c);
      if (top.length >= 8) break;
    }

    if (top.length === 0) {
      warnings.push("No standard stock sizes found — part may require custom-cut material or forging");
    }

    const bestStockVol = top[0] ? (top[0].weight_per_part_kg / (density / 1e6)) : partVol;
    const btf = bestStockVol / partVol;

    if (btf > 10) warnings.push(`Buy-to-fly ratio is ${btf.toFixed(1)}:1 — consider near-net-shape (casting/forging/additive)`);
    if (btf > 5 && input.material.startsWith("titanium")) warnings.push("High BTF ratio with titanium — strongly consider additive or forging");

    return {
      recommendations: top,
      part_volume_cm3: Math.round(partVol * 100) / 100,
      stock_volume_cm3_best: Math.round(bestStockVol * 100) / 100,
      buy_to_fly_ratio: Math.round(btf * 100) / 100,
      warnings,
    };
  }

  /** Return catalog of available stock forms for a material. */
  catalog(material: string): { round_bars: number[]; flat_bars: number[][]; plate_thicknesses: number[]; cost_per_kg: number; density_kg_m3: number } {
    // U-BIZREG1: Registry-backed lookup
    const costRes = _resolveCostKg(material);
    const densRes = _resolveDensity(material);
    const costKg = costRes.costKg;
    const dens = densRes.density;
    return {
      round_bars: ROUND_BAR_SIZES,
      flat_bars: FLAT_BAR_SIZES,
      plate_thicknesses: PLATE_THICKNESSES_MM,
      cost_per_kg: costKg,
      density_kg_m3: dens,
    };
  }

  /** Calculate how many parts can be nested from a given stock piece. */
  nesting(input: {
    stock_form: "round_bar" | "flat_bar" | "plate";
    stock_dims_mm: number[];
    stock_length_mm: number;
    part_dims_mm: { length: number; width: number; height: number };
    machining_allowance_mm?: number;
    saw_kerf_mm?: number;
  }): { parts_per_stock: number; waste_pct: number; layout: string } {
    const allow = input.machining_allowance_mm ?? 1.5;
    const kerf = input.saw_kerf_mm ?? 3.2;
    const reqL = input.part_dims_mm.length + 2 * allow;
    const reqW = input.part_dims_mm.width + 2 * allow;
    const reqH = input.part_dims_mm.height + 2 * allow;
    const partVol = input.part_dims_mm.length * input.part_dims_mm.width * input.part_dims_mm.height;

    let parts = 0;
    let stockVol = 0;
    let layout = "";

    if (input.stock_form === "round_bar") {
      const dia = input.stock_dims_mm[0];
      const cutLen = reqL + kerf;
      parts = Math.floor(input.stock_length_mm / cutLen);
      stockVol = Math.PI * (dia / 2) ** 2 * input.stock_length_mm;
      layout = `${parts} parts × ${Math.round(cutLen)}mm cuts along ${input.stock_length_mm}mm bar`;
    } else if (input.stock_form === "flat_bar") {
      const [w, h] = input.stock_dims_mm;
      if (w < reqW || h < reqH) return { parts_per_stock: 0, waste_pct: 100, layout: "Part does not fit in stock cross-section" };
      const cutLen = reqL + kerf;
      parts = Math.floor(input.stock_length_mm / cutLen);
      stockVol = w * h * input.stock_length_mm;
      layout = `${parts} parts × ${Math.round(cutLen)}mm cuts along ${input.stock_length_mm}mm bar`;
    } else {
      const [pw, pl, thick] = input.stock_dims_mm;
      if (thick < Math.min(reqH, reqW)) return { parts_per_stock: 0, waste_pct: 100, layout: "Part does not fit in plate thickness" };
      const fitW = Math.max(reqL, reqW);
      const fitL = reqL === fitW ? reqW : reqL;
      const nx = Math.floor(pw / (fitW + kerf));
      const ny = Math.floor(pl / (fitL + kerf));
      parts = nx * ny;
      stockVol = pw * pl * thick;
      layout = `${nx}×${ny} = ${parts} parts nested on ${pw}×${pl}×${thick}mm plate`;
    }

    const usedVol = partVol * parts;
    const waste = parts > 0 ? (1 - usedVol / stockVol) * 100 : 100;

    return { parts_per_stock: parts, waste_pct: Math.round(waste * 10) / 10, layout };
  }
}

export const stockSizeOptimizerEngine = new StockSizeOptimizerEngine();
