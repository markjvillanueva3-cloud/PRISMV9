/**
 * CostEstimatorEngine — Quick manufacturing cost estimation
 *
 * @deprecated U-CONSOL1: This engine is superseded by JobCostingEngine,
 * which provides physics-backed cycle times and registry-backed pricing.
 * This engine was never wired to any dispatcher. For quick estimates,
 * use JobCostingEngine.calculateJobCost() with minimal input.
 *
 * Canonical engine: JobCostingEngine
 *
 * @version 1.0.0
 */

export interface CostEstimate {
  materialCost: number;
  machiningCost: number;
  setupCost: number;
  totalCost: number;
  perPart: number;
  breakdown: string;
  currency: string;
}

export interface MaterialCostInput {
  material: string;
  weightLbs?: number;
  volumeIn3?: number;
}

export interface MachiningCostInput {
  cycleTimeMin: number;
  shopRate?: number;
  setupTimeMin?: number;
  quantity?: number;
}

// Industry average shop rates ($/hr)
const SHOP_RATES: Record<string, number> = {
  manual_mill: 65,
  cnc_3axis: 95,
  cnc_4axis: 110,
  cnc_5axis: 135,
  turning: 85,
  edm_wire: 100,
  edm_sinker: 110,
  grinding: 90,
  laser: 120,
  waterjet: 80,
};

// Material cost per pound (approximate)
const MATERIAL_COSTS: Record<string, number> = {
  "6061": 3.50, "7075": 5.00, "2024": 5.50,
  "aluminum": 3.50, "al": 3.50,
  "1018": 1.20, "4140": 2.00, "4340": 3.50,
  "steel": 1.50, "mild_steel": 1.20,
  "304": 4.50, "316": 5.50, "17-4": 8.00,
  "stainless": 4.50, "ss": 4.50,
  "ti6al4v": 25.00, "titanium": 20.00, "ti": 20.00,
  "brass": 4.00, "bronze": 5.00,
  "copper": 6.00, "cu": 6.00,
  "inconel": 35.00, "hastelloy": 40.00,
  "delrin": 5.00, "nylon": 4.00, "peek": 100.00,
  "plastic": 4.00,
};

// Material density (lb/in³)
const DENSITY: Record<string, number> = {
  aluminum: 0.098, al: 0.098, "6061": 0.098, "7075": 0.101, "2024": 0.100,
  steel: 0.284, mild_steel: 0.284, "1018": 0.284, "4140": 0.284, "4340": 0.284,
  stainless: 0.289, ss: 0.289, "304": 0.289, "316": 0.289,
  titanium: 0.163, ti: 0.163, ti6al4v: 0.160,
  brass: 0.307, bronze: 0.320, copper: 0.323,
  inconel: 0.305, hastelloy: 0.297,
  plastic: 0.050, delrin: 0.051, nylon: 0.041, peek: 0.047,
};

export class CostEstimatorEngine {

  /**
   * Estimate total job cost.
   */
  estimate(
    material: MaterialCostInput,
    machining: MachiningCostInput,
  ): CostEstimate {
    const qty = machining.quantity || 1;
    const shopRate = machining.shopRate || SHOP_RATES.cnc_3axis;
    const setupTime = machining.setupTimeMin || 30;

    // Material cost
    const matKey = material.material.toLowerCase();
    const pricePerLb = MATERIAL_COSTS[matKey] || 3.50;
    let weight = material.weightLbs || 0;
    if (!weight && material.volumeIn3) {
      const density = DENSITY[matKey] || 0.098;
      weight = material.volumeIn3 * density;
    }
    const materialCost = weight * pricePerLb * qty;

    // Machining cost
    const machiningCost = (machining.cycleTimeMin / 60) * shopRate * qty;

    // Setup cost (amortized across quantity)
    const setupCost = (setupTime / 60) * shopRate;

    const totalCost = materialCost + machiningCost + setupCost;
    const perPart = totalCost / qty;

    const breakdown = [
      `Material: $${materialCost.toFixed(2)} (${weight.toFixed(2)} lb × $${pricePerLb}/lb × ${qty})`,
      `Machining: $${machiningCost.toFixed(2)} (${machining.cycleTimeMin} min × $${shopRate}/hr × ${qty})`,
      `Setup: $${setupCost.toFixed(2)} (${setupTime} min × $${shopRate}/hr)`,
      `Total: $${totalCost.toFixed(2)} | Per part: $${perPart.toFixed(2)}`,
    ].join("\n");

    return {
      materialCost: round2(materialCost),
      machiningCost: round2(machiningCost),
      setupCost: round2(setupCost),
      totalCost: round2(totalCost),
      perPart: round2(perPart),
      breakdown,
      currency: "USD",
    };
  }

  /**
   * Quick per-part estimate from minimal inputs.
   */
  quickEstimate(
    material: string,
    cycleTimeMin: number,
    quantity = 1,
    machineType = "cnc_3axis"
  ): { perPart: number; total: number; breakdown: string } {
    const shopRate = SHOP_RATES[machineType] || SHOP_RATES.cnc_3axis;
    const machiningPerPart = (cycleTimeMin / 60) * shopRate;
    const setupAmortized = (30 / 60) * shopRate / quantity;
    const perPart = round2(machiningPerPart + setupAmortized);
    const total = round2(perPart * quantity);

    return {
      perPart,
      total,
      breakdown: `$${perPart}/part (machine: $${machiningPerPart.toFixed(2)} + setup: $${setupAmortized.toFixed(2)}) × ${quantity} = $${total}`,
    };
  }

  /**
   * Get shop rate for a machine type.
   */
  getShopRate(machineType: string): number {
    return SHOP_RATES[machineType] || SHOP_RATES.cnc_3axis;
  }

  /**
   * Get material price per pound.
   */
  getMaterialPrice(material: string): number {
    return MATERIAL_COSTS[material.toLowerCase()] || 3.50;
  }

  /**
   * List all available shop rates.
   */
  listShopRates(): Record<string, number> {
    return { ...SHOP_RATES };
  }

  /**
   * List all material prices.
   */
  listMaterialPrices(): Record<string, number> {
    return { ...MATERIAL_COSTS };
  }

  /**
   * Price break estimate for multiple quantities.
   */
  priceBreaks(
    material: string,
    cycleTimeMin: number,
    quantities: number[],
    machineType = "cnc_3axis"
  ): Array<{ qty: number; perPart: number; total: number }> {
    return quantities.map(qty => {
      const est = this.quickEstimate(material, cycleTimeMin, qty, machineType);
      return { qty, perPart: est.perPart, total: est.total };
    });
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const costEstimatorEngine = new CostEstimatorEngine();
