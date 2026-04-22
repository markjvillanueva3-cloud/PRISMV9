/**
 * LathePrintFeatureStrategySelectorEngine — U-LTH36 (LATHE-MASTER P4)
 *
 * Maps turning features → optimal machining strategies with chain-of-thought reasoning.
 * Consumes: feature list + tolerance targets + material + machine
 * Produces: ranked strategy plan with reasoning, tool recs, cycle estimates
 *
 * Delegates to TurningStrategyCatalog (40+ canonical turning strategies)
 * and applies JM Die tribal knowledge for selection refinement.
 *
 * @milestone LATHE-MASTER U-LTH36
 * @version 1.0.0
 */

import { z } from "zod";
import { TURNING_STRATEGY_CATALOG, selectTurningStrategy, type TurningStrategyEntry } from "./TurningStrategyCatalog.js";
import type { FeatureCpkTarget, ToleranceStackOutput } from "./LathePrintToleranceStackEngine.js";

// ============================================================================
// SCHEMAS & TYPES
// ============================================================================

/** ISO material group per Sandvik */
export type MaterialGroup = "P" | "M" | "K" | "N" | "S" | "H";

/** Machine capability profile */
export const MachineCapabilitySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["cnc_lathe", "swiss", "vtl", "mill_turn", "manual"]),
  max_rpm: z.number().min(100).max(50000),
  max_bar_diameter_mm: z.number().min(1).max(500),
  has_sub_spindle: z.boolean().optional(),
  has_live_tooling: z.boolean().optional(),
  has_y_axis: z.boolean().optional(),
  turret_capacity: z.number().optional(),
  coolant_type: z.enum(["flood", "high_pressure", "mql", "cryo", "none"]).optional(),
  spindle_power_kw: z.number().optional(),
  rigidity_class: z.enum(["light", "medium", "heavy"]).optional(),
});
export type MachineCapability = z.infer<typeof MachineCapabilitySchema>;

/** Material input */
export const MaterialInputSchema = z.object({
  name: z.string(),
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
  hardness_hrc: z.number().optional(),
  tensile_strength_mpa: z.number().optional(),
  machinability_factor: z.number().min(0.1).max(2.0).optional(),
});
export type MaterialInput = z.infer<typeof MaterialInputSchema>;

/** Feature input for strategy selection */
export const FeatureInputSchema = z.object({
  id: z.string(),
  type: z.enum([
    "od_turn", "id_bore", "face", "groove_od", "groove_id", "groove_face",
    "thread_external", "thread_internal", "chamfer_od", "chamfer_id",
    "radius_od", "radius_id", "taper_od", "taper_id", "knurl",
    "undercut", "center_drill", "drill", "tap", "ream"
  ]),
  diameter_mm: z.number().optional(),
  depth_mm: z.number().optional(),
  length_mm: z.number().optional(),
  tolerance_total_mm: z.number().optional(),
  ra_um_target: z.number().optional(),
  cpk_target: z.number().optional(),
  is_critical: z.boolean().optional(),
});
export type FeatureInput = z.infer<typeof FeatureInputSchema>;

/** Reasoning step */
export const ReasoningStepSchema = z.object({
  step: z.number(),
  thought: z.string(),
  conclusion: z.string(),
  confidence: z.number().min(0).max(1),
});
export type ReasoningStep = z.infer<typeof ReasoningStepSchema>;

/** Strategy recommendation */
export const StrategyRecommendationSchema = z.object({
  featureId: z.string(),
  featureType: z.string(),
  strategy_id: z.string(),
  strategy_name: z.string(),
  score: z.number().min(0).max(100),
  reasoning_chain: z.array(ReasoningStepSchema),
  parameters: z.record(z.union([z.number(), z.string(), z.boolean()])),
  trade_offs: z.object({
    pros: z.array(z.string()),
    cons: z.array(z.string()),
  }),
  alternatives: z.array(z.object({
    strategy_id: z.string(),
    strategy_name: z.string(),
    score: z.number(),
    reason_for_rejection: z.string(),
  })),
  tool_recommendation: z.object({
    insert_type: z.string().optional(),
    geometry: z.string().optional(),
    grade: z.string().optional(),
    nose_radius_mm: z.number().optional(),
    approach_angle_deg: z.number().optional(),
  }).optional(),
  estimated_cycle_time_sec: z.number().optional(),
  citations: z.array(z.string()),
});
export type StrategyRecommendation = z.infer<typeof StrategyRecommendationSchema>;

