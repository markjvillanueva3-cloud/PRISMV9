/**
 * PRISM MCP Server — Job Costing Engine
 *
 * Complete job cost estimation: material, setup, machining, programming,
 * inspection, finishing, overhead. Configurable shop rates and machine rates.
 *
 * Ported from PRISM_JOB_COSTING_ENGINE.js (monolith R2.3.1).
 *
 * @module JobCostingEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ShopRates {
  laborRate: number;
  overheadRate: number;
  adminRate: number;
  setupRate: number;
  programmingRate: number;
  inspectionRate: number;
  machineRates: Record<string, number>;
}

export interface JobSpec {
  quantity?: number;
  complexity?: "simple" | "medium" | "complex" | "very_complex";
  machineType?: string;
  operations?: Array<{
    name?: string;
    type?: string;
    setupTime?: number;
    cycleTime?: number;
    mrr?: number;
    volumeToRemove?: number;
  }>;
  material?: {
    type?: string;
    length?: number;
    width?: number;
    height?: number;
    density?: number;
    pricePerLb?: number;
    scrapFactor?: number;
    kerfAllowance?: number;
    customerSupplied?: boolean;
  };
  finishingOperations?: Array<{
    type?: string;
    costPerPart?: number;
  }>;
  toolChanges?: number;
  inspectionLevel?: "minimal" | "standard" | "detailed" | "full_cmm";
  criticalDimensions?: number;
  firstArticleRequired?: boolean;
  rates?: Partial<ShopRates> & { machineRate?: number };
}

export interface CostBreakdown {
  material: { stockDimensions: { length: number; width: number; height: number }; volumeIn3: number; weightLb: number; pricePerLb: number; baseCost: number; scrapAllowance: number; cost: number };
  setup: { operations: Array<{ operation: string; setupMinutes: number }>; totalMinutes: number; hours: number; rate: number; cost: number };
  machining: { operations: Array<{ operation: string; cycleMinutes: number; totalMinutes: number }>; toolChangeMinutes: number; totalMinutes: number; hours: number; machineType: string; rate: number; cost: number };
  programming: { complexity: string; baseHours: number; operationHours: number; axisMultiplier: number; hours: number; rate: number; cost: number };
  inspection: { inspectionLevel: string; partsInspected: number; minutesPerPart: number; firstArticleMinutes: number; totalMinutes: number; hours: number; rate: number; cost: number };
  finishing: { operations: Array<{ type: string; costPerPart: number; totalCost: number }>; cost: number };
  toolConsumption: { toolsConsumed: number; toolCostPerPart: number; toolLifeMin: number; cost: number; source: string };
  power: { avgPowerKw: number; machiningHours: number; ratePerKwh: number; cost: number };
  overhead: { hours: number; cost: number };
  admin: { hours: number; cost: number };
  total: number;
  perPart: number;
  breakdown: { materialPercent: string; laborPercent: string; overheadPercent: string };
}

// ============================================================================
// CONFIG
// ============================================================================

// Session 5-2: rates sourced from ShopConfigurationEngine with hardcoded fallback
const _FALLBACK_RATES: ShopRates = {
  laborRate: 45.00, overheadRate: 35.00, adminRate: 15.00,
  setupRate: 55.00, programmingRate: 75.00, inspectionRate: 50.00,
  machineRates: {
    manual_mill: 35.00, cnc_mill_3axis: 85.00, cnc_mill_5axis: 150.00,
    cnc_lathe: 75.00, swiss_lathe: 125.00, wire_edm: 95.00,
    sinker_edm: 85.00, surface_grinder: 65.00, cylindrical_grinder: 75.00,
    band_saw: 35.00, cmm_inspection: 95.00,
  },
};
let _shopRatesResolved = false;
let _resolvedRates: ShopRates = _FALLBACK_RATES;
function _getShopRates(): ShopRates {
  if (!_shopRatesResolved) {
    try { _resolvedRates = require("./ShopConfigurationEngine.js").shopConfigurationEngine.toJobCostingRates(); } catch { /* fallback */ }
    _shopRatesResolved = true;
  }
  return _resolvedRates;
}
const DEFAULT_RATES: ShopRates = _FALLBACK_RATES;

