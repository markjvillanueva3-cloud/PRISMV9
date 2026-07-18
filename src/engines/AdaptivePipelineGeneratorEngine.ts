/**
 * AdaptivePipelineGeneratorEngine
 * ================================
 * Takes a proven manufacturing recipe and a new part specification, then
 * generates an adapted machining pipeline with physics-based scaling,
 * tool substitution, and confidence scoring.
 *
 * Inline physics: Kienzle force model, Taylor tool life, hardness-based
 * speed scaling. Fully decoupled from other PRISM engines.
 *
 * Actions:
 *   pipeline_adapt       - full adaptation (proven recipe + new spec)
 *   pipeline_adapt_step  - adapt a single operation
 *   pipeline_preview     - quick preview without full computation
 *
 * @module engines/AdaptivePipelineGeneratorEngine
 * @version 1.0.0
 */

import { randomUUID } from "crypto";

// ============================================================================
// Types
// ============================================================================

export type AdaptationType =
  | "reused"
  | "scaled"
  | "substituted"
  | "added"
  | "removed"
  | "manual_review";

export interface AdaptedStep {
  sequence: number;
  operation_type: string;
  feature_ids: string[];
  adaptation_type: AdaptationType;
  confidence: number;
  tool: {
    tool_id?: string;
    type: string;
    diameter_mm: number;
    flutes: number;
    material: string;
    coating: string;
    corner_radius_mm?: number;
  };
  cutting_params: {
    speed_mpm: number;
    feed_mmtooth: number;
    spindle_rpm: number;
    feed_rate_mmmin: number;
    axial_depth_mm: number;
    radial_depth_mm: number;
  };
  coolant: string;
  estimated_cycle_time_sec: number;
  source_operation_seq?: number;
  adaptations_applied: Array<{
    parameter: string;
    proven_value: number;
    adapted_value: number;
    method: string;
    formula?: string;
  }>;
  warnings: string[];
}

export interface AdaptedPipeline {
  pipeline_id: string;
  source_recipe_id: string;
  similarity_score: number;
  steps: AdaptedStep[];
  total_steps: number;
  steps_reused: number;
  steps_scaled: number;
  steps_substituted: number;
  steps_added: number;
  steps_removed: number;
  steps_manual_review: number;
  overall_confidence: number;
  estimated_cycle_time_sec: number;
  tool_list: Array<{
    tool_id?: string;
    type: string;
    diameter_mm: number;
    available: boolean;
  }>;
  tools_needing_substitution: string[];
  warnings: string[];
  recommendations: string[];
}

export interface ProvenOperation {
  sequence: number;
  operation_type: string;
  feature_ids: string[];
  tool: {
    tool_id?: string;
    type: string;
    diameter_mm: number;
    flutes: number;
    material: string;
    coating: string;
    flute_length_mm?: number;
    corner_radius_mm?: number;
  };
  cutting_params: {
    speed_mpm: number;
    feed_mmtooth: number;
    spindle_rpm: number;
    feed_rate_mmmin: number;
    axial_depth_mm: number;
    radial_depth_mm: number;
  };
  coolant: string;
  cycle_time_sec: number;
  tolerance_mm?: number;
}

export interface ProvenRecipe {
  recipe_id: string;
  part_name?: string;
  material: {
    name: string;
    iso_group: string;
    hardness_hrc?: number;
  };
  operations: ProvenOperation[];
  total_cycle_time_sec: number;
  machine?: {
    id?: string;
    max_rpm: number;
    spindle_power_kw: number;
  };
}

export interface NewPartSpec {
  part_name?: string;
  material: {
    name: string;
    iso_group: string;
    hardness_hrc?: number;
  };
  features: Array<{
    feature_id: string;
    type: string;
    dimensions_mm?: {
      length?: number;
      width?: number;
      depth?: number;
      diameter?: number;
    };
    tolerance_mm?: number;
    surface_finish_um?: number;
  }>;
  machine?: {
    id?: string;
    max_rpm: number;
    spindle_power_kw: number;
  };
  general_tolerance_mm?: number;
}

export interface AvailableTool {
  tool_id: string;
  type: string;
  diameter_mm: number;
  flutes: number;
  material: string;
  coating: string;
  flute_length_mm?: number;
  corner_radius_mm?: number;
}

// ============================================================================
// Inline Kienzle material database
// ============================================================================

interface KienzleMaterialData {
  kc1_1: number;
  mc: number;
  hardness_hrc: number;
  thermal_conductivity_wm_k: number;
}

const KIENZLE_DB: Record<string, KienzleMaterialData> = {
  P: { kc1_1: 1800, mc: 0.25, hardness_hrc: 25, thermal_conductivity_wm_k: 45 },
  M: { kc1_1: 2100, mc: 0.25, hardness_hrc: 30, thermal_conductivity_wm_k: 15 },
  K: { kc1_1: 1100, mc: 0.28, hardness_hrc: 20, thermal_conductivity_wm_k: 50 },
  N: { kc1_1: 700, mc: 0.23, hardness_hrc: 10, thermal_conductivity_wm_k: 170 },
  S: { kc1_1: 2800, mc: 0.28, hardness_hrc: 35, thermal_conductivity_wm_k: 7 },
  H: { kc1_1: 3200, mc: 0.30, hardness_hrc: 55, thermal_conductivity_wm_k: 25 },
};

// ============================================================================
// Taylor tool life constants by ISO group
// ============================================================================

interface TaylorData { C: number; n: number; }

const TAYLOR_DB: Record<string, TaylorData> = {
  P: { C: 350, n: 0.25 },
  M: { C: 200, n: 0.20 },
  K: { C: 400, n: 0.28 },
  N: { C: 600, n: 0.35 },
  S: { C: 120, n: 0.15 },
  H: { C: 100, n: 0.12 },
};

// ============================================================================
// Tool material hierarchy (higher = better)
// ============================================================================

const TOOL_MATERIAL_RANK: Record<string, number> = {
  hss: 1, cobalt_hss: 2, carbide: 3, cermet: 4,
  ceramic: 5, cbn: 6, pcd: 7,
};

const CONFIDENCE_BASE: Record<AdaptationType, number> = {
  reused: 0.95, scaled: 0.80, substituted: 0.70,
  added: 0.60, removed: 0.95, manual_review: 0.30,
};

// ============================================================================
// Helper functions
// ============================================================================

function getKienzleData(isoGroup: string): KienzleMaterialData {
  return KIENZLE_DB[isoGroup.toUpperCase()] ?? KIENZLE_DB.P;
}

function getTaylorData(isoGroup: string): TaylorData {
  return TAYLOR_DB[isoGroup.toUpperCase()] ?? TAYLOR_DB.P;
}

