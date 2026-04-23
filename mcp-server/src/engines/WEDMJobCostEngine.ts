/**
 * WEDMJobCostEngine
 * U-PROD-19: Job costing for WEDM operations
 *
 * Calculates:
 * - Wire consumption cost
 * - Machine time cost ($/hr rates)
 * - Setup/programming time
 * - Dielectric and consumable costs
 * - Per-piece and batch cost breakdown
 */

export interface WireCost {
  spool_cost_usd: number;
  spool_length_m: number;
  wire_type: string;
  wire_diameter_mm: number;
}

export interface MachineCost {
  machine_rate_usd_hr: number;
  operator_rate_usd_hr: number;
  overhead_rate_usd_hr: number;
}

export interface JobCostInput {
  perimeter_mm: number;
  thickness_mm: number;
  quantity: number;
  pass_count: number;
  cutting_speed_mm_min?: number;
  wire_consumption_m_per_mm?: number;
  setup_time_hr?: number;
  programming_time_hr?: number;
  wire_cost?: WireCost;
  machine_cost?: MachineCost;
  dielectric_cost_per_hr?: number;
  include_markup?: boolean;
  markup_percent?: number;
}

export interface CostBreakdown {
  wire_cost_usd: number;
  machine_time_cost_usd: number;
  operator_cost_usd: number;
  overhead_cost_usd: number;
  setup_cost_usd: number;
  programming_cost_usd: number;
  dielectric_cost_usd: number;
  subtotal_usd: number;
  markup_usd: number;
  total_usd: number;
}

export interface JobCostResult {
  per_piece: CostBreakdown;
  batch: CostBreakdown;
  total_cut_time_hr: number;
  total_wire_m: number;
  wire_spools_needed: number;
  cost_per_mm: number;
  cost_per_piece: number;
  quoted_price_per_piece: number;
  margin_percent: number;
  time_breakdown: {
    cutting_hr: number;
    setup_hr: number;
    programming_hr: number;
    total_hr: number;
  };
}

export class WEDMJobCostEngine {
  private config = {
    default_cutting_speed_mm_min: 2.5,
    default_wire_consumption_m_per_mm: 0.001,
    default_setup_time_hr: 0.5,
    default_programming_time_hr: 0.25,
    default_markup_percent: 25,
    default_wire_cost: {
      spool_cost_usd: 150,
      spool_length_m: 5000,
      wire_type: 'brass',
      wire_diameter_mm: 0.25,
    } as WireCost,
    default_machine_cost: {
      machine_rate_usd_hr: 85,
      operator_rate_usd_hr: 35,
      overhead_rate_usd_hr: 15,
    } as MachineCost,
    default_dielectric_cost_per_hr: 2.5,
  };

  configure(options: Partial<typeof this.config>): void {
    Object.assign(this.config, options);
  }

  getConfig(): typeof this.config {
    return { ...this.config };
  }

  /**
   * Calculate wire consumption in meters
   */
  calculateWireConsumption(
    perimeterMm: number,
    passCount: number,
    consumptionRate: number
  ): number {
    return perimeterMm * passCount * consumptionRate;
  }

  /**
   * Calculate cutting time in hours
   */
  calculateCuttingTime(
    perimeterMm: number,
    passCount: number,
    speedMmMin: number
  ): number {
    const totalLength = perimeterMm * passCount;
    const timeMin = totalLength / speedMmMin;
    return timeMin / 60;
  }

  /**
   * Calculate wire cost
   */
  calculateWireCost(wireM: number, wireCost: WireCost): number {
    const costPerM = wireCost.spool_cost_usd / wireCost.spool_length_m;
    return wireM * costPerM;
  }