// Session 5-3 (U-PHYSCOST2): Physics bridge for MRR-based cycle time and Taylor tool life
import { resolveMaterial, getTaylor } from "../physics/constants.js";

interface _PhysicsCostContext {
  mrr_cm3min: number;
  power_kw: number;
  tool_life_min: number;
  confidence: number;
  source: string;
}

function _getPhysicsForOp(materialType: string | undefined, opType: string | undefined): _PhysicsCostContext {
  const isFinish = (opType ?? "").toLowerCase().includes("finish");
  const toolDia = isFinish ? 10 : 12;
  const flutes = isFinish ? 2 : 4;
  const ap = isFinish ? 1.0 : toolDia * 1.0;
  const ae = isFinish ? toolDia * 0.05 : toolDia * 0.5;

  if (!materialType) {
    return { mrr_cm3min: 10, power_kw: 0, tool_life_min: 0, confidence: 0.3, source: "no_material" };
  }

  try {
    const mod = require("./SpeedFeedOrchestratorEngine.js");
    const r = mod.speedFeedOrchestratorEngine.compute({
      material: materialType,
      tool_diameter_mm: toolDia,
      flute_count: flutes,
      axial_depth_mm: ap,
      radial_depth_mm: ae,
      operation: isFinish ? "finishing" : "roughing",
      output_detail: "minimal",
    }).value;

    return {
      mrr_cm3min: r.mrr_cm3min > 0 ? r.mrr_cm3min : 10,
      power_kw: r.power_kw > 0 ? r.power_kw : 0,
      tool_life_min: r.tool_life_min > 0 ? r.tool_life_min : 0,
      confidence: r.overall_confidence,
      source: "SpeedFeedOrchestrator",
    };
  } catch {
    // Fallback: canonical MRR from material Vc + basic geometry
    const mat = resolveMaterial(materialType);
    const vc = isFinish ? mat.vc_base_finishing : mat.vc_base_roughing;
    const rpm = (vc * 1000) / (Math.PI * toolDia);
    const fz = toolDia * (isFinish ? 0.01 : 0.02);
    const feedMmMin = fz * flutes * rpm;
    const mrr = (ap * ae * feedMmMin) / 1000;

    // Taylor tool life: T = (C / Vc)^(1/n), clamped to [0.1, 500] min
    const taylor = getTaylor(materialType);
    const rawToolLife = taylor.C > 0 && taylor.n > 0
      ? Math.pow(taylor.C / vc, 1 / taylor.n) : 0;
    const toolLife = Math.min(Math.max(rawToolLife, 0.1), 500);

    // Kienzle power: Fc [N] = kc1.1 × ap × fz^(1-mc); P [kW] = Fc × Vc / 60000
    const kc1_1 = mat.kc1_1;
    const mc = mat.mc;
    const h = fz > 0 ? fz : 0.05;
    const Fc = kc1_1 * ap * Math.pow(h, 1 - mc); // [N]
    const power = (Fc * vc) / 60000; // [kW] = [N] × [m/min] / 60000

    return {
      mrr_cm3min: Math.max(mrr, 1),
      power_kw: Math.max(power, 0),
      tool_life_min: toolLife,
      confidence: 0.5,
      source: "canonical_fallback",
    };
  }
}

const ELECTRICITY_RATE_PER_KWH = 0.12; // $/kWh — US industrial average
const AVG_TOOL_COST = 25.00; // $ per insert/endmill — fallback if no catalog data

// Fallback material prices ($/lb) — used only when MarketMaterialPricingEngine is unavailable
const _FALLBACK_MATERIAL_PRICES: Record<string, number> = {
  aluminum_6061: 3.50, aluminum_7075: 5.00,
  steel_1018: 1.25, steel_4140: 2.00, steel_4340: 2.50,
  stainless_304: 4.00, stainless_316: 5.50, "stainless_17-4": 8.00,
  titanium_gr5: 25.00, inconel_718: 45.00,
  brass_360: 4.50, bronze_932: 6.00,
  plastic_delrin: 8.00, plastic_peek: 75.00,
};

