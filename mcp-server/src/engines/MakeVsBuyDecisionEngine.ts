/**
 * MakeVsBuyDecisionEngine — Manufacturing Intelligence Layer
 *
 * Evaluates whether each operation in a manufacturing job should be produced
 * in-house ("make") or outsourced to a vendor ("buy"). Uses weighted decision
 * factors including cost, lead time, quality risk, IP sensitivity, and
 * critical-path impact to produce per-operation recommendations and an
 * aggregate job-level analysis with breakeven quantities.
 *
 * Actions: make_vs_buy_analysis, estimate_vendor_cost, breakeven_analysis
 *
 * Shortcode: E1083
 * @module MakeVsBuyDecisionEngine
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/** Process type used for vendor rate estimation. */
export type ProcessType =
  | 'milling' | 'turning' | 'grinding' | 'edm'
  | 'heat_treatment' | 'surface_treatment' | 'other';

/** Complexity level that multiplies vendor base rates. */
export type ComplexityLevel = 'low' | 'medium' | 'high' | 'very_high';

/** Final recommendation for a single operation. */
export type MakeVsBuyRecommendation = 'make' | 'buy' | 'evaluate_further';

/** Input for a single operation to be analyzed. */
export interface OperationInput {
  operation_id: string;
  operation_name: string;
  process_type: ProcessType;
  complexity: ComplexityLevel;
  /** In-house machine rate, $/hr */
  machine_rate_per_hour: number;
  /** Cycle time in hours */
  cycle_time_hours: number;
  /** One-time setup cost */
  setup_cost: number;
  /** Tooling cost allocated to this operation */
  tooling_cost: number;
  /** Material cost allocated to this operation */
  material_cost_allocated: number;
  /** Vendor quote in $, if available */
  vendor_quote?: number;
  /** Vendor-quoted lead time in business days */
  vendor_lead_time_days?: number;
  /** In-house estimated lead time in business days */
  in_house_lead_time_days: number;
  /** In-house Cpk if known (higher = better) */
  in_house_cpk?: number;
  /** Vendor quality score 0-100 */
  vendor_quality_score?: number;
  /** Whether the operation involves sensitive IP */
  ip_sensitive?: boolean;
  /** Actual quantity needed */
  quantity: number;
  /** Vendor minimum order quantity */
  vendor_moq?: number;
  /** Estimated shipping cost from vendor */
  shipping_cost?: number;
  /** Whether this operation is on the critical path */
  is_critical_path?: boolean;
  /** Weight of the part in pounds (for heat/surface treatment) */
  part_weight_lbs?: number;
  /** Surface area in sqft (for surface treatment) */
  surface_area_sqft?: number;
  /** Heat treatment type if applicable */
  heat_treatment_type?: string;
  /** Surface treatment type if applicable */
  surface_treatment_type?: string;
}

/** Weight overrides for decision factors (all should sum to 1.0). */
export interface DecisionWeights {
  cost_difference: number;
  lead_time: number;
  quality_risk: number;
  ip_sensitivity: number;
  minimum_order_impact: number;
  shipping_cost: number;
  control_preference: number;
}

/** Full job input containing multiple operations. */
export interface MakeVsBuyJobInput {
  job_id: string;
  job_name: string;
  operations: OperationInput[];
  /** Override default weights */
  weights?: Partial<DecisionWeights>;
  /** Target delivery date (ISO string) */
  target_delivery_date?: string;
}

/** Per-operation result. */
export interface OperationResult {
  operation_id: string;
  operation_name: string;
  recommendation: MakeVsBuyRecommendation;
  in_house_cost: number;
  vendor_cost: number;
  cost_savings: number;
  cost_savings_pct: number;
  breakeven_quantity: number;
  in_house_lead_time_days: number;
  vendor_lead_time_days: number;
  decision_score: number;
  factor_scores: Record<string, number>;
  justification: string[];
  risk_factors: string[];
}