  /**
   * Calculate full job cost
   */
  calculateJobCost(input: JobCostInput): JobCostResult {
    const cuttingSpeed = input.cutting_speed_mm_min ?? this.config.default_cutting_speed_mm_min;
    const wireConsumption = input.wire_consumption_m_per_mm ?? this.config.default_wire_consumption_m_per_mm;
    const setupTime = input.setup_time_hr ?? this.config.default_setup_time_hr;
    const programmingTime = input.programming_time_hr ?? this.config.default_programming_time_hr;
    const wireCost = input.wire_cost ?? this.config.default_wire_cost;
    const machineCost = input.machine_cost ?? this.config.default_machine_cost;
    const dielectricCostPerHr = input.dielectric_cost_per_hr ?? this.config.default_dielectric_cost_per_hr;
    const markupPercent = input.markup_percent ?? this.config.default_markup_percent;

    // Calculate per-piece metrics
    const wirePerPiece = this.calculateWireConsumption(
      input.perimeter_mm,
      input.pass_count,
      wireConsumption
    );
    const cuttingTimePerPiece = this.calculateCuttingTime(
      input.perimeter_mm,
      input.pass_count,
      cuttingSpeed
    );

    // Total metrics for batch
    const totalWire = wirePerPiece * input.quantity;
    const totalCuttingTime = cuttingTimePerPiece * input.quantity;
    const totalJobTime = totalCuttingTime + setupTime + programmingTime;

    // Wire spools needed
    const spoolsNeeded = Math.ceil(totalWire / wireCost.spool_length_m);

    // Cost calculations for batch
    const batchWireCost = this.calculateWireCost(totalWire, wireCost);
    const batchMachineTimeCost = totalCuttingTime * machineCost.machine_rate_usd_hr;
    const batchOperatorCost = totalJobTime * machineCost.operator_rate_usd_hr;
    const batchOverheadCost = totalJobTime * machineCost.overhead_rate_usd_hr;
    const batchSetupCost = setupTime * (machineCost.operator_rate_usd_hr + machineCost.machine_rate_usd_hr);
    const batchProgrammingCost = programmingTime * machineCost.operator_rate_usd_hr;
    const batchDielectricCost = totalCuttingTime * dielectricCostPerHr;

    const batchSubtotal = batchWireCost + batchMachineTimeCost + batchOperatorCost +
      batchOverheadCost + batchSetupCost + batchProgrammingCost + batchDielectricCost;

    const batchMarkup = input.include_markup !== false ? batchSubtotal * (markupPercent / 100) : 0;
    const batchTotal = batchSubtotal + batchMarkup;

    // Per-piece breakdown (amortize setup/programming)
    const setupCostPerPiece = batchSetupCost / input.quantity;
    const programmingCostPerPiece = batchProgrammingCost / input.quantity;
    const wireCostPerPiece = this.calculateWireCost(wirePerPiece, wireCost);
    const machineTimeCostPerPiece = cuttingTimePerPiece * machineCost.machine_rate_usd_hr;
    const operatorCostPerPiece = (cuttingTimePerPiece + setupTime / input.quantity + programmingTime / input.quantity) * machineCost.operator_rate_usd_hr;
    const overheadCostPerPiece = (cuttingTimePerPiece + setupTime / input.quantity + programmingTime / input.quantity) * machineCost.overhead_rate_usd_hr;
    const dielectricCostPerPiece = cuttingTimePerPiece * dielectricCostPerHr;

    const pieceSubtotal = wireCostPerPiece + machineTimeCostPerPiece + operatorCostPerPiece +
      overheadCostPerPiece + setupCostPerPiece + programmingCostPerPiece + dielectricCostPerPiece;

    const pieceMarkup = input.include_markup !== false ? pieceSubtotal * (markupPercent / 100) : 0;
    const pieceTotal = pieceSubtotal + pieceMarkup;

    // Cost metrics
    const totalPerimeterMm = input.perimeter_mm * input.quantity * input.pass_count;
    const costPerMm = batchTotal / totalPerimeterMm;

    return {
      per_piece: {
        wire_cost_usd: wireCostPerPiece,
        machine_time_cost_usd: machineTimeCostPerPiece,
        operator_cost_usd: operatorCostPerPiece,
        overhead_cost_usd: overheadCostPerPiece,
        setup_cost_usd: setupCostPerPiece,
        programming_cost_usd: programmingCostPerPiece,
        dielectric_cost_usd: dielectricCostPerPiece,
        subtotal_usd: pieceSubtotal,
        markup_usd: pieceMarkup,
        total_usd: pieceTotal,
      },
      batch: {
        wire_cost_usd: batchWireCost,
        machine_time_cost_usd: batchMachineTimeCost,
        operator_cost_usd: batchOperatorCost,
        overhead_cost_usd: batchOverheadCost,
        setup_cost_usd: batchSetupCost,
        programming_cost_usd: batchProgrammingCost,
        dielectric_cost_usd: batchDielectricCost,
        subtotal_usd: batchSubtotal,
        markup_usd: batchMarkup,
        total_usd: batchTotal,
      },
      total_cut_time_hr: totalCuttingTime,
      total_wire_m: totalWire,
      wire_spools_needed: spoolsNeeded,
      cost_per_mm: costPerMm,
      cost_per_piece: pieceTotal,
      quoted_price_per_piece: pieceTotal,
      margin_percent: markupPercent,
      time_breakdown: {
        cutting_hr: totalCuttingTime,
        setup_hr: setupTime,
        programming_hr: programmingTime,
        total_hr: totalJobTime,
      },
    };
  }

  /**
   * Quick estimate without full breakdown
   */
  quickEstimate(
    perimeterMm: number,
    thicknessMm: number,
    passCount: number
  ): { estimated_cost_usd: number; estimated_time_hr: number } {
    // Simple estimate using defaults
    const result = this.calculateJobCost({
      perimeter_mm: perimeterMm,
      thickness_mm: thicknessMm,
      quantity: 1,
      pass_count: passCount,
    });

    return {
      estimated_cost_usd: result.per_piece.total_usd,
      estimated_time_hr: result.time_breakdown.total_hr,
    };
  }

  /**
   * Compare costs for different pass strategies
   */
  compareStrategies(
    perimeterMm: number,
    thicknessMm: number,
    quantity: number,
    passOptions: number[]
  ): Array<{ passes: number; cost_per_piece: number; time_hr: number }> {
    return passOptions.map((passes) => {
      const result = this.calculateJobCost({
        perimeter_mm: perimeterMm,
        thickness_mm: thicknessMm,
        quantity,
        pass_count: passes,
      });

      return {
        passes,
        cost_per_piece: result.cost_per_piece,
        time_hr: result.time_breakdown.total_hr / quantity,
      };
    });
  }
}

export const wedmJobCostEngine = new WEDMJobCostEngine();