/**
 * U-BIZREG1: Resolve material price from MarketMaterialPricingEngine (40 materials)
 * with fallback to hardcoded table. Returns $/lb.
 */
function _resolvePrice(materialKey: string): { pricePerLb: number; source: string } {
  try {
    const mod = require("./MarketMaterialPricingEngine.js");
    const engine: { lookup: (i: { material: string }) => { final_price_kg: number } } =
      mod.marketMaterialPricingEngine;
    const result = engine.lookup({ material: materialKey });
    // Convert $/kg to $/lb for compatibility with existing callers
    return { pricePerLb: result.final_price_kg / 2.20462, source: "MarketMaterialPricingEngine" };
  } catch {
    const fallback = _FALLBACK_MATERIAL_PRICES[materialKey] ?? 2.50;
    return { pricePerLb: fallback, source: "hardcoded_fallback" };
  }
}

const SETUP_TIMES: Record<string, number> = {
  roughing: 20, finishing: 10, drilling: 15, tapping: 20,
  boring: 25, facing: 10, turning: 15, threading: 25,
  grinding: 30, "5axis": 45, inspection: 15,
};

const FINISHING_COSTS: Record<string, number> = {
  anodize: 8, anodize_hard: 15, powder_coat: 12,
  nickel_plate: 10, chrome_plate: 18, heat_treat: 5,
  passivate: 3, deburr: 2, bead_blast: 4, tumble: 1.50,
};

// ============================================================================
// ENGINE
// ============================================================================

class JobCostingEngineImpl {

  calculateJobCost(jobSpec: JobSpec): CostBreakdown {
    const material = this.calculateMaterialCost(jobSpec);
    const setup = this.calculateSetupCost(jobSpec);
    const machining = this.calculateMachiningCost(jobSpec);
    const programming = this.calculateProgrammingCost(jobSpec);
    const inspection = this.calculateInspectionCost(jobSpec);
    const finishing = this.calculateFinishingCost(jobSpec);
    const toolConsumption = this._calculateToolConsumption(jobSpec, machining.hours);
    const power = this._calculatePowerCost(jobSpec, machining.hours);

    const directLaborHours = setup.hours + machining.hours
      + programming.hours + inspection.hours;

    const shopRates = _getShopRates();
    const overheadRate = jobSpec.rates?.overheadRate ?? shopRates.overheadRate;
    const adminRate = jobSpec.rates?.adminRate ?? shopRates.adminRate;

    let adminBurdenPct = 0.15;
    try {
      const shopCfg = require("./ShopConfigurationEngine.js").shopConfigurationEngine.getActiveProfile();
      if (shopCfg?.admin_burden_pct != null) adminBurdenPct = shopCfg.admin_burden_pct / 100;
    } catch { /* fallback to 15% */ }

    const overhead = {
      hours: directLaborHours,
      cost: round2(directLaborHours * overheadRate),
    };
    const admin = {
      hours: round2(directLaborHours * adminBurdenPct),
      cost: round2(directLaborHours * adminBurdenPct * adminRate),
    };

    // Session 5-3: total now includes physics-based tool consumption and power
    const total = round2(
      material.cost + setup.cost + machining.cost
      + programming.cost + inspection.cost + finishing.cost
      + toolConsumption.cost + power.cost
      + overhead.cost + admin.cost,
    );

    const quantity = jobSpec.quantity ?? 1;
    const perPart = round2(total / Math.max(quantity, 1));

    return {
      material, setup, machining, programming, inspection, finishing,
      toolConsumption, power,
      overhead, admin, total, perPart,
      breakdown: {
        materialPercent: total > 0 ? (material.cost / total * 100).toFixed(1) : "0.0",
        laborPercent: total > 0 ? ((setup.cost + machining.cost) / total * 100).toFixed(1) : "0.0",
        overheadPercent: total > 0 ? ((overhead.cost + admin.cost) / total * 100).toFixed(1) : "0.0",
      },
    };
  }

