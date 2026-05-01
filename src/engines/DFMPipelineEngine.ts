/**
 * DFMPipelineEngine — Unified DFM analysis pipeline with GD&T tolerance feasibility
 *
 * Orchestrates four existing engines into a single DFM pipeline:
 *   1. DFMFeedbackEngine — feature-level rules (wall, depth, corner, tolerance, finish)
 *   2. DfMRulesEngine — structural pass/fail with machine type awareness
 *   3. AccessibilityAnalysisEngine — tool reachability (holder clearance, chip evacuation)
 *   4. CADDrawingKnowledgeEngine — GD&T correctness, datum consistency, ISO 286 fits
 *
 * New rules added by this engine:
 *   - Undercut detection (max depth 2× width, tool access)
 *   - Thread depth ratio (max 3× nominal for blind, 2× for through)
 *   - Internal sharp corners (stress concentration Kt = 1 + 2√(a/r))
 *   - Flatness/parallelism feasibility vs process capability
 *   - Draft angle (injection mold: min 0.5° walls, 1° ribs, 2° textured)
 *   - Material-specific DFM (Ti thin wall deflection ×3, hardened steel min corner)
 *
 * Pipeline: feature extract → DFM rules → accessibility → GD&T Cpk → cost impact → prioritize
 *
 * Actions (5):
 *   dfm_analyze, dfm_quick, dfm_tolerance_check, dfm_cost_impact, dfm_get_rules
 *
 * @module engines/DFMPipelineEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// Types
// ============================================================================

export interface DFMFeatureInput {
  id?: string;
  type: string; // hole, pocket, slot, thread, undercut, wall, boss, bore, contour, fillet, chamfer, rib, tall_feature, small_feature
  count: number;
  dimensions?: {
    length_mm?: number;
    width_mm?: number;
    depth_mm?: number;
    diameter_mm?: number;
    height_mm?: number;
  };
  tolerance_mm?: number;
  surface_finish_Ra?: number;
  wall_thickness_mm?: number;
  corner_radius_mm?: number;
  is_blind?: boolean;
  requires_5axis?: boolean;
  draft_angle_deg?: number;       // for injection mold features
  thread_pitch_mm?: number;       // for thread features
  thread_nominal_mm?: number;     // thread nominal diameter
  gdt_callout?: {
    symbol: string;               // flatness, position, perpendicularity, etc.
    tolerance_mm: number;
    datum_refs?: string[];
    material_condition?: "MMC" | "LMC" | "RFS";
  };
}

export interface DFMPipelineInput {
  part_name?: string;
  features: DFMFeatureInput[];
  material?: string;
  iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  hardness_hb?: number;
  machine_type?: "3axis" | "5axis_indexed" | "5axis_continuous" | "lathe" | "mill_turn";
  machine_axes?: number;
  is_injection_mold?: boolean;
  assembly_context?: {
    mating_parts?: number;
    fit_type?: "clearance" | "transition" | "interference";
    stack_tolerances?: Array<{ dimension_name: string; tolerance_mm: number }>;
  };
  available_tools?: Array<{
    diameter_mm: number;
    length_mm: number;
    corner_radius_mm?: number;
  }>;
}

export interface DFMPipelineIssue {
  id: string;
  severity: "critical" | "warning" | "info";
  category: string;
  feature_ref?: string;        // links to feature.id
  feature_type?: string;
  message: string;
  recommendation: string;
  cost_impact_usd?: number;
  savings_if_fixed_usd?: number;
  physics_basis?: string;
  source_engine: string;
}

export interface ToleranceFeasibility {
  feature_ref?: string;
  gdt_symbol?: string;
  specified_tolerance_mm: number;
  required_cpk: number;
  achievable_cpk: number;
  recommended_process: string;
  feasible: boolean;
  cost_tier: "standard" | "precision" | "ultra_precision";
  notes?: string;
}

export interface DFMPipelineResult {
  part_name?: string;
  overall_score: number;        // 0-100
  manufacturability: "excellent" | "good" | "marginal" | "difficult";
  issues: DFMPipelineIssue[];
  tolerance_feasibility: ToleranceFeasibility[];
  recommended_process: string;
  total_cost_impact_usd: number;
  total_savings_if_fixed_usd: number;
  engines_used: string[];
  summary: {
    critical_count: number;
    warning_count: number;
    info_count: number;
    features_analyzed: number;
    tolerances_checked: number;
  };
}

export interface ToleranceStackInput {
  dimensions: Array<{
    name: string;
    nominal_mm: number;
    tolerance_mm: number;
  }>;
  method: "linear" | "rss";
  assembly_gap_requirement_mm?: number;
}

export interface ToleranceStackResult {
  method: "linear" | "rss";
  total_nominal_mm: number;
  worst_case_tolerance_mm: number;  // linear
  rss_tolerance_mm: number;         // RSS = sqrt(sum(tol_i^2))
  effective_tolerance_mm: number;   // whichever method was selected
  gap_nominal_mm?: number;
  gap_min_mm?: number;
  gap_max_mm?: number;
  assembly_feasible: boolean;
  contributors: Array<{
    name: string;
    nominal_mm: number;
    tolerance_mm: number;
    pct_of_total: number;
  }>;
  recommendation?: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Process capability (Cpk) by manufacturing process.
 * Source: Machinery's Handbook 31st ed., Table 8 "Typical Process Capabilities";
 * validated against Boothroyd & Dewhurst "Product Design for Manufacture" 3rd ed.
 */
