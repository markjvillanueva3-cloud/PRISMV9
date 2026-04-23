/**
 * QuotingFormulaEngine — SQ4-1-QUOTE: Quoting + cost engine hardening
 *
 * Six physics-fed cost formulas missing from the quoting pipeline:
 *
 * 1. Activity-Based Costing (ABC) — allocate overhead by cost drivers
 * 2. Learning Curve — Wright's model for batch production cost reduction
 * 3. Economic Batch Sizing (EOQ) — optimal lot size balancing setup vs holding
 * 4. Quote Calibration — historical accuracy adjustment
 * 5. Setup Complexity Scoring — numeric complexity from fixture/WCS/tool data
 * 6. Scrap Reserve — Cpk-based yield prediction + material allowance
 *
 * Two additional formulas (OEE decomposition, Cpk prediction) already exist
 * in OEECalculatorEngine and ProcessCapabilityPredictionEngine respectively.
 * This engine delegates to them rather than duplicating.
 *
 * References:
 * - Wright (1936): "Factors Affecting the Cost of Airplanes", J. Aeronautical Sciences
 * - Harris (1913): "How Many Parts to Make at Once", Factory Magazine (EOQ origin)
 * - Cooper & Kaplan (1988): "Measure Costs Right: Make the Right Decisions", HBR
 * - AIAG SPC Manual (2005): Cpk → yield mapping
 * - Shingo (1985): SMED system, setup complexity classification
 *
 * @engine QuotingFormulaEngine
 * @dispatcher businessDispatcher
 * @actions quote_abc_cost, quote_learning_curve, quote_eoq,
 *          quote_calibrate, quote_setup_complexity, quote_scrap_reserve
 */

// ── Types ──

export interface ABCInput {
  /** Direct material cost [$] */
  material_cost: number;
  /** Direct labor hours */
  labor_hours: number;
  /** Labor rate [$/hr] */
  labor_rate: number;
  /** Machine hours used */
  machine_hours: number;
  /** Machine rate [$/hr] */
  machine_rate: number;
  /** Number of setups */
  setup_count: number;
  /** Cost per setup [$] */
  cost_per_setup: number;
  /** Number of inspections */
  inspection_count: number;
  /** Cost per inspection [$] */
  cost_per_inspection: number;
  /** Number of tool changes */
  tool_change_count: number;
  /** Cost per tool change [$] */
  cost_per_tool_change: number;
  /** Facility overhead rate [$/machine-hr] — rent, utilities, insurance */
  facility_rate_per_machine_hr?: number;
  /** Batch size (for per-part allocation) */
  batch_size: number;
}

export interface ABCResult {
  total_cost: number;
  cost_per_part: number;
  breakdown: {
    material: number;
    labor: number;
    machine: number;
    setup: number;
    inspection: number;
    tool_changes: number;
    facility_overhead: number;
  };
  cost_driver_pct: Record<string, number>;
  dominant_driver: string;
  source: string;
}

export interface LearningCurveInput {
  /** Time/cost for the first unit */
  first_unit_cost: number;
  /** Learning rate (0.80 = 80% curve means each doubling reduces cost to 80%) */
  learning_rate: number;
  /** Quantity to estimate */
  quantity: number;
}

export interface LearningCurveResult {
  /** Cost of the Nth unit */
  nth_unit_cost: number;
  /** Cumulative total cost for all N units */
  cumulative_cost: number;
  /** Average cost per unit over N units */
  average_unit_cost: number;
  /** Cost improvement ratio (first → Nth) */
  improvement_ratio: number;
  /** Learning curve exponent b = ln(LR)/ln(2) */
  exponent_b: number;
  source: string;
}

export interface EOQInput {
  /** Annual demand (units/year) */
  annual_demand: number;
  /** Setup/ordering cost per batch [$] */
  setup_cost: number;
  /** Holding cost per unit per year [$/unit/year] */
  holding_cost_per_unit: number;
  /** Unit production cost [$] — for total cost calculation */
  unit_cost?: number;
}

export interface EOQResult {
  /** Economic order quantity */
  eoq: number;
  /** Number of orders per year at EOQ */
  orders_per_year: number;
  /** Time between orders [days] */
  order_interval_days: number;
  /** Total annual cost at EOQ (setup + holding) */
  total_annual_cost: number;
  /** Setup cost component */
  annual_setup_cost: number;
  /** Holding cost component */
  annual_holding_cost: number;
  source: string;
}