/** Aggregate job-level result. */
export interface MakeVsBuyJobResult {
  job_id: string;
  job_name: string;
  operations: OperationResult[];
  total_in_house_cost: number;
  total_vendor_cost: number;
  total_optimal_cost: number;
  optimal_savings: number;
  optimal_savings_pct: number;
  outsource_candidates: string[];
  in_house_candidates: string[];
  evaluate_further: string[];
  critical_path_impact: boolean;
  critical_path_notes: string[];
  summary: string;
}

/** Vendor cost estimation result. */
export interface VendorEstimate {
  process_type: ProcessType;
  complexity: ComplexityLevel;
  base_rate_per_hour: number;
  complexity_factor: number;
  effective_rate_per_hour: number;
  estimated_cycle_hours: number;
  estimated_cost: number;
  rate_range: { min: number; max: number };
  notes: string[];
}

/** Breakeven analysis result. */
export interface BreakevenResult {
  operation_id: string;
  operation_name: string;
  breakeven_quantity: number;
  current_quantity: number;
  recommendation_at_current: MakeVsBuyRecommendation;
  cost_curve_make: { qty: number; unit_cost: number }[];
  cost_curve_buy: { qty: number; unit_cost: number }[];
  notes: string[];
}

// ============================================================================
// VENDOR RATE TABLES
// ============================================================================

/**
 * Base vendor rates per hour by process type.
 * Values represent mid-range shop rates in USD.
 */
const VENDOR_RATES: Record<ProcessType, { min: number; max: number; mid: number }> = {
  milling:           { min: 75,  max: 150, mid: 112 },
  turning:           { min: 60,  max: 120, mid: 90  },
  grinding:          { min: 80,  max: 160, mid: 120 },
  edm:               { min: 90,  max: 180, mid: 135 },
  heat_treatment:    { min: 40,  max: 100, mid: 70  },
  surface_treatment: { min: 30,  max: 80,  mid: 55  },
  other:             { min: 60,  max: 140, mid: 100 },
};

/** Complexity multipliers applied to the mid-range vendor rate. */
const COMPLEXITY_FACTORS: Record<ComplexityLevel, number> = {
  low:       0.75,
  medium:    1.00,
  high:      1.35,
  very_high: 1.75,
};

/** Heat treatment per-pound rates by type. */
const HEAT_TREAT_RATES: Record<string, number> = {
  through_harden:  2.50,
  case_harden:     3.25,
  carburize:       4.00,
  nitride:         5.50,
  induction:       3.00,
  stress_relieve:  1.50,
  anneal:          1.75,
  normalize:       1.80,
  temper:          1.60,
  quench:          2.00,
};

/** Surface treatment per-sqft rates by type. */
const SURFACE_TREAT_RATES: Record<string, number> = {
  anodize_type_ii:    8.00,
  anodize_type_iii:  14.00,
  hard_chrome:       18.00,
  electroless_nickel: 15.00,
  zinc_plate:         5.00,
  cadmium_plate:     12.00,
  passivation:        4.00,
  black_oxide:        3.50,
  powder_coat:        6.00,
  painting:           5.00,
  conversion_coat:    4.50,
};

// ============================================================================
// DEFAULT WEIGHTS
// ============================================================================

const DEFAULT_WEIGHTS: DecisionWeights = {
  cost_difference:      0.40,
  lead_time:            0.20,
  quality_risk:         0.15,
  ip_sensitivity:       0.10,
  minimum_order_impact: 0.05,
  shipping_cost:        0.05,
  control_preference:   0.05,
};

// ============================================================================
// ENGINE
// ============================================================================

class MakeVsBuyDecisionEngineImpl {

  // --------------------------------------------------------------------------
  // PUBLIC: Full Job Analysis
  // --------------------------------------------------------------------------