function toolMaterialRank(mat: string): number {
  const key = mat.toLowerCase().replace(/[\s-]/g, "_");
  return TOOL_MATERIAL_RANK[key] ?? 3;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function geometricMean(values: number[]): number {
  if (values.length === 0) return 0;
  const product = values.reduce((acc, v) => acc * Math.max(v, 0.01), 1);
  return Math.pow(product, 1 / values.length);
}

function materialSimilarity(isoA: string, isoB: string): number {
  const a = isoA.toUpperCase();
  const b = isoB.toUpperCase();
  if (a === b) return 1.0;
  const related: Record<string, string[]> = {
    P: ["M", "H"], M: ["P", "S"], K: ["N"],
    N: ["K"], S: ["M"], H: ["P"],
  };
  if (related[a]?.includes(b)) return 0.75;
  return 0.5;
}

/** Kienzle cutting force: Fc = kc1.1 * ap * fz^(1 - mc) */
function kienzleForce(
  kc1_1: number, mc: number, ap_mm: number, fz_mm: number,
): number {
  return kc1_1 * ap_mm * Math.pow(Math.max(fz_mm, 0.001), 1 - mc);
}

/** Taylor tool life: T = (C / Vc)^(1/n) */
function taylorLife(C: number, n: number, Vc_mpm: number): number {
  if (Vc_mpm <= 0) return 9999;
  return Math.pow(C / Vc_mpm, 1 / n);
}

/** Spindle RPM from cutting speed: n = (Vc * 1000) / (pi * D) */
function speedToRPM(Vc_mpm: number, diameter_mm: number): number {
  if (diameter_mm <= 0) return 0;
  return (Vc_mpm * 1000) / (Math.PI * diameter_mm);
}

/** Table feed rate: Vf = fz * z * n */
function feedRate(fz_mm: number, flutes: number, rpm: number): number {
  return fz_mm * flutes * rpm;
}

// ============================================================================
// Operation-to-feature type mapping
// ============================================================================

const OP_FEATURE_MAP: Record<string, string[]> = {
  face_mill: ["face", "top_face", "planar"],
  pocket_mill: ["pocket", "cavity", "slot", "channel"],
  contour_mill: ["contour", "profile", "wall", "island"],
  drill: ["hole", "through_hole", "blind_hole", "bore"],
  bore: ["bore", "precision_hole", "reamed_hole"],
  thread_mill: ["thread", "tapped_hole"],
  chamfer: ["chamfer", "edge_break"],
  finishing: ["surface", "freeform", "3d_surface"],
  slot_mill: ["slot", "keyway", "groove"],
};

const BASE_SPEEDS: Record<string, number> = {
  P: 180, M: 100, K: 200, N: 400, S: 50, H: 80,
};

const BASE_FEEDS: Record<string, number> = {
  P: 0.10, M: 0.08, K: 0.12, N: 0.15, S: 0.06, H: 0.05,
};

// ============================================================================
// Engine
// ============================================================================

export class AdaptivePipelineGeneratorEngine {
  calculate(
    action: string,
    params: Record<string, unknown>,
  ): AdaptedPipeline | AdaptedStep | Record<string, unknown> {
    switch (action) {
      case "pipeline_adapt":
        return this.adaptPipeline(
          params.proven_recipe as ProvenRecipe,
          params.new_spec as NewPartSpec,
          (params.available_tools as AvailableTool[] | undefined) ?? [],
        );
      case "pipeline_adapt_step":
        return this.adaptSingleStep(
          params.proven_operation as ProvenOperation,
          params.proven_material as ProvenRecipe["material"],
          params.new_material as NewPartSpec["material"],
          (params.available_tools as AvailableTool[] | undefined) ?? [],
          params.new_tolerance_mm as number | undefined,
          params.proven_tolerance_mm as number | undefined,
        );
      case "pipeline_preview":
        return this.previewPipeline(
          params.proven_recipe as ProvenRecipe,
          params.new_spec as NewPartSpec,
          (params.available_tools as AvailableTool[] | undefined) ?? [],
        );
      default:
        throw new Error(
          `Unknown action: ${action}. ` +
          `Valid: pipeline_adapt, pipeline_adapt_step, pipeline_preview`,
        );
    }
  }

  // ==========================================================================
  // Full Pipeline Adaptation
  // ==========================================================================

  private adaptPipeline(
    recipe: ProvenRecipe,
    spec: NewPartSpec,
    availableTools: AvailableTool[],
  ): AdaptedPipeline {
    const pipelineId = randomUUID();
    const matSim = materialSimilarity(
      recipe.material.iso_group, spec.material.iso_group,
    );
    const warnings: string[] = [];
    const recommendations: string[] = [];

    const featureToOps = this.mapFeaturesToOperations(recipe, spec);
    const adaptedSteps: AdaptedStep[] = [];
    let stepSeq = 1;

    for (const op of recipe.operations) {
      const mappedFeatures =
        featureToOps.get(op.sequence) ?? op.feature_ids;
      const featureStillNeeded =
        mappedFeatures.length > 0 || op.feature_ids.length === 0;

      if (!featureStillNeeded) {
        adaptedSteps.push(this.createRemovedStep(stepSeq++, op));
        continue;
      }

      const newTolerance = this.resolveToleranceForOp(op, spec);
      const adapted = this.adaptSingleStep(
        op, recipe.material, spec.material,
        availableTools, newTolerance, op.tolerance_mm,
      );
      adapted.sequence = stepSeq++;
      adapted.feature_ids = mappedFeatures;
      adaptedSteps.push(adapted);
    }

    // Add operations for uncovered features
    const coveredFeatures = new Set(
      adaptedSteps.flatMap(s => s.feature_ids),
    );
    const uncovered = spec.features.filter(
      f => !coveredFeatures.has(f.feature_id),
    );

    for (const feature of uncovered) {
      const addedStep = this.generateStepForFeature(
        stepSeq++, feature, spec, availableTools,
      );
      adaptedSteps.push(addedStep);
      warnings.push(
        `Added new operation for uncovered feature: ` +
        `${feature.feature_id} (${feature.type})`,
      );
    }

    // Inject finishing passes where tolerance tightened
    const finishingPasses = this.injectFinishingPasses(
      adaptedSteps, spec, stepSeq,
    );
    for (const fp of finishingPasses) {
      fp.sequence = stepSeq++;
      adaptedSteps.push(fp);
    }

    // Sort and renumber
    adaptedSteps.sort((a, b) => a.sequence - b.sequence);
    adaptedSteps.forEach((s, i) => { s.sequence = i + 1; });

    // Compile tool list
    const toolList = this.compileToolList(adaptedSteps, availableTools);
    const toolsNeedingSub = toolList
      .filter(t => !t.available)
      .map(t => {
        const id = t.tool_id ? ` (${t.tool_id})` : "";
        return `${t.type} D${t.diameter_mm}mm${id}`;
      });

    if (toolsNeedingSub.length > 0) {
      warnings.push(
        `${toolsNeedingSub.length} tool(s) need substitution`,
      );
    }

    // Confidence
    const stepConfidences = adaptedSteps
      .filter(s => s.adaptation_type !== "removed")
      .map(s => s.confidence);
    const overallConfidence = geometricMean(stepConfidences);

    // Recommendations
    if (matSim < 0.7) {
      recommendations.push(
        "Material change is significant " +
        "-- run a test part before production",
      );
    }
    if (overallConfidence < 0.6) {
      recommendations.push(
        "Overall confidence is low " +
        "-- review manual_review steps carefully",
      );
    }
    if (finishingPasses.length > 0) {
      recommendations.push(
        `${finishingPasses.length} finishing pass(es) ` +
        `injected for tighter tolerances`,
      );
    }

    const taylorNew = getTaylorData(spec.material.iso_group);
    const taylorProven = getTaylorData(recipe.material.iso_group);
    if (taylorNew.C < taylorProven.C * 0.7) {
      recommendations.push(
        "New material has significantly lower tool life " +
        "-- consider frequent tool changes",
      );
    }

    // Machine RPM cap
    if (spec.machine) {
      for (const step of adaptedSteps) {
        if (step.cutting_params.spindle_rpm > spec.machine.max_rpm) {
          step.warnings.push(
            `RPM ${Math.round(step.cutting_params.spindle_rpm)} ` +
            `exceeds machine max ${spec.machine.max_rpm} -- capped`,
          );
          step.cutting_params.spindle_rpm = spec.machine.max_rpm;
          step.cutting_params.speed_mpm =
            (Math.PI * step.tool.diameter_mm *
              spec.machine.max_rpm) / 1000;
          step.cutting_params.feed_rate_mmmin =
            step.cutting_params.feed_mmtooth *
            step.tool.flutes * spec.machine.max_rpm;
        }
      }
    }

    const counts = this.countAdaptationTypes(adaptedSteps);
    const totalCycleTime = adaptedSteps.reduce(
      (sum, s) => sum + s.estimated_cycle_time_sec, 0,
    );

    return {
      pipeline_id: pipelineId,
      source_recipe_id: recipe.recipe_id,
      similarity_score: matSim,
      steps: adaptedSteps,
      total_steps: adaptedSteps.length,
      steps_reused: counts.reused,
      steps_scaled: counts.scaled,
      steps_substituted: counts.substituted,
      steps_added: counts.added,
      steps_removed: counts.removed,
      steps_manual_review: counts.manual_review,
      overall_confidence: clamp(overallConfidence, 0, 1),
      estimated_cycle_time_sec: totalCycleTime,
      tool_list: toolList,
      tools_needing_substitution: toolsNeedingSub,
      warnings,
      recommendations,
    };
  }

  // ==========================================================================
  // Single Step Adaptation
  // ==========================================================================

  adaptSingleStep(
    op: ProvenOperation,
    provenMat: ProvenRecipe["material"],
    newMat: NewPartSpec["material"],
    availableTools: AvailableTool[],
    newTolerance?: number,
    provenTolerance?: number,
  ): AdaptedStep {
    const adaptations: AdaptedStep["adaptations_applied"] = [];
    const stepWarnings: string[] = [];
    const matSim = materialSimilarity(
      provenMat.iso_group, newMat.iso_group,
    );
    const sameMaterialGroup =
      provenMat.iso_group.toUpperCase() ===
      newMat.iso_group.toUpperCase();

    let adaptedSpeed = op.cutting_params.speed_mpm;
    let adaptedFz = op.cutting_params.feed_mmtooth;
    let adaptedAp = op.cutting_params.axial_depth_mm;
    let adaptedAe = op.cutting_params.radial_depth_mm;
    let adaptationType: AdaptationType = "reused";

    if (sameMaterialGroup) {
      const hardnessProven =
        provenMat.hardness_hrc ??
        getKienzleData(provenMat.iso_group).hardness_hrc;
      const hardnessNew =
        newMat.hardness_hrc ??
        getKienzleData(newMat.iso_group).hardness_hrc;

      if (Math.abs(hardnessNew - hardnessProven) > 3) {
        adaptedSpeed =
          op.cutting_params.speed_mpm *
          Math.pow(hardnessProven / hardnessNew, 0.3);
        adaptedFz = op.cutting_params.feed_mmtooth * 0.9;
        adaptationType = "scaled";

        adaptations.push({
          parameter: "speed_mpm",
          proven_value: op.cutting_params.speed_mpm,
          adapted_value: adaptedSpeed,
          method: "hardness_ratio_scaling",
          formula: "Vc_new = Vc_proven * (HRC_proven/HRC_new)^0.3",
        });
        adaptations.push({
          parameter: "feed_mmtooth",
          proven_value: op.cutting_params.feed_mmtooth,
          adapted_value: adaptedFz,
          method: "same_group_conservative",
          formula: "fz_new = fz_proven * 0.9",
        });
      } else {
        adaptedSpeed = op.cutting_params.speed_mpm * 0.9;
        adaptedFz = op.cutting_params.feed_mmtooth * 0.9;
        adaptationType = "reused";
        adaptations.push({
          parameter: "speed_mpm",
          proven_value: op.cutting_params.speed_mpm,
          adapted_value: adaptedSpeed,
          method: "same_group_conservative_90pct",
        });
      }
    } else {
      // Different ISO group: full Kienzle-based scaling
      const kcProven = getKienzleData(provenMat.iso_group);
      const kcNew = getKienzleData(newMat.iso_group);
      const hardnessProven =
        provenMat.hardness_hrc ?? kcProven.hardness_hrc;
      const hardnessNew =
        newMat.hardness_hrc ?? kcNew.hardness_hrc;

      // Speed via hardness ratio
      adaptedSpeed =
        op.cutting_params.speed_mpm *
        Math.pow(hardnessProven / hardnessNew, 0.3);

      // Feed via Kienzle kc ratio to maintain equivalent force
      // fz_new = fz_proven * (kc_proven/kc_new)^(1/(1-mc_new))
      const kcRatio = kcProven.kc1_1 / kcNew.kc1_1;
      const exponent = 1 / (1 - kcNew.mc);
      adaptedFz =
        op.cutting_params.feed_mmtooth *
        Math.pow(kcRatio, exponent);
      adaptationType = "scaled";

      adaptations.push({
        parameter: "speed_mpm",
        proven_value: op.cutting_params.speed_mpm,
        adapted_value: adaptedSpeed,
        method: "hardness_ratio_scaling",
        formula: "Vc_new = Vc_proven * (HRC_proven/HRC_new)^0.3",
      });
      adaptations.push({
        parameter: "feed_mmtooth",
        proven_value: op.cutting_params.feed_mmtooth,
        adapted_value: adaptedFz,
        method: "kienzle_kc_ratio",
        formula:
          "fz_new = fz_proven * (kc_proven/kc_new)^(1/(1-mc_new))",
      });

      // Hard materials: reduce depth
      if (newMat.iso_group === "S" || newMat.iso_group === "H") {
        const depthFactor =
          newMat.iso_group === "H" ? 0.5 : 0.65;
        adaptedAp =
          op.cutting_params.axial_depth_mm * depthFactor;
        adaptedAe =
          op.cutting_params.radial_depth_mm * depthFactor;
        adaptations.push({
          parameter: "axial_depth_mm",
          proven_value: op.cutting_params.axial_depth_mm,
          adapted_value: adaptedAp,
          method: "hard_material_depth_reduction",
          formula: `ap_new = ap_proven * ${depthFactor}`,
        });
        stepWarnings.push(
          `Depth of cut reduced for ` +
          `${newMat.iso_group}-group material`,
        );
      }

      // Verify cutting force within 115% of proven
      const Fc_proven = kienzleForce(
        kcProven.kc1_1, kcProven.mc,
        op.cutting_params.axial_depth_mm,
        op.cutting_params.feed_mmtooth,
      );
      const Fc_new = kienzleForce(
        kcNew.kc1_1, kcNew.mc, adaptedAp, adaptedFz,
      );
      if (Fc_new > Fc_proven * 1.15) {
        const targetFz =
          adaptedFz * (Fc_proven * 1.15) / Fc_new;
        adaptations.push({
          parameter: "feed_mmtooth",
          proven_value: adaptedFz,
          adapted_value: targetFz,
          method: "force_limit_clamp",
          formula: "fz clamped: Fc <= 1.15 * Fc_proven",
        });
        adaptedFz = targetFz;
        stepWarnings.push(
          "Feed reduced to limit cutting force " +
          "within 115% of proven value",
        );
      }
    }

    // Sanity clamps
    adaptedSpeed = clamp(adaptedSpeed, 5, 1200);
    adaptedFz = clamp(adaptedFz, 0.002, 1.0);
    adaptedAp = clamp(adaptedAp, 0.05, 50);
    adaptedAe = clamp(adaptedAe, 0.05, 100);

    // Tool adaptation
    let toolAdapted = { ...op.tool };
    let toolFactor = 1.0;

    if (availableTools.length > 0) {
      const match = this.findBestTool(op.tool, availableTools);
      if (match.exact) {
        toolFactor = 1.0;
      } else if (match.substitute) {
        const sub = match.substitute;
        toolAdapted = {
          tool_id: sub.tool_id,
          type: sub.type,
          diameter_mm: sub.diameter_mm,
          flutes: sub.flutes,
          material: sub.material,
          coating: sub.coating,
          corner_radius_mm: sub.corner_radius_mm,
        };
        if (adaptationType === "reused") {
          adaptationType = "substituted";
        }
        toolFactor = match.sameTypeAndSize ? 0.85 : 0.70;

        if (Math.abs(sub.diameter_mm - op.tool.diameter_mm) > 0.01) {
          adaptations.push({
            parameter: "tool_diameter_mm",
            proven_value: op.tool.diameter_mm,
            adapted_value: sub.diameter_mm,
            method: "tool_substitution",
          });
        }
        if (sub.flutes !== op.tool.flutes) {
          adaptations.push({
            parameter: "tool_flutes",
            proven_value: op.tool.flutes,
            adapted_value: sub.flutes,
            method: "tool_substitution",
          });
        }
        stepWarnings.push(
          `Tool substituted: ${op.tool.type} ` +
          `D${op.tool.diameter_mm} -> D${sub.diameter_mm}`,
        );
      } else {
        adaptationType = "manual_review";
        toolFactor = 0.5;
        stepWarnings.push(
          `No suitable tool found for ${op.tool.type} ` +
          `D${op.tool.diameter_mm}mm -- manual review required`,
        );
      }
    }

    // Compute derived parameters
    const rpm = speedToRPM(adaptedSpeed, toolAdapted.diameter_mm);
    const vf = feedRate(adaptedFz, toolAdapted.flutes, rpm);

    // Tolerance factor
    let toleranceFactor = 1.0;
    if (
      newTolerance != null &&
      provenTolerance != null &&
      provenTolerance > 0 &&
      newTolerance > 0
    ) {
      if (newTolerance >= provenTolerance) {
        toleranceFactor = 1.0;
      } else {
        toleranceFactor = Math.max(
          0.5,
          1 - Math.abs(Math.log10(newTolerance / provenTolerance)),
        );
      }
    }

    // Confidence
    const baseConf = CONFIDENCE_BASE[adaptationType];
    const confidence = clamp(
      baseConf * matSim * toolFactor * toleranceFactor, 0, 1,
    );

    // Cycle time estimation via speed/feed ratios
    const speedRatio =
      op.cutting_params.speed_mpm > 0
        ? adaptedSpeed / op.cutting_params.speed_mpm
        : 1;
    const feedRatioVal =
      op.cutting_params.feed_rate_mmmin > 0
        ? vf / op.cutting_params.feed_rate_mmmin
        : 1;
    const depthProduct = adaptedAp * adaptedAe;
    const provenDepthProduct = Math.max(
      op.cutting_params.axial_depth_mm *
      op.cutting_params.radial_depth_mm,
      0.001,
    );
    const depthRatio = depthProduct / provenDepthProduct;
    const estimatedCycleTime =
      op.cycle_time_sec *
      (1 / Math.max(feedRatioVal, 0.1)) *
      (1 / Math.max(depthRatio, 0.1));

    // Coolant adaptation
    let coolant = op.coolant;
    const kcNewData = getKienzleData(newMat.iso_group);
    if (
      kcNewData.thermal_conductivity_wm_k < 15 &&
      coolant === "flood"
    ) {
      coolant = "high_pressure";
      stepWarnings.push(
        "Upgraded to high-pressure coolant " +
        "for low thermal conductivity material",
      );
    }
    if (newMat.iso_group === "N" && coolant === "dry") {
      coolant = "mist";
      stepWarnings.push(
        "Added mist coolant for aluminum -- prevents BUE",
      );
    }

    return {
      sequence: op.sequence,
      operation_type: op.operation_type,
      feature_ids: op.feature_ids,
      adaptation_type: adaptationType,
      confidence: Math.round(confidence * 1000) / 1000,
      tool: toolAdapted,
      cutting_params: {
        speed_mpm: Math.round(adaptedSpeed * 100) / 100,
        feed_mmtooth: Math.round(adaptedFz * 10000) / 10000,
        spindle_rpm: Math.round(rpm),
        feed_rate_mmmin: Math.round(vf * 10) / 10,
        axial_depth_mm: Math.round(adaptedAp * 1000) / 1000,
        radial_depth_mm: Math.round(adaptedAe * 1000) / 1000,
      },
      coolant,
      estimated_cycle_time_sec:
        Math.round(estimatedCycleTime * 10) / 10,
      source_operation_seq: op.sequence,
      adaptations_applied: adaptations,
      warnings: stepWarnings,
    };
  }

  // ==========================================================================
  // Preview (Quick)
  // ==========================================================================

  private previewPipeline(
    recipe: ProvenRecipe,
    spec: NewPartSpec,
    availableTools: AvailableTool[],
  ): Record<string, unknown> {
    const matSim = materialSimilarity(
      recipe.material.iso_group, spec.material.iso_group,
    );
    const sameMaterial =
      recipe.material.iso_group.toUpperCase() ===
      spec.material.iso_group.toUpperCase();

    // Quick tool availability check
    let toolsAvailable = 0;
    let toolsSubstitutable = 0;
    let toolsMissing = 0;

    if (availableTools.length > 0) {
      for (const op of recipe.operations) {
        const match = this.findBestTool(op.tool, availableTools);
        if (match.exact) toolsAvailable++;
        else if (match.substitute) toolsSubstitutable++;
        else toolsMissing++;
      }
    } else {
      toolsAvailable = recipe.operations.length;
    }

    // Quick cycle time estimate
    const kcProven = getKienzleData(recipe.material.iso_group);
    const kcNew = getKienzleData(spec.material.iso_group);
    const hardnessProven =
      recipe.material.hardness_hrc ?? kcProven.hardness_hrc;
    const hardnessNew =
      spec.material.hardness_hrc ?? kcNew.hardness_hrc;
    const speedFactor = Math.pow(hardnessProven / hardnessNew, 0.3);
    const estCycleTime =
      recipe.total_cycle_time_sec / Math.max(speedFactor, 0.1);

    // Feature coverage
    const coveredIds = new Set(
      recipe.operations.flatMap(op => op.feature_ids),
    );
    const newFeatureIds = spec.features.map(f => f.feature_id);
    const uncoveredCount = newFeatureIds.filter(
      fid => !coveredIds.has(fid),
    ).length;

    // Quick confidence estimate
    let quickConf = sameMaterial ? 0.90 : 0.70;
    quickConf *= toolsMissing === 0
      ? 1.0
      : Math.max(0.5, 1 - toolsMissing * 0.15);
    quickConf *= uncoveredCount === 0
      ? 1.0
      : Math.max(0.4, 1 - uncoveredCount * 0.1);

    // Taylor life comparison
    const taylorProven = getTaylorData(recipe.material.iso_group);
    const taylorNew = getTaylorData(spec.material.iso_group);
    const avgSpeed = recipe.operations.reduce(
      (s, op) => s + op.cutting_params.speed_mpm, 0,
    ) / Math.max(recipe.operations.length, 1);
    const lifeProven = taylorLife(
      taylorProven.C, taylorProven.n, avgSpeed,
    );
    const lifeNew = taylorLife(
      taylorNew.C, taylorNew.n, avgSpeed * speedFactor,
    );
    const lifeRatio = lifeNew / Math.max(lifeProven, 0.01);

    const previewWarnings: string[] = [];
    if (matSim < 0.7) {
      previewWarnings.push(
        "Significant material difference -- full adaptation recommended",
      );
    }
    if (toolsMissing > 0) {
      previewWarnings.push(
        `${toolsMissing} required tool(s) not available`,
      );
    }
    if (uncoveredCount > 0) {
      previewWarnings.push(
        `${uncoveredCount} feature(s) not covered by proven recipe`,
      );
    }
    if (lifeRatio < 0.5) {
      previewWarnings.push(
        "Tool life expected to drop significantly (>50%)",
      );
    }

    return {
      source_recipe_id: recipe.recipe_id,
      material_similarity: Math.round(matSim * 100) / 100,
      same_material_group: sameMaterial,
      proven_operations: recipe.operations.length,
      estimated_adapted_steps:
        recipe.operations.length + uncoveredCount,
      uncovered_features: uncoveredCount,
      tools_available: toolsAvailable,
      tools_substitutable: toolsSubstitutable,
      tools_missing: toolsMissing,
      estimated_cycle_time_sec:
        Math.round(estCycleTime * 10) / 10,
      cycle_time_change_pct:
        Math.round(
          (estCycleTime / recipe.total_cycle_time_sec - 1) * 1000,
        ) / 10,
      tool_life_ratio: Math.round(lifeRatio * 100) / 100,
      estimated_confidence: Math.round(quickConf * 100) / 100,
      feasibility:
        quickConf >= 0.6
          ? "feasible"
          : quickConf >= 0.4
            ? "marginal"
            : "needs_review",
      warnings: previewWarnings,
    };
  }

  // ==========================================================================
  // Tool Matching
  // ==========================================================================

  private findBestTool(
    required: ProvenOperation["tool"],
    available: AvailableTool[],
  ): {
    exact: boolean;
    substitute?: AvailableTool;
    sameTypeAndSize: boolean;
  } {
    // Step 1: exact match by ID
    if (required.tool_id) {
      const exact = available.find(
        t => t.tool_id === required.tool_id,
      );
      if (exact) return { exact: true, sameTypeAndSize: true };
    }

    // Step 2: same type + diameter + adequate flutes/material
    const typeAndSize = available.find(
      t =>
        t.type === required.type &&
        Math.abs(t.diameter_mm - required.diameter_mm) < 0.01 &&
        t.flutes >= required.flutes &&
        toolMaterialRank(t.material) >=
          toolMaterialRank(required.material),
    );
    if (typeAndSize) {
      return { exact: true, sameTypeAndSize: true };
    }

    // Step 3: score candidates
    const candidates = available
      .filter(t => t.type === required.type)
      .map(t => {
        let score = 100;
        const diamDiff = Math.abs(
          t.diameter_mm - required.diameter_mm,
        );
        if (diamDiff > 0.5) return { tool: t, score: -1 };
        score -= diamDiff * 40;

        const matDiff =
          toolMaterialRank(t.material) -
          toolMaterialRank(required.material);
        if (matDiff < 0) score -= 30;
        else score += Math.min(matDiff * 5, 15);

        if (t.flutes < required.flutes) score -= 15;
        else if (t.flutes > required.flutes) score += 2;

        if (required.flute_length_mm && t.flute_length_mm) {
          if (t.flute_length_mm < required.flute_length_mm) {
            score -= 25;
          }
        }

        if (required.corner_radius_mm && t.corner_radius_mm) {
          const crDiff = Math.abs(
            t.corner_radius_mm - required.corner_radius_mm,
          );
          score -= crDiff * 10;
        }

        return { tool: t, score };
      })
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score);

    if (candidates.length > 0) {
      const best = candidates[0];
      const sameTS =
        Math.abs(
          best.tool.diameter_mm - required.diameter_mm,
        ) < 0.5 && best.tool.type === required.type;
      return {
        exact: false,
        substitute: best.tool,
        sameTypeAndSize: sameTS,
      };
    }

    return { exact: false, sameTypeAndSize: false };
  }

  // ==========================================================================
  // Feature-to-Operation Mapping
  // ==========================================================================

  private mapFeaturesToOperations(
    recipe: ProvenRecipe,
    spec: NewPartSpec,
  ): Map<number, string[]> {
    const mapping = new Map<number, string[]>();
    const newFeatureIds = new Set(
      spec.features.map(f => f.feature_id),
    );

    for (const op of recipe.operations) {
      const matchedFeatures = op.feature_ids.filter(
        fid => newFeatureIds.has(fid),
      );

      if (matchedFeatures.length === 0 && op.feature_ids.length > 0) {
        const typeMatches = spec.features
          .filter(f => this.operationMatchesFeatureType(
            op.operation_type, f.type,
          ))
          .map(f => f.feature_id);
        if (typeMatches.length > 0) {
          mapping.set(op.sequence, typeMatches);
          continue;
        }
      }

      mapping.set(
        op.sequence,
        matchedFeatures.length > 0
          ? matchedFeatures
          : op.feature_ids,
      );
    }

    return mapping;
  }

  private operationMatchesFeatureType(
    opType: string, featureType: string,
  ): boolean {
    const normalizedOp = opType.toLowerCase().replace(/[-\s]/g, "_");
    const normalizedFeat =
      featureType.toLowerCase().replace(/[-\s]/g, "_");

    for (const [op, feats] of Object.entries(OP_FEATURE_MAP)) {
      if (normalizedOp.includes(op) || op.includes(normalizedOp)) {
        if (feats.some(
          f => normalizedFeat.includes(f) || f.includes(normalizedFeat),
        )) {
          return true;
        }
      }
    }
    return false;
  }

  // ==========================================================================
  // Tolerance Resolution
  // ==========================================================================

  private resolveToleranceForOp(
    op: ProvenOperation, spec: NewPartSpec,
  ): number | undefined {
    for (const fid of op.feature_ids) {
      const feature = spec.features.find(
        f => f.feature_id === fid,
      );
      if (feature?.tolerance_mm != null) return feature.tolerance_mm;
    }
    return spec.general_tolerance_mm;
  }

  // ==========================================================================
  // Removed Step
  // ==========================================================================

  private createRemovedStep(
    seq: number, op: ProvenOperation,
  ): AdaptedStep {
    return {
      sequence: seq,
      operation_type: op.operation_type,
      feature_ids: op.feature_ids,
      adaptation_type: "removed",
      confidence: 0.95,
      tool: op.tool,
      cutting_params: op.cutting_params,
      coolant: op.coolant,
      estimated_cycle_time_sec: 0,
      source_operation_seq: op.sequence,
      adaptations_applied: [{
        parameter: "operation",
        proven_value: 1,
        adapted_value: 0,
        method: "feature_not_present_in_new_part",
      }],
      warnings: [
        "Operation removed -- associated features " +
        "not present in new part",
      ],
    };
  }

  // ==========================================================================
  // Generate Step for Uncovered Feature
  // ==========================================================================

  private generateStepForFeature(
    seq: number,
    feature: NewPartSpec["features"][0],
    spec: NewPartSpec,
    availableTools: AvailableTool[],
  ): AdaptedStep {
    const warnings: string[] = [];
    const kcData = getKienzleData(spec.material.iso_group);

    const opType = this.inferOperationType(feature.type);
    const inferredDiameter = this.inferToolDiameter(feature);

    const candidateReq = {
      type: this.inferToolType(opType),
      diameter_mm: inferredDiameter,
      flutes: 4,
      material: "carbide",
      coating: "TiAlN",
      tool_id: undefined as string | undefined,
      flute_length_mm: undefined as number | undefined,
      corner_radius_mm: undefined as number | undefined,
    };

    const match = this.findBestTool(candidateReq, availableTools);

    const tool = match.substitute ?? {
      type: candidateReq.type,
      diameter_mm: inferredDiameter,
      flutes: 4,
      material: "carbide",
      coating: "TiAlN",
    };

    const hardness =
      spec.material.hardness_hrc ?? kcData.hardness_hrc;
    const isoKey = spec.material.iso_group.toUpperCase();
    const baseSpeed =
      (BASE_SPEEDS[isoKey] ?? 150) *
      Math.pow(25 / hardness, 0.3);
    const baseFz = BASE_FEEDS[isoKey] ?? 0.10;
    const rpm = speedToRPM(baseSpeed, tool.diameter_mm);
    const vf = feedRate(baseFz, tool.flutes ?? 4, rpm);

    const depth = feature.dimensions_mm?.depth ?? 5;
    const ap = Math.min(depth, tool.diameter_mm * 0.5);
    const ae = tool.diameter_mm * 0.4;

    // Rough cycle time from volume / MRR
    const volume =
      (feature.dimensions_mm?.length ?? 20) *
      (feature.dimensions_mm?.width ?? 20) *
      depth;
    const mrr = ap * ae * vf / 1000;
    const cycleTime = mrr > 0 ? (volume / (mrr / 60)) : 60;

    warnings.push(
      `Auto-generated operation for feature ` +
      `${feature.feature_id} -- verify parameters`,
    );
    if (!match.exact && !match.substitute) {
      warnings.push(
        "No matching tool found " +
        "-- using default carbide endmill parameters",
      );
    }

    return {
      sequence: seq,
      operation_type: opType,
      feature_ids: [feature.feature_id],
      adaptation_type: "added",
      confidence: match.substitute ? 0.55 : 0.45,
      tool: {
        tool_id: (tool as AvailableTool).tool_id,
        type: tool.type,
        diameter_mm: tool.diameter_mm,
        flutes: tool.flutes ?? 4,
        material: tool.material,
        coating: tool.coating,
        corner_radius_mm: (tool as AvailableTool).corner_radius_mm,
      },
      cutting_params: {
        speed_mpm: Math.round(baseSpeed * 100) / 100,
        feed_mmtooth: Math.round(baseFz * 10000) / 10000,
        spindle_rpm: Math.round(rpm),
        feed_rate_mmmin: Math.round(vf * 10) / 10,
        axial_depth_mm: Math.round(ap * 1000) / 1000,
        radial_depth_mm: Math.round(ae * 1000) / 1000,
      },
      coolant: spec.material.iso_group === "N" ? "mist" : "flood",
      estimated_cycle_time_sec:
        Math.round(Math.max(cycleTime, 5) * 10) / 10,
      adaptations_applied: [{
        parameter: "operation",
        proven_value: 0,
        adapted_value: 1,
        method: "feature_requires_new_operation",
      }],
      warnings,
    };
  }

  // ==========================================================================
  // Finishing Pass Injection
  // ==========================================================================

  private injectFinishingPasses(
    steps: AdaptedStep[],
    spec: NewPartSpec,
    startSeq: number,
  ): AdaptedStep[] {
    const finishingPasses: AdaptedStep[] = [];
    let seq = startSeq;

    for (const step of steps) {
      if (step.adaptation_type === "removed") continue;

      for (const fid of step.feature_ids) {
        const feature = spec.features.find(
          f => f.feature_id === fid,
        );
        if (!feature?.tolerance_mm) continue;

        const isRoughing =
          step.operation_type.toLowerCase().includes("rough") ||
          step.cutting_params.axial_depth_mm >
            step.tool.diameter_mm * 0.3;

        if (feature.tolerance_mm < 0.02 && isRoughing) {
          const fzFinish =
            step.cutting_params.feed_mmtooth * 0.7;
          const vfFinish =
            step.cutting_params.feed_rate_mmmin * 0.7;
          const apFinish =
            step.cutting_params.axial_depth_mm * 0.5;
          const aeFinish =
            step.cutting_params.radial_depth_mm * 0.5;

          finishingPasses.push({
            sequence: seq++,
            operation_type: `${step.operation_type}_finishing`,
            feature_ids: [fid],
            adaptation_type: "added",
            confidence: 0.65,
            tool: { ...step.tool },
            cutting_params: {
              speed_mpm: step.cutting_params.speed_mpm,
              feed_mmtooth:
                Math.round(fzFinish * 10000) / 10000,
              spindle_rpm: step.cutting_params.spindle_rpm,
              feed_rate_mmmin:
                Math.round(vfFinish * 10) / 10,
              axial_depth_mm:
                Math.round(apFinish * 1000) / 1000,
              radial_depth_mm:
                Math.round(aeFinish * 1000) / 1000,
            },
            coolant: step.coolant,
            estimated_cycle_time_sec:
              Math.round(
                step.estimated_cycle_time_sec * 0.4 * 10,
              ) / 10,
            source_operation_seq: step.source_operation_seq,
            adaptations_applied: [{
              parameter: "finishing_pass",
              proven_value: 0,
              adapted_value: 1,
              method: "tolerance_driven_finishing",
              formula: "ap * 0.5, feed * 0.7, speed same",
            }],
            warnings: [
              `Finishing pass injected for feature ${fid} ` +
              `(tolerance ${feature.tolerance_mm}mm)`,
            ],
          });
        }
      }
    }

    return finishingPasses;
  }

  // ==========================================================================
  // Inference helpers
  // ==========================================================================

  private inferOperationType(featureType: string): string {
    const ft = featureType.toLowerCase();
    if (ft.includes("hole") || ft.includes("bore")) return "drill";
    if (ft.includes("thread")) return "thread_mill";
    if (ft.includes("pocket") || ft.includes("cavity")) {
      return "pocket_mill";
    }
    if (
      ft.includes("slot") ||
      ft.includes("groove") ||
      ft.includes("keyway")
    ) {
      return "slot_mill";
    }
    if (ft.includes("chamfer")) return "chamfer";
    if (ft.includes("face") || ft.includes("planar")) {
      return "face_mill";
    }
    if (
      ft.includes("contour") ||
      ft.includes("profile") ||
      ft.includes("wall")
    ) {
      return "contour_mill";
    }
    if (ft.includes("surface") || ft.includes("freeform")) {
      return "finishing";
    }
    return "pocket_mill";
  }

  private inferToolType(opType: string): string {
    const typeMap: Record<string, string> = {
      drill: "drill",
      thread_mill: "thread_mill",
      pocket_mill: "end_mill",
      slot_mill: "end_mill",
      chamfer: "chamfer_mill",
      face_mill: "face_mill",
      contour_mill: "end_mill",
      finishing: "ball_mill",
    };
    return typeMap[opType] ?? "end_mill";
  }

  private inferToolDiameter(
    feature: NewPartSpec["features"][0],
  ): number {
    const dims = feature.dimensions_mm;
    if (!dims) return 10;
    if (dims.diameter) {
      return Math.min(dims.diameter * 0.8, 25);
    }
    const minDim = Math.min(dims.width ?? 50, dims.length ?? 50);
    return clamp(minDim * 0.6, 3, 25);
  }

  // ==========================================================================
  // Utility methods
  // ==========================================================================

  private compileToolList(
    steps: AdaptedStep[],
    availableTools: AvailableTool[],
  ): AdaptedPipeline["tool_list"] {
    const seen = new Map<
      string,
      AdaptedPipeline["tool_list"][0]
    >();
    const availableIds = new Set(
      availableTools.map(t => t.tool_id),
    );
    const availableBySpec = availableTools.map(
      t => `${t.type}_${t.diameter_mm}`,
    );

    for (const step of steps) {
      if (step.adaptation_type === "removed") continue;
      const key =
        `${step.tool.type}_${step.tool.diameter_mm}` +
        `_${step.tool.tool_id ?? ""}`;
      if (!seen.has(key)) {
        const specKey =
          `${step.tool.type}_${step.tool.diameter_mm}`;
        const isAvailable = step.tool.tool_id
          ? availableIds.has(step.tool.tool_id)
          : availableBySpec.includes(specKey);
        seen.set(key, {
          tool_id: step.tool.tool_id,
          type: step.tool.type,
          diameter_mm: step.tool.diameter_mm,
          available: availableTools.length === 0 || isAvailable,
        });
      }
    }

    return Array.from(seen.values());
  }

  private countAdaptationTypes(
    steps: AdaptedStep[],
  ): Record<AdaptationType, number> {
    const counts: Record<AdaptationType, number> = {
      reused: 0, scaled: 0, substituted: 0,
      added: 0, removed: 0, manual_review: 0,
    };
    for (const step of steps) {
      counts[step.adaptation_type]++;
    }
    return counts;
  }

  // ==========================================================================
  // Flat-format convenience methods (used by tests & orchestrator)
  // ==========================================================================

  private static readonly STANDARD_DIAMETERS = [
    1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 25, 30, 32, 40, 50,
  ];

  private snapToStandard(d: number): number {
    let best = AdaptivePipelineGeneratorEngine.STANDARD_DIAMETERS[0];
    let bestDiff = Math.abs(d - best);
    for (const s of AdaptivePipelineGeneratorEngine.STANDARD_DIAMETERS) {
      const diff = Math.abs(d - s);
      // Prefer larger standard when equidistant (safer for machining)
      if (diff < bestDiff || (diff === bestDiff && s > best)) {
        bestDiff = diff;
        best = s;
      }
    }
    return best;
  }

  /**
   * adapt() — Flat-format adaptation for simple step structures.
   * Accepts flat source_recipe/target_spec and returns flat adapted steps.
   */
  adapt(params: {
    source_recipe: {
      iso_group: string;
      hardness_hb?: number;
      dimensions?: { x: number; y: number; z: number };
      steps: Array<{
        operation: string;
        tool_diameter_mm: number;
        tool_type: string;
        rpm: number;
        feed_mmmin: number;
        axial_depth_mm: number;
        radial_depth_mm: number;
        coolant: string;
      }>;
      cycle_time_min?: number;
    };
    target_spec: {
      material?: string;
      iso_group?: string;
      hardness_hb?: number;
      dimensions?: { x: number; y: number; z: number };
      features?: string[];
      tolerances?: { dimension: string; value_mm: number }[];
      surface_finish_ra?: number;
      operations?: string[];
    };
    similarity_score: number;
    aggressiveness?: number;
  }): {
    steps: Array<{
      operation: string;
      tool_diameter_mm: number;
      tool_type: string;
      rpm: number;
      feed_mmmin: number;
      axial_depth_mm: number;
      radial_depth_mm: number;
      coolant: string;
      adaptation_notes: string[];
    }>;
    confidence: number;
    warnings: string[];
    estimated_cycle_time_min?: number;
  } {
    const srcIso = params.source_recipe.iso_group.toUpperCase();
    const tgtIso = (params.target_spec.iso_group ?? srcIso).toUpperCase();
    const aggr = params.aggressiveness ?? 0.5;
    const sameGroup = srcIso === tgtIso;

    const kcSrc = getKienzleData(srcIso);
    const kcTgt = getKienzleData(tgtIso);

    const srcHardness = params.source_recipe.hardness_hb ?? (kcSrc.hardness_hrc * 10);
    const tgtHardness = params.target_spec.hardness_hb ?? (kcTgt.hardness_hrc * 10);

    // Dimension scale factor
    let dimScale = 1.0;
    if (params.source_recipe.dimensions && params.target_spec.dimensions) {
      const sVol =
        params.source_recipe.dimensions.x *
        params.source_recipe.dimensions.y *
        params.source_recipe.dimensions.z;
      const tVol =
        params.target_spec.dimensions.x *
        params.target_spec.dimensions.y *
        params.target_spec.dimensions.z;
      if (sVol > 0) dimScale = Math.pow(tVol / sVol, 1 / 3);
    }
    // Blend dimScale toward 1.0 with aggressiveness
    dimScale = 1.0 + (dimScale - 1.0) * aggr;

    const warnings: string[] = [];
    const adaptedSteps: Array<{
      operation: string;
      tool_diameter_mm: number;
      tool_type: string;
      rpm: number;
      feed_mmmin: number;
      axial_depth_mm: number;
      radial_depth_mm: number;
      coolant: string;
      adaptation_notes: string[];
    }> = [];

    if (!sameGroup) {
      warnings.push(
        `Material group change: ${srcIso} -> ${tgtIso}`,
      );
    }

    for (const step of params.source_recipe.steps) {
      const notes: string[] = [];

      // --- Feed scaling via Kienzle kc ratio ---
      const kcRatio = kcTgt.kc1_1 / kcSrc.kc1_1;
      let feedFactor = 1.0 / kcRatio;
      feedFactor = clamp(feedFactor, 0.4, 2.5);
      let feed = step.feed_mmmin * feedFactor;

      // --- RPM scaling ---
      let rpm = step.rpm;
      const hardnessRatio = tgtHardness / srcHardness;
      if (hardnessRatio > 1) {
        rpm *= Math.pow(1 / hardnessRatio, 0.3);
        notes.push(`RPM reduced for higher hardness (ratio ${hardnessRatio.toFixed(2)})`);
      } else if (hardnessRatio < 1) {
        rpm *= Math.pow(1 / hardnessRatio, 0.3);
      }
      // Extra RPM reduction for S/H groups when source is P
      if ((tgtIso === "S" || tgtIso === "H") && srcIso !== tgtIso) {
        const speedFactor = tgtIso === "H" ? 0.45 : 0.6;
        rpm *= speedFactor;
        notes.push(`RPM reduced for ${tgtIso}-group material`);
      }

      // --- Depth scaling ---
      let axialDepth = step.axial_depth_mm * dimScale;
      let radialDepth = step.radial_depth_mm;

      // --- Tool diameter snap ---
      const toolDiam = this.snapToStandard(step.tool_diameter_mm);
      if (toolDiam !== step.tool_diameter_mm) {
        notes.push(`Tool snapped: ${step.tool_diameter_mm} -> ${toolDiam}mm`);
      }

      // --- Surface finish adjustment ---
      const sfTarget = params.target_spec.surface_finish_ra;
      if (sfTarget !== undefined && sfTarget < 0.8 && step.operation === "finishing") {
        const sfFactor = Math.max(0.3, sfTarget / 1.6);
        feed *= sfFactor;
        notes.push(`Feed reduced for fine surface finish (Ra ${sfTarget})`);
      }

      // --- Coolant adaptation ---
      let coolant = step.coolant;
      if ((tgtIso === "S" || tgtIso === "H") && coolant === "dry") {
        coolant = "flood";
        notes.push("Coolant changed from dry to flood for difficult material");
      }
      if (tgtIso === "N" && coolant === "dry") {
        coolant = "mist";
        notes.push("Added mist coolant for aluminum");
      }

      // --- Clamps ---
      feed = clamp(Math.round(feed * 10) / 10, 20, 20000);
      rpm = clamp(Math.round(rpm), 100, 60000);
      axialDepth = clamp(Math.round(axialDepth * 1000) / 1000, 0.05, 50);
      radialDepth = clamp(Math.round(radialDepth * 1000) / 1000, 0.05, 100);

      if (!sameGroup) {
        notes.push(`Kienzle kc ratio ${kcRatio.toFixed(3)}: feed factor ${feedFactor.toFixed(3)}`);
      }

      adaptedSteps.push({
        operation: step.operation,
        tool_diameter_mm: toolDiam,
        tool_type: step.tool_type,
        rpm,
        feed_mmmin: feed,
        axial_depth_mm: axialDepth,
        radial_depth_mm: radialDepth,
        coolant,
        adaptation_notes: notes,
      });
    }

    // --- Inject finishing pass if tight tolerances and none present ---
    const hasTightTol = (params.target_spec.tolerances ?? []).some(
      t => t.value_mm < 0.02,
    );
    const hasFinishing = adaptedSteps.some(s => s.operation === "finishing");
    if (hasTightTol && !hasFinishing) {
      const lastStep = adaptedSteps[adaptedSteps.length - 1];
      adaptedSteps.push({
        operation: "finishing",
        tool_diameter_mm: lastStep.tool_diameter_mm,
        tool_type: lastStep.tool_type,
        rpm: lastStep.rpm,
        feed_mmmin: clamp(Math.round(lastStep.feed_mmmin * 0.5), 20, 20000),
        axial_depth_mm: clamp(lastStep.axial_depth_mm * 0.3, 0.05, 50),
        radial_depth_mm: clamp(lastStep.radial_depth_mm * 0.3, 0.05, 100),
        coolant: lastStep.coolant,
        adaptation_notes: ["Finishing pass injected for tight tolerance"],
      });
    }

    // --- Confidence ---
    let confidence = params.similarity_score;
    if (!sameGroup) confidence *= 0.8;
    if (warnings.length > 0) confidence *= 0.9;
    confidence = clamp(confidence, 0, 1);

    // --- Cycle time estimate ---
    let estimatedCycleTimeMin: number | undefined;
    if (params.source_recipe.cycle_time_min) {
      const avgFeedRatio =
        adaptedSteps.reduce((s, st, i) => {
          const orig = params.source_recipe.steps[i];
          return s + (orig ? st.feed_mmmin / orig.feed_mmmin : 1);
        }, 0) / adaptedSteps.length;
      estimatedCycleTimeMin =
        Math.round(
          params.source_recipe.cycle_time_min / Math.max(avgFeedRatio, 0.1) * 100,
        ) / 100;
    }

    return {
      steps: adaptedSteps,
      confidence: Math.round(confidence * 1000) / 1000,
      warnings,
      estimated_cycle_time_min: estimatedCycleTimeMin,
    };
  }

  /**
   * preview() — Quick preview of adaptation parameters without full recipe.
   */
  preview(params: {
    source_iso_group: string;
    target_iso_group: string;
    source_hardness_hb?: number;
    target_hardness_hb?: number;
    sample_rpm: number;
    sample_feed_mmmin: number;
  }): {
    force_ratio: number;
    adapted_rpm: number;
    adapted_feed: number;
    speed_factor: number;
    feed_factor: number;
  } {
    const srcIso = params.source_iso_group.toUpperCase();
    const tgtIso = params.target_iso_group.toUpperCase();
    const kcSrc = getKienzleData(srcIso);
    const kcTgt = getKienzleData(tgtIso);

    const forceRatio = kcTgt.kc1_1 / kcSrc.kc1_1;
    const feedFactor = 1.0 / forceRatio;

    const srcHardness = params.source_hardness_hb ?? (kcSrc.hardness_hrc * 10);
    const tgtHardness = params.target_hardness_hb ?? (kcTgt.hardness_hrc * 10);
    const hardnessRatio = tgtHardness / srcHardness;
    let speedFactor = Math.pow(1 / hardnessRatio, 0.3);
    if ((tgtIso === "S" || tgtIso === "H") && srcIso !== tgtIso) {
      speedFactor *= tgtIso === "H" ? 0.45 : 0.6;
    }

    return {
      force_ratio: forceRatio,
      adapted_rpm: clamp(Math.round(params.sample_rpm * speedFactor), 100, 60000),
      adapted_feed: clamp(Math.round(params.sample_feed_mmmin * feedFactor * 10) / 10, 20, 20000),
      speed_factor: Math.round(speedFactor * 1000) / 1000,
      feed_factor: Math.round(feedFactor * 1000) / 1000,
    };
  }
}

// Singleton
export const adaptivePipelineGeneratorEngine =
  new AdaptivePipelineGeneratorEngine();