export interface CalibrationInput {
  /** Base quoted price [$] */
  base_quote: number;
  /** Historical quotes for similar work */
  historical: Array<{
    quoted: number;
    actual: number;
    material?: string;
    operation?: string;
    complexity?: string;
  }>;
  /** Current job attributes for matching */
  material?: string;
  operation?: string;
  complexity?: string;
}

export interface CalibrationResult {
  /** Calibrated quote [$] */
  calibrated_quote: number;
  /** Calibration factor applied */
  calibration_factor: number;
  /** Number of historical records used */
  sample_size: number;
  /** Historical accuracy stats */
  accuracy: {
    mean_error_pct: number;
    median_error_pct: number;
    std_dev_pct: number;
  };
  /** Confidence in calibration (0-1) */
  confidence: number;
  source: string;
}

export interface SetupComplexityInput {
  /** Number of setups/fixtures */
  setup_count: number;
  /** Number of work coordinate systems */
  wcs_count: number;
  /** Number of unique tools */
  tool_count: number;
  /** Number of orientation changes (A/B/C axis repositioning) */
  orientation_changes: number;
  /** Tightest tolerance [mm] */
  tightest_tolerance_mm: number;
  /** Part requires probing? */
  probing_required: boolean;
  /** Custom fixturing required? */
  custom_fixture: boolean;
  /** Part material hardness [HRC] */
  hardness_hrc?: number;
}

export interface SetupComplexityResult {
  /** Complexity score 0-100 */
  score: number;
  /** Tier classification */
  tier: "simple" | "moderate" | "complex" | "extreme";
  /** Estimated setup time [min] */
  estimated_setup_time_min: number;
  /** Score breakdown by factor */
  factors: Record<string, number>;
  /** Recommendations */
  recommendations: string[];
  source: string;
}

export interface ScrapReserveInput {
  /** Material cost per part [$] */
  material_cost_per_part: number;
  /** Batch size */
  batch_size: number;
  /** Expected scrap rate (0-1, e.g., 0.03 = 3%) */
  scrap_rate?: number;
  /** Process Cpk (if known — overrides scrap_rate) */
  cpk?: number;
  /** Machine cost per part [$] — for total scrap cost */
  machine_cost_per_part?: number;
}

export interface ScrapReserveResult {
  /** Extra material cost for scrap reserve [$] */
  scrap_reserve_cost: number;
  /** Per-part scrap allocation [$] */
  scrap_cost_per_part: number;
  /** Effective scrap rate used */
  scrap_rate: number;
  /** Expected yield (good parts / total) */
  expected_yield: number;
  /** Parts to run to guarantee batch quantity */
  parts_to_run: number;
  /** Extra parts needed */
  extra_parts: number;
  source: string;
}

// ── Engine ──

export class QuotingFormulaEngine {

  /**
   * Activity-Based Costing — allocates overhead by cost drivers.
   *
   * ABC assigns costs based on actual consumption of resources by each activity
   * (setups, inspections, tool changes) rather than a flat overhead percentage.
   *
   * Reference: Cooper & Kaplan (1988), "Measure Costs Right", HBR
   */
  activityBasedCost(input: ABCInput): ABCResult {
    const material = input.material_cost;
    const labor = input.labor_hours * input.labor_rate;
    const machine = input.machine_hours * input.machine_rate;
    const setup = input.setup_count * input.cost_per_setup;
    const inspection = input.inspection_count * input.cost_per_inspection;
    const toolChanges = input.tool_change_count * input.cost_per_tool_change;
    const facility = input.machine_hours * (input.facility_rate_per_machine_hr ?? 15);

    const total = material + labor + machine + setup + inspection + toolChanges + facility;
    const perPart = input.batch_size > 0 ? total / input.batch_size : total;

    const breakdown = { material, labor, machine, setup, inspection, tool_changes: toolChanges, facility_overhead: facility };

    // Cost driver percentages
    const driverPct: Record<string, number> = {};
    for (const [key, val] of Object.entries(breakdown)) {
      driverPct[key] = total > 0 ? Math.round((val / total) * 1000) / 10 : 0;
    }
    const dominant = Object.entries(driverPct).reduce((a, b) => b[1] > a[1] ? b : a);

    return {
      total_cost: Math.round(total * 100) / 100,
      cost_per_part: Math.round(perPart * 100) / 100,
      breakdown: {
        material: Math.round(material * 100) / 100,
        labor: Math.round(labor * 100) / 100,
        machine: Math.round(machine * 100) / 100,
        setup: Math.round(setup * 100) / 100,
        inspection: Math.round(inspection * 100) / 100,
        tool_changes: Math.round(toolChanges * 100) / 100,
        facility_overhead: Math.round(facility * 100) / 100,
      },
      cost_driver_pct: driverPct,
      dominant_driver: dominant[0],
      source: "ABC: Cooper & Kaplan (1988)",
    };
  }

