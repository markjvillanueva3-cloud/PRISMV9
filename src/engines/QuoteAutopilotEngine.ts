/**
 * QuoteAutopilotEngine — ACP-MS6
 *
 * ERP/Quote product autopilot chain:
 *   1. Part analysis (material, features, complexity)
 *   2. DFM assessment (manufacturability warnings)
 *   3. Cycle time estimation (per-feature, per-operation)
 *   4. Cost calculation (material + machine + labor + overhead)
 *   5. Quantity break computation (learning curve, fixture amort)
 *   6. Quote document generation (structured output)
 *
 * Plus telemetry chain for self-calibration:
 *   - Track predicted vs actual cycle times
 *   - Compute prediction accuracy
 *   - Generate calibration suggestions
 *
 * Sources:
 *   - ACP-MS6: ERP/Quote Autopilot + Telemetry
 *   - QuoteToShipOrchestratorEngine (21 stages)
 *   - AUTOMATION_CENSUS.json gap: erp_autopilot missing
 */

// ============================================================================
// TYPES
// ============================================================================

export interface QuoteInput {
  part_name: string;
  material: string;
  features: string[];
  dimensions_mm?: { x: number; y: number; z: number };
  tolerances?: Record<string, number>;
  batch_sizes: number[];
  secondary_ops?: string[];
  finish_requirements?: string;
  priority?: "standard" | "rush" | "prototype";
}

export interface CostBreakdown {
  material_cost: number;
  machine_time_cost: number;
  labor_cost: number;
  overhead_cost: number;
  setup_cost: number;
  secondary_ops_cost: number;
  total_per_part: number;
  margin_pct: number;
  quoted_price: number;
}

export interface QuantityBreak {
  quantity: number;
  cycle_time_min: number;
  cost_per_part: number;
  price_per_part: number;
  total_price: number;
  setup_amortized: number;
  learning_factor: number;
}

export interface QuoteStep {
  name: string;
  status: "pass" | "fail" | "warn";
  duration_ms: number;
  output_summary: string;
}

export interface QuoteResult {
  chain_id: "quote_autopilot";
  started_at: string;
  completed_at: string;
  duration_ms: number;
  status: "success" | "partial" | "failed";
  steps: QuoteStep[];
  part_name: string;
  material: string;
  complexity: "low" | "medium" | "high" | "very_high";
  base_cycle_time_min: number;
  quantity_breaks: QuantityBreak[];
  dfm_warnings: string[];
  recommendations: string[];
}

export interface TelemetryEvent {
  event_type: "quote_generated" | "cycle_time_predicted" | "actual_recorded" | "calibration_computed";
  timestamp: string;
  part_name: string;
  predicted_value: number;
  actual_value?: number;
  accuracy_pct?: number;
  metadata: Record<string, unknown>;
}

export interface CalibrationResult {
  sample_size: number;
  mean_error_pct: number;
  bias: "over_estimate" | "under_estimate" | "neutral";
  correction_factor: number;
  confidence: number;
  suggestions: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Machine hourly rates ($/hr) */
const MACHINE_RATES: Record<string, number> = {
  "3axis_vmc": 85,
  "4axis_hmc": 110,
  "5axis": 150,
  "turning": 75,
  "mill_turn": 130,
  "edm_wire": 95,
  "edm_sinker": 90,
  "grinding": 100,
  "laser": 120,
  "waterjet": 80,
};

/** Material cost per kg */
const MATERIAL_COSTS_PER_KG: Record<string, number> = {
  steel: 3.50,
  aluminum: 8.00,
  stainless: 12.00,
  titanium: 65.00,
  inconel: 85.00,
  copper: 15.00,
  brass: 12.00,
  cast_iron: 4.00,
  tool_steel: 25.00,
  plastic: 5.00,
};

/** Material density kg/m³ for volume→weight */
const MATERIAL_DENSITY: Record<string, number> = {
  steel: 7850, aluminum: 2700, stainless: 7930, titanium: 4430,
  inconel: 8190, copper: 8960, brass: 8500, cast_iron: 7200,
  tool_steel: 7800, plastic: 1200,
};

/** Default margin percentages by priority */
const MARGIN_PCT: Record<string, number> = {
  standard: 0.30,
  rush: 0.50,
  prototype: 0.45,
};

/** Learning curve factor: cost reduction per doubling of quantity */
const LEARNING_RATE = 0.90; // 90% curve (10% reduction per doubling)

// ============================================================================
// ENGINE
// ============================================================================

export class QuoteAutopilotEngine {