  calculateMaterialCost(jobSpec: JobSpec) {
    const mat = jobSpec.material ?? {};
    const quantity = jobSpec.quantity ?? 1;
    const kerf = mat.kerfAllowance ?? 3;

    const stockLength = (mat.length ?? 100) + kerf;
    const stockWidth = (mat.width ?? 100) + kerf;
    const stockHeight = (mat.height ?? 25) + kerf; // use same kerf as length/width

    const volumeMm3 = stockLength * stockWidth * stockHeight;
    const volumeIn3 = volumeMm3 / 16387.064;

    // U-BIZREG1: Density from MaterialRegistry via resolveMaterial() (canonical, ISO-group-aware)
    let density = mat.density ?? 7850;
    let densitySource = "default_steel";
    if (mat.type) {
      try {
        const resolved = resolveMaterial(mat.type);
        density = resolved.density_kg_m3;
        densitySource = "MaterialRegistry";
      } catch { /* keep default */ }
    }

    const weightKg = volumeMm3 * 1e-9 * density;
    const weightLb = weightKg * 2.20462;

    // U-BIZREG1: Price from MarketMaterialPricingEngine (40 materials, commodity-indexed)
    let pricePerLb: number;
    let priceSource: string;
    if (mat.pricePerLb != null) {
      pricePerLb = mat.pricePerLb;
      priceSource = "user_input";
    } else {
      const resolved = _resolvePrice(mat.type?.toLowerCase() ?? "");
      pricePerLb = resolved.pricePerLb;
      priceSource = resolved.source;
    }

    const baseCost = round2(weightLb * pricePerLb * quantity);
    const scrapFactor = mat.scrapFactor ?? 0.15;
    const scrapAllowance = round2(baseCost * scrapFactor);

    return {
      stockDimensions: { length: stockLength, width: stockWidth, height: stockHeight },
      volumeIn3: round2(volumeIn3 * quantity),
      weightLb: round2(weightLb * quantity),
      pricePerLb,
      priceSource,
      densitySource,
      baseCost,
      scrapAllowance,
      cost: round2(baseCost + scrapAllowance),
    };
  }

  calculateSetupCost(jobSpec: JobSpec) {
    const operations = jobSpec.operations ?? [];
    let totalMinutes = 0;
    const details: Array<{ operation: string; setupMinutes: number }> = [];

    for (const op of operations) {
      const time = op.setupTime ?? (SETUP_TIMES[op.type?.toLowerCase() ?? ""] ?? 20);
      details.push({ operation: op.name ?? op.type ?? "unknown", setupMinutes: time });
      totalMinutes += time;
    }

    if (jobSpec.firstArticleRequired) totalMinutes += 30;

    const hours = totalMinutes / 60;
    const rate = jobSpec.rates?.setupRate ?? DEFAULT_RATES.setupRate;

    return { operations: details, totalMinutes, hours: round2(hours), rate, cost: round2(hours * rate) };
  }

  calculateMachiningCost(jobSpec: JobSpec) {
    const operations = jobSpec.operations ?? [];
    const quantity = jobSpec.quantity ?? 1;
    const machineType = jobSpec.machineType ?? "cnc_mill_3axis";
    const materialType = jobSpec.material?.type;

    let totalMinutes = 0;
    const details: Array<{ operation: string; cycleMinutes: number; totalMinutes: number }> = [];

    for (const op of operations) {
      const cycleTime = op.cycleTime ?? this._estimateCycleTime(op, materialType);
      const opTotal = cycleTime * quantity;
      details.push({
        operation: op.name ?? op.type ?? "unknown",
        cycleMinutes: round2(cycleTime),
        totalMinutes: round2(opTotal),
      });
      totalMinutes += opTotal;
    }

    const toolChanges = jobSpec.toolChanges ?? operations.length;
    const toolChangeTime = toolChanges * 0.25 * quantity;
    totalMinutes += toolChangeTime;

    const hours = totalMinutes / 60;
    const rate = jobSpec.rates?.machineRate
      ?? DEFAULT_RATES.machineRates[machineType] ?? 85.00;

    return {
      operations: details,
      toolChangeMinutes: round2(toolChangeTime),
      totalMinutes: round2(totalMinutes),
      hours: round2(hours),
      machineType,
      rate,
      cost: round2(hours * rate),
    };
  }

