/**
 * InstantQuoteEngine — Xometry-killer instant pricing pipeline
 *
 * Orchestrates: feature extraction → DFM analysis → SpeedFeedOrchestrator cycle time →
 * QuoteEstimator cost aggregation → Wright's law qty breaks → lead time multipliers →
 * PartSimilarity sanity check.
 *
 * Output includes CI95 confidence bounds, quantity breaks (1–100), lead time options
 * (standard/expedited/rush), DFM warnings, cost breakdown, and similar-part references.
 *
 * Actions (3):
 *   instant_quote, instant_quote_qty_breaks, instant_quote_lead_time
 *
 * Knowledge sources:
 *   - QuoteEstimatorEngine (physics-backed cost estimation)
 *   - DFMFeedbackEngine (manufacturability analysis)
 *   - SpeedFeedOrchestratorEngine (physics cycle time)
 *   - PartSimilarityEngine (historical price sanity check)
 *   - BlueprintToQuoteBridgeEngine (drawing→quote bridge)
 *
 * Physics:
 *   - Wright's law (Crawford/Boeing unit-cost model): C(n) = C(1) × n^b, b = ln(learning_rate)/ln(2)
 *     Source: Crawford (1944) unit-cost variant; NASA Cost Estimating Handbook (2015) Ch.8
 *   - CI95 = price ± 1.96 × σ, σ derived from cost component uncertainties (RSS)
 *   - Kienzle force → power → cycle time (via SpeedFeedOrchestrator)
 *
 * @module engines/InstantQuoteEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import {
  quoteEstimatorEngine,
  type QuoteEstimateInput,
  type QuoteEstimateResult,
} from "./QuoteEstimatorEngine.js";
import { dfmFeedbackEngine } from "./DFMFeedbackEngine.js";
import { speedFeedOrchestratorEngine } from "./SpeedFeedOrchestratorEngine.js";
import { cycleTimeEstimatorEngine, type ControllerType } from "./CycleTimeEstimatorEngine.js";
import { shopConfigurationEngine } from "./ShopConfigurationEngine.js";
import { vendorCostIndexEngine } from "./VendorCostIndexEngine.js";
import { adaptiveShopRateEngine } from "./AdaptiveShopRateEngine.js";

// U-QP-DOCUSTRATA-MATERIAL: mm^3 -> in^3 (1 in = 25.4 mm; 25.4^3 = 16387.064).
const MM3_PER_IN3 = 16387.064;

// U-QP-RATE-WIRE: bridge the quote machine-type taxonomy (both the QuoteEstimator
// form cnc_mill_3axis/cnc_lathe/... and the SpeedFeed form vertical_mill/lathe/...)
// to the ShopConfigurationEngine machine `type` labels, so the quote can read THIS
// shop's actual per-machine $/hr. A type with no shop machine falls back to the
// quote engine's planning default (silent, never blocks a quote).
const MACHINE_TYPE_TO_SHOP_TYPE: Record<string, string> = {
  // QuoteEstimator taxonomy
  cnc_mill_3axis: "VMC", manual_mill: "VMC",
  cnc_mill_5axis: "5-axis",
  cnc_lathe: "Lathe", swiss_lathe: "Lathe", cnc_lathe_live: "Lathe", multi_spindle: "Lathe",
  wire_edm: "Wire EDM", sinker_edm: "EDM",
  surface_grinder: "Grinder", cylindrical_grinder: "Grinder", centerless_grinder: "Grinder",
  // SpeedFeed taxonomy (inferMachineType / input.machine_type alternate form)
  vertical_mill: "VMC", horizontal_mill: "VMC", lathe: "Lathe", "5axis": "5-axis",
};
import { partSimilarityEngine, type PartSpec } from "./PartSimilarityEngine.js";
import { tribalKnowledgeEngine, type KnowledgeTip } from "./TribalKnowledgeEngine.js";

// ============================================================================
// Types
// ============================================================================

export interface InstantQuoteInput {
  // Part geometry (from CAD or manual entry)
  part_name: string;
  material: string;
  bounding_box_mm?: { x: number; y: number; z: number };
  part_volume_cm3?: number;
  stock_dimensions_mm?: { length: number; width: number; height: number };

  // Features (from CAD feature recognition or manual)
  features?: Array<{
    type: string;
    count: number;
    tolerance_mm?: number;
    surface_finish_ra?: number;
    depth_ratio?: number;
    is_blind?: boolean;
    requires_5axis?: boolean;
    wall_thickness_mm?: number;
    corner_radius_mm?: number;
  }>;

  // Material context
  iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  hardness_hb?: number;

  // Machine preference
  machine_type?: string;
  machine_axes?: number;

  // Quantity and batch
  quantity: number;
  annual_volume?: number;

  // Tool context (optional — SpeedFeedOrchestrator resolves defaults)
  tool_diameter_mm?: number;
  flutes?: number;

  // ── G-code program (U-QP-GCODE-TIME-WIRE): when a real NC program is
  // available it is the MOST accurate cycle-time source (deterministic, from
  // actual toolpaths + this machine's kinematics), used ahead of the MRR
  // estimate. controller/profile select the machine kinematics. ──
  gcode_program?: string;
  gcode_controller?: ControllerType;
  gcode_machine_profile?: string;

  // Secondary operations
  secondary_ops?: Array<{
    type: string;
    vendor_quote?: number;
    notes?: string;
  }>;

  // Inspection
  inspection_level?: "minimal" | "standard" | "detailed" | "full_cmm";
  first_article_required?: boolean;
  certifications?: string[];

  // Rush
  rush?: boolean;
  rush_tier?: "standard" | "3day" | "next_day";

  // Customer context
  customer_tier?: "A" | "B" | "C" | "new";
  repeat_order?: boolean;
  target_margin_pct?: number;

  // Historical parts for similarity check
  historical_parts?: Array<{ id: string; spec: PartSpec }>;
}

export interface InstantQuoteResult {
  quote_id: string;
  part_name: string;
  quantity: number;
  date: string;
  valid_until: string;

  // Primary pricing with CI95 confidence bounds
  unit_price: number;
  total_price: number;
  ci95_low: number;
  ci95_high: number;
  confidence: number; // 0-100

  // Quantity breaks (Wright's law learning curve)
  quantity_breaks: QuantityBreak[];

  // Lead time options
  lead_time_options: LeadTimeOption[];

  // DFM analysis
  dfm: {
    score: number; // 0-100
    manufacturability: "excellent" | "good" | "marginal" | "difficult";
    issues: DFMIssue[];
  };

  // Full cost breakdown
  cost_breakdown: CostBreakdown;

  // Similar historical parts (for sanity check)
  similar_parts: SimilarPartRef[];

  // Process recommendation
  recommended_process: string;
  recommended_machine: string;

  // Physics traceability
  cycle_time_min: number;
  cycle_time_source: string;
  physics_engines_used: string[];

  // Confidence factors
  confidence_factors: string[];

  // Warnings for edge cases and limit violations
  warnings: string[];

  // Tribal knowledge (TK-2 consumer wiring)
  tribal_tips?: KnowledgeTip[];
}

export interface QuantityBreak {
  quantity: number;
  unit_price: number;
  total_price: number;
  savings_pct: number; // vs qty=1
  lead_time_days: number;
}

export interface LeadTimeOption {
  tier: "standard" | "expedited" | "rush";
  days: number;
  multiplier: number;
  unit_price: number;
  total_price: number;
}

export interface DFMIssue {
  severity: "critical" | "warning" | "info";
  category: string;
  message: string;
  recommendation: string;
  cost_impact_usd?: number;
  physics_basis?: string;
}

export interface CostBreakdown {
  material: { raw_cost: number; scrap_pct: number; total: number };
  machining: { cycle_time_min: number; machine_rate_hr: number; total: number };
  setup: { num_setups: number; setup_minutes: number; total: number };
  tooling: { tool_count: number; amortization_per_part: number; total: number };
  programming: { hours: number; total: number };
  inspection: { level: string; total: number };
  secondary_ops: { operations: Array<{ type: string; per_part: number }>; total: number };
  overhead: { rate_pct: number; total: number };
  total_cost_per_part: number;
}

export interface SimilarPartRef {
  id: string;
  similarity_score: number;
  historical_price?: number;
  price_delta_pct?: number; // how our quote compares
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Wright's law learning rates by process type.
 * Source: Wright (1936), validated by NASA Cost Estimating Handbook.
 * learning_rate = fraction of cost when quantity doubles.
 * b = ln(learning_rate) / ln(2)
 */