  /**
   * Analyze an entire job to determine make-vs-buy for every operation.
   * Returns per-operation recommendations plus an aggregate summary
   * with the optimal cost mix.
   */
  analyzeJob(input: MakeVsBuyJobInput): MakeVsBuyJobResult {
    const weights = this.resolveWeights(input.weights);
    const opResults: OperationResult[] = input.operations.map(op =>
      this.analyzeOperation(op, weights),
    );

    const totalInHouse = this.sumField(opResults, 'in_house_cost');
    const totalVendor  = this.sumField(opResults, 'vendor_cost');
    const totalOptimal = opResults.reduce((sum, r) => {
      if (r.recommendation === 'buy') return sum + r.vendor_cost;
      return sum + r.in_house_cost;
    }, 0);

    const outsourceCandidates = opResults
      .filter(r => r.recommendation === 'buy')
      .map(r => r.operation_id);
    const inHouseCandidates = opResults
      .filter(r => r.recommendation === 'make')
      .map(r => r.operation_id);
    const evaluateFurther = opResults
      .filter(r => r.recommendation === 'evaluate_further')
      .map(r => r.operation_id);

    // Critical path impact: check if any outsource candidate is on the critical path
    const criticalOutsourced = input.operations.filter(
      op => op.is_critical_path && outsourceCandidates.includes(op.operation_id),
    );
    const criticalPathImpact = criticalOutsourced.length > 0;
    const criticalPathNotes = criticalOutsourced.map(
      op => `Operation "${op.operation_name}" (${op.operation_id}) is on the critical path ` +
        `and recommended for outsourcing — verify vendor lead time meets schedule`,
    );

    const optimalSavings = totalInHouse - totalOptimal;
    const optimalSavingsPct = totalInHouse > 0
      ? this.round((optimalSavings / totalInHouse) * 100, 1)
      : 0;

    const summary = this.generateJobSummary(
      opResults, totalInHouse, totalVendor, totalOptimal,
      outsourceCandidates, criticalPathImpact,
    );

    return {
      job_id: input.job_id,
      job_name: input.job_name,
      operations: opResults,
      total_in_house_cost: this.round(totalInHouse, 2),
      total_vendor_cost: this.round(totalVendor, 2),
      total_optimal_cost: this.round(totalOptimal, 2),
      optimal_savings: this.round(optimalSavings, 2),
      optimal_savings_pct: optimalSavingsPct,
      outsource_candidates: outsourceCandidates,
      in_house_candidates: inHouseCandidates,
      evaluate_further: evaluateFurther,
      critical_path_impact: criticalPathImpact,
      critical_path_notes: criticalPathNotes,
      summary,
    };
  }

  // --------------------------------------------------------------------------
  // PUBLIC: Vendor Cost Estimation
  // --------------------------------------------------------------------------

  /**
   * Estimate vendor cost when no quote is available.
   * Uses process-type base rates, complexity factors, and special-case
   * pricing for heat treatment and surface treatment.
   */
  estimateVendorCost(
    processType: ProcessType,
    complexity: ComplexityLevel,
    cycleTimeHours: number,
    options?: {
      part_weight_lbs?: number;
      surface_area_sqft?: number;
      heat_treatment_type?: string;
      surface_treatment_type?: string;
      quantity?: number;
    },
  ): VendorEstimate {
    const rates = VENDOR_RATES[processType];
    const complexityFactor = COMPLEXITY_FACTORS[complexity];
    const effectiveRate = this.round(rates.mid * complexityFactor, 2);
    const notes: string[] = [];

    let estimatedCost: number;

    // Special handling for treatment processes
    if (processType === 'heat_treatment' && options?.heat_treatment_type && options?.part_weight_lbs) {
      const htType = options.heat_treatment_type.toLowerCase().replace(/[\s-]+/g, '_');
      const perLbRate = HEAT_TREAT_RATES[htType] ?? HEAT_TREAT_RATES['through_harden'];
      estimatedCost = this.round(perLbRate * options.part_weight_lbs * (options.quantity ?? 1), 2);
      notes.push(`Heat treatment rate: $${perLbRate}/lb for ${options.heat_treatment_type}`);
    } else if (processType === 'surface_treatment' && options?.surface_treatment_type && options?.surface_area_sqft) {
      const stType = options.surface_treatment_type.toLowerCase().replace(/[\s-]+/g, '_');
      const perSqftRate = SURFACE_TREAT_RATES[stType] ?? SURFACE_TREAT_RATES['passivation'];
      estimatedCost = this.round(perSqftRate * options.surface_area_sqft * (options.quantity ?? 1), 2);
      notes.push(`Surface treatment rate: $${perSqftRate}/sqft for ${options.surface_treatment_type}`);
    } else {
      estimatedCost = this.round(effectiveRate * cycleTimeHours * (options?.quantity ?? 1), 2);
      notes.push(`Effective shop rate: $${effectiveRate}/hr (base $${rates.mid} x ${complexityFactor} complexity)`);
    }

    // Volume discount note
    const qty = options?.quantity ?? 1;
    if (qty >= 100) {
      notes.push('Volume of 100+ units may qualify for 10-20% discount — request formal quote');
    } else if (qty >= 50) {
      notes.push('Volume of 50+ units may qualify for 5-10% discount');
    }

    return {
      process_type: processType,
      complexity,
      base_rate_per_hour: rates.mid,
      complexity_factor: complexityFactor,
      effective_rate_per_hour: effectiveRate,
      estimated_cycle_hours: cycleTimeHours,
      estimated_cost: estimatedCost,
      rate_range: { min: this.round(rates.min * complexityFactor, 2), max: this.round(rates.max * complexityFactor, 2) },
      notes,
    };
  }