  /**
   * Wright's Learning Curve — cost reduction with cumulative production.
   *
   * T(n) = T₁ × n^b  where b = ln(LR)/ln(2)
   * Cumulative: C(N) = T₁ × Σ(i=1..N) i^b ≈ T₁ × N^(b+1) / (b+1)  [for large N]
   *
   * Reference: Wright (1936), "Factors Affecting the Cost of Airplanes"
   * Typical learning rates: 80% (complex assembly), 85-90% (machining), 95% (automated)
   */
  learningCurve(input: LearningCurveInput): LearningCurveResult {
    const { first_unit_cost, learning_rate, quantity } = input;

    if (learning_rate <= 0 || learning_rate >= 1) {
      return {
        nth_unit_cost: first_unit_cost, cumulative_cost: first_unit_cost * quantity,
        average_unit_cost: first_unit_cost, improvement_ratio: 1, exponent_b: 0,
        source: "Learning curve: invalid rate (must be 0 < LR < 1)",
      };
    }

    // b = ln(learning_rate) / ln(2)  — always negative for LR < 1
    const b = Math.log(learning_rate) / Math.log(2);

    // Cost of the Nth unit
    const nthCost = first_unit_cost * Math.pow(Math.max(1, quantity), b);

    // Cumulative cost: sum of T₁ × i^b for i=1..N
    // For precision, compute exact sum for small N, approximate for large N
    let cumCost = 0;
    if (quantity <= 1000) {
      for (let i = 1; i <= quantity; i++) {
        cumCost += first_unit_cost * Math.pow(i, b);
      }
    } else {
      // Crawford approximation: C(N) ≈ T₁ × N^(b+1) / (b+1) + T₁/2 × N^b
      cumCost = first_unit_cost * Math.pow(quantity, b + 1) / (b + 1) + first_unit_cost * 0.5 * Math.pow(quantity, b);
    }

    const avgCost = quantity > 0 ? cumCost / quantity : first_unit_cost;

    return {
      nth_unit_cost: Math.round(nthCost * 100) / 100,
      cumulative_cost: Math.round(cumCost * 100) / 100,
      average_unit_cost: Math.round(avgCost * 100) / 100,
      improvement_ratio: first_unit_cost > 0 ? Math.round((nthCost / first_unit_cost) * 1000) / 1000 : 1,
      exponent_b: Math.round(b * 10000) / 10000,
      source: "Wright (1936) learning curve: T(n) = T1 * n^b, b = ln(LR)/ln(2)",
    };
  }

  /**
   * Economic Order Quantity — optimal batch size.
   *
   * EOQ = sqrt(2DS/H)
   * where D = annual demand, S = setup cost, H = holding cost per unit per year
   *
   * Reference: Harris (1913), "How Many Parts to Make at Once"
   */
  economicBatchSize(input: EOQInput): EOQResult {
    const { annual_demand, setup_cost, holding_cost_per_unit } = input;

    if (annual_demand <= 0 || setup_cost <= 0 || holding_cost_per_unit <= 0) {
      return {
        eoq: 1, orders_per_year: annual_demand, order_interval_days: 1,
        total_annual_cost: 0, annual_setup_cost: 0, annual_holding_cost: 0,
        source: "EOQ: invalid input (all values must be > 0)",
      };
    }

    // Classic EOQ formula
    const eoq = Math.round(Math.sqrt(2 * annual_demand * setup_cost / holding_cost_per_unit));

    const ordersPerYear = annual_demand / eoq;
    const orderIntervalDays = 365 / ordersPerYear;
    const annualSetup = ordersPerYear * setup_cost;
    const annualHolding = (eoq / 2) * holding_cost_per_unit;
    const totalAnnual = annualSetup + annualHolding;

    return {
      eoq,
      orders_per_year: Math.round(ordersPerYear * 10) / 10,
      order_interval_days: Math.round(orderIntervalDays),
      total_annual_cost: Math.round(totalAnnual * 100) / 100,
      annual_setup_cost: Math.round(annualSetup * 100) / 100,
      annual_holding_cost: Math.round(annualHolding * 100) / 100,
      source: "Harris (1913) EOQ: sqrt(2DS/H)",
    };
  }