const PROCESS_CAPABILITY: Array<{
  process: string;
  typical_tolerance_mm: number;
  achievable_cpk: number;
  cost_tier: "standard" | "precision" | "ultra_precision";
}> = [
  // Sorted loosest→tightest for linear early-exit search (cheapest capable process first)
  { process: "CNC milling (standard)", typical_tolerance_mm: 0.05, achievable_cpk: 1.33, cost_tier: "standard" },
  { process: "CNC milling (precision)", typical_tolerance_mm: 0.025, achievable_cpk: 1.67, cost_tier: "precision" },
  { process: "CNC turning (standard)", typical_tolerance_mm: 0.025, achievable_cpk: 1.33, cost_tier: "standard" },
  { process: "CNC turning (precision)", typical_tolerance_mm: 0.013, achievable_cpk: 1.67, cost_tier: "precision" },
  { process: "EDM (sinker)", typical_tolerance_mm: 0.01, achievable_cpk: 1.33, cost_tier: "precision" },
  { process: "CNC grinding", typical_tolerance_mm: 0.005, achievable_cpk: 2.0, cost_tier: "precision" },
  { process: "EDM (wire)", typical_tolerance_mm: 0.005, achievable_cpk: 1.67, cost_tier: "precision" },
  { process: "Jig boring", typical_tolerance_mm: 0.003, achievable_cpk: 2.0, cost_tier: "ultra_precision" },
  { process: "Honing", typical_tolerance_mm: 0.002, achievable_cpk: 2.0, cost_tier: "ultra_precision" },
  { process: "Lapping", typical_tolerance_mm: 0.001, achievable_cpk: 2.0, cost_tier: "ultra_precision" },
];

/**
 * Material-specific DFM multipliers.
 * Ti and superalloys have dramatically higher deflection and tool wear.
 * Source: Trent & Wright "Metal Cutting" 4th ed., Chapter 11 (difficult-to-machine).
 */
const MATERIAL_DFM_FACTORS: Record<string, {
  min_wall_mm: number;
  min_corner_radius_mm: number;
  deflection_multiplier: number;
  tool_wear_multiplier: number;
  description: string;
}> = {
  P: { min_wall_mm: 1.0, min_corner_radius_mm: 0.5, deflection_multiplier: 1.0, tool_wear_multiplier: 1.0, description: "Steel — standard rules" },
  M: { min_wall_mm: 1.5, min_corner_radius_mm: 0.8, deflection_multiplier: 1.5, tool_wear_multiplier: 2.0, description: "Stainless — higher cutting forces" },
  K: { min_wall_mm: 1.0, min_corner_radius_mm: 0.5, deflection_multiplier: 0.8, tool_wear_multiplier: 1.2, description: "Cast iron — brittle fracture risk" },
  N: { min_wall_mm: 0.8, min_corner_radius_mm: 0.3, deflection_multiplier: 0.7, tool_wear_multiplier: 0.5, description: "Non-ferrous (Al) — easy to machine" },
  S: { min_wall_mm: 2.5, min_corner_radius_mm: 1.5, deflection_multiplier: 3.0, tool_wear_multiplier: 5.0, description: "Superalloy (Ti/Inconel) — extreme deflection and wear" },
  H: { min_wall_mm: 3.0, min_corner_radius_mm: 2.0, deflection_multiplier: 2.0, tool_wear_multiplier: 3.0, description: "Hardened steel (>45 HRC) — requires ceramic/CBN tooling" },
};

/**
 * Draft angle requirements for injection mold features.
 * Source: "Injection Mold Design Engineering" (Menges, Michaeli & Mohren), 2nd ed., Table 6.2.
 */
const DRAFT_ANGLE_RULES = {
  wall_min_deg: 0.5,
  rib_min_deg: 1.0,
  textured_min_deg: 2.0,
  deep_feature_additional_per_25mm_deg: 0.5,
};

/**
 * Stress concentration factor for sharp internal corners.
 * Kt ≈ 1 + 2×sqrt(a/r) for a notch of depth a and root radius r.
 * Source: Peterson's Stress Concentration Factors, 4th ed.
 */
const STRESS_CONCENTRATION_KT_LIMIT = 3.0; // above this = critical