  // --------------------------------------------------------------------------
  // PUBLIC: Breakeven Analysis
  // --------------------------------------------------------------------------

  /**
   * Determine the quantity at which the make-vs-buy recommendation flips.
   * Returns cost curves for both options across a range of quantities.
   */
  breakevenAnalysis(op: OperationInput): BreakevenResult {
    const vendorUnitCost = this.getVendorUnitCost(op);
    const makeVariableCost = op.machine_rate_per_hour * op.cycle_time_hours + op.material_cost_allocated;
    const makeFixedCost = op.setup_cost + op.tooling_cost;

    // Breakeven: makeFixed + qty * makeVariable = qty * vendorUnit
    // qty = makeFixed / (vendorUnit - makeVariable)
    let breakevenQty: number;
    const costDiffPerUnit = vendorUnitCost - makeVariableCost;
    if (costDiffPerUnit <= 0) {
      // Vendor is always cheaper per unit — buy at any quantity
      breakevenQty = 0;
    } else {
      breakevenQty = Math.ceil(makeFixedCost / costDiffPerUnit);
    }

    // Build cost curves at representative quantities
    const maxQty = Math.max(breakevenQty * 2, op.quantity * 3, 100);
    const step = Math.max(1, Math.floor(maxQty / 20));
    const costCurveMake: { qty: number; unit_cost: number }[] = [];
    const costCurveBuy: { qty: number; unit_cost: number }[] = [];

    for (let q = 1; q <= maxQty; q += step) {
      costCurveMake.push({
        qty: q,
        unit_cost: this.round((makeFixedCost / q) + makeVariableCost, 2),
      });
      costCurveBuy.push({
        qty: q,
        unit_cost: this.round(vendorUnitCost + (op.shipping_cost ?? 0) / q, 2),
      });
    }

    const notes: string[] = [];
    if (breakevenQty === 0) {
      notes.push('Vendor is cheaper at all quantities — in-house variable cost exceeds vendor unit cost');
    } else if (op.quantity < breakevenQty) {
      notes.push(`At current quantity (${op.quantity}), in-house is more expensive due to fixed costs`);
      notes.push(`Breakeven at ${breakevenQty} units — consider outsourcing for small batches`);
    } else {
      notes.push(`At current quantity (${op.quantity}), in-house is cost-effective`);
      notes.push(`Breakeven at ${breakevenQty} units — in-house becomes cheaper above this quantity`);
    }

    const weights = DEFAULT_WEIGHTS;
    const recommendation = this.analyzeOperation(op, weights).recommendation;

    return {
      operation_id: op.operation_id,
      operation_name: op.operation_name,
      breakeven_quantity: breakevenQty,
      current_quantity: op.quantity,
      recommendation_at_current: recommendation,
      cost_curve_make: costCurveMake,
      cost_curve_buy: costCurveBuy,
      notes,
    };
  }