  /**
   * Quote Calibration — adjust quotes based on historical accuracy.
   *
   * Computes calibration factor from historical quoted-vs-actual data,
   * optionally filtered by material, operation, and complexity.
   *
   * calibration_factor = mean(actual/quoted) for matching historical records
   * calibrated_quote = base_quote × calibration_factor
   */
  calibrateQuote(input: CalibrationInput): CalibrationResult {
    const { base_quote, historical } = input;

    // Filter historical records by matching attributes
    let filtered = historical.filter(h => h.quoted > 0 && h.actual > 0);
    if (input.material) {
      const matMatched = filtered.filter(h => h.material === input.material);
      if (matMatched.length >= 3) filtered = matMatched;
    }
    if (input.operation) {
      const opMatched = filtered.filter(h => h.operation === input.operation);
      if (opMatched.length >= 3) filtered = opMatched;
    }
    if (input.complexity) {
      const cxMatched = filtered.filter(h => h.complexity === input.complexity);
      if (cxMatched.length >= 3) filtered = cxMatched;
    }

    if (filtered.length === 0) {
      return {
        calibrated_quote: base_quote, calibration_factor: 1.0, sample_size: 0,
        accuracy: { mean_error_pct: 0, median_error_pct: 0, std_dev_pct: 0 },
        confidence: 0.1, source: "No historical data for calibration",
      };
    }

    // Compute ratios: actual/quoted
    const ratios = filtered.map(h => h.actual / h.quoted);
    const errors = filtered.map(h => ((h.actual - h.quoted) / h.quoted) * 100);

    const meanRatio = ratios.reduce((s, r) => s + r, 0) / ratios.length;
    const meanError = errors.reduce((s, e) => s + e, 0) / errors.length;

    // Median error
    const sortedErrors = [...errors].sort((a, b) => a - b);
    const medianError = sortedErrors.length % 2 === 0
      ? (sortedErrors[sortedErrors.length / 2 - 1] + sortedErrors[sortedErrors.length / 2]) / 2
      : sortedErrors[Math.floor(sortedErrors.length / 2)];

    // Std dev
    const variance = errors.reduce((s, e) => s + Math.pow(e - meanError, 2), 0) / errors.length;
    const stdDev = Math.sqrt(variance);

    // Confidence increases with sample size, decreases with variance
    const confidence = Math.min(0.95, Math.max(0.20,
      0.30 + Math.log10(Math.max(1, filtered.length)) * 0.25 - stdDev / 100
    ));

    return {
      calibrated_quote: Math.round(base_quote * meanRatio * 100) / 100,
      calibration_factor: Math.round(meanRatio * 1000) / 1000,
      sample_size: filtered.length,
      accuracy: {
        mean_error_pct: Math.round(meanError * 10) / 10,
        median_error_pct: Math.round(medianError * 10) / 10,
        std_dev_pct: Math.round(stdDev * 10) / 10,
      },
      confidence: Math.round(confidence * 100) / 100,
      source: `Quote calibration from ${filtered.length} historical records`,
    };
  }