/** Complete strategy plan */
export const StrategyPlanSchema = z.object({
  plan_id: z.string(),
  material: MaterialInputSchema,
  machine: MachineCapabilitySchema.optional(),
  feature_count: z.number(),
  recommendations: z.array(StrategyRecommendationSchema),
  sequence: z.array(z.object({
    order: z.number(),
    featureId: z.string(),
    strategy_id: z.string(),
    reason: z.string(),
  })),
  total_cycle_time_sec: z.number().optional(),
  warnings: z.array(z.object({
    code: z.string(),
    level: z.enum(["info", "warning", "critical"]),
    message: z.string(),
    featureIds: z.array(z.string()),
  })),
  timestamp: z.string(),
});
export type StrategyPlan = z.infer<typeof StrategyPlanSchema>;

// ============================================================================
// KNOWLEDGE BASES
// ============================================================================

/** Feature-to-strategy mapping rules */
const FEATURE_STRATEGY_RULES: Record<string, {
  preferred_strategies: string[];
  fallback_strategies: string[];
  material_adjustments: Partial<Record<MaterialGroup, string[]>>;
  tolerance_rules: { tight_um: number; precision_strategies: string[] };
  surface_rules: { fine_ra_um: number; finishing_strategies: string[] };
}> = {
  od_turn: {
    preferred_strategies: ["turning_rough_longitudinal", "turning_finish_profile"],
    fallback_strategies: ["turning_rough_pattern", "turning_contour_cnc"],
    material_adjustments: {
      H: ["turning_hard", "turning_cryo"],
      S: ["turning_cryo", "turning_diamond"],
    },
    tolerance_rules: { tight_um: 25, precision_strategies: ["turning_finish_spring_pass", "turning_finish_wiper"] },
    surface_rules: { fine_ra_um: 1.6, finishing_strategies: ["turning_finish_wiper", "turning_finish_super"] },
  },
  id_bore: {
    preferred_strategies: ["turning_bore_rough", "turning_bore_finish"],
    fallback_strategies: ["turning_bore_profile"],
    material_adjustments: {
      H: ["turning_hard"],
    },
    tolerance_rules: { tight_um: 20, precision_strategies: ["turning_bore_finish"] },
    surface_rules: { fine_ra_um: 1.6, finishing_strategies: ["turning_bore_finish"] },
  },
  face: {
    preferred_strategies: ["turning_rough_face", "turning_finish_profile"],
    fallback_strategies: ["turning_contour_cnc"],
    material_adjustments: {},
    tolerance_rules: { tight_um: 30, precision_strategies: ["turning_finish_profile"] },
    surface_rules: { fine_ra_um: 3.2, finishing_strategies: ["turning_finish_profile"] },
  },
  groove_od: {
    preferred_strategies: ["turning_groove_radial", "turning_groove_multi_pass"],
    fallback_strategies: ["turning_groove_profile"],
    material_adjustments: {
      S: ["turning_cryo"],
    },
    tolerance_rules: { tight_um: 25, precision_strategies: ["turning_groove_radial"] },
    surface_rules: { fine_ra_um: 3.2, finishing_strategies: ["turning_groove_radial"] },
  },
  groove_id: {
    preferred_strategies: ["turning_groove_id"],
    fallback_strategies: ["turning_groove_profile"],
    material_adjustments: {},
    tolerance_rules: { tight_um: 25, precision_strategies: ["turning_groove_id"] },
    surface_rules: { fine_ra_um: 3.2, finishing_strategies: ["turning_groove_id"] },
  },
  groove_face: {
    preferred_strategies: ["turning_groove_face"],
    fallback_strategies: ["turning_groove_profile"],
    material_adjustments: {},
    tolerance_rules: { tight_um: 30, precision_strategies: ["turning_groove_face"] },
    surface_rules: { fine_ra_um: 3.2, finishing_strategies: ["turning_groove_face"] },
  },
  thread_external: {
    preferred_strategies: ["turning_thread_single_point", "turning_thread_modified_flank"],
    fallback_strategies: ["turning_thread_radial_infeed", "turning_thread_alternating"],
    material_adjustments: {
      S: ["turning_thread_modified_flank"],
      H: ["turning_thread_modified_flank"],
    },
    tolerance_rules: { tight_um: 50, precision_strategies: ["turning_thread_modified_flank", "turning_thread_chase"] },
    surface_rules: { fine_ra_um: 3.2, finishing_strategies: ["turning_thread_chase"] },
  },
  thread_internal: {
    preferred_strategies: ["turning_thread_single_point", "turning_thread_radial_infeed"],
    fallback_strategies: ["turning_thread_modified_flank"],
    material_adjustments: {},
    tolerance_rules: { tight_um: 50, precision_strategies: ["turning_thread_modified_flank"] },
    surface_rules: { fine_ra_um: 3.2, finishing_strategies: ["turning_thread_chase"] },
  },
  chamfer_od: {
    preferred_strategies: ["turning_contour_cnc"],
    fallback_strategies: ["turning_finish_profile"],
    material_adjustments: {},
    tolerance_rules: { tight_um: 100, precision_strategies: ["turning_finish_profile"] },
    surface_rules: { fine_ra_um: 6.3, finishing_strategies: ["turning_finish_profile"] },
  },
  chamfer_id: {
    preferred_strategies: ["turning_bore_profile"],
    fallback_strategies: ["turning_bore_finish"],
    material_adjustments: {},
    tolerance_rules: { tight_um: 100, precision_strategies: ["turning_bore_finish"] },
    surface_rules: { fine_ra_um: 6.3, finishing_strategies: ["turning_bore_finish"] },
  },
  radius_od: {
    preferred_strategies: ["turning_contour_cnc", "turning_finish_profile"],
    fallback_strategies: ["turning_form"],
    material_adjustments: {},
    tolerance_rules: { tight_um: 50, precision_strategies: ["turning_finish_spring_pass"] },
    surface_rules: { fine_ra_um: 1.6, finishing_strategies: ["turning_finish_wiper"] },
  },
  radius_id: {
    preferred_strategies: ["turning_bore_profile"],
    fallback_strategies: ["turning_form"],
    material_adjustments: {},
    tolerance_rules: { tight_um: 50, precision_strategies: ["turning_bore_finish"] },
    surface_rules: { fine_ra_um: 1.6, finishing_strategies: ["turning_bore_finish"] },
  },
  taper_od: {
    preferred_strategies: ["turning_finish_taper", "turning_contour_cnc"],
    fallback_strategies: ["turning_rough_pattern"],
    material_adjustments: {},
    tolerance_rules: { tight_um: 25, precision_strategies: ["turning_finish_spring_pass"] },
    surface_rules: { fine_ra_um: 1.6, finishing_strategies: ["turning_finish_wiper"] },
  },
  taper_id: {
    preferred_strategies: ["turning_bore_profile"],
    fallback_strategies: ["turning_bore_finish"],
    material_adjustments: {},
    tolerance_rules: { tight_um: 25, precision_strategies: ["turning_bore_finish"] },
    surface_rules: { fine_ra_um: 1.6, finishing_strategies: ["turning_bore_finish"] },
  },
  knurl: {
    preferred_strategies: ["turning_knurling"],
    fallback_strategies: [],
    material_adjustments: {},
    tolerance_rules: { tight_um: 500, precision_strategies: ["turning_knurling"] },
    surface_rules: { fine_ra_um: 25, finishing_strategies: ["turning_knurling"] },
  },
  undercut: {
    preferred_strategies: ["turning_groove_radial", "turning_groove_profile"],
    fallback_strategies: ["turning_form"],
    material_adjustments: {},
    tolerance_rules: { tight_um: 50, precision_strategies: ["turning_groove_radial"] },
    surface_rules: { fine_ra_um: 3.2, finishing_strategies: ["turning_groove_radial"] },
  },
  center_drill: {
    preferred_strategies: ["turning_drill_center"],
    fallback_strategies: [],
    material_adjustments: {},
    tolerance_rules: { tight_um: 200, precision_strategies: ["turning_drill_center"] },
    surface_rules: { fine_ra_um: 12.5, finishing_strategies: ["turning_drill_center"] },
  },
  drill: {
    preferred_strategies: ["turning_drill_axial", "turning_drill_peck"],
    fallback_strategies: ["turning_drill_gun"],
    material_adjustments: {
      S: ["turning_drill_peck"],
    },
    tolerance_rules: { tight_um: 100, precision_strategies: ["turning_drill_peck"] },
    surface_rules: { fine_ra_um: 6.3, finishing_strategies: ["turning_drill_axial"] },
  },
  tap: {
    preferred_strategies: ["turning_thread_single_point"],
    fallback_strategies: [],
    material_adjustments: {},
    tolerance_rules: { tight_um: 100, precision_strategies: ["turning_thread_single_point"] },
    surface_rules: { fine_ra_um: 6.3, finishing_strategies: ["turning_thread_single_point"] },
  },
  ream: {
    preferred_strategies: ["turning_bore_finish"],
    fallback_strategies: [],
    material_adjustments: {},
    tolerance_rules: { tight_um: 15, precision_strategies: ["turning_bore_finish"] },
    surface_rules: { fine_ra_um: 1.6, finishing_strategies: ["turning_bore_finish"] },
  },
};