  // --------------------------------------------------------------------------
  // PRIVATE: Single Operation Analysis
  // --------------------------------------------------------------------------

  /**
   * Analyze a single operation against all weighted decision factors.
   * Score > 0.55 favors in-house ("make"), < 0.45 favors outsource ("buy"),
   * between 0.45 and 0.55 requires further evaluation.
   */
  private analyzeOperation(op: OperationInput, weights: DecisionWeights): OperationResult {
    const inHouseCost = this.computeInHouseCost(op);
    const vendorCost = this.computeVendorCost(op);
    const vendorLeadTime = this.estimateVendorLeadTime(op);

    const justification: string[] = [];
    const riskFactors: string[] = [];

    // --- Factor 1: Cost Difference (0 = buy much cheaper, 1 = make much cheaper) ---
    const costRatio = vendorCost > 0 ? inHouseCost / vendorCost : 1;
    let costScore: number;
    if (costRatio <= 0.7) {
      costScore = 1.0;  // In-house is 30%+ cheaper
      justification.push(`In-house cost ($${this.round(inHouseCost, 2)}) is ${this.round((1 - costRatio) * 100, 1)}% cheaper than vendor ($${this.round(vendorCost, 2)})`);
    } else if (costRatio <= 0.9) {
      costScore = 0.75;
      justification.push(`In-house cost ($${this.round(inHouseCost, 2)}) is moderately cheaper than vendor ($${this.round(vendorCost, 2)})`);
    } else if (costRatio <= 1.1) {
      costScore = 0.5;  // Roughly equal
      justification.push(`In-house ($${this.round(inHouseCost, 2)}) and vendor ($${this.round(vendorCost, 2)}) costs are comparable`);
    } else if (costRatio <= 1.3) {
      costScore = 0.25;
      justification.push(`Vendor ($${this.round(vendorCost, 2)}) is moderately cheaper than in-house ($${this.round(inHouseCost, 2)})`);
    } else {
      costScore = 0.0;
      justification.push(`Vendor ($${this.round(vendorCost, 2)}) is significantly cheaper than in-house ($${this.round(inHouseCost, 2)})`);
    }

    // --- Factor 2: Lead Time (0 = vendor much faster, 1 = in-house much faster) ---
    const leadRatio = vendorLeadTime > 0 ? op.in_house_lead_time_days / vendorLeadTime : 1;
    let leadScore: number;
    if (leadRatio <= 0.5) {
      leadScore = 1.0;
      justification.push(`In-house lead time (${op.in_house_lead_time_days}d) is much shorter than vendor (${vendorLeadTime}d)`);
    } else if (leadRatio <= 0.8) {
      leadScore = 0.75;
    } else if (leadRatio <= 1.2) {
      leadScore = 0.5;
    } else if (leadRatio <= 1.5) {
      leadScore = 0.25;
      justification.push(`Vendor lead time (${vendorLeadTime}d) is shorter than in-house (${op.in_house_lead_time_days}d)`);
    } else {
      leadScore = 0.0;
      justification.push(`Vendor lead time (${vendorLeadTime}d) is much shorter than in-house (${op.in_house_lead_time_days}d)`);
    }

    // --- Factor 3: Quality Risk (0 = vendor better quality, 1 = in-house better) ---
    let qualityScore = 0.5; // default neutral
    const cpk = op.in_house_cpk;
    const vendorQ = op.vendor_quality_score;
    if (cpk !== undefined && cpk >= 1.67) {
      qualityScore = 1.0;
      justification.push(`In-house Cpk of ${cpk} indicates excellent process capability`);
    } else if (cpk !== undefined && cpk >= 1.33) {
      qualityScore = 0.75;
    } else if (cpk !== undefined && cpk < 1.0) {
      qualityScore = 0.25;
      riskFactors.push(`In-house Cpk of ${cpk} is below 1.0 — process not capable`);
    }
    if (vendorQ !== undefined) {
      const vendorNorm = vendorQ / 100;
      if (cpk !== undefined) {
        // Blend in-house Cpk-based score with vendor score
        const cpkNorm = Math.min(cpk / 2, 1);
        qualityScore = cpkNorm > vendorNorm ? 0.5 + (cpkNorm - vendorNorm) * 0.5
          : 0.5 - (vendorNorm - cpkNorm) * 0.5;
        qualityScore = this.clamp(qualityScore, 0, 1);
      } else {
        qualityScore = vendorQ >= 90 ? 0.3 : vendorQ >= 70 ? 0.5 : 0.7;
      }
      if (vendorQ < 70) {
        riskFactors.push(`Vendor quality score (${vendorQ}/100) is below acceptable threshold`);
      }
    }

    // --- Factor 4: IP Sensitivity (0 = not sensitive, 1 = very sensitive -> make) ---
    const ipScore = op.ip_sensitive ? 1.0 : 0.3;
    if (op.ip_sensitive) {
      justification.push('IP-sensitive operation — strongly favors in-house production');
      riskFactors.push('Outsourcing IP-sensitive work increases exposure risk');
    }

    // --- Factor 5: Minimum Order Impact (1 = no MOQ issue, 0 = bad MOQ mismatch) ---
    let moqScore = 0.8;
    if (op.vendor_moq !== undefined && op.vendor_moq > op.quantity) {
      const overage = op.vendor_moq / op.quantity;
      moqScore = overage > 3 ? 0.0 : overage > 2 ? 0.2 : 0.4;
      justification.push(`Vendor MOQ (${op.vendor_moq}) exceeds needed quantity (${op.quantity}) — would order ${this.round(overage, 1)}x requirement`);
      riskFactors.push(`Excess inventory of ${op.vendor_moq - op.quantity} units from vendor MOQ`);
    }

    // --- Factor 6: Shipping Cost Impact (1 = no shipping, 0 = high shipping) ---
    let shippingScore = 0.7; // neutral for in-house
    if (op.shipping_cost !== undefined && vendorCost > 0) {
      const shippingPct = op.shipping_cost / vendorCost;
      if (shippingPct > 0.15) {
        shippingScore = 1.0;
        justification.push(`Shipping adds ${this.round(shippingPct * 100, 1)}% to vendor cost`);
      } else if (shippingPct > 0.05) {
        shippingScore = 0.75;
      } else {
        shippingScore = 0.5;
      }
    }

    // --- Factor 7: Control Preference (critical path -> make) ---
    const controlScore = op.is_critical_path ? 0.9 : 0.4;
    if (op.is_critical_path) {
      justification.push('Critical-path operation — in-house production preferred for schedule control');
      riskFactors.push('Outsourcing critical-path work may impact delivery date');
    }

    // --- Weighted Composite ---
    const factorScores: Record<string, number> = {
      cost_difference:      this.round(costScore, 3),
      lead_time:            this.round(leadScore, 3),
      quality_risk:         this.round(qualityScore, 3),
      ip_sensitivity:       this.round(ipScore, 3),
      minimum_order_impact: this.round(moqScore, 3),
      shipping_cost:        this.round(shippingScore, 3),
      control_preference:   this.round(controlScore, 3),
    };

    const decisionScore = this.round(
      costScore * weights.cost_difference +
      leadScore * weights.lead_time +
      qualityScore * weights.quality_risk +
      ipScore * weights.ip_sensitivity +
      moqScore * weights.minimum_order_impact +
      shippingScore * weights.shipping_cost +
      controlScore * weights.control_preference,
      3,
    );

    // --- Recommendation ---
    let recommendation: MakeVsBuyRecommendation;
    if (decisionScore >= 0.55) {
      recommendation = 'make';
      justification.push(`Weighted score ${decisionScore} >= 0.55 — recommend in-house production`);
    } else if (decisionScore <= 0.45) {
      recommendation = 'buy';
      justification.push(`Weighted score ${decisionScore} <= 0.45 — recommend outsourcing`);
    } else {
      recommendation = 'evaluate_further';
      justification.push(`Weighted score ${decisionScore} is in the 0.45-0.55 range — requires further evaluation`);
    }

    // --- Breakeven Quantity ---
    const breakevenQty = this.computeBreakevenQuantity(op, vendorCost);

    // --- Cost Savings ---
    const costSavings = vendorCost - inHouseCost;
    const costSavingsPct = inHouseCost > 0
      ? this.round((costSavings / inHouseCost) * 100, 1)
      : 0;

    return {
      operation_id: op.operation_id,
      operation_name: op.operation_name,
      recommendation,
      in_house_cost: this.round(inHouseCost, 2),
      vendor_cost: this.round(vendorCost, 2),
      cost_savings: this.round(Math.abs(costSavings), 2),
      cost_savings_pct: Math.abs(costSavingsPct),
      breakeven_quantity: breakevenQty,
      in_house_lead_time_days: op.in_house_lead_time_days,
      vendor_lead_time_days: vendorLeadTime,
      decision_score: decisionScore,
      factor_scores: factorScores,
      justification,
      risk_factors: riskFactors,
    };
  }