  /**
   * Setup Complexity Scoring — numeric complexity from setup parameters.
   *
   * Weighted scoring model:
   * - Setup count: 15 pts each (max 30)
   * - WCS count: 5 pts each (max 20)
   * - Tool count: 1 pt each (max 15)
   * - Orientation changes: 10 pts each (max 20)
   * - Tolerance tightness: 0-15 pts (based on IT grade)
   * - Probing: +5 pts
   * - Custom fixture: +10 pts
   * - Hard material (>45 HRC): +5 pts
   *
   * Reference: adapted from Shingo (1985) SMED + Boothroyd (2006) complexity factors
   */
  setupComplexity(input: SetupComplexityInput): SetupComplexityResult {
    const factors: Record<string, number> = {};

    // Setup count: 15 pts each, max 30
    factors.setups = Math.min(30, input.setup_count * 15);
    // WCS count: 5 pts each, max 20
    factors.wcs = Math.min(20, input.wcs_count * 5);
    // Tool count: 1 pt each, max 15
    factors.tools = Math.min(15, input.tool_count * 1);
    // Orientation changes: 10 pts each, max 20
    factors.orientations = Math.min(20, input.orientation_changes * 10);

    // Tolerance tightness (IT grade mapping)
    const tol = input.tightest_tolerance_mm;
    if (tol <= 0.005) factors.tolerance = 15;       // IT5 or tighter
    else if (tol <= 0.01) factors.tolerance = 12;   // IT6
    else if (tol <= 0.025) factors.tolerance = 8;   // IT7
    else if (tol <= 0.05) factors.tolerance = 5;    // IT8
    else if (tol <= 0.1) factors.tolerance = 3;     // IT9
    else factors.tolerance = 0;                       // IT10+

    // Binary factors
    factors.probing = input.probing_required ? 5 : 0;
    factors.custom_fixture = input.custom_fixture ? 10 : 0;
    factors.hard_material = (input.hardness_hrc ?? 0) > 45 ? 5 : 0;

    const score = Math.min(100, Object.values(factors).reduce((s, v) => s + v, 0));

    // Tier classification
    let tier: SetupComplexityResult["tier"];
    if (score <= 20) tier = "simple";
    else if (score <= 45) tier = "moderate";
    else if (score <= 70) tier = "complex";
    else tier = "extreme";

    // Setup time from Shingo SMED tiers
    const setupTimeMap = { simple: 15, moderate: 30, complex: 60, extreme: 120 };
    const setupTime = setupTimeMap[tier];

    const recommendations: string[] = [];
    if (factors.setups > 15) recommendations.push("Consider 5-axis to reduce setup count");
    if (factors.orientations > 10) recommendations.push("Tombstone or pallet system could eliminate orientation changes");
    if (factors.tolerance > 10) recommendations.push("In-process probing recommended for tight tolerances");
    if (factors.tools > 10) recommendations.push("Tool presetting can reduce setup time for high tool counts");

    return {
      score, tier,
      estimated_setup_time_min: setupTime,
      factors, recommendations,
      source: "Complexity scoring: Shingo (1985) SMED + Boothroyd (2006)",
    };
  }

  /**
   * Scrap Reserve — material allowance for expected rejects.
   *
   * If Cpk is provided, scrap rate is derived from statistical yield:
   *   yield = 2Φ(3×Cpk) - 1  (for normal distribution)
   *   scrap_rate = 1 - yield
   *
   * Parts to run = ceil(batch_size / yield)
   * Scrap cost = extra_parts × (material_cost + machine_cost)
   *
   * Reference: AIAG SPC Manual (2005), Montgomery (2019) Ch. 8
   */
  scrapReserve(input: ScrapReserveInput): ScrapReserveResult {
    let scrapRate: number;

    if (input.cpk != null && input.cpk > 0) {
      // Derive scrap rate from Cpk using normal distribution approximation
      // yield ≈ 2Φ(3×Cpk) - 1, using error function approximation
      const z = 3 * input.cpk;
      const yield_ = this._normalCDF(z) - this._normalCDF(-z);
      scrapRate = Math.max(0, 1 - yield_);
    } else {
      scrapRate = input.scrap_rate ?? 0.03; // Default 3%
    }

    // Clamp to reasonable range
    scrapRate = Math.max(0, Math.min(0.50, scrapRate));

    const expectedYield = 1 - scrapRate;
    const partsToRun = expectedYield > 0 ? Math.ceil(input.batch_size / expectedYield) : input.batch_size;
    const extraParts = partsToRun - input.batch_size;

    const costPerPart = input.material_cost_per_part + (input.machine_cost_per_part ?? 0);
    const scrapReserveCost = extraParts * costPerPart;
    const scrapCostPerPart = input.batch_size > 0 ? scrapReserveCost / input.batch_size : 0;

    return {
      scrap_reserve_cost: Math.round(scrapReserveCost * 100) / 100,
      scrap_cost_per_part: Math.round(scrapCostPerPart * 100) / 100,
      scrap_rate: Math.round(scrapRate * 10000) / 10000,
      expected_yield: Math.round(expectedYield * 10000) / 10000,
      parts_to_run: partsToRun,
      extra_parts: extraParts,
      source: input.cpk != null
        ? `Cpk-derived: AIAG SPC (2005), Cpk=${input.cpk}`
        : `Fixed scrap rate: ${(scrapRate * 100).toFixed(1)}%`,
    };
  }

  // ── Private helpers ──

  /**
   * Standard normal CDF approximation.
   * Abramowitz & Stegun (1964) formula 26.2.17, max error 7.5×10⁻⁸.
   */
  private _normalCDF(x: number): number {
    if (x < -8) return 0;
    if (x > 8) return 1;

    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    const absX = Math.abs(x);
    const t = 1.0 / (1.0 + p * absX);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX / 2);

    return 0.5 * (1.0 + sign * y);
  }
}

export const quotingFormulaEngine = new QuotingFormulaEngine();