/** Tool recommendation knowledge */
const TOOL_KNOWLEDGE: Record<string, {
  insert_shape: string;
  typical_grade: Record<MaterialGroup, string>;
  nose_radius_mm: number;
  approach_angle_deg: number;
}> = {
  turning_rough_longitudinal: { insert_shape: "CNMG", typical_grade: { P: "GC4325", M: "GC2220", K: "GC3215", N: "H13A", S: "GC1115", H: "CB7025" }, nose_radius_mm: 0.8, approach_angle_deg: 95 },
  turning_finish_profile: { insert_shape: "VNMG", typical_grade: { P: "GC4325", M: "GC2220", K: "GC3215", N: "H13A", S: "GC1115", H: "CB7025" }, nose_radius_mm: 0.4, approach_angle_deg: 93 },
  turning_finish_wiper: { insert_shape: "WNMG-WM", typical_grade: { P: "GC4325", M: "GC2220", K: "GC3215", N: "H13A", S: "GC1115", H: "CB7025" }, nose_radius_mm: 0.4, approach_angle_deg: 95 },
  turning_groove_radial: { insert_shape: "N123", typical_grade: { P: "GC4225", M: "GC2135", K: "GC3115", N: "H13A", S: "GC1125", H: "CB7015" }, nose_radius_mm: 0.2, approach_angle_deg: 90 },
  turning_thread_single_point: { insert_shape: "16ER", typical_grade: { P: "GC1125", M: "GC1125", K: "GC1125", N: "H13A", S: "GC1125", H: "GC1125" }, nose_radius_mm: 0.0, approach_angle_deg: 60 },
  turning_bore_rough: { insert_shape: "CCMT", typical_grade: { P: "GC4325", M: "GC2220", K: "GC3215", N: "H13A", S: "GC1115", H: "CB7025" }, nose_radius_mm: 0.4, approach_angle_deg: 95 },
  turning_bore_finish: { insert_shape: "VCMT", typical_grade: { P: "GC4325", M: "GC2220", K: "GC3215", N: "H13A", S: "GC1115", H: "CB7025" }, nose_radius_mm: 0.2, approach_angle_deg: 93 },
};