const WRIGHT_LEARNING_RATES: Record<string, number> = {
  cnc_mill_3axis: 0.92,    // 8% cost reduction per doubling
  cnc_mill_5axis: 0.90,    // 10% — more setup optimization potential
  cnc_lathe: 0.93,         // 7% — simpler setups
  swiss_lathe: 0.91,       // 9%
  wire_edm: 0.95,          // 5% — less operator learning
  cnc_lathe_live: 0.91,    // 9%
  surface_grinder: 0.94,   // 6%
  default: 0.92,
};

/** Standard quantity break points (Xometry/Fictiv-style) */
const QTY_BREAK_POINTS = [1, 5, 10, 25, 50, 100];

/** Lead time multipliers and days per tier */
const LEAD_TIME_TIERS: Record<string, { multiplier: number; base_factor: number }> = {
  standard: { multiplier: 1.0, base_factor: 1.0 },
  expedited: { multiplier: 1.35, base_factor: 0.65 },
  rush: { multiplier: 1.75, base_factor: 0.45 },
};

/**
 * Base lead time by complexity [business days].
 * Includes programming, setup, machining, inspection.
 */
const BASE_LEAD_DAYS: Record<string, number> = {
  simple: 5,
  medium: 8,
  complex: 12,
  very_complex: 18,
};

/** CI95 z-score */
const Z_95 = 1.96;

/**
 * Cost uncertainty coefficients by source.
 * These are coefficient-of-variation (CV) values used in RSS uncertainty propagation.
 * Adapted from AACE International Recommended Practice 18R-97 (process industry)
 * for CNC manufacturing cost estimation. Values calibrated to typical job-shop variability.
 */
const COST_CV: Record<string, number> = {
  material: 0.05,           // 5% — market price fluctuation
  machining_physics: 0.12,  // 12% — physics-based cycle time uncertainty
  machining_parametric: 0.25, // 25% — parametric estimate uncertainty
  setup: 0.15,              // 15%
  tooling: 0.20,            // 20%
  programming: 0.10,        // 10%
  inspection: 0.08,         // 8%
  secondary_ops: 0.15,      // 15%
  overhead: 0.05,           // 5%
};

// ============================================================================
// Engine
// ============================================================================