/**
 * Thread depth ratio limits.
 * Source: Machinery's Handbook 31st ed., "Thread Milling & Tapping" chapter.
 */
const THREAD_DEPTH_LIMITS = {
  blind_max_ratio: 3.0,   // max depth / nominal diameter for blind holes
  through_max_ratio: 2.0,  // for through holes — less critical
  min_nominal_mm: 2.0,     // M2 minimum for reliable tapping
};

/** Cost impact multipliers by severity (fraction of typical unit price) */
const COST_IMPACT_MULTIPLIERS = {
  critical: 0.15,  // 15% cost adder per critical issue
  warning: 0.05,   // 5% per warning
  info: 0.01,      // 1% per info
};

/** Base unit price estimate for cost impact when no price provided */
const DEFAULT_UNIT_PRICE_USD = 50;

// ============================================================================
// Engine
// ============================================================================

class DFMPipelineEngine {
  /**
   * Full DFM analysis pipeline: rules → accessibility → GD&T → cost impact → prioritize.
   */
  async analyze(input: DFMPipelineInput): Promise<DFMPipelineResult> {
    const enginesUsed: string[] = ["DFMPipelineEngine"];
    const allIssues: DFMPipelineIssue[] = [];
    const toleranceFeasibility: ToleranceFeasibility[] = [];
    let issueCounter = 0;

    // ── Stage 1: DFMFeedbackEngine — feature-level scoring ──
    try {
      const { dfmFeedbackEngine } = await import("./DFMFeedbackEngine.js");
      const feedbackResult = dfmFeedbackEngine.analyze(
        input.features.map(f => ({
          id: f.id,
          type: f.type,
          tolerance_mm: f.tolerance_mm,
          surface_finish_Ra: f.surface_finish_Ra,
          wall_thickness_mm: f.wall_thickness_mm,
          corner_radius_mm: f.corner_radius_mm,
        })),
        input.iso_group,
        input.machine_axes ?? (input.machine_type?.includes("5axis") ? 5 : 3),
      );
      for (const issue of feedbackResult.issues) {
        allIssues.push({
          id: `DFM-FB-${++issueCounter}`,
          severity: issue.severity,
          category: issue.category,
          feature_ref: issue.feature_id,
          message: issue.message,
          recommendation: issue.recommendation,
          physics_basis: issue.physics_basis,
          source_engine: "DFMFeedbackEngine",
        });
      }
      enginesUsed.push("DFMFeedbackEngine");
    } catch (err) {
      log.warn("DFMFeedbackEngine failed", { error: String(err) });
    }

    // ── Stage 2: DfMRulesEngine — structural rules ──
    try {
      const { checkDfMRules } = await import("./DfMRulesEngine.js");
      const rulesResult = checkDfMRules({
        features: input.features.map(f => ({
          type: f.type as "wall" | "cavity" | "hole" | "thread" | "undercut" | "tall_feature" | "small_feature" | "fillet",
          thickness_mm: f.wall_thickness_mm,
          depth_mm: f.dimensions?.depth_mm,
          width_mm: f.dimensions?.width_mm,
          diameter_mm: f.dimensions?.diameter_mm,
          height_mm: f.dimensions?.height_mm,
          thread_nominal_mm: f.thread_nominal_mm,
          thread_length_mm: f.dimensions?.depth_mm,
        })),
        material_type: "metal", // DfMRulesEngine currently only supports metal rules
        machine_type: input.machine_type ?? "3axis",
        tolerance_mm: input.features.reduce((min, f) =>
          f.tolerance_mm !== undefined ? Math.min(min, f.tolerance_mm) : min, Infinity,
        ) === Infinity ? undefined : input.features.reduce((min, f) =>
          f.tolerance_mm !== undefined ? Math.min(min, f.tolerance_mm) : min, Infinity,
        ),
      });
      for (const violation of rulesResult.violations) {
        // Normalize severity: DfMRulesEngine uses "error" instead of "critical"
        const severity = violation.severity === "error" ? "critical" as const : violation.severity as "warning" | "info";
        allIssues.push({
          id: `DFM-RU-${++issueCounter}`,
          severity,
          category: violation.rule ?? "structural_rule",
          feature_type: violation.feature_type,
          message: violation.message,
          recommendation: violation.recommendation,
          source_engine: "DfMRulesEngine",
        });
      }
      enginesUsed.push("DfMRulesEngine");
    } catch (err) {
      log.warn("DfMRulesEngine failed", { error: String(err) });
    }

    // ── Stage 3: AccessibilityAnalysisEngine — tool reachability ──
    if (input.available_tools && input.available_tools.length > 0) {
      try {
        const { accessibilityAnalysisEngine } = await import("./AccessibilityAnalysisEngine.js");
        const accessResult = accessibilityAnalysisEngine.checkAllFeatures(
          input.features.map(f => ({
            id: f.id ?? `f_${Math.random().toString(36).slice(2, 8)}`,
            type: f.type,
            depth_mm: f.dimensions?.depth_mm ?? 0,
            width_mm: f.dimensions?.width_mm ?? f.dimensions?.diameter_mm ?? 10,
            corner_radius_mm: f.corner_radius_mm,
          })),
          input.available_tools.map(t => ({
            id: `tool_${t.diameter_mm}`,
            diameter_mm: t.diameter_mm,
            length_mm: t.length_mm,
            holder_diameter_mm: t.diameter_mm * 1.5,
          })),
        );
        // Extract issues from per-feature results and critical_issues
        for (const result of accessResult.results) {
          if (!result.accessible) {
            for (const issueMsg of result.issues) {
              allIssues.push({
                id: `DFM-AC-${++issueCounter}`,
                severity: "critical",
                category: "accessibility",
                feature_ref: result.feature_id,
                message: issueMsg,
                recommendation: "Check tool access and holder clearance. Consider smaller tool or 5-axis approach.",
                source_engine: "AccessibilityAnalysisEngine",
              });
            }
          }
        }
        for (const critMsg of accessResult.critical_issues) {
          allIssues.push({
            id: `DFM-AC-${++issueCounter}`,
            severity: "critical",
            category: "accessibility",
            message: critMsg,
            recommendation: "Review tool selection and approach strategy.",
            source_engine: "AccessibilityAnalysisEngine",
          });
        }
        enginesUsed.push("AccessibilityAnalysisEngine");
      } catch (err) {
        log.warn("AccessibilityAnalysisEngine failed", { error: String(err) });
      }
    }

    // ── Stage 4: CADDrawingKnowledgeEngine — GD&T checks ──
    const featuresWithGdt = input.features.filter(f => f.gdt_callout);
    if (featuresWithGdt.length > 0) {
      try {
        const { cadDrawingKnowledgeEngine } = await import("./CADDrawingKnowledgeEngine.js");
        for (const feature of featuresWithGdt) {
          const gdt = feature.gdt_callout!;
          // Check GD&T symbol selection appropriateness
          const gdtResult = cadDrawingKnowledgeEngine.calculate("cad_select_gdt", {
            feature_type: feature.type,
            intent: this.inferGdtIntent(gdt.symbol),
          });
          if (gdtResult && typeof gdtResult === "object" && "recommended" in (gdtResult as Record<string, unknown>)) {
            const rec = gdtResult as { recommended: string; reasoning: string };
            if (rec.recommended !== gdt.symbol) {
              allIssues.push({
                id: `DFM-GD-${++issueCounter}`,
                severity: "info",
                category: "gdt_selection",
                feature_ref: feature.id,
                feature_type: feature.type,
                message: `GD&T symbol "${gdt.symbol}" may not be optimal for ${feature.type}. Consider "${rec.recommended}".`,
                recommendation: rec.reasoning,
                source_engine: "CADDrawingKnowledgeEngine",
              });
            }
          }
        }
        enginesUsed.push("CADDrawingKnowledgeEngine");
      } catch (err) {
        log.warn("CADDrawingKnowledgeEngine GD&T check failed", { error: String(err) });
      }
    }

    // ── Stage 5: New pipeline rules (undercut, thread, corner, draft, material) ──
    this.checkNewRules(input, allIssues, () => ++issueCounter);

    // ── Stage 6: Tolerance feasibility via process capability (Cpk) ──
    for (const feature of input.features) {
      if (feature.tolerance_mm !== undefined) {
        const feasibility = this.checkToleranceFeasibility(feature);
        toleranceFeasibility.push(feasibility);
      }
      if (feature.gdt_callout) {
        const feasibility = this.checkToleranceFeasibility({
          ...feature,
          tolerance_mm: feature.gdt_callout.tolerance_mm,
          id: feature.id ? `${feature.id}_gdt` : undefined,
        });
        feasibility.gdt_symbol = feature.gdt_callout.symbol;
        toleranceFeasibility.push(feasibility);
      }
    }

    // ── Stage 7: Cost impact estimation ──
    this.estimateCostImpact(allIssues);

    // ── Stage 8: Deduplicate and prioritize ──
    const deduped = this.deduplicateIssues(allIssues);
    deduped.sort((a, b) => {
      const sevOrder = { critical: 0, warning: 1, info: 2 };
      if (sevOrder[a.severity] !== sevOrder[b.severity]) {
        return sevOrder[a.severity] - sevOrder[b.severity];
      }
      return (b.cost_impact_usd ?? 0) - (a.cost_impact_usd ?? 0);
    });

    // ── Scoring ──
    const criticalCount = deduped.filter(i => i.severity === "critical").length;
    const warningCount = deduped.filter(i => i.severity === "warning").length;
    const infoCount = deduped.filter(i => i.severity === "info").length;

    // Score: 100 - criticals×20 - warnings×5 - infos×1 (floor 0)
    // Source: DFMFeedbackEngine scoring formula, kept consistent
    const score = Math.max(0, 100 - criticalCount * 20 - warningCount * 5 - infoCount * 1);
    const manufacturability = score >= 80 ? "excellent"
      : score >= 60 ? "good"
      : score >= 40 ? "marginal"
      : "difficult";

    const totalCostImpact = deduped.reduce((sum, i) => sum + (i.cost_impact_usd ?? 0), 0);
    const totalSavings = deduped.reduce((sum, i) => sum + (i.savings_if_fixed_usd ?? 0), 0);

    // Recommend process based on tightest tolerance
    const recommendedProcess = this.recommendProcess(input);

    log.info(`DFM pipeline analyzed ${input.features.length} features: score=${score}, ${criticalCount}C/${warningCount}W/${infoCount}I`);

    return {
      part_name: input.part_name,
      overall_score: score,
      manufacturability,
      issues: deduped,
      tolerance_feasibility: toleranceFeasibility,
      recommended_process: recommendedProcess,
      total_cost_impact_usd: Math.round(totalCostImpact * 100) / 100,
      total_savings_if_fixed_usd: Math.round(totalSavings * 100) / 100,
      engines_used: enginesUsed,
      summary: {
        critical_count: criticalCount,
        warning_count: warningCount,
        info_count: infoCount,
        features_analyzed: input.features.length,
        tolerances_checked: toleranceFeasibility.length,
      },
    };
  }