/** Sequence priority by feature type (lower = earlier) */
const SEQUENCE_PRIORITY: Record<string, number> = {
  center_drill: 10,
  drill: 20,
  face: 30,
  od_turn: 40,
  taper_od: 45,
  id_bore: 50,
  taper_id: 55,
  groove_face: 60,
  groove_od: 70,
  groove_id: 75,
  undercut: 80,
  radius_od: 85,
  radius_id: 86,
  chamfer_od: 90,
  chamfer_id: 91,
  thread_external: 100,
  thread_internal: 105,
  ream: 110,
  tap: 115,
  knurl: 120,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LathePrintFeatureStrategySelectorEngine {
  /**
   * Select optimal strategy for a single feature
   */
  selectStrategy(
    feature: FeatureInput,
    material: MaterialInput,
    machine?: MachineCapability
  ): StrategyRecommendation {
    const validated = FeatureInputSchema.parse(feature);
    const matValidated = MaterialInputSchema.parse(material);
    const machineValidated = machine ? MachineCapabilitySchema.parse(machine) : undefined;

    const rules = FEATURE_STRATEGY_RULES[validated.type];
    if (!rules) {
      throw new Error(`Unknown feature type: ${validated.type}`);
    }

    const reasoning: ReasoningStep[] = [];
    let stepNum = 1;

    // Step 1: Identify base strategies
    const baseStrategies = [...rules.preferred_strategies];
    reasoning.push({
      step: stepNum++,
      thought: `Feature type "${validated.type}" has preferred strategies: ${baseStrategies.join(", ")}`,
      conclusion: `Starting with ${baseStrategies.length} candidate strategies`,
      confidence: 0.9,
    });

    // Step 2: Material adjustments
    const materialAdj = rules.material_adjustments[matValidated.iso_group as MaterialGroup];
    if (materialAdj && materialAdj.length > 0) {
      materialAdj.forEach(s => {
        if (!baseStrategies.includes(s)) baseStrategies.unshift(s);
      });
      reasoning.push({
        step: stepNum++,
        thought: `Material group "${matValidated.iso_group}" suggests: ${materialAdj.join(", ")}`,
        conclusion: `Added material-specific strategies, now ${baseStrategies.length} candidates`,
        confidence: 0.85,
      });
    }

    // Step 3: Tolerance check
    const tolUm = (validated.tolerance_total_mm ?? 0.1) * 1000;
    if (tolUm < rules.tolerance_rules.tight_um) {
      const precisionStrats = rules.tolerance_rules.precision_strategies;
      precisionStrats.forEach(s => {
        if (!baseStrategies.includes(s)) baseStrategies.unshift(s);
      });
      reasoning.push({
        step: stepNum++,
        thought: `Tolerance ${tolUm.toFixed(1)}µm < ${rules.tolerance_rules.tight_um}µm threshold`,
        conclusion: `Added precision strategies: ${precisionStrats.join(", ")}`,
        confidence: 0.9,
      });
    }

    // Step 4: Surface finish check
    const raUm = validated.ra_um_target ?? 3.2;
    if (raUm < rules.surface_rules.fine_ra_um) {
      const finishStrats = rules.surface_rules.finishing_strategies;
      finishStrats.forEach(s => {
        if (!baseStrategies.includes(s)) baseStrategies.unshift(s);
      });
      reasoning.push({
        step: stepNum++,
        thought: `Target Ra ${raUm}µm < ${rules.surface_rules.fine_ra_um}µm fine finish threshold`,
        conclusion: `Added finishing strategies: ${finishStrats.join(", ")}`,
        confidence: 0.85,
      });
    }

    // Step 5: Machine capability filter
    if (machineValidated) {
      if (machineValidated.type === "swiss") {
        if (!baseStrategies.includes("turning_swiss")) {
          baseStrategies.push("turning_swiss");
        }
        reasoning.push({
          step: stepNum++,
          thought: `Swiss-type machine detected (${machineValidated.name})`,
          conclusion: `Added swiss turning strategy, leveraging guide bushing`,
          confidence: 0.9,
        });
      }
      if (matValidated.iso_group === "H" && (matValidated.hardness_hrc ?? 0) > 55) {
        if (!baseStrategies.includes("turning_hard")) {
          baseStrategies.unshift("turning_hard");
        }
        reasoning.push({
          step: stepNum++,
          thought: `Hardened material (${matValidated.hardness_hrc} HRC) requires CBN tooling`,
          conclusion: `Prioritized hard turning strategy`,
          confidence: 0.95,
        });
      }
    }

    // Step 6: Score and rank strategies
    const catalog = TURNING_STRATEGY_CATALOG;
    const scored: { entry: TurningStrategyEntry; score: number; reason: string }[] = [];

    for (const stratId of baseStrategies) {
      const entry = catalog.find(c => c.id === stratId);
      if (!entry) continue;

      let score = 70; // Base score

      // Bonus for being preferred
      if (rules.preferred_strategies.includes(stratId)) score += 15;

      // Bonus for material match
      if (entry.material_tags?.some(t => matValidated.name.toLowerCase().includes(t))) score += 10;

      // Penalty if Ra target not achievable
      if (entry.typical_Ra_um) {
        const [minRa, maxRa] = entry.typical_Ra_um;
        if (raUm < minRa) score -= 20; // Can't achieve target
        else if (raUm >= minRa && raUm <= maxRa) score += 10; // Optimal range
      }

      // Cpk bonus for critical features
      if (validated.is_critical && validated.cpk_target && validated.cpk_target >= 1.67) {
        if (entry.category === "finish" || entry.category === "specialty") score += 15;
      }

      scored.push({ entry, score: Math.min(100, Math.max(0, score)), reason: `Base + modifiers` });
    }

    // Sort by score
    scored.sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      // Fallback
      const fallback = rules.fallback_strategies[0];
      const fallbackEntry = catalog.find(c => c.id === fallback);
      if (fallbackEntry) {
        scored.push({ entry: fallbackEntry, score: 50, reason: "Fallback strategy" });
      } else {
        throw new Error(`No valid strategy found for feature type: ${validated.type}`);
      }
    }

    const best = scored[0];
    reasoning.push({
      step: stepNum++,
      thought: `Scored ${scored.length} strategies. Top: "${best.entry.name}" (${best.score}/100)`,
      conclusion: `Selected "${best.entry.id}" as optimal strategy`,
      confidence: best.score / 100,
    });

    // Build tool recommendation
    const toolKnowledge = TOOL_KNOWLEDGE[best.entry.id];
    const toolRec = toolKnowledge ? {
      insert_type: toolKnowledge.insert_shape,
      geometry: best.entry.category === "finish" ? "positive" : "negative",
      grade: toolKnowledge.typical_grade[matValidated.iso_group as MaterialGroup] ?? "GC4325",
      nose_radius_mm: toolKnowledge.nose_radius_mm,
      approach_angle_deg: toolKnowledge.approach_angle_deg,
    } : undefined;

    // Estimate cycle time (simplified)
    let cycleTime: number | undefined;
    const depth = validated.depth_mm ?? 10;
    const length = validated.length_mm ?? 20;
    const diameter = validated.diameter_mm ?? 50;
    if (diameter > 0) {
      const mrr = best.entry.category === "rough" ? 15 : 5; // cm³/min rough vs finish
      const volume = Math.PI * (diameter / 20) * (diameter / 20) * length / 1000; // cm³ approx
      cycleTime = (volume / mrr) * 60; // seconds
    }

    return {
      featureId: validated.id,
      featureType: validated.type,
      strategy_id: best.entry.id,
      strategy_name: best.entry.name,
      score: best.score,
      reasoning_chain: reasoning,
      parameters: {
        operation_type: best.entry.category,
        suggested_doc_mm: best.entry.category === "rough" ? 2.0 : 0.25,
        suggested_feed_mmrev: best.entry.category === "rough" ? 0.3 : 0.15,
      },
      trade_offs: {
        pros: [
          `Optimal for ${validated.type} features`,
          best.entry.notes ?? `Category: ${best.entry.category}`,
        ],
        cons: scored.length > 1 ? [
          `Alternative "${scored[1]?.entry.name}" scored ${scored[1]?.score}/100`,
        ] : [],
      },
      alternatives: scored.slice(1, 4).map(s => ({
        strategy_id: s.entry.id,
        strategy_name: s.entry.name,
        score: s.score,
        reason_for_rejection: `Scored ${best.score - s.score} points lower than selected`,
      })),
      tool_recommendation: toolRec,
      estimated_cycle_time_sec: cycleTime,
      citations: [
        "Sandvik Coromant: Turning Applications Guide",
        "JM Die Company: Turning Best Practices (internal)",
      ],
    };
  }

  /**
   * Batch process multiple features
   */
  batchSelectStrategies(
    features: FeatureInput[],
    material: MaterialInput,
    machine?: MachineCapability
  ): StrategyRecommendation[] {
    if (!features || features.length === 0) return [];
    return features.map(f => this.selectStrategy(f, material, machine));
  }

  /**
   * Generate complete strategy plan with sequencing
   */
  generateStrategyPlan(
    features: FeatureInput[],
    material: MaterialInput,
    machine?: MachineCapability,
    toleranceOutput?: ToleranceStackOutput
  ): StrategyPlan {
    const matValidated = MaterialInputSchema.parse(material);
    const machineValidated = machine ? MachineCapabilitySchema.parse(machine) : undefined;

    if (!features || features.length === 0) {
      return {
        plan_id: `plan_${Date.now()}`,
        material: matValidated,
        machine: machineValidated,
        feature_count: 0,
        recommendations: [],
        sequence: [],
        total_cycle_time_sec: 0,
        warnings: [],
        timestamp: new Date().toISOString(),
      };
    }

    // Merge Cpk targets from tolerance output if available
    const enrichedFeatures = features.map(f => {
      if (toleranceOutput) {
        const cpkTarget = toleranceOutput.feature_cpk_targets.find(t => t.featureId === f.id);
        if (cpkTarget) {
          return {
            ...f,
            cpk_target: f.cpk_target ?? cpkTarget.cpk_target,
            is_critical: f.is_critical ?? cpkTarget.is_critical,
            tolerance_total_mm: f.tolerance_total_mm ?? cpkTarget.tolerance_total_mm,
          };
        }
      }
      return f;
    });

    const recommendations = this.batchSelectStrategies(enrichedFeatures, matValidated, machineValidated);

    // Build sequence
    const sequence = enrichedFeatures
      .map((f, idx) => ({
        featureId: f.id,
        featureType: f.type,
        priority: SEQUENCE_PRIORITY[f.type] ?? 200,
        strategy_id: recommendations[idx]?.strategy_id ?? "unknown",
      }))
      .sort((a, b) => a.priority - b.priority)
      .map((s, idx) => ({
        order: idx + 1,
        featureId: s.featureId,
        strategy_id: s.strategy_id,
        reason: `Sequence priority ${s.priority} for ${s.featureType}`,
      }));

    // Calculate total cycle time
    const totalCycleTime = recommendations.reduce((sum, r) => sum + (r.estimated_cycle_time_sec ?? 0), 0);

    // Generate warnings
    const warnings: StrategyPlan["warnings"] = [];

    // Check for hardened material without CBN strategy
    if (matValidated.iso_group === "H" && (matValidated.hardness_hrc ?? 0) > 55) {
      const hasCBN = recommendations.some(r => r.strategy_id.includes("hard") || r.strategy_id.includes("cbn"));
      if (!hasCBN) {
        warnings.push({
          code: "MAT_HARDENED_NO_CBN",
          level: "warning",
          message: `Material hardness ${matValidated.hardness_hrc} HRC typically requires CBN tooling`,
          featureIds: enrichedFeatures.map(f => f.id),
        });
      }
    }

    // Check for tight tolerances with roughing only
    const criticalFeatures = enrichedFeatures.filter(f => f.is_critical || (f.tolerance_total_mm ?? 0.1) < 0.02);
    criticalFeatures.forEach(cf => {
      const rec = recommendations.find(r => r.featureId === cf.id);
      if (rec && !rec.strategy_id.includes("finish") && !rec.strategy_id.includes("spring") && !rec.strategy_id.includes("wiper")) {
        warnings.push({
          code: "TOL_CRITICAL_NO_FINISH",
          level: "warning",
          message: `Critical feature ${cf.id} (tol=${cf.tolerance_total_mm}mm) may need dedicated finishing pass`,
          featureIds: [cf.id],
        });
      }
    });

    return {
      plan_id: `plan_${Date.now()}`,
      material: matValidated,
      machine: machineValidated,
      feature_count: enrichedFeatures.length,
      recommendations,
      sequence,
      total_cycle_time_sec: totalCycleTime,
      warnings,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get statistics about strategy selection
   */
  getStrategyStats(plan: StrategyPlan): {
    total_features: number;
    strategies_used: string[];
    avg_score: number;
    critical_count: number;
    warning_count: number;
    cycle_time_min: number;
    category_breakdown: Record<string, number>;
  } {
    const validated = StrategyPlanSchema.parse(plan);
    const categories: Record<string, number> = {};

    validated.recommendations.forEach(r => {
      const entry = TURNING_STRATEGY_CATALOG.find(c => c.id === r.strategy_id);
      if (entry) {
        categories[entry.category] = (categories[entry.category] ?? 0) + 1;
      }
    });

    return {
      total_features: validated.feature_count,
      strategies_used: [...new Set(validated.recommendations.map(r => r.strategy_id))],
      avg_score: validated.recommendations.length > 0
        ? validated.recommendations.reduce((s, r) => s + r.score, 0) / validated.recommendations.length
        : 0,
      critical_count: validated.warnings.filter(w => w.level === "critical").length,
      warning_count: validated.warnings.filter(w => w.level === "warning").length,
      cycle_time_min: (validated.total_cycle_time_sec ?? 0) / 60,
      category_breakdown: categories,
    };
  }

  /**
   * Validate a strategy plan
   */
  validate(plan: StrategyPlan): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      StrategyPlanSchema.parse(plan);
    } catch (err) {
      errors.push(`Schema validation failed: ${err instanceof Error ? err.message : String(err)}`);
      return { valid: false, errors, warnings };
    }

    // Check all strategies exist in catalog
    plan.recommendations.forEach(r => {
      const exists = TURNING_STRATEGY_CATALOG.some(c => c.id === r.strategy_id);
      if (!exists) {
        errors.push(`Strategy "${r.strategy_id}" not found in catalog`);
      }
    });

    // Check sequence consistency
    const seqFeatures = new Set(plan.sequence.map(s => s.featureId));
    const recFeatures = new Set(plan.recommendations.map(r => r.featureId));
    if (seqFeatures.size !== recFeatures.size) {
      warnings.push(`Sequence has ${seqFeatures.size} features but recommendations has ${recFeatures.size}`);
    }

    // Check for very low scores
    plan.recommendations.forEach(r => {
      if (r.score < 40) {
        warnings.push(`Strategy "${r.strategy_id}" for feature ${r.featureId} has low confidence score ${r.score}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get catalog size for testing
   */
  getCatalogSize(): number {
    return TURNING_STRATEGY_CATALOG.length;
  }

  /**
   * Get rule count for testing
   */
  getRuleCount(): number {
    return Object.keys(FEATURE_STRATEGY_RULES).length;
  }
}

export const lathePrintFeatureStrategySelectorEngine = new LathePrintFeatureStrategySelectorEngine();