  private telemetryLog: TelemetryEvent[] = [];

  // ── Full Quote Chain ───────────────────────────────────────

  /**
   * Execute the full quote autopilot chain.
   *
   * @param input Quote parameters
   * @returns Full quote with quantity breaks and recommendations
   */
  generateQuote(input: QuoteInput): QuoteResult {
    const startTime = Date.now();
    const steps: QuoteStep[] = [];
    const dfmWarnings: string[] = [];
    const recommendations: string[] = [];

    // Step 1: Complexity assessment
    const cxStart = Date.now();
    const complexity = this.assessComplexity(input.features, input.tolerances);
    steps.push({
      name: "complexity_assessment",
      status: "pass",
      duration_ms: Date.now() - cxStart,
      output_summary: `Complexity: ${complexity} (${input.features.length} features)`,
    });

    // Step 2: DFM check
    const dfmStart = Date.now();
    dfmWarnings.push(...this.checkDFM(input));
    steps.push({
      name: "dfm_check",
      status: dfmWarnings.length > 0 ? "warn" : "pass",
      duration_ms: Date.now() - dfmStart,
      output_summary: dfmWarnings.length > 0 ? `${dfmWarnings.length} warning(s)` : "Clean",
    });

    // Step 3: Cycle time estimation
    const ctStart = Date.now();
    const baseCycleTime = this.estimateCycleTime(input);
    steps.push({
      name: "cycle_time",
      status: "pass",
      duration_ms: Date.now() - ctStart,
      output_summary: `${baseCycleTime.toFixed(1)} min base cycle`,
    });

    // Step 4: Quantity breaks
    const qbStart = Date.now();
    const breaks = input.batch_sizes.map(qty =>
      this.computeQuantityBreak(input, baseCycleTime, qty, complexity)
    );
    steps.push({
      name: "quantity_breaks",
      status: "pass",
      duration_ms: Date.now() - qbStart,
      output_summary: `${breaks.length} qty breaks: ${input.batch_sizes.join(", ")}`,
    });

    // Step 5: Recommendation generation
    if (complexity === "very_high") {
      recommendations.push("Complex part — request 3D model for accurate cycle time estimate");
    }
    if (baseCycleTime > 60) {
      recommendations.push("Long cycle time — consider fixture pallet system for efficiency");
    }
    if (input.secondary_ops && input.secondary_ops.length > 3) {
      recommendations.push("Multiple secondary ops — evaluate outsourcing vs in-house tradeoff");
    }
    if (input.priority === "rush") {
      recommendations.push("Rush order — 50% premium applied. Lead time 3-5 days vs standard 10-15.");
    }

    // Log telemetry
    this.logTelemetry({
      event_type: "quote_generated",
      timestamp: new Date().toISOString(),
      part_name: input.part_name,
      predicted_value: baseCycleTime,
      metadata: { complexity, features: input.features.length, batch_sizes: input.batch_sizes },
    });

    const failSteps = steps.filter(s => s.status === "fail");
    const warnSteps = steps.filter(s => s.status === "warn");

    return {
      chain_id: "quote_autopilot",
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      status: failSteps.length > 0 ? "failed" : warnSteps.length > 0 ? "partial" : "success",
      steps,
      part_name: input.part_name,
      material: input.material,
      complexity,
      base_cycle_time_min: parseFloat(baseCycleTime.toFixed(1)),
      quantity_breaks: breaks,
      dfm_warnings: dfmWarnings,
      recommendations,
    };
  }

  // ── Complexity Assessment ──────────────────────────────────

  assessComplexity(
    features: string[],
    tolerances?: Record<string, number>,
  ): QuoteResult["complexity"] {
    let score = features.length * 2;

    // Tight tolerances add complexity
    if (tolerances) {
      for (const tol of Object.values(tolerances)) {
        if (tol < 0.01) score += 5;
        else if (tol < 0.025) score += 3;
        else if (tol < 0.05) score += 1;
      }
    }

    // Complex feature types
    const complexFeatures = ["3d_surface", "thread", "keyway", "o_ring_groove"];
    for (const f of features) {
      if (complexFeatures.includes(f)) score += 3;
    }

    if (score <= 6) return "low";
    if (score <= 15) return "medium";
    if (score <= 30) return "high";
    return "very_high";
  }