  // --------------------------------------------------------------------------
  // PRIVATE: Cost Computation
  // --------------------------------------------------------------------------

  /**
   * Compute total in-house cost for an operation:
   * machine_rate * cycle_time * qty + setup_cost + tooling_cost + material_cost * qty
   */
  private computeInHouseCost(op: OperationInput): number {
    const machineCost = op.machine_rate_per_hour * op.cycle_time_hours * op.quantity;
    return machineCost + op.setup_cost + op.tooling_cost + (op.material_cost_allocated * op.quantity);
  }

  /**
   * Compute vendor cost — use vendor_quote if available, otherwise estimate.
   * Adds shipping cost if provided.
   */
  private computeVendorCost(op: OperationInput): number {
    let baseCost: number;

    if (op.vendor_quote !== undefined) {
      baseCost = op.vendor_quote;
    } else {
      const estimate = this.estimateVendorCost(op.process_type, op.complexity, op.cycle_time_hours, {
        part_weight_lbs: op.part_weight_lbs,
        surface_area_sqft: op.surface_area_sqft,
        heat_treatment_type: op.heat_treatment_type,
        surface_treatment_type: op.surface_treatment_type,
        quantity: op.quantity,
      });
      baseCost = estimate.estimated_cost;
    }

    // Add shipping
    const shipping = op.shipping_cost ?? 0;

    // Handle MOQ overage cost
    if (op.vendor_moq !== undefined && op.vendor_moq > op.quantity) {
      const vendorUnitCost = this.getVendorUnitCost(op);
      baseCost = vendorUnitCost * op.vendor_moq + shipping;
    } else {
      baseCost += shipping;
    }

    return baseCost;
  }