class InstantQuoteEngine {
  /**
   * Generate an instant quote with CI95 bounds, DFM analysis, qty breaks,
   * and lead time options. The Xometry-killer endpoint.
   */
  quote(input: InstantQuoteInput): InstantQuoteResult {
    const startTime = Date.now();
    const enginesUsed: string[] = ["InstantQuoteEngine"];

    // ── Step 1: Infer complexity from features ──
    const complexity = this.inferComplexity(input);
    const machineType = input.machine_type ?? this.inferMachineType(input);
    const numSetups = this.inferSetups(input, complexity);

    // ── Step 2: DFM Analysis ──
    let dfmResult: { issues: DFMIssue[]; score: number; manufacturability: "excellent" | "good" | "marginal" | "difficult" } = {
      issues: [], score: 100, manufacturability: "excellent",
    };
    if (input.features && input.features.length > 0) {
      try {
        const rawDfm = dfmFeedbackEngine.analyze(
          input.features.map(f => ({
            type: f.type,
            tolerance_mm: f.tolerance_mm,
            surface_finish_Ra: f.surface_finish_ra,
            wall_thickness_mm: f.wall_thickness_mm,
            corner_radius_mm: f.corner_radius_mm,
          })),
          input.iso_group,
          input.machine_axes ?? (machineType.includes("5axis") ? 5 : 3),
        );
        dfmResult = {
          score: rawDfm.score,
          manufacturability: rawDfm.manufacturability as "excellent" | "good" | "marginal" | "difficult",
          issues: rawDfm.issues.map(i => ({
            severity: i.severity,
            category: i.category,
            message: i.message,
            recommendation: i.recommendation,
            physics_basis: i.physics_basis,
          })),
        };
        enginesUsed.push("DFMFeedbackEngine");
      } catch (err) {
        log.warn("DFM analysis failed, continuing without", { error: String(err) });
      }
    }

    // -- Step 3: Cycle time. Priority: real G-code (deterministic) > physics
    // MRR estimate > parametric complexity estimate. --
    let cycleTimeMin = 0;
    let cycleTimeSource = "parametric_estimate";

    // Step 3a: G-code program (U-QP-GCODE-TIME-WIRE) -- the most accurate source.
    // Runs the full line-by-line S-curve parser (rapid/cut/canned-cycle/tool-change)
    // against this machine's kinematics instead of a single-tool MRR assumption.
    if (input.gcode_program && input.gcode_program.trim().length > 0) {
      try {
        const gc = cycleTimeEstimatorEngine.estimateFromGCode(input.gcode_program, {
          controller: (input.gcode_controller ?? "fanuc") as ControllerType,
          machine_profile: input.gcode_machine_profile,
        });
        if (gc && Number.isFinite(gc.total_seconds) && gc.total_seconds > 0) {
          cycleTimeMin = gc.total_seconds / 60;
          cycleTimeSource = "gcode_precise";
          enginesUsed.push("CycleTimeEstimatorEngine");
        }
      } catch (err: unknown) {
        log.warn("G-code cycle-time estimate failed, falling back to MRR/parametric", { error: String(err) });
      }
    }

    // Step 3b: Physics-based cycle time via SpeedFeedOrchestrator (only when no
    // G-code program produced a time).
    if (cycleTimeMin <= 0) {
      try {
        const sfResult = speedFeedOrchestratorEngine.compute({
          material: input.material,
          iso_group: input.iso_group,
          hardness_hb: input.hardness_hb,
          machine_type: machineType as "vertical_mill" | "horizontal_mill" | "lathe" | "5axis",
          tool_diameter_mm: input.tool_diameter_mm ?? 12,
          flutes: input.flutes ?? 4,
          operation: machineType.includes("lathe") ? "turning" : "milling",
          cut_type: "roughing",
          axial_depth_mm: input.tool_diameter_mm ? input.tool_diameter_mm * 0.5 : 6,
          radial_depth_pct: 40,
        });

        if (sfResult?.value?.mrr_cm3min && sfResult.value.mrr_cm3min > 0) {
          // Estimate volume to remove from bounding box vs part volume
          const volumeToRemove = this.estimateVolumeToRemove(input);
          if (volumeToRemove > 0) {
            // Roughing time + finishing time (finishing ~30% of roughing time)
            const roughingMin = volumeToRemove / sfResult.value.mrr_cm3min;
            const finishingMin = roughingMin * 0.3;
            cycleTimeMin = roughingMin + finishingMin;
            cycleTimeSource = "physics_calculated";
            enginesUsed.push("SpeedFeedOrchestratorEngine");
          }
        }
      } catch (err: unknown) {
        log.warn("SpeedFeedOrchestrator failed, using parametric estimate", { error: String(err) });
      }
    }

    // Fallback: parametric estimate based on complexity
    if (cycleTimeMin <= 0) {
      cycleTimeMin = this.parametricCycleTime(input, complexity);
      cycleTimeSource = "parametric_estimate";
    }

    // Step 3c: Per-shop rates from ShopConfigurationEngine (U-QP-RATE-WIRE) --
    // the active shop's actual machine/setup/programming $/hr replace the quote
    // engine's inline planning defaults, killing the silent rate divergence.
    let shopMachineRateHr: number | undefined;
    let shopSetupRateHr: number | undefined;
    let shopProgrammingRateHr: number | undefined;
    try {
      const shopType = MACHINE_TYPE_TO_SHOP_TYPE[machineType];
      if (shopType) {
        const machine = shopConfigurationEngine.getMachines().find(
          m => m.type.toLowerCase() === shopType.toLowerCase(),
        );
        if (machine && machine.hourly_rate > 0) {
          shopMachineRateHr = machine.hourly_rate;
          // U-QP-ADAPTIVE-PERSIST: when the adaptive engine has folded in REAL
          // actual-vs-predicted outcomes for this machine, its self-tuned
          // posterior mean (the learned rate) beats the static catalog rate.
          // Dormant until outcomes are recorded (n_observations == 0 today).
          try {
            const prior = adaptiveShopRateEngine.getPrior(machine.id);
            if (prior && prior.n_observations > 0 && prior.mu > 0) {
              shopMachineRateHr = prior.mu;
              enginesUsed.push("AdaptiveShopRateEngine");
            }
          } catch { /* no learned prior -> keep the catalog rate */ }
        }
      }
      const rates = shopConfigurationEngine.getRates();
      if (rates.setup_per_hr > 0) shopSetupRateHr = rates.setup_per_hr;
      if (rates.programming_per_hr > 0) shopProgrammingRateHr = rates.programming_per_hr;
      // Honest traceability: record the engine when ANY shop rate (machine OR
      // setup OR programming) was actually applied to this quote.
      if (shopMachineRateHr !== undefined || shopSetupRateHr !== undefined || shopProgrammingRateHr !== undefined) {
        enginesUsed.push("ShopConfigurationEngine");
      }
    } catch (err: unknown) {
      log.warn("ShopConfig rate lookup failed, using quote-engine planning defaults", { error: String(err) });
    }

    // Step 3d: Units-correct REAL material cost (U-QP-DOCUSTRATA-MATERIAL) --
    // when stock dims + a JM tool-steel grade are known, cost the material from
    // the AP-ledger $/in3 consumable basis (density-free, real spend) instead of
    // the density x $/kg planning estimate. Only the 10 JM grades resolve; other
    // materials (aluminum/stainless) return null -> fall back silently.
    let materialCostPerPartOverride: number | undefined;
    try {
      if (input.stock_dimensions_mm) {
        const d = input.stock_dimensions_mm;
        const stockVolIn3 = (d.length * d.width * d.height) / MM3_PER_IN3;
        // U-QP-CONSUME-FMV-DEDUP: route through the canonical confidence-gated
        // primitive instead of re-gating inline. minConfidence:"high" REFUSES low-n
        // AP-ledger outliers (e.g. D2 block_n=2 -> $251/in3, ~40x other tool steels)
        // for customer-facing quotes; none/below-floor -> ok:false -> parametric fallback.
        const mc = vendorCostIndexEngine.materialCostForVolume(input.material, stockVolIn3, undefined, { minConfidence: "high" });
        if (mc.ok && mc.material_cost_usd != null && mc.material_cost_usd > 0) {
          materialCostPerPartOverride = mc.material_cost_usd;
          enginesUsed.push("VendorCostIndexEngine");
        }
      }
    } catch (err: unknown) {
      log.warn("Material $/in3 basis lookup failed, using parametric material cost", { error: String(err) });
    }

    // ── Step 4: Build QuoteEstimator input and get cost breakdown ──
    const quoteInput: QuoteEstimateInput = {
      part_name: input.part_name,
      quantity: input.quantity,
      material: input.material,
      stock_dimensions_mm: input.stock_dimensions_mm,
      part_volume_cm3: input.part_volume_cm3,
      complexity,
      features: input.features?.map(f => ({
        type: f.type as "hole" | "pocket" | "slot" | "thread" | "chamfer" | "fillet",
        count: f.count,
        tolerance_mm: f.tolerance_mm,
        surface_finish_ra: f.surface_finish_ra,
        depth_ratio: f.depth_ratio,
        is_blind: f.is_blind,
        requires_5axis: f.requires_5axis,
      })),
      num_setups: numSetups,
      machine_type: machineType,
      machine_rate_hr: shopMachineRateHr,
      setup_rate_hr: shopSetupRateHr,
      programming_rate_hr: shopProgrammingRateHr,
      material_cost_per_part_override: materialCostPerPartOverride,
      tightest_tolerance_mm: this.tightestTolerance(input),
      tightest_surface_finish_ra: this.tightestFinish(input),
      operations: [{
        name: "main_machining",
        type: machineType.includes("lathe") ? "turning" : "milling",
        cycle_time_min: cycleTimeMin,
      }],
      secondary_ops: input.secondary_ops,
      inspection_level: input.inspection_level ?? "standard",
      first_article_required: input.first_article_required,
      certifications: input.certifications,
      rush: input.rush,
      rush_tier: input.rush_tier,
      customer_tier: input.customer_tier,
      repeat_order: input.repeat_order,
      target_margin_pct: input.target_margin_pct,
      annual_volume: input.annual_volume,
    };

    let quoteResult: QuoteEstimateResult;
    try {
      quoteResult = quoteEstimatorEngine.estimate(quoteInput);
      enginesUsed.push("QuoteEstimatorEngine");
    } catch (err: unknown) {
      log.error("QuoteEstimator failed", String(err));
      throw new Error(`Quote estimation failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // ── Step 5: CI95 confidence interval via RSS uncertainty propagation ──
    const { ci95Low, ci95High, confidenceScore, confidenceFactors } =
      this.computeCI95(quoteResult, cycleTimeSource);

    // ── Step 6: Wright's law quantity breaks ──
    const quantityBreaks = this.computeQuantityBreaks(
      quoteResult, machineType, complexity,
    );

    // ── Step 7: Lead time options ──
    const leadTimeOptions = this.computeLeadTimeOptions(
      quoteResult, complexity, input.quantity,
    );

    // ── Step 8: PartSimilarity sanity check ──
    let similarParts: SimilarPartRef[] = [];
    if (input.historical_parts && input.historical_parts.length > 0) {
      try {
        const targetSpec: PartSpec = {
          material: input.material,
          iso_group: input.iso_group,
          dimensions: input.bounding_box_mm,
          features: input.features?.map(f => f.type),
          tolerances: input.features
            ?.filter(f => f.tolerance_mm)
            .map(f => ({ dimension: f.type, value_mm: f.tolerance_mm! })),
          surface_finish_ra: this.tightestFinish(input),
          operations: [machineType.includes("lathe") ? "turning" : "milling"],
          machine_type: machineType,
          batch_size: input.quantity,
        };

        const nearest = partSimilarityEngine.findNearest(
          targetSpec, input.historical_parts, 5,
        );

        similarParts = nearest.map(n => ({
          id: n.id,
          similarity_score: n.score,
        }));
        enginesUsed.push("PartSimilarityEngine");
      } catch (err: unknown) {
        log.warn("PartSimilarity check failed", { error: String(err) });
      }
    }

    // ── Step 9: Add DFM cost impact to issues ──
    const dfmWithCostImpact = this.addDfmCostImpact(
      dfmResult.issues, quoteResult.pricing.unit_price,
    );

    // ── Step 10: Generate warnings for edge cases ──
    const warnings: string[] = [];
    if (cycleTimeSource === "parametric_estimate") {
      warnings.push("Cycle time is a parametric estimate — provide bounding_box_mm and part_volume_cm3 for physics-based calculation");
    }
    if (confidenceScore < 50) {
      warnings.push(`Low confidence (${confidenceScore}%) — quote may vary significantly from actual cost`);
    }
    if (dfmResult.issues.some(i => i.severity === "critical")) {
      warnings.push(`${dfmResult.issues.filter(i => i.severity === "critical").length} critical DFM issue(s) — address before production`);
    }
    if (!input.bounding_box_mm && !input.part_volume_cm3) {
      warnings.push("No part geometry provided — cost estimate is rough; upload CAD for accurate pricing");
    }
    if (input.quantity > 1000) {
      warnings.push("High volume (>1000) — contact sales for production pricing with dedicated tooling amortization");
    }
    if (quoteResult.buy_to_fly && quoteResult.buy_to_fly > 10) {
      warnings.push(`High buy-to-fly ratio (${quoteResult.buy_to_fly.toFixed(1)}:1) — consider near-net-shape stock or casting`);
    }

    const elapsed = Date.now() - startTime;
    log.info(`InstantQuote generated in ${elapsed}ms for ${input.part_name}`);

    // ── TK-2: Tribal knowledge consumer wiring ──
    const tribal_tips = this._queryTribalTips(input);

    return {
      quote_id: quoteResult.quote_id,
      part_name: input.part_name,
      quantity: input.quantity,
      date: quoteResult.date,
      valid_until: quoteResult.valid_until,

      unit_price: quoteResult.pricing.unit_price,
      total_price: quoteResult.pricing.total_price,
      ci95_low: ci95Low,
      ci95_high: ci95High,
      confidence: confidenceScore,

      quantity_breaks: quantityBreaks,
      lead_time_options: leadTimeOptions,

      dfm: {
        score: dfmResult.score,
        manufacturability: dfmResult.manufacturability,
        issues: dfmWithCostImpact,
      },

      cost_breakdown: {
        material: {
          raw_cost: quoteResult.costs.material.raw_cost,
          scrap_pct: quoteResult.costs.material.scrap_pct,
          total: quoteResult.costs.material.total,
        },
        machining: {
          cycle_time_min: quoteResult.costs.machining.cycle_time_min,
          machine_rate_hr: quoteResult.costs.machining.machine_rate_hr,
          total: quoteResult.costs.machining.total,
        },
        setup: {
          num_setups: quoteResult.costs.setup.num_setups,
          setup_minutes: quoteResult.costs.setup.setup_minutes,
          total: quoteResult.costs.setup.total,
        },
        tooling: {
          tool_count: quoteResult.costs.tooling.estimated_tool_count,
          amortization_per_part: quoteResult.costs.tooling.tool_amortization_per_part,
          total: quoteResult.costs.tooling.total,
        },
        programming: {
          hours: quoteResult.costs.programming.hours,
          total: quoteResult.costs.programming.total,
        },
        inspection: {
          level: quoteResult.costs.inspection.level,
          total: quoteResult.costs.inspection.total,
        },
        secondary_ops: {
          operations: quoteResult.costs.secondary_ops.operations.map(o => ({
            type: o.type,
            per_part: o.per_part,
          })),
          total: quoteResult.costs.secondary_ops.total,
        },
        overhead: {
          rate_pct: quoteResult.costs.overhead.rate_pct,
          total: quoteResult.costs.overhead.total,
        },
        total_cost_per_part: quoteResult.costs.total_cost_per_part,
      },

      similar_parts: similarParts,

      recommended_process: machineType.includes("lathe") ? "CNC Turning" : "CNC Milling",
      recommended_machine: machineType,

      cycle_time_min: cycleTimeMin,
      cycle_time_source: cycleTimeSource,
      physics_engines_used: enginesUsed,

      confidence_factors: confidenceFactors,

      warnings,

      // ── TK-2: Tribal knowledge consumer wiring ──
      tribal_tips,
    };
  }

  /** Query tribal knowledge tips for quoting context. */
  private _queryTribalTips(input: { iso_group?: string; material_spec?: string }): KnowledgeTip[] | undefined {
    try {
      return tribalKnowledgeEngine.search({
        category: "tooling",
        material_iso_group: input.iso_group,
        query: input.material_spec,
        min_confidence: 70,
        limit: 5,
      });
    } catch { return undefined; }
  }

  /**
   * Compute quantity breaks for a given quote (standalone).
   * Uses Wright's law learning curve with setup amortization.
   */
  computeQtyBreaks(input: {
    unit_price_at_qty: number;
    quantity: number;
    machine_type?: string;
    complexity?: string;
    setup_cost?: number;
    programming_cost?: number;
  }): QuantityBreak[] {
    const machineType = input.machine_type ?? "default";
    const learningRate = WRIGHT_LEARNING_RATES[machineType] ?? WRIGHT_LEARNING_RATES.default;
    const b = Math.log(learningRate) / Math.log(2);

    // Decompose: fixed costs (setup + programming) + variable costs at input quantity
    const fixedCost = (input.setup_cost ?? 0) + (input.programming_cost ?? 0);
    const variableCostAtInputQty = input.unit_price_at_qty - (fixedCost / Math.max(input.quantity, 1));

    // Normalize variable cost to qty=1 reference using Wright's law inverse:
    // C(Q) = C(1) × Q^b  →  C(1) = C(Q) / Q^b
    // Source: Crawford (1944) unit-cost model; NASA CEH 2015 Ch.8
    const inputQty = Math.max(input.quantity, 1);
    const variableCostAtQty1 = inputQty > 1
      ? variableCostAtInputQty / Math.pow(inputQty, b)
      : variableCostAtInputQty;

    const baseDays = BASE_LEAD_DAYS[input.complexity ?? "medium"] ?? 8;
    const baseUnitPrice = variableCostAtQty1 + fixedCost; // qty=1 reference price

    return QTY_BREAK_POINTS.map(qty => {
      // Wright's law: C(n) = C(1) × n^b
      const scaleFactor = qty > 1 ? Math.pow(qty, b) : 1.0;
      const variableAtQty = variableCostAtQty1 * scaleFactor;
      const unitPrice = variableAtQty + (fixedCost / Math.max(qty, 1));
      const unitPriceRounded = Math.round(unitPrice * 100) / 100;

      return {
        quantity: qty,
        unit_price: unitPriceRounded,
        total_price: Math.round(unitPriceRounded * qty * 100) / 100,
        savings_pct: baseUnitPrice > 0
          ? Math.max(0, Math.round((1 - unitPriceRounded / baseUnitPrice) * 1000) / 10)
          : 0,
        lead_time_days: Math.ceil(baseDays + Math.log2(Math.max(qty, 1)) * 1.5),
      };
    });
  }

  /**
   * Compute lead time options for a given quote (standalone).
   */
  computeLeadOptions(input: {
    base_lead_days: number;
    unit_price: number;
    quantity: number;
  }): LeadTimeOption[] {
    return (Object.entries(LEAD_TIME_TIERS) as [string, { multiplier: number; base_factor: number }][])
      .map(([tier, config]) => {
        const days = Math.ceil(input.base_lead_days * config.base_factor);
        const unitPrice = Math.round(input.unit_price * config.multiplier * 100) / 100;
        return {
          tier: tier as "standard" | "expedited" | "rush",
          days,
          multiplier: config.multiplier,
          unit_price: unitPrice,
          total_price: Math.round(unitPrice * input.quantity * 100) / 100,
        };
      });
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  /** Infer complexity from feature count, tolerances, and 5-axis needs */
  private inferComplexity(
    input: InstantQuoteInput,
  ): "simple" | "medium" | "complex" | "very_complex" {
    if (!input.features || input.features.length === 0) return "medium";

    const featureCount = input.features.reduce((sum, f) => sum + f.count, 0);
    const has5Axis = input.features.some(f => f.requires_5axis);
    const hasUndercut = input.features.some(f => f.type === "undercut");
    const tightTol = this.tightestTolerance(input);

    let score = 0;
    if (featureCount > 20) score += 3;
    else if (featureCount > 10) score += 2;
    else if (featureCount > 4) score += 1;

    if (has5Axis) score += 2;
    if (hasUndercut) score += 2;
    if (tightTol !== undefined && tightTol < 0.01) score += 2;
    else if (tightTol !== undefined && tightTol < 0.05) score += 1;

    if (score >= 6) return "very_complex";
    if (score >= 4) return "complex";
    if (score >= 2) return "medium";
    return "simple";
  }

  /** Infer machine type from features and geometry */
  private inferMachineType(input: InstantQuoteInput): string {
    // If bounding box is cylindrical (one dim >> others), suggest lathe
    if (input.bounding_box_mm) {
      const { x, y, z } = input.bounding_box_mm;
      const dims = [x, y, z].sort((a, b) => b - a);
      const lengthToDiameterRatio = dims[0] / Math.max(dims[1], 1);
      if (lengthToDiameterRatio > 3 && Math.abs(dims[1] - dims[2]) / Math.max(dims[1], 1) < 0.2) {
        return "cnc_lathe";
      }
    }

    // If any feature requires 5-axis
    if (input.features?.some(f => f.requires_5axis)) {
      return "cnc_mill_5axis";
    }

    // Default to 3-axis mill
    return "cnc_mill_3axis";
  }

  /** Infer number of setups from complexity and features */
  private inferSetups(
    input: InstantQuoteInput,
    complexity: string,
  ): number {
    if (input.features?.some(f => f.requires_5axis)) return 1; // 5-axis = single setup
    switch (complexity) {
      case "simple": return 1;
      case "medium": return 2;
      case "complex": return 3;
      case "very_complex": return 4;
      default: return 2;
    }
  }

  /** Get tightest tolerance from features */
  private tightestTolerance(input: InstantQuoteInput): number | undefined {
    if (!input.features) return undefined;
    const tolerances = input.features
      .map(f => f.tolerance_mm)
      .filter((t): t is number => t !== undefined && t > 0);
    return tolerances.length > 0 ? Math.min(...tolerances) : undefined;
  }

  /** Get tightest (smallest) surface finish Ra from features */
  private tightestFinish(input: InstantQuoteInput): number | undefined {
    if (!input.features) return undefined;
    const finishes = input.features
      .map(f => f.surface_finish_ra)
      .filter((r): r is number => r !== undefined && r > 0);
    return finishes.length > 0 ? Math.min(...finishes) : undefined;
  }

  /**
   * Estimate volume to remove from stock.
   * If part_volume_cm3 and bounding_box are provided, use buy-to-fly ratio.
   * Otherwise estimate from bounding box with typical material removal %.
   */
  private estimateVolumeToRemove(input: InstantQuoteInput): number {
    if (input.part_volume_cm3 && input.bounding_box_mm) {
      const { x, y, z } = input.bounding_box_mm;
      // Stock volume = bounding box + 5mm margin per side
      const stockVolCm3 = ((x + 10) * (y + 10) * (z + 10)) / 1000;
      return Math.max(stockVolCm3 - input.part_volume_cm3, 0);
    }

    if (input.bounding_box_mm) {
      const { x, y, z } = input.bounding_box_mm;
      const stockVolCm3 = ((x + 10) * (y + 10) * (z + 10)) / 1000;
      // Material removal fraction varies by part type: 10-20% (simple prismatic) to
      // 85-95% (aerospace pockets). 60% is a PRISM-internal default for medium complexity,
      // calibrated against historical shop data. Source: Boothroyd, Dewhurst & Knight
      // "Product Design for Manufacture and Assembly" 3rd ed., Table 7.4 avg removal ratios.
      return stockVolCm3 * 0.6;
    }

    // No geometry info — return 0 (will fall back to parametric)
    return 0;
  }

  /** Parametric cycle time estimate when physics pipeline isn't available */
  private parametricCycleTime(
    input: InstantQuoteInput,
    complexity: string,
  ): number {
    // Base cycle times by complexity [minutes]
    const baseTimes: Record<string, number> = {
      simple: 8,
      medium: 20,
      complex: 45,
      very_complex: 90,
    };

    let time = baseTimes[complexity] ?? 20;

    // Scale by bounding box volume (larger parts = more time)
    if (input.bounding_box_mm) {
      const { x, y, z } = input.bounding_box_mm;
      const volCm3 = (x * y * z) / 1000;
      // Exponent 0.6: PRISM-internal approximation. Literature 0.5–0.7 for machining
      // time vs volume (Boothroyd & Dewhurst DFM handbook Ch.7). Pending shop calibration.
      time *= Math.pow(volCm3 / 100, 0.6);
    }

    // Feature-based additions
    if (input.features) {
      for (const f of input.features) {
        if (f.type === "thread") time += 2 * f.count;
        if (f.type === "hole" && f.is_blind) time += 1.5 * f.count;
        if (f.tolerance_mm && f.tolerance_mm < 0.01) time += 3 * f.count;
        if (f.surface_finish_ra && f.surface_finish_ra < 0.8) time += 2 * f.count;
      }
    }

    return Math.max(time, 2); // minimum 2 minutes
  }

  /**
   * CI95 confidence interval via RSS uncertainty propagation.
   * σ_total = sqrt(Σ (cv_i × cost_i)²)
   * CI95 = price ± 1.96 × σ_total
   *
   * Source: AACE 18R-97 cost estimate classification
   */
  private computeCI95(
    quote: QuoteEstimateResult,
    cycleTimeSource: string,
  ): {
    ci95Low: number;
    ci95High: number;
    confidenceScore: number;
    confidenceFactors: string[];
  } {
    const costs = quote.costs;
    const machiningCV = cycleTimeSource === "physics_calculated"
      ? COST_CV.machining_physics
      : COST_CV.machining_parametric;

    // RSS uncertainty propagation on PER-PART costs: σ² = Σ(cv_i × perPartCost_i)²
    // Fixed costs (setup, programming) are NOT divided by qty — their uncertainty
    // applies to the full order and is amortized per-part after RSS.
    // Source: AACE 18R-97 RSS method, adapted for CNC manufacturing cost estimation.
    // Each component's uncertainty = CV × (component_total / qty), propagated via RSS.
    const qty = Math.max(quote.quantity, 1);
    const varianceComponents = [
      (COST_CV.material * (costs.material.total / qty)) ** 2,
      (machiningCV * (costs.machining.total / qty)) ** 2,
      (COST_CV.setup * (costs.setup.total / qty)) ** 2,       // fixed cost amortized
      (COST_CV.tooling * (costs.tooling.total / qty)) ** 2,
      (COST_CV.programming * (costs.programming.total / qty)) ** 2, // fixed cost amortized
      (COST_CV.inspection * (costs.inspection.total / qty)) ** 2,
      (COST_CV.secondary_ops * (costs.secondary_ops.total / qty)) ** 2,
      (COST_CV.overhead * (costs.overhead.total / qty)) ** 2,
    ];

    const sigmaPerPart = Math.sqrt(varianceComponents.reduce((sum, v) => sum + v, 0));

    const unitPrice = quote.pricing.unit_price;
    const ci95Low = Math.round(Math.max(unitPrice - Z_95 * sigmaPerPart, 0) * 100) / 100;
    const ci95High = Math.round((unitPrice + Z_95 * sigmaPerPart) * 100) / 100;

    // Confidence score: higher when variance is low relative to price
    const cvTotal = unitPrice > 0 ? sigmaPerPart / unitPrice : 1;
    const confidenceScore = Math.round(Math.max(0, Math.min(100,
      100 * (1 - cvTotal * 2), // CV of 50% → 0 confidence
    )));

    const confidenceFactors: string[] = [];
    if (cycleTimeSource === "physics_calculated") {
      confidenceFactors.push("Physics-based cycle time (±12%)");
    } else {
      confidenceFactors.push("Parametric cycle time estimate (±25%)");
    }
    if (costs.secondary_ops.total > 0) {
      confidenceFactors.push("Secondary ops included (±15%)");
    }
    if (quote.confidence_factors) {
      confidenceFactors.push(...quote.confidence_factors);
    }

    return { ci95Low, ci95High, confidenceScore, confidenceFactors };
  }

  /**
   * Wright's law quantity breaks with setup amortization.
   *
   * Wright's law: C(n) = C(1) × n^b where b = ln(learning_rate)/ln(2)
   * Setup and programming costs are fixed, amortized over quantity.
   *
   * Source: Crawford (1944) unit-cost learning curve model,
   * validated by NASA Cost Estimating Handbook (2015) Ch.8.
   */
  private computeQuantityBreaks(
    quote: QuoteEstimateResult,
    machineType: string,
    complexity: string,
  ): QuantityBreak[] {
    const learningRate = WRIGHT_LEARNING_RATES[machineType] ?? WRIGHT_LEARNING_RATES.default;
    const b = Math.log(learningRate) / Math.log(2);

    // Fixed costs: setup + programming (amortized)
    const fixedCost = quote.costs.setup.total + quote.costs.programming.total;

    // Variable per-part cost at quote quantity (excludes amortized setup/programming)
    const quoteQty = Math.max(quote.quantity, 1);
    const variableAtQuoteQty = quote.pricing.unit_price - (fixedCost / quoteQty);

    // Normalize variable cost to qty=1 reference using Wright's law inverse:
    // C(Q) = C(1) × Q^b  →  C(1) = C(Q) / Q^b
    // Source: Crawford (1944) unit-cost model; NASA CEH 2015 Ch.8
    const variableAtQty1 = quoteQty > 1
      ? variableAtQuoteQty / Math.pow(quoteQty, b)
      : variableAtQuoteQty;

    const baseDays = BASE_LEAD_DAYS[complexity] ?? 8;
    const secondaryDays = quote.lead_time?.secondary_ops_days ?? 0;
    const baseUnitPrice = variableAtQty1 + fixedCost; // qty=1 reference (savings_pct denominator)

    return QTY_BREAK_POINTS.map(qty => {
      // Wright's law: C(n) = C(1) × n^b
      const scaleFactor = qty > 1 ? Math.pow(qty, b) : 1.0;
      const variableAtQty = variableAtQty1 * scaleFactor;
      const unitPrice = Math.round((variableAtQty + fixedCost / Math.max(qty, 1)) * 100) / 100;
      const totalPrice = Math.round(unitPrice * qty * 100) / 100;
      const savingsPct = baseUnitPrice > 0
        ? Math.max(0, Math.round((1 - unitPrice / baseUnitPrice) * 1000) / 10)
        : 0;

      // Lead time scales sub-linearly with quantity
      const machiningDays = Math.ceil(baseDays + Math.log2(Math.max(qty, 1)) * 1.5);
      const totalDays = machiningDays + secondaryDays;

      return {
        quantity: qty,
        unit_price: unitPrice,
        total_price: totalPrice,
        savings_pct: savingsPct,
        lead_time_days: totalDays,
      };
    });
  }

  /** Compute standard/expedited/rush lead time options */
  private computeLeadTimeOptions(
    quote: QuoteEstimateResult,
    complexity: string,
    quantity: number,
  ): LeadTimeOption[] {
    const baseDays = BASE_LEAD_DAYS[complexity] ?? 8;
    const secondaryDays = quote.lead_time?.secondary_ops_days ?? 0;
    const qtyDays = Math.ceil(Math.log2(Math.max(quantity, 1)) * 1.5);
    const totalBaseDays = baseDays + secondaryDays + qtyDays;

    return (Object.entries(LEAD_TIME_TIERS) as [string, { multiplier: number; base_factor: number }][])
      .map(([tier, config]) => {
        const days = Math.max(Math.ceil(totalBaseDays * config.base_factor), 1);
        const unitPrice = Math.round(quote.pricing.unit_price * config.multiplier * 100) / 100;
        return {
          tier: tier as "standard" | "expedited" | "rush",
          days,
          multiplier: config.multiplier,
          unit_price: unitPrice,
          total_price: Math.round(unitPrice * quantity * 100) / 100,
        };
      });
  }

  /** Estimate per-issue cost impact as percentage of unit price */
  private addDfmCostImpact(issues: DFMIssue[], unitPrice: number): DFMIssue[] {
    return issues.map(issue => {
      let impactPct = 0;
      switch (issue.severity) {
        case "critical": impactPct = 0.15; break; // 15% cost adder per critical issue
        case "warning": impactPct = 0.05; break;  // 5% per warning
        case "info": impactPct = 0.01; break;      // 1% per info
      }
      return {
        ...issue,
        cost_impact_usd: Math.round(unitPrice * impactPct * 100) / 100,
      };
    });
  }

  /**
   * JULIETT-DB-BRIDGE-MS0/U-DB-MACHINE-QUALITY-CONSUMERS — Phase 5 wire (quoting consumer).
   *
   * Wrapper over quote() that consumes machineQualityForConsumer('sfc')
   * + machineQualityForConsumer('post') and applies:
   *   - Cycle-time inflation: lower-tier machine → derate the implied feed/speed,
   *     pushes cycle_time_min UP (cycle = volume / mrr; mrr scales with feed×speed)
   *   - CI95 widening: post payload safety_pad_pct widens the price uncertainty band
   *     (low-quality machine → wider quote band reflects scrap-rate uncertainty)
   *
   * Additive — when no machine_id provided, behavior identical to quote().
   *
   * @param input Standard InstantQuoteInput + optional machine_id / machine
   */
  async quoteWithMachineQuality(
    input: InstantQuoteInput & {
      machine_id?: string;
      machine?: Record<string, unknown>;
    },
  ): Promise<InstantQuoteResult & {
    machine_quality_adjustment: {
      derate_factor: number;
      cycle_time_uplift_pct: number;
      ci95_widen_pct: number;
      tier: string;
      source: string;
    };
  }> {
    const base = this.quote(input);

    let derate = 1.0;
    let safetyPadPct = 5;
    let tier = "UNKNOWN";
    let source = "none";

    if (input.machine_id || input.machine) {
      // Lazy import to keep engine-layer pure (no circular dep with dispatcher)
      const { machineQualityForConsumer } = await import("./MachineQualityScoreEngine.js");

      // Pull both sfc derate (for cycle time) AND post payload (for safety pad / quote band)
      const [sfcQ, postQ] = await Promise.all([
        machineQualityForConsumer({ consumer: "sfc",  machine_id: input.machine_id, machine: input.machine }),
        machineQualityForConsumer({ consumer: "post", machine_id: input.machine_id, machine: input.machine }),
      ]);

      if (sfcQ.ok) {
        const p = sfcQ.payload as { derate_factor: number; recommend_safety_pad_pct: number };
        if (typeof p.derate_factor === "number" && isFinite(p.derate_factor)) {
          derate = Math.max(0.5, Math.min(1.0, p.derate_factor));
        }
        if (typeof p.recommend_safety_pad_pct === "number" && isFinite(p.recommend_safety_pad_pct)) {
          safetyPadPct = p.recommend_safety_pad_pct;
        }
        tier = sfcQ.tier;
        source = `machine_quality_score[${sfcQ.tier}]`;
      }
      // post payload reserved for future controller-family override; kept for symmetry / future expansion
      void postQ;
    }

    // Cycle-time uplift: derate < 1.0 means slower machine → longer cycle.
    // Uplift factor = 1/derate. e.g. derate=0.65 → cycle * 1.538 (54% longer)
    const cycleUpliftFactor = derate > 0 ? 1.0 / derate : 1.0;
    const cycleUpliftPct = Math.round((cycleUpliftFactor - 1.0) * 1000) / 10; // 1dp

    // CI95 widen: safetyPadPct (5/10/20) extends the price band as a fractional widening.
    // High-tier (5%) → narrow band. Hobby (20%) → wide band.
    const padFraction = safetyPadPct / 100;
    const ci95WidenPct = Math.round(padFraction * 1000) / 10;

    const adjustedUnitPrice = Math.round(base.unit_price * cycleUpliftFactor * 100) / 100;
    const adjustedCi95Low  = Math.round(base.ci95_low  * (1 - padFraction) * 100) / 100;
    const adjustedCi95High = Math.round(base.ci95_high * (1 + padFraction) * 100) / 100;

    return {
      ...base,
      unit_price: adjustedUnitPrice,
      ci95_low: adjustedCi95Low,
      ci95_high: adjustedCi95High,
      machine_quality_adjustment: {
        derate_factor: derate,
        cycle_time_uplift_pct: cycleUpliftPct,
        ci95_widen_pct: ci95WidenPct,
        tier,
        source,
      },
    };
  }
}

export const instantQuoteEngine = new InstantQuoteEngine();