  // ── DFM Check ──────────────────────────────────────────────

  private checkDFM(input: QuoteInput): string[] {
    const warnings: string[] = [];

    if (input.tolerances) {
      for (const [dim, tol] of Object.entries(input.tolerances)) {
        if (tol < 0.005) {
          warnings.push(`${dim}: ${tol}mm tolerance requires grinding — adds cost`);
        } else if (tol < 0.01) {
          warnings.push(`${dim}: ${tol}mm tolerance is tight — boring or reaming required`);
        }
      }
    }

    if (input.features.includes("3d_surface") && input.features.includes("thread")) {
      warnings.push("3D surface + threads requires multi-setup — adds handling time");
    }

    if (input.dimensions_mm) {
      const { x, y, z } = input.dimensions_mm;
      if (z > 5 * Math.min(x, y)) {
        warnings.push("Deep part (Z >> XY) — tool deflection risk, may need shorter tools + lighter cuts");
      }
    }

    return warnings;
  }

  // ── Cycle Time Estimation ──────────────────────────────────

  estimateCycleTime(input: QuoteInput): number {
    const lower = input.material.toLowerCase();
    const matFactor = lower.includes("titanium") || lower.includes("inconel") ? 2.5 :
      lower.includes("stainless") ? 1.3 :
      lower.includes("aluminum") ? 0.4 :
      lower.includes("cast") ? 0.8 : 1.0;

    const featureTimes: Record<string, number> = {
      face: 2, pocket: 8, hole: 1, thread: 1.5, slot: 3,
      chamfer: 1, fillet: 1, contour: 5, "3d_surface": 20,
      boss: 4, step: 3, keyway: 4, o_ring_groove: 3,
      engraving: 2, deburr: 3,
    };

    let total = 0;
    for (const f of input.features) {
      total += featureTimes[f] || 2;
    }

    // Setup overhead (tool changes ~30s each, estimated from feature count)
    const estToolChanges = Math.min(input.features.length, 10);
    total += estToolChanges * 0.5;

    return total * matFactor;
  }

  // ── Quantity Break Computation ─────────────────────────────

  computeQuantityBreak(
    input: QuoteInput,
    baseCycleTime: number,
    quantity: number,
    complexity: QuoteResult["complexity"],
  ): QuantityBreak {
    // Learning curve: reduce time with quantity
    const learningFactor = Math.pow(LEARNING_RATE, Math.log2(Math.max(quantity, 1)));
    const adjustedCycleTime = baseCycleTime * (1 + (learningFactor - 1) * 0.3); // damped learning

    // Material cost
    const lower = input.material.toLowerCase();
    const matKey = Object.keys(MATERIAL_COSTS_PER_KG).find(k => lower.includes(k)) || "steel";
    const density = MATERIAL_DENSITY[matKey] || 7850;
    const costPerKg = MATERIAL_COSTS_PER_KG[matKey] || 3.50;

    let materialCost = 5; // minimum
    if (input.dimensions_mm) {
      const vol_m3 = (input.dimensions_mm.x * input.dimensions_mm.y * input.dimensions_mm.z) / 1e9;
      const weight_kg = vol_m3 * density * 1.3; // 30% stock allowance
      materialCost = weight_kg * costPerKg;
    }

    // Machine rate
    const machineType = complexity === "very_high" ? "5axis" :
      complexity === "high" ? "4axis_hmc" : "3axis_vmc";
    const hourlyRate = MACHINE_RATES[machineType] || 85;
    const machineTimeCost = (adjustedCycleTime / 60) * hourlyRate;

    // Setup cost (amortized over batch)
    const setupMinutes = complexity === "very_high" ? 120 : complexity === "high" ? 60 : 30;
    const setupCost = (setupMinutes / 60) * hourlyRate;
    const setupAmortized = setupCost / quantity;

    // Labor (15% of machine time for tending)
    const laborCost = machineTimeCost * 0.15;

    // Secondary ops
    let secondaryOpsCost = 0;
    if (input.secondary_ops) {
      const opCosts: Record<string, number> = {
        anodize: 5, heat_treat: 8, plating: 10, paint: 3,
        deburr: 2, inspect: 4, assembly: 6, packaging: 1,
      };
      for (const op of input.secondary_ops) {
        const key = Object.keys(opCosts).find(k => op.toLowerCase().includes(k));
        secondaryOpsCost += key ? opCosts[key] : 5;
      }
    }

    // Overhead (20% of direct costs)
    const directCost = materialCost + machineTimeCost + laborCost + setupAmortized + secondaryOpsCost;
    const overheadCost = directCost * 0.20;

    const totalPerPart = directCost + overheadCost;

    // Margin
    const marginPct = MARGIN_PCT[input.priority || "standard"] || 0.30;
    const quotedPrice = totalPerPart * (1 + marginPct);

    return {
      quantity,
      cycle_time_min: parseFloat(adjustedCycleTime.toFixed(1)),
      cost_per_part: parseFloat(totalPerPart.toFixed(2)),
      price_per_part: parseFloat(quotedPrice.toFixed(2)),
      total_price: parseFloat((quotedPrice * quantity).toFixed(2)),
      setup_amortized: parseFloat(setupAmortized.toFixed(2)),
      learning_factor: parseFloat(learningFactor.toFixed(4)),
    };
  }