  /**
   * Quick DFM check — skips accessibility and GD&T, returns only feature-level rules.
   * Faster for pre-order screening.
   */
  async quickCheck(input: DFMPipelineInput): Promise<DFMPipelineResult> {
    const quickInput = { ...input, available_tools: undefined, assembly_context: undefined };
    // Strip GD&T callouts for speed
    quickInput.features = input.features.map(f => ({ ...f, gdt_callout: undefined }));
    return this.analyze(quickInput);
  }

  /**
   * Tolerance stack-up analysis: linear (worst-case) and RSS (statistical).
   *
   * Linear: T_total = Σ|t_i| — guaranteed to work in worst case
   * RSS: T_total = √(Σ t_i²) — statistical, assumes normal distributions
   *
   * Source: Dimensioning and Tolerancing Handbook (Drake), McGraw-Hill;
   * ASME Y14.5-2018 appendix on statistical tolerancing.
   */
  toleranceStack(input: ToleranceStackInput): ToleranceStackResult {
    if (input.dimensions.length === 0) {
      throw new Error("At least one dimension required for tolerance stack");
    }

    const totalNominal = input.dimensions.reduce((sum, d) => sum + d.nominal_mm, 0);
    const worstCase = input.dimensions.reduce((sum, d) => sum + Math.abs(d.tolerance_mm), 0);
    const rss = Math.sqrt(input.dimensions.reduce((sum, d) => sum + d.tolerance_mm ** 2, 0));

    const effectiveTol = input.method === "linear" ? worstCase : rss;

    const contributors = input.dimensions.map(d => ({
      name: d.name,
      nominal_mm: d.nominal_mm,
      tolerance_mm: d.tolerance_mm,
      pct_of_total: worstCase > 0
        ? Math.round((Math.abs(d.tolerance_mm) / worstCase) * 1000) / 10
        : 0,
    }));

    let assemblyFeasible = true;
    let gapNominal: number | undefined;
    let gapMin: number | undefined;
    let gapMax: number | undefined;
    let recommendation: string | undefined;

    if (input.assembly_gap_requirement_mm !== undefined) {
      gapNominal = input.assembly_gap_requirement_mm;
      gapMin = gapNominal - effectiveTol;
      gapMax = gapNominal + effectiveTol;
      assemblyFeasible = gapMin >= 0;
      if (!assemblyFeasible) {
        recommendation = input.method === "linear"
          ? `Worst-case stack (±${worstCase.toFixed(3)}mm) exceeds gap. Try RSS method (±${rss.toFixed(3)}mm) or tighten largest contributor: ${contributors.sort((a, b) => b.pct_of_total - a.pct_of_total)[0]?.name}.`
          : `RSS stack (±${rss.toFixed(3)}mm) exceeds gap. Tighten largest contributor: ${contributors.sort((a, b) => b.pct_of_total - a.pct_of_total)[0]?.name} or increase gap requirement.`;
      }
    }

    return {
      method: input.method,
      total_nominal_mm: Math.round(totalNominal * 1000) / 1000,
      worst_case_tolerance_mm: Math.round(worstCase * 1000) / 1000,
      rss_tolerance_mm: Math.round(rss * 1000) / 1000,
      effective_tolerance_mm: Math.round(effectiveTol * 1000) / 1000,
      gap_nominal_mm: gapNominal,
      gap_min_mm: gapMin !== undefined ? Math.round(gapMin * 1000) / 1000 : undefined,
      gap_max_mm: gapMax !== undefined ? Math.round(gapMax * 1000) / 1000 : undefined,
      assembly_feasible: assemblyFeasible,
      contributors,
      recommendation,
    };
  }