  calculateProgrammingCost(jobSpec: JobSpec) {
    const complexity = jobSpec.complexity ?? "medium";
    const opCount = jobSpec.operations?.length ?? 3;

    const baseHours: Record<string, number> = {
      simple: 0.5, medium: 1.5, complex: 4.0, very_complex: 8.0,
    };
    const base = baseHours[complexity] ?? 1.5;
    const perOp = opCount * 0.25;
    const axisMult = jobSpec.machineType?.includes("5axis") ? 1.5 : 1.0;

    const hours = (base + perOp) * axisMult;
    const rate = jobSpec.rates?.programmingRate ?? DEFAULT_RATES.programmingRate;

    return {
      complexity,
      baseHours: base,
      operationHours: perOp,
      axisMultiplier: axisMult,
      hours: round2(hours),
      rate,
      cost: round2(hours * rate),
    };
  }

  calculateInspectionCost(jobSpec: JobSpec) {
    const quantity = jobSpec.quantity ?? 1;
    const level = jobSpec.inspectionLevel ?? "standard";
    const critDims = jobSpec.criticalDimensions ?? 5;

    const minutesPerPart: Record<string, number> = {
      minimal: 2, standard: 5, detailed: 15, full_cmm: 30,
    };
    const baseMinutes = minutesPerPart[level] ?? 5;
    const dimTime = critDims * 0.5;

    let partsToInspect = quantity;
    if (quantity > 50) partsToInspect = Math.ceil(quantity * 0.1) + 10;
    else if (quantity > 20) partsToInspect = Math.ceil(quantity * 0.2) + 5;

    const faiTime = jobSpec.firstArticleRequired ? 30 : 0;
    const totalMinutes = partsToInspect * (baseMinutes + dimTime) + faiTime;
    const hours = totalMinutes / 60;
    const rate = jobSpec.rates?.inspectionRate ?? DEFAULT_RATES.inspectionRate;

    return {
      inspectionLevel: level,
      partsInspected: partsToInspect,
      minutesPerPart: baseMinutes + dimTime,
      firstArticleMinutes: faiTime,
      totalMinutes: round2(totalMinutes),
      hours: round2(hours),
      rate,
      cost: round2(hours * rate),
    };
  }

  calculateFinishingCost(jobSpec: JobSpec) {
    const finishingOps = jobSpec.finishingOperations ?? [];
    const quantity = jobSpec.quantity ?? 1;

    let totalCost = 0;
    const details: Array<{ type: string; costPerPart: number; totalCost: number }> = [];

    for (const op of finishingOps) {
      const perPart = op.costPerPart
        ?? FINISHING_COSTS[op.type?.toLowerCase() ?? ""] ?? 5.00;
      const cost = round2(quantity * perPart);
      details.push({ type: op.type ?? "other", costPerPart: perPart, totalCost: cost });
      totalCost += cost;
    }

    return { operations: details, cost: round2(totalCost) };
  }