  // ── Telemetry ──────────────────────────────────────────────

  /**
   * Log a telemetry event for calibration.
   */
  logTelemetry(event: TelemetryEvent): void {
    this.telemetryLog.push(event);
  }

  /**
   * Record actual cycle time for a previously quoted part.
   */
  recordActual(partName: string, actualCycleTimeMin: number): void {
    const predicted = this.telemetryLog.find(
      e => e.part_name === partName && e.event_type === "quote_generated"
    );

    this.logTelemetry({
      event_type: "actual_recorded",
      timestamp: new Date().toISOString(),
      part_name: partName,
      predicted_value: predicted?.predicted_value || 0,
      actual_value: actualCycleTimeMin,
      accuracy_pct: predicted
        ? parseFloat(((1 - Math.abs(predicted.predicted_value - actualCycleTimeMin) / actualCycleTimeMin) * 100).toFixed(1))
        : undefined,
      metadata: {},
    });
  }

  /**
   * Compute calibration from telemetry history.
   */
  computeCalibration(): CalibrationResult {
    const actuals = this.telemetryLog.filter(e => e.event_type === "actual_recorded" && e.actual_value);

    if (actuals.length < 3) {
      return {
        sample_size: actuals.length,
        mean_error_pct: 0,
        bias: "neutral",
        correction_factor: 1.0,
        confidence: 0,
        suggestions: ["Need at least 3 actual measurements for calibration"],
      };
    }

    let totalErrorPct = 0;
    let overCount = 0;

    for (const a of actuals) {
      const predicted = a.predicted_value;
      const actual = a.actual_value!;
      const errorPct = ((predicted - actual) / actual) * 100;
      totalErrorPct += errorPct;
      if (predicted > actual) overCount++;
    }

    const meanError = totalErrorPct / actuals.length;
    const bias: CalibrationResult["bias"] =
      meanError > 5 ? "over_estimate" :
      meanError < -5 ? "under_estimate" : "neutral";

    // Correction factor: if we over-estimate by 15%, multiply by 0.87
    const correction = 1 / (1 + meanError / 100);

    const suggestions: string[] = [];
    if (bias === "over_estimate") {
      suggestions.push(`Predictions average ${meanError.toFixed(1)}% high — apply ${correction.toFixed(3)} correction`);
    } else if (bias === "under_estimate") {
      suggestions.push(`Predictions average ${Math.abs(meanError).toFixed(1)}% low — check material factors`);
    }

    return {
      sample_size: actuals.length,
      mean_error_pct: parseFloat(meanError.toFixed(1)),
      bias,
      correction_factor: parseFloat(correction.toFixed(4)),
      confidence: Math.min(actuals.length / 20, 1.0), // Full confidence at 20+ samples
      suggestions,
    };
  }

  /**
   * Get telemetry history.
   */
  getTelemetryLog(): TelemetryEvent[] {
    return [...this.telemetryLog];
  }

  /**
   * Clear telemetry (for testing).
   */
  clearTelemetry(): void {
    this.telemetryLog = [];
  }
}

export const quoteAutopilotEngine = new QuoteAutopilotEngine();