  /**
   * Check process capability for a given tolerance.
   * Maps tolerance → required Cpk → suitable process.
   *
   * Cpk = (USL - LSL) / (6σ). For bilateral tolerance:
   * Cpk = tolerance / (3σ). Minimum acceptable Cpk = 1.33 (industry standard).
   *
   * Source: Machinery's Handbook 31st ed., "Statistical Quality Control" chapter.
   */
  checkProcessCapability(tolerance_mm: number): ToleranceFeasibility {
    return this.checkToleranceFeasibility({ tolerance_mm } as DFMFeatureInput);
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  /**
   * New DFM rules not covered by existing engines.
   */
  private checkNewRules(
    input: DFMPipelineInput,
    issues: DFMPipelineIssue[],
    nextId: () => number,
  ): void {
    const isoGroup = input.iso_group ?? "P";
    const materialFactors = MATERIAL_DFM_FACTORS[isoGroup] ?? MATERIAL_DFM_FACTORS.P;

    for (const feature of input.features) {
      const featureRef = feature.id;

      // ── Undercut detection ──
      if (feature.type === "undercut") {
        const width = feature.dimensions?.width_mm ?? 0;
        const depth = feature.dimensions?.depth_mm ?? 0;
        if (width > 0 && depth > 0) {
          const depthRatio = depth / width;
          if (depthRatio > 2.0) {
            issues.push({
              id: `DFM-NR-${nextId()}`,
              severity: "critical",
              category: "undercut_depth",
              feature_ref: featureRef,
              feature_type: "undercut",
              message: `Undercut depth/width ratio ${depthRatio.toFixed(1)}:1 exceeds 2:1 limit. Tool cannot reach.`,
              recommendation: "Reduce undercut depth or widen opening. Consider split-line design or EDM.",
              physics_basis: "Tool holder interference: shank diameter limits depth at given width. Max practical depth ≈ 2× opening width.",
              source_engine: "DFMPipelineEngine",
            });
          } else if (depthRatio > 1.5) {
            issues.push({
              id: `DFM-NR-${nextId()}`,
              severity: "warning",
              category: "undercut_depth",
              feature_ref: featureRef,
              feature_type: "undercut",
              message: `Undercut depth/width ratio ${depthRatio.toFixed(1)}:1 approaching 2:1 limit.`,
              recommendation: "Verify tool access with specific holder geometry.",
              source_engine: "DFMPipelineEngine",
            });
          }
        }
      }

      // ── Thread depth ratio ──
      if (feature.type === "thread" && feature.thread_nominal_mm) {
        const depth = feature.dimensions?.depth_mm ?? 0;
        const nominal = feature.thread_nominal_mm;
        if (nominal < THREAD_DEPTH_LIMITS.min_nominal_mm) {
          issues.push({
            id: `DFM-NR-${nextId()}`,
            severity: "warning",
            category: "thread_size",
            feature_ref: featureRef,
            feature_type: "thread",
            message: `Thread M${nominal} is below recommended minimum M${THREAD_DEPTH_LIMITS.min_nominal_mm}. Tap breakage risk.`,
            recommendation: `Use M${THREAD_DEPTH_LIMITS.min_nominal_mm} or larger. For smaller: consider thread milling.`,
            physics_basis: `Source: Machinery's Handbook 31st ed. — taps below M2 have <60% cross-section strength.`,
            source_engine: "DFMPipelineEngine",
          });
        }
        if (depth > 0 && nominal > 0) {
          const maxRatio = feature.is_blind ? THREAD_DEPTH_LIMITS.blind_max_ratio : THREAD_DEPTH_LIMITS.through_max_ratio;
          const ratio = depth / nominal;
          if (ratio > maxRatio) {
            issues.push({
              id: `DFM-NR-${nextId()}`,
              severity: "critical",
              category: "thread_depth",
              feature_ref: featureRef,
              feature_type: "thread",
              message: `Thread depth/nominal ratio ${ratio.toFixed(1)}:1 exceeds ${maxRatio}:1 limit for ${feature.is_blind ? "blind" : "through"} holes.`,
              recommendation: `Reduce thread depth to ≤${(nominal * maxRatio).toFixed(1)}mm or use thread insert (Helicoil).`,
              physics_basis: `Source: Machinery's Handbook — engagement beyond ${maxRatio}×D adds <5% pull-out strength but dramatically increases tap breakage risk.`,
              source_engine: "DFMPipelineEngine",
            });
          }
        }
      }

      // ── Internal sharp corners (stress concentration) ──
      if (feature.corner_radius_mm !== undefined && feature.corner_radius_mm > 0) {
        const radius = feature.corner_radius_mm;
        // Peterson's Fig 2.2: Kt ≈ 1 + 2√(a/r), where a = notch depth.
        // For pocket/slot corners, notch depth ≈ wall thickness (not full pocket depth).
        // Fallback: use 1/3 of pocket depth when wall thickness is unavailable.
        const fullDepth = feature.dimensions?.depth_mm ?? 5;
        const notchDepth = feature.wall_thickness_mm
          ? Math.min(feature.wall_thickness_mm, fullDepth)
          : Math.min(fullDepth / 3, fullDepth);
        const kt = 1 + 2 * Math.sqrt(notchDepth / radius);
        if (kt > STRESS_CONCENTRATION_KT_LIMIT && feature.type !== "chamfer" && feature.type !== "fillet") {
          // r_min from Kt inversion: r = a / ((Kt-1)/2)²
          const rMin = Math.ceil(notchDepth / Math.pow((STRESS_CONCENTRATION_KT_LIMIT - 1) / 2, 2) * 10) / 10;
          issues.push({
            id: `DFM-NR-${nextId()}`,
            severity: kt > 5 ? "critical" : "warning",
            category: "stress_concentration",
            feature_ref: featureRef,
            feature_type: feature.type,
            message: `Internal corner Kt = ${kt.toFixed(1)} (r=${radius}mm, notch depth≈${notchDepth.toFixed(1)}mm). Stress concentration exceeds ${STRESS_CONCENTRATION_KT_LIMIT}.`,
            recommendation: `Increase corner radius to ≥${rMin}mm or add relief cut.`,
            physics_basis: `Peterson's Stress Concentration Factors 4th ed., Fig 2.2: Kt = 1 + 2√(a/r). Notch depth a ≈ wall thickness or depth/3.`,
            source_engine: "DFMPipelineEngine",
          });
        }
      }

      // ── Draft angle (injection mold) ──
      if (input.is_injection_mold && feature.draft_angle_deg !== undefined) {
        const angle = feature.draft_angle_deg;
        const depth = feature.dimensions?.depth_mm ?? 0;
        let requiredAngle = DRAFT_ANGLE_RULES.wall_min_deg;
        if (feature.type === "rib") requiredAngle = DRAFT_ANGLE_RULES.rib_min_deg;
        // Additional draft for deep features: +0.5° per 25mm beyond the first 25mm
        // Source: Menges Table 6.2 — depth-based increment starts after first band
        if (depth > 25) {
          requiredAngle += Math.ceil((depth - 25) / 25) * DRAFT_ANGLE_RULES.deep_feature_additional_per_25mm_deg;
        }
        if (angle < requiredAngle) {
          issues.push({
            id: `DFM-NR-${nextId()}`,
            severity: angle < requiredAngle * 0.5 ? "critical" : "warning",
            category: "draft_angle",
            feature_ref: featureRef,
            feature_type: feature.type,
            message: `Draft angle ${angle}° is below required ${requiredAngle}° for ${feature.type} (depth=${depth}mm).`,
            recommendation: `Increase draft to ≥${requiredAngle}°. Deep features (${depth}mm) need additional draft.`,
            physics_basis: `Source: Menges "Injection Mold Design" 2nd ed. — insufficient draft causes ejection marks and mold sticking.`,
            source_engine: "DFMPipelineEngine",
          });
        }
      }

      // ── Material-specific wall thickness ──
      if (feature.wall_thickness_mm !== undefined && feature.wall_thickness_mm > 0) {
        const minWall = materialFactors.min_wall_mm;
        if (feature.wall_thickness_mm < minWall) {
          issues.push({
            id: `DFM-NR-${nextId()}`,
            severity: feature.wall_thickness_mm < minWall * 0.5 ? "critical" : "warning",
            category: "material_wall_thickness",
            feature_ref: featureRef,
            feature_type: feature.type,
            message: `Wall ${feature.wall_thickness_mm}mm is below ${minWall}mm minimum for ISO ${isoGroup} (${materialFactors.description}). Deflection multiplier: ${materialFactors.deflection_multiplier}×.`,
            recommendation: `Increase wall to ≥${minWall}mm or change material. ${isoGroup === "S" ? "Titanium/superalloy thin walls deflect 3× more than steel." : ""}`,
            physics_basis: `δ = FL³/3EI scaled by material deflection factor ${materialFactors.deflection_multiplier}×. Source: Trent & Wright "Metal Cutting" 4th ed.`,
            source_engine: "DFMPipelineEngine",
          });
        }
      }

      // ── Material-specific corner radius ──
      if (feature.corner_radius_mm !== undefined && feature.corner_radius_mm > 0) {
        const minCorner = materialFactors.min_corner_radius_mm;
        if (feature.corner_radius_mm < minCorner && feature.type !== "chamfer" && feature.type !== "fillet") {
          issues.push({
            id: `DFM-NR-${nextId()}`,
            severity: "warning",
            category: "material_corner_radius",
            feature_ref: featureRef,
            feature_type: feature.type,
            message: `Corner radius ${feature.corner_radius_mm}mm is below ${minCorner}mm minimum for ISO ${isoGroup}. Tool wear accelerates in tight corners.`,
            recommendation: `Increase corner radius to ≥${minCorner}mm. ${isoGroup === "H" ? "Hardened steel requires larger radii for CBN/ceramic tools." : ""}`,
            physics_basis: `Tool wear multiplier for ISO ${isoGroup}: ${materialFactors.tool_wear_multiplier}×. Small radii require small tools with lower rigidity.`,
            source_engine: "DFMPipelineEngine",
          });
        }
      }
    }
  }

  /**
   * Check tolerance against process capability table.
   */
  private checkToleranceFeasibility(feature: DFMFeatureInput): ToleranceFeasibility {
    const tol = feature.tolerance_mm ?? 0.1;
    // Required Cpk: for bilateral tolerance, Cpk = tol / (3σ)
    // Industry minimum Cpk = 1.33 → σ_max = tol / (3 × 1.33) = tol / 3.99
    const requiredCpk = 1.33;

    // Find cheapest process that achieves this tolerance
    let bestProcess = PROCESS_CAPABILITY[PROCESS_CAPABILITY.length - 1]; // fallback: lapping
    for (const proc of PROCESS_CAPABILITY) {
      if (proc.typical_tolerance_mm <= tol) {
        bestProcess = proc;
        break;
      }
    }

    const feasible = bestProcess.typical_tolerance_mm <= tol;

    return {
      feature_ref: feature.id,
      specified_tolerance_mm: tol,
      required_cpk: requiredCpk,
      achievable_cpk: feasible ? bestProcess.achievable_cpk : 0.5,
      recommended_process: bestProcess.process,
      feasible,
      cost_tier: bestProcess.cost_tier,
      notes: !feasible
        ? `Tolerance ±${tol}mm exceeds capability of all catalogued processes. Consider redesign.`
        : undefined,
    };
  }

  /**
   * Estimate cost impact of each issue.
   */
  private estimateCostImpact(issues: DFMPipelineIssue[]): void {
    for (const issue of issues) {
      const multiplier = COST_IMPACT_MULTIPLIERS[issue.severity];
      issue.cost_impact_usd = Math.round(DEFAULT_UNIT_PRICE_USD * multiplier * 100) / 100;
      issue.savings_if_fixed_usd = issue.cost_impact_usd;
    }
  }

  /**
   * Deduplicate issues that multiple engines may flag.
   * Uses message similarity as dedup key.
   */
  private deduplicateIssues(issues: DFMPipelineIssue[]): DFMPipelineIssue[] {
    const seen = new Map<string, DFMPipelineIssue>();
    for (const issue of issues) {
      // Key: category + feature_ref (or message prefix if no ref)
      const key = `${issue.category}:${issue.feature_ref ?? issue.message.slice(0, 40)}`;
      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, issue);
      } else {
        // Keep the more severe one
        const sevOrder = { critical: 0, warning: 1, info: 2 };
        if (sevOrder[issue.severity] < sevOrder[existing.severity]) {
          seen.set(key, issue);
        }
      }
    }
    return Array.from(seen.values());
  }

  /**
   * Recommend manufacturing process based on features and tolerances.
   */
  private recommendProcess(input: DFMPipelineInput): string {
    const tightestTol = input.features.reduce((min, f) =>
      f.tolerance_mm !== undefined ? Math.min(min, f.tolerance_mm) : min, Infinity,
    );
    const has5Axis = input.features.some(f => f.requires_5axis);
    const hasThreads = input.features.some(f => f.type === "thread");
    const isLathe = input.machine_type === "lathe";

    if (tightestTol < 0.003) return "Jig boring + CNC grinding";
    if (tightestTol < 0.005) return "CNC grinding";
    if (has5Axis) return "5-axis CNC milling";
    if (isLathe) return hasThreads ? "CNC turning with live tooling" : "CNC turning";
    if (tightestTol < 0.025) return "CNC milling (precision)";
    return "CNC milling (standard)";
  }

  /**
   * Infer GD&T intent from symbol name.
   */
  private inferGdtIntent(symbol: string): string {
    const formSymbols = ["flatness", "cylindricity", "circularity", "straightness"];
    const orientSymbols = ["perpendicularity", "parallelism", "angularity"];
    const runoutSymbols = ["circular_runout", "total_runout"];
    const profileSymbols = ["profile_line", "profile_surface"];

    if (formSymbols.includes(symbol)) return "form";
    if (orientSymbols.includes(symbol)) return "orientation";
    if (runoutSymbols.includes(symbol)) return "runout";
    if (profileSymbols.includes(symbol)) return "profile";
    if (symbol === "position") return "location";
    return "form";
  }
}

export const dfmPipelineEngine = new DFMPipelineEngine();