  /**
   * Get the vendor per-unit cost (excluding shipping).
   */
  private getVendorUnitCost(op: OperationInput): number {
    if (op.vendor_quote !== undefined) {
      return op.vendor_quote / op.quantity;
    }
    const estimate = this.estimateVendorCost(op.process_type, op.complexity, op.cycle_time_hours, {
      part_weight_lbs: op.part_weight_lbs,
      surface_area_sqft: op.surface_area_sqft,
      heat_treatment_type: op.heat_treatment_type,
      surface_treatment_type: op.surface_treatment_type,
      quantity: 1,
    });
    return estimate.estimated_cost;
  }

  /**
   * Estimate vendor lead time if not explicitly provided.
   * Heuristic: base days by process type + complexity adder.
   */
  private estimateVendorLeadTime(op: OperationInput): number {
    if (op.vendor_lead_time_days !== undefined) return op.vendor_lead_time_days;

    const baseDays: Record<ProcessType, number> = {
      milling: 10, turning: 8, grinding: 12, edm: 15,
      heat_treatment: 7, surface_treatment: 5, other: 10,
    };
    const complexityAdder: Record<ComplexityLevel, number> = {
      low: 0, medium: 3, high: 7, very_high: 12,
    };
    // Quantity adder: +1 day per 25 units above 25
    const qtyAdder = Math.max(0, Math.floor((op.quantity - 25) / 25));

    return baseDays[op.process_type] + complexityAdder[op.complexity] + qtyAdder;
  }

