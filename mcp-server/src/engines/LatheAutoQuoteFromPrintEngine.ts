/**
 * LatheAutoQuoteFromPrintEngine — Auto-Quote from Print-to-Program Output
 *
 * U-LTH48: Bridge P4 print-to-program output → instant quote
 * Uses BlueprintToQuoteBridgeEngine + QuoteEstimatorEngine + LathePartCostModelEngine
 *
 * Includes:
 * - Material cost (stock volume × material rate)
 * - Tool wear cost (per-operation tool degradation)
 * - Cycle time cost (machine hourly rate × cycle)
 * - Setup cost (fixtures, tooling changes)
 * - Overhead (shop rate percentage)
 * - Margin (configurable profit target)
 *
 * @module engines/LatheAutoQuoteFromPrintEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface PrintToProgramOutput {
  program_number: number;
  program_name: string;
  part_number?: string;
  customer?: string;
  gcode_lines: string[];
  tool_calls: Array<{
    tool_number: number;
    tool_type: string;
    description: string;
    operation: string;
  }>;
  cycle_time_sec: number;
  features: Array<{
    id: string;
    type: string;
    parameters: Record<string, number>;
  }>;
  material?: string;
  stock_diameter?: number;
  stock_length?: number;
}

export interface QuoteConfig {
  material_rates: Record<string, number>;
  machine_hourly_rate: number;
  setup_base_cost: number;
  setup_per_tool_cost: number;
  overhead_percent: number;
  target_margin_percent: number;
  min_lot_size: number;
  tool_wear_rates: Record<string, number>;
}

export interface QuoteCostBreakdown {
  material_cost: number;
  tool_wear_cost: number;
  cycle_time_cost: number;
  setup_cost: number;
  subtotal: number;
  overhead: number;
  margin: number;
  total_per_part: number;
}

export interface QuoteResult {
  quote_id: string;
  timestamp: string;
  part_number: string;
  customer: string;
  program_number: number;
  quantity: number;
  lead_time_days: number;
  cost_breakdown: QuoteCostBreakdown;
  unit_price: number;
  total_price: number;
  confidence: number;
  assumptions: string[];
  warnings: string[];
  valid_until: string;
  generated_in_ms: number;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_QUOTE_CONFIG: QuoteConfig = {
  material_rates: {
    "6061-T6": 3.50,
    "7075-T6": 5.20,
    "2024-T4": 4.80,
    "A356-T6": 4.00,
    "1018": 1.80,
    "1045": 2.10,
    "4140": 2.80,
    "4340": 3.20,
    "8620": 2.50,
    "12L14": 2.00,
    "303SS": 6.50,
    "316SS": 8.00,
    "17-4PH": 12.00,
    "15-5PH": 11.50,
    "440C": 9.00,
    "52100": 3.50,
    "O1": 4.50,
    "A36": 1.50,
    "C360 Brass": 7.00,
    "C932 Bronze": 9.50,
    "Ti-6Al-4V": 35.00,
    "Inconel 718": 45.00,
    "21-4N": 28.00,
    DEFAULT: 3.00,
  },
  machine_hourly_rate: 85.00,
  setup_base_cost: 150.00,
  setup_per_tool_cost: 25.00,
  overhead_percent: 15,
  target_margin_percent: 25,
  min_lot_size: 1,
  tool_wear_rates: {
    turning: 0.15,
    facing: 0.12,
    boring: 0.18,
    threading: 0.25,
    grooving: 0.20,
    drilling: 0.10,
    parting: 0.22,
    DEFAULT: 0.15,
  },
};

// ============================================================================
// ENGINE
// ============================================================================

class LatheAutoQuoteFromPrintEngine {
  private config: QuoteConfig;
  private quoteCounter = 0;

  constructor(config?: Partial<QuoteConfig>) {
    this.config = { ...DEFAULT_QUOTE_CONFIG, ...config };
  }

  generateQuote(
    p2pOutput: PrintToProgramOutput,
    quantity: number = 1,
    rushOrder: boolean = false
  ): QuoteResult {
    const startTime = Date.now();
    const assumptions: string[] = [];
    const warnings: string[] = [];

    quantity = Math.max(quantity, this.config.min_lot_size);

    const materialRate = this.getMaterialRate(p2pOutput.material, assumptions);
    const materialVolume = this.calculateMaterialVolume(p2pOutput);
    const materialCost = materialVolume * materialRate;

    const toolWearCost = this.calculateToolWearCost(p2pOutput, assumptions);
    const cycleTimeCost = this.calculateCycleTimeCost(p2pOutput.cycle_time_sec);
    const setupCost = this.calculateSetupCost(p2pOutput.tool_calls.length);

    const subtotal = materialCost + toolWearCost + cycleTimeCost + (setupCost / quantity);
    const overhead = subtotal * (this.config.overhead_percent / 100);
    const costBeforeMargin = subtotal + overhead;
    const margin = costBeforeMargin * (this.config.target_margin_percent / 100);
    const totalPerPart = costBeforeMargin + margin;

    const totalPrice = totalPerPart * quantity;

    let leadTimeDays = this.calculateLeadTime(quantity, p2pOutput.cycle_time_sec);
    if (rushOrder) {
      leadTimeDays = Math.max(1, Math.ceil(leadTimeDays * 0.5));
      warnings.push("Rush order: lead time reduced but premium pricing may apply");
    }

    const confidence = this.calculateConfidence(p2pOutput, assumptions);
    if (confidence < 0.8) {
      warnings.push("Quote confidence below 80% - manual review recommended");
    }

    const quoteId = this.generateQuoteId(p2pOutput);
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    return {
      quote_id: quoteId,
      timestamp: new Date().toISOString(),
      part_number: p2pOutput.part_number || "UNKNOWN",
      customer: p2pOutput.customer || "WALK-IN",
      program_number: p2pOutput.program_number,
      quantity,
      lead_time_days: leadTimeDays,
      cost_breakdown: {
        material_cost: Math.round(materialCost * 100) / 100,
        tool_wear_cost: Math.round(toolWearCost * 100) / 100,
        cycle_time_cost: Math.round(cycleTimeCost * 100) / 100,
        setup_cost: Math.round(setupCost * 100) / 100,
        subtotal: Math.round(subtotal * 100) / 100,
        overhead: Math.round(overhead * 100) / 100,
        margin: Math.round(margin * 100) / 100,
        total_per_part: Math.round(totalPerPart * 100) / 100,
      },
      unit_price: Math.round(totalPerPart * 100) / 100,
      total_price: Math.round(totalPrice * 100) / 100,
      confidence,
      assumptions,
      warnings,
      valid_until: validUntil,
      generated_in_ms: Date.now() - startTime,
    };
  }

  generateBatchQuotes(
    p2pOutput: PrintToProgramOutput,
    quantities: number[]
  ): QuoteResult[] {
    return quantities.map((qty) => this.generateQuote(p2pOutput, qty));
  }

  calculateQuoteVariance(
    quote: QuoteResult,
    manualQuote: { unit_price: number; total_price: number }
  ): {
    unit_price_variance_pct: number;
    total_price_variance_pct: number;
    within_tolerance: boolean;
  } {
    const unitVariance =
      ((quote.unit_price - manualQuote.unit_price) / manualQuote.unit_price) * 100;
    const totalVariance =
      ((quote.total_price - manualQuote.total_price) / manualQuote.total_price) * 100;

    return {
      unit_price_variance_pct: Math.round(unitVariance * 10) / 10,
      total_price_variance_pct: Math.round(totalVariance * 10) / 10,
      within_tolerance: Math.abs(unitVariance) <= 10 && Math.abs(totalVariance) <= 10,
    };
  }

  private getMaterialRate(material: string | undefined, assumptions: string[]): number {
    if (!material) {
      assumptions.push("Material not specified - using default rate");
      return this.config.material_rates["DEFAULT"];
    }

    const normalizedMaterial = material.toUpperCase().replace(/\s+/g, "");
    for (const [key, rate] of Object.entries(this.config.material_rates)) {
      if (key.toUpperCase().replace(/\s+/g, "") === normalizedMaterial) {
        return rate;
      }
    }

    assumptions.push(`Unknown material "${material}" - using default rate`);
    return this.config.material_rates["DEFAULT"];
  }

  private calculateMaterialVolume(p2pOutput: PrintToProgramOutput): number {
    const diameter = p2pOutput.stock_diameter || 50;
    const length = p2pOutput.stock_length || 100;

    const volumeCubicMm = Math.PI * Math.pow(diameter / 2, 2) * length;
    const volumeCubicIn = volumeCubicMm / 16387.064;

    return volumeCubicIn;
  }

  private calculateToolWearCost(
    p2pOutput: PrintToProgramOutput,
    assumptions: string[]
  ): number {
    let totalCost = 0;

    for (const tool of p2pOutput.tool_calls) {
      const opType = this.normalizeOperationType(tool.operation);
      const wearRate = this.config.tool_wear_rates[opType] ||
        this.config.tool_wear_rates["DEFAULT"];
      totalCost += wearRate;
    }

    if (p2pOutput.tool_calls.length === 0) {
      assumptions.push("No tool data - estimated tool wear from features");
      totalCost = p2pOutput.features.length * 0.15;
    }

    return totalCost;
  }

  private normalizeOperationType(operation: string): string {
    const op = operation.toLowerCase();
    if (op.includes("turn")) return "turning";
    if (op.includes("face")) return "facing";
    if (op.includes("bore")) return "boring";
    if (op.includes("thread")) return "threading";
    if (op.includes("groove") || op.includes("ring")) return "grooving";
    if (op.includes("drill")) return "drilling";
    if (op.includes("part") || op.includes("cutoff")) return "parting";
    return "DEFAULT";
  }

  private calculateCycleTimeCost(cycleTimeSec: number): number {
    const cycleTimeHours = cycleTimeSec / 3600;
    return cycleTimeHours * this.config.machine_hourly_rate;
  }

  private calculateSetupCost(toolCount: number): number {
    return this.config.setup_base_cost + (toolCount * this.config.setup_per_tool_cost);
  }

  private calculateLeadTime(quantity: number, cycleTimeSec: number): number {
    const totalMachineTimeHours = (quantity * cycleTimeSec) / 3600;
    const setupDays = 0.5;
    const machiningDays = totalMachineTimeHours / 8;
    const bufferDays = 2;

    return Math.ceil(setupDays + machiningDays + bufferDays);
  }

  private calculateConfidence(
    p2pOutput: PrintToProgramOutput,
    assumptions: string[]
  ): number {
    let confidence = 1.0;

    if (!p2pOutput.material) confidence -= 0.1;
    if (!p2pOutput.stock_diameter) confidence -= 0.05;
    if (!p2pOutput.stock_length) confidence -= 0.05;
    if (p2pOutput.tool_calls.length === 0) confidence -= 0.15;
    if (p2pOutput.cycle_time_sec === 0) confidence -= 0.2;
    if (assumptions.length > 0) confidence -= assumptions.length * 0.05;

    return Math.max(0.5, Math.round(confidence * 100) / 100);
  }

  private generateQuoteId(p2pOutput: PrintToProgramOutput): string {
    this.quoteCounter++;
    const timestamp = Date.now().toString(36);
    const partRef = (p2pOutput.part_number || "UNK").substring(0, 6).toUpperCase();
    return `Q-${partRef}-${timestamp}-${this.quoteCounter.toString().padStart(4, "0")}`;
  }

  updateConfig(config: Partial<QuoteConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): QuoteConfig {
    return { ...this.config };
  }
}

export const latheAutoQuoteFromPrintEngine = new LatheAutoQuoteFromPrintEngine();
