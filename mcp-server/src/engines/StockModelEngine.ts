/**
 * StockModelEngine — L2-P2-MS1 CAD/CAM Layer
 *
 * Stock material modeling: create stock from billet/casting/forging,
 * track material removal through operations, compute remaining volume,
 * identify excess material. Used for visualization and verification.
 *
 * Actions: stock_create, stock_update, stock_analyze, stock_compare
 */

// ============================================================================
// TYPES
// ============================================================================

export type StockType = "billet" | "bar" | "plate" | "casting" | "forging" | "near_net";

export interface StockDefinition {
  id: string;
  type: StockType;
  material: string;
  dimensions: {
    width_mm: number;
    height_mm: number;
    depth_mm: number;   // or length for bar stock
    diameter_mm?: number;  // for cylindrical stock
  };
  weight_kg?: number;
  cost_per_kg?: number;
}

export interface MaterialRemoval {
  operation_id: string;
  operation_type: string;       // "roughing", "finishing", "drilling", etc.
  volume_removed_mm3: number;
  tool_used: string;
  time_sec: number;
}

export interface StockState {
  stock_id: string;
  original_volume_mm3: number;
  current_volume_mm3: number;
  removed_volume_mm3: number;
  removal_history: MaterialRemoval[];
  removal_pct: number;
  remaining_excess_mm3: number;
  part_volume_mm3: number;
}

export interface StockAnalysis {
  material_utilization_pct: number;   // part_vol / stock_vol
  buy_to_fly_ratio: number;          // stock_weight / part_weight
  excess_material_mm3: number;
  operations_count: number;
  total_removal_time_sec: number;
  mrr_avg_mm3_per_sec: number;
  cost_of_waste: number;
  recommendations: string[];
}

export interface StockComparison {
  options: StockDefinition[];
  analyses: StockAnalysis[];
  best_index: number;
  reason: string;
}

// ============================================================================
// DENSITY TABLE (kg/m³)
// ============================================================================

const MATERIAL_DENSITY: Record<string, number> = {
  "steel_1045": 7850, "steel_4140": 7850, "steel_4340": 7850,
  "stainless_304": 8000, "stainless_316": 8000, "stainless_17-4PH": 7780,
  "aluminum_6061": 2710, "aluminum_7075": 2810, "aluminum_2024": 2780,
  "titanium_Ti6Al4V": 4430, "inconel_718": 8190,
  "cast_iron": 7200, "brass": 8500, "copper": 8960,
};

function densityFor(material: string): number {
  for (const [key, val] of Object.entries(MATERIAL_DENSITY)) {
    if (material.toLowerCase().includes(key.toLowerCase().split("_")[0])) return val;
  }
  return 7850; // default steel
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class StockModelEngine {
  private states = new Map<string, StockState>();

  create(stock: StockDefinition, partVolume_mm3: number): StockState {
    let volume: number;
    if (stock.dimensions.diameter_mm) {
      // Cylindrical stock
      const r = stock.dimensions.diameter_mm / 2;
      volume = Math.PI * r * r * stock.dimensions.depth_mm;
    } else {
      volume = stock.dimensions.width_mm * stock.dimensions.height_mm * stock.dimensions.depth_mm;
    }

    const state: StockState = {
      stock_id: stock.id,
      original_volume_mm3: Math.round(volume),
      current_volume_mm3: Math.round(volume),
      removed_volume_mm3: 0,
      removal_history: [],
      removal_pct: 0,
      remaining_excess_mm3: Math.round(volume - partVolume_mm3),
      part_volume_mm3: Math.round(partVolume_mm3),
    };

    this.states.set(stock.id, state);
    return state;
  }

  removeVolume(stockId: string, removal: MaterialRemoval): StockState | null {
    const state = this.states.get(stockId);
    if (!state) return null;

    state.removal_history.push(removal);
    state.removed_volume_mm3 += removal.volume_removed_mm3;
    state.current_volume_mm3 = Math.max(state.part_volume_mm3, state.original_volume_mm3 - state.removed_volume_mm3);
    state.removal_pct = Math.round((state.removed_volume_mm3 / state.original_volume_mm3) * 1000) / 10;
    state.remaining_excess_mm3 = Math.max(0, state.current_volume_mm3 - state.part_volume_mm3);

    return state;
  }

  analyze(stockId: string, material: string, costPerKg: number = 5): StockAnalysis | null {
    const state = this.states.get(stockId);
    if (!state) return null;

    const density = densityFor(material);
    const stockWeight = (state.original_volume_mm3 / 1e9) * density;
    const partWeight = (state.part_volume_mm3 / 1e9) * density;
    const wasteWeight = stockWeight - partWeight;
    const utilization = (state.part_volume_mm3 / state.original_volume_mm3) * 100;
    const buyToFly = partWeight > 0 ? stockWeight / partWeight : Infinity;

    const totalTime = state.removal_history.reduce((s, r) => s + r.time_sec, 0);
    const totalRemoved = state.removal_history.reduce((s, r) => s + r.volume_removed_mm3, 0);
    const avgMRR = totalTime > 0 ? totalRemoved / totalTime : 0;

    const recommendations: string[] = [];
    if (utilization < 30) {
      recommendations.push("Low material utilization — consider near-net-shape blank (casting/forging)");
    }
    if (buyToFly > 10) {
      recommendations.push(`High buy-to-fly ratio (${buyToFly.toFixed(1)}:1) — significant waste. Evaluate additive manufacturing.`);
    }
    if (state.remaining_excess_mm3 > 0 && state.remaining_excess_mm3 / state.original_volume_mm3 > 0.1) {
      recommendations.push("Excess stock remaining after all operations — verify stock dimensions are optimal");
    }

    return {
      material_utilization_pct: Math.round(utilization * 10) / 10,
      buy_to_fly_ratio: Math.round(buyToFly * 100) / 100,
      excess_material_mm3: Math.round(state.remaining_excess_mm3),
      operations_count: state.removal_history.length,
      total_removal_time_sec: Math.round(totalTime),
      mrr_avg_mm3_per_sec: Math.round(avgMRR * 100) / 100,
      cost_of_waste: Math.round(wasteWeight * costPerKg * 100) / 100,
      recommendations,
    };
  }

  compareStocks(stocks: StockDefinition[], partVolume_mm3: number, material: string): StockComparison {
    const analyses: StockAnalysis[] = [];

    for (const s of stocks) {
      const state = this.create(s, partVolume_mm3);
      const analysis = this.analyze(s.id, material, s.cost_per_kg);
      if (analysis) analyses.push(analysis);
      this.states.delete(s.id); // cleanup
    }

    let bestIdx = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < analyses.length; i++) {
      // Score: higher utilization + lower waste cost = better
      const score = analyses[i].material_utilization_pct - analyses[i].cost_of_waste * 0.1;
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    }

    return {
      options: stocks,
      analyses,
      best_index: bestIdx,
      reason: `Best material utilization (${analyses[bestIdx]?.material_utilization_pct}%) with lowest waste cost`,
    };
  }

  getState(stockId: string): StockState | undefined {
    return this.states.get(stockId);
  }
}

export const stockModelEngine = new StockModelEngine();