  /**
   * Compute breakeven quantity: the quantity at which the make/buy
   * recommendation would flip.
   */
  private computeBreakevenQuantity(op: OperationInput, _vendorCostTotal: number): number {
    const vendorUnitCost = this.getVendorUnitCost(op);
    const makeVariableCost = op.machine_rate_per_hour * op.cycle_time_hours + op.material_cost_allocated;
    const makeFixedCost = op.setup_cost + op.tooling_cost;
    const shippingFixed = op.shipping_cost ?? 0;

    // make total = makeFixed + qty * makeVariable
    // buy total  = qty * vendorUnit + shipping
    // breakeven: makeFixed + qty * makeVar = qty * vendorUnit + shipping
    // qty * (vendorUnit - makeVar) = makeFixed - shipping
    // qty = (makeFixed - shipping) / (vendorUnit - makeVar)
    const denom = vendorUnitCost - makeVariableCost;
    if (denom <= 0) return 0; // vendor always cheaper per-unit

    const numerator = makeFixedCost - shippingFixed;
    if (numerator <= 0) return 1; // make is already cheaper at qty=1

    return Math.ceil(numerator / denom);
  }

  // --------------------------------------------------------------------------
  // PRIVATE: Helpers
  // --------------------------------------------------------------------------

  /** Resolve user-supplied weight overrides against defaults. */
  private resolveWeights(overrides?: Partial<DecisionWeights>): DecisionWeights {
    if (!overrides) return { ...DEFAULT_WEIGHTS };
    const merged = { ...DEFAULT_WEIGHTS, ...overrides };
    // Normalize so weights sum to 1.0
    const total = Object.values(merged).reduce((s, v) => s + v, 0);
    if (Math.abs(total - 1.0) > 0.001) {
      const keys = Object.keys(merged) as (keyof DecisionWeights)[];
      for (const k of keys) {
        merged[k] = merged[k] / total;
      }
    }
    return merged;
  }

  /** Sum a numeric field across an array of operation results. */
  private sumField(results: OperationResult[], field: 'in_house_cost' | 'vendor_cost'): number {
    return results.reduce((sum, r) => sum + r[field], 0);
  }

  /** Round to N decimal places. */
  private round(val: number, decimals: number): number {
    const f = Math.pow(10, decimals);
    return Math.round(val * f) / f;
  }

  /** Clamp a value between min and max. */
  private clamp(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, val));
  }

  /** Generate a human-readable job summary string. */
  private generateJobSummary(
    results: OperationResult[],
    totalInHouse: number,
    totalVendor: number,
    totalOptimal: number,
    outsourceCandidates: string[],
    criticalPathImpact: boolean,
  ): string {
    const makeCount = results.filter(r => r.recommendation === 'make').length;
    const buyCount = results.filter(r => r.recommendation === 'buy').length;
    const evalCount = results.filter(r => r.recommendation === 'evaluate_further').length;
    const savings = this.round(totalInHouse - totalOptimal, 2);
    const savingsPct = totalInHouse > 0 ? this.round((savings / totalInHouse) * 100, 1) : 0;

    const parts: string[] = [
      `Analyzed ${results.length} operations: ${makeCount} make, ${buyCount} buy, ${evalCount} evaluate further.`,
    ];

    if (savings > 0) {
      parts.push(`Optimal mix saves $${savings.toLocaleString()} (${savingsPct}%) vs all in-house ($${this.round(totalInHouse, 2).toLocaleString()}).`);
    } else {
      parts.push(`All in-house ($${this.round(totalInHouse, 2).toLocaleString()}) is the most cost-effective approach.`);
    }

    if (outsourceCandidates.length > 0) {
      parts.push(`Outsource candidates: ${outsourceCandidates.join(', ')}.`);
    }

    if (criticalPathImpact) {
      parts.push('WARNING: Some outsource candidates are on the critical path — review lead times carefully.');
    }

    return parts.join(' ');
  }
}

/** Make vs Buy Decision Engine singleton.
 * Shortcode: E1083
 */
export const makeVsBuyDecisionEngine = new MakeVsBuyDecisionEngineImpl();
