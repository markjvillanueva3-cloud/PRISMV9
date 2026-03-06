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
  overhead: { hours: number; cost: number };
  admin: { hours: number; cost: number };
  total: number;
  perPart: number;
  breakdown: { materialPercent: string; laborPercent: string; overheadPercent: string };
}

// ============================================================================
// CONFIG
// ============================================================================

const DEFAULT_RATES: ShopRates = {
  laborRate: 45.00,
  overheadRate: 35.00,
  adminRate: 15.00,
  setupRate: 55.00,
  programmingRate: 75.00,
  inspectionRate: 50.00,
  machineRates: {
    manual_mill: 35.00,
    cnc_mill_3axis: 85.00,
    cnc_mill_5axis: 150.00,
    cnc_lathe: 75.00,
    swiss_lathe: 125.00,
    wire_edm: 95.00,
    sinker_edm: 85.00,
    surface_grinder: 65.00,
    cylindrical_grinder: 75.00,
  },
};

const MATERIAL_PRICES: Record<string, number> = {
  aluminum_6061: 3.50, aluminum_7075: 5.00,
  steel_1018: 1.25, steel_4140: 2.00, steel_4340: 2.50,
  stainless_304: 4.00, stainless_316: 5.50, "stainless_17-4": 8.00,
  titanium_gr5: 25.00, inconel_718: 45.00,
  brass_360: 4.50, bronze_932: 6.00,
  plastic_delrin: 8.00, plastic_peek: 75.00,
};

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

    const directLaborHours = setup.hours + machining.hours
      + programming.hours + inspection.hours;

    const overheadRate = jobSpec.rates?.overheadRate ?? DEFAULT_RATES.overheadRate;
    const adminRate = jobSpec.rates?.adminRate ?? DEFAULT_RATES.adminRate;

    const overhead = {
      hours: directLaborHours,
      cost: round2(directLaborHours * overheadRate),
    };
    const admin = {
      hours: round2(directLaborHours * 0.15),
      cost: round2(directLaborHours * 0.15 * adminRate),
    };

    const total = round2(
      material.cost + setup.cost + machining.cost
      + programming.cost + inspection.cost + finishing.cost
      + overhead.cost + admin.cost,
    );

    const quantity = jobSpec.quantity ?? 1;
    const perPart = round2(total / Math.max(quantity, 1));

    return {
      material, setup, machining, programming, inspection, finishing,
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
    const stockHeight = (mat.height ?? 25) + (mat.kerfAllowance ?? 2);

    const volumeMm3 = stockLength * stockWidth * stockHeight;
    const volumeIn3 = volumeMm3 / 16387.064;
    const density = mat.density ?? 7850;
    const weightKg = volumeMm3 * 1e-9 * density;
    const weightLb = weightKg * 2.20462;

    const pricePerLb = mat.pricePerLb
      ?? MATERIAL_PRICES[mat.type?.toLowerCase() ?? ""] ?? 2.50;
    const baseCost = round2(weightLb * pricePerLb * quantity);
    const scrapFactor = mat.scrapFactor ?? 0.15;
    const scrapAllowance = round2(baseCost * scrapFactor);

    return {
      stockDimensions: { length: stockLength, width: stockWidth, height: stockHeight },
      volumeIn3: round2(volumeIn3 * quantity),
      weightLb: round2(weightLb * quantity),
      pricePerLb,
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

    let totalMinutes = 0;
    const details: Array<{ operation: string; cycleMinutes: number; totalMinutes: number }> = [];

    for (const op of operations) {
      const cycleTime = op.cycleTime ?? this._estimateCycleTime(op);
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

  private _estimateCycleTime(op: { type?: string; mrr?: number; volumeToRemove?: number }): number {
    const mrr = op.mrr ?? 10;
    const vol = op.volumeToRemove ?? 50;
    let cycleTime = vol / mrr;
    cycleTime *= 1.2; // positioning overhead

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