  // Session 5-3 (U-PHYSCOST2): Tool consumption from Taylor tool life
  private _calculateToolConsumption(jobSpec: JobSpec, machiningHours: number): { toolsConsumed: number; toolCostPerPart: number; toolLifeMin: number; cost: number; source: string } {
    const quantity = jobSpec.quantity ?? 1;
    const ops = jobSpec.operations ?? [];
    const materialType = jobSpec.material?.type;

    if (ops.length > 0 && materialType && machiningHours > 0) {
      // Weighted-average tool life across all operation types (review fix: HIGH #3)
      const opPhysics = ops.map(op => _getPhysicsForOp(materialType, op.type));
      const validLives = opPhysics.filter(p => p.tool_life_min > 0);

      if (validLives.length > 0) {
        const avgToolLife = validLives.reduce((s, p) => s + p.tool_life_min, 0) / validLives.length;
        const machiningMin = machiningHours * 60;
        const toolsConsumed = Math.ceil(machiningMin / avgToolLife);
        const totalToolCost = round2(toolsConsumed * AVG_TOOL_COST);
        const source = opPhysics.some(p => p.source === "SpeedFeedOrchestrator")
          ? "SpeedFeedOrchestrator" : "canonical_fallback";

        return {
          toolsConsumed,
          toolCostPerPart: round2(totalToolCost / Math.max(quantity, 1)),
          toolLifeMin: round2(avgToolLife),
          cost: totalToolCost,
          source,
        };
      }
    }

    // Fallback: static per-operation cost (legacy behavior)
    const cost = round2(ops.length * AVG_TOOL_COST);
    return {
      toolsConsumed: ops.length,
      toolCostPerPart: round2(cost / Math.max(quantity, 1)),
      toolLifeMin: 0,
      cost,
      source: "static_fallback",
    };
  }

  // Session 5-3 (U-PHYSCOST2): Power cost from Kienzle force → kW
  private _calculatePowerCost(jobSpec: JobSpec, machiningHours: number): { avgPowerKw: number; machiningHours: number; ratePerKwh: number; cost: number } {
    const materialType = jobSpec.material?.type;
    const ops = jobSpec.operations ?? [];
    const dominantOp = ops.length > 0 ? ops[0] : undefined;
    const physics = _getPhysicsForOp(materialType, dominantOp?.type);

    if (physics.power_kw > 0 && machiningHours > 0) {
      const cost = round2(physics.power_kw * machiningHours * ELECTRICITY_RATE_PER_KWH);
      return {
        avgPowerKw: round2(physics.power_kw),
        machiningHours: round2(machiningHours),
        ratePerKwh: ELECTRICITY_RATE_PER_KWH,
        cost,
      };
    }

    return { avgPowerKw: 0, machiningHours: round2(machiningHours), ratePerKwh: ELECTRICITY_RATE_PER_KWH, cost: 0 };
  }

  // Session 5-3 (U-PHYSCOST2): Enhanced cycle time with physics MRR
  private _estimateCycleTime(op: { type?: string; mrr?: number; volumeToRemove?: number }, materialType?: string): number {
    // If explicit MRR provided, use it directly
    if (op.mrr && op.mrr > 0) {
      const vol = op.volumeToRemove ?? 50;
      let cycleTime = vol / op.mrr;
      cycleTime *= 1.2; // positioning overhead
      return Math.max(cycleTime, 1);
    }

    // Try physics-backed MRR from SpeedFeedOrchestrator
    if (materialType) {
      const physics = _getPhysicsForOp(materialType, op.type);
      if (physics.mrr_cm3min > 0 && physics.source !== "no_material") {
        const vol = op.volumeToRemove ?? 50;
        let cycleTime = vol / physics.mrr_cm3min;
        cycleTime *= 1.2; // positioning overhead
        const multipliers: Record<string, number> = {
          finishing: 2.0, roughing: 1.0, drilling: 0.5, tapping: 1.5,
        };
        cycleTime *= multipliers[op.type?.toLowerCase() ?? ""] ?? 1.0;
        return Math.max(cycleTime, 1);
      }
    }

    // Fallback: static MRR estimate
    const mrr = 10;
    const vol = op.volumeToRemove ?? 50;
    let cycleTime = vol / mrr;
    cycleTime *= 1.2;
    const multipliers: Record<string, number> = {
      finishing: 2.0, roughing: 1.0, drilling: 0.5, tapping: 1.5,
    };
    cycleTime *= multipliers[op.type?.toLowerCase() ?? ""] ?? 1.0;
    return Math.max(cycleTime, 1);
  }
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export const jobCostingEngine = new JobCostingEngineImpl();
