/**
 * ProvenPipelineOrchestratorEngine
 * =================================
 * Master orchestrator for the Proven Pipeline system. Chains three engines:
 *   - ProvenPartRecipeEngine: CRUD for proven part recipes
 *   - PartSimilarityEngine: multi-dimensional similarity scoring
 *   - AdaptivePipelineGeneratorEngine: adapts proven recipes to new specs
 *
 * Actions (6):
 *   proven_prove_out, proven_find_similar, proven_generate_pipeline,
 *   proven_compare, proven_record_outcome, proven_dashboard
 *
 * @module engines/ProvenPipelineOrchestratorEngine
 * @version 1.0.0
 */

import { provenPartRecipeEngine } from "./ProvenPartRecipeEngine.js";
import { partSimilarityEngine } from "./PartSimilarityEngine.js";
import { adaptivePipelineGeneratorEngine } from "./AdaptivePipelineGeneratorEngine.js";

// ============================================================================
// Types
// ============================================================================

export interface PartSpec {
  material: string;
  iso_group?: string;
  hardness_hb?: number;
  dimensions?: { x: number; y: number; z: number };
  features?: string[];
  tolerances?: { dimension: string; value_mm: number }[];
  surface_finish_ra?: number;
  operations?: string[];
  machine_type?: string;
  batch_size?: number;
}

export interface ProveOutResult {
  recipe_id: string;
  complexity_score: number;
  feature_histogram: Record<string, number>;
  tolerance_histogram: Record<string, number>;
  operation_count: number;
  estimated_cycle_time_min?: number;
  created_at: string;
}

export interface SimilarMatch {
  recipe_id: string;
  score: number;
  breakdown: Record<string, number>;
  recipe_summary: {
    material: string;
    operations: string[];
    part_name?: string;
  };
}

export interface GeneratedPipeline {
  no_match?: boolean;
  recommendation?: string;
  source_recipe_id?: string;
  similarity_score?: number;
  confidence: number;
  adapted_steps: AdaptedStep[];
  warnings: string[];
  estimated_cycle_time_min?: number;
}

export interface AdaptedStep {
  step_index: number;
  operation: string;
  tool_diameter_mm: number;
  tool_type: string;
  rpm: number;
  feed_mmmin: number;
  axial_depth_mm: number;
  radial_depth_mm: number;
  coolant: string;
  adaptation_notes: string[];
}

export interface CompareResult {
  source_recipe_id: string;
  steps: StepComparison[];
  overall_deviation_pct: number;
  risk_assessment: string;
}

export interface StepComparison {
  step_index: number;
  operation: string;
  parameter: string;
  proven_value: number | string;
  adapted_value: number | string;
  deviation_pct: number;
  risk: "low" | "medium" | "high";
}

export interface OutcomeRecord {
  recipe_id: string;
  timestamp: string;
  success: boolean;
  actual_cycle_time_min?: number;
  dimension_accuracy_pct?: number;
  surface_finish_actual_ra?: number;
  notes?: string;
}

export interface DashboardResult {
  total_recipes: number;
  total_reuses: number;
  overall_success_rate: number;
  top_recipes: { recipe_id: string; part_name: string; reuse_count: number; success_rate: number }[];
  material_distribution: Record<string, number>;
  avg_confidence: number;
}

// ============================================================================
// Engine
// ============================================================================

export class ProvenPipelineOrchestratorEngine {
  /**
   * proven_prove_out — Create a proven recipe and enrich with computed metrics.
   */
  proveOut(params: {
    part_name: string;
    spec: PartSpec;
    steps: {
      operation: string;
      tool_diameter_mm: number;
      tool_type: string;
      rpm: number;
      feed_mmmin: number;
      axial_depth_mm: number;
      radial_depth_mm: number;
      coolant: string;
    }[];
    cycle_time_min?: number;
    notes?: string;
    tags?: string[];
  }): ProveOutResult {
    // Build recipe via the recipe engine
    const recipe = provenPartRecipeEngine.create({
      part_name: params.part_name,
      material: params.spec.material,
      iso_group: params.spec.iso_group ?? "P",
      hardness_hb: params.spec.hardness_hb,
      dimensions: params.spec.dimensions,
      features: params.spec.features ?? [],
      tolerances: params.spec.tolerances ?? [],
      surface_finish_ra: params.spec.surface_finish_ra,
      operations: params.steps.map((s) => s.operation),
      steps: params.steps,
      cycle_time_min: params.cycle_time_min,
      notes: params.notes,
      tags: params.tags ?? [],
    });

    // Compute histograms
    const featureHistogram: Record<string, number> = {};
    for (const f of params.spec.features ?? []) {
      featureHistogram[f] = (featureHistogram[f] ?? 0) + 1;
    }
    const toleranceHistogram: Record<string, number> = {};
    for (const t of params.spec.tolerances ?? []) {
      const bucket =
        t.value_mm <= 0.01
          ? "ultra_precision"
          : t.value_mm <= 0.05
            ? "precision"
            : t.value_mm <= 0.1
              ? "standard"
              : "loose";
      toleranceHistogram[bucket] = (toleranceHistogram[bucket] ?? 0) + 1;
    }

    // Complexity scoring: weighted sum of features, tolerances, operations
    const featureCount = (params.spec.features ?? []).length;
    const toleranceCount = (params.spec.tolerances ?? []).length;
    const opCount = params.steps.length;
    const tightestTol = Math.min(
      ...(params.spec.tolerances ?? []).map((t) => t.value_mm),
      1.0
    );
    const tolFactor = tightestTol < 0.02 ? 3 : tightestTol < 0.05 ? 2 : 1;
    const complexityScore = Math.min(
      100,
      featureCount * 5 + toleranceCount * 8 * tolFactor + opCount * 6
    );

    return {
      recipe_id: recipe.id,
      complexity_score: complexityScore,
      feature_histogram: featureHistogram,
      tolerance_histogram: toleranceHistogram,
      operation_count: opCount,
      estimated_cycle_time_min: params.cycle_time_min,
      created_at: recipe.created_at,
    };
  }

  /**
   * proven_find_similar — Find N most similar proven parts for a new spec.
   */
  findSimilar(params: {
    spec: PartSpec;
    top_n?: number;
    min_score?: number;
    custom_weights?: Record<string, number>;
  }): SimilarMatch[] {
    const topN = params.top_n ?? 5;
    const minScore = params.min_score ?? 0.0;
    const allRecipes = provenPartRecipeEngine.list();

    if (allRecipes.length === 0) return [];

    // Score each recipe against the spec
    const scored: SimilarMatch[] = [];
    for (const recipe of allRecipes) {
      const recipeSpec: PartSpec = {
        material: recipe.material,
        iso_group: recipe.iso_group,
        hardness_hb: recipe.hardness_hb,
        dimensions: recipe.dimensions,
        features: recipe.features,
        tolerances: recipe.tolerances,
        surface_finish_ra: recipe.surface_finish_ra,
        operations: recipe.operations,
      };
      const result = partSimilarityEngine.compare(
        params.spec,
        recipeSpec,
        params.custom_weights
      );
      if (result.overall >= minScore) {
        scored.push({
          recipe_id: recipe.id,
          score: result.overall,
          breakdown: result.breakdown,
          recipe_summary: {
            material: recipe.material,
            operations: recipe.operations,
            part_name: recipe.part_name,
          },
        });
      }
    }

    // Sort descending by score, take top N
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topN);
  }

  /**
   * proven_generate_pipeline — Full pipeline: findSimilar -> adapt -> return pipeline with confidence.
   */
  generatePipeline(params: {
    spec: PartSpec;
    recipe_id?: string;
    custom_weights?: Record<string, number>;
    aggressiveness?: number;
  }): GeneratedPipeline {
    let sourceRecipe: any;
    let similarityScore: number;

    if (params.recipe_id) {
      // Use specific recipe
      sourceRecipe = provenPartRecipeEngine.get(params.recipe_id);
      if (!sourceRecipe) {
        return {
          no_match: true,
          recommendation: `Recipe ${params.recipe_id} not found`,
          confidence: 0,
          adapted_steps: [],
          warnings: [`Recipe ${params.recipe_id} does not exist`],
        };
      }
      // Still compute similarity for confidence
      const recipeSpec: PartSpec = {
        material: sourceRecipe.material,
        iso_group: sourceRecipe.iso_group,
        hardness_hb: sourceRecipe.hardness_hb,
        dimensions: sourceRecipe.dimensions,
        features: sourceRecipe.features,
        tolerances: sourceRecipe.tolerances,
        surface_finish_ra: sourceRecipe.surface_finish_ra,
        operations: sourceRecipe.operations,
      };
      const sim = partSimilarityEngine.compare(
        params.spec,
        recipeSpec,
        params.custom_weights
      );
      similarityScore = sim.overall;
    } else {
      // Find best match
      const matches = this.findSimilar({
        spec: params.spec,
        top_n: 1,
        custom_weights: params.custom_weights,
      });
      if (matches.length === 0 || matches[0].score < 0.40) {
        return {
          no_match: true,
          recommendation: "create from scratch",
          confidence: 0,
          adapted_steps: [],
          warnings: [
            matches.length === 0
              ? "No proven recipes exist in the database"
              : `Best match score ${matches[0].score.toFixed(3)} is below 0.40 threshold`,
          ],
        };
      }
      sourceRecipe = provenPartRecipeEngine.get(matches[0].recipe_id);
      similarityScore = matches[0].score;
    }

    // Adapt the proven recipe to the new spec using flat-format adapt()
    const adapted = adaptivePipelineGeneratorEngine.adapt({
      source_recipe: {
        iso_group: sourceRecipe.iso_group,
        hardness_hb: sourceRecipe.hardness_hb,
        dimensions: sourceRecipe.dimensions,
        steps: sourceRecipe.steps,
        cycle_time_min: sourceRecipe.cycle_time_min,
      },
      target_spec: params.spec,
      similarity_score: similarityScore,
      aggressiveness: params.aggressiveness,
    });

    return {
      source_recipe_id: sourceRecipe.id,
      similarity_score: similarityScore,
      confidence: adapted.confidence,
      adapted_steps: adapted.steps.map((s, i) => ({ step_index: i, ...s })),
      warnings: adapted.warnings,
      estimated_cycle_time_min: adapted.estimated_cycle_time_min,
    };
  }

  /**
   * proven_compare — Diff adapted pipeline vs proven recipe (step-by-step parameter comparison).
   */
  compare(params: {
    recipe_id: string;
    adapted_steps: AdaptedStep[];
  }): CompareResult {
    const recipe = provenPartRecipeEngine.get(params.recipe_id);
    if (!recipe) {
      return {
        source_recipe_id: params.recipe_id,
        steps: [],
        overall_deviation_pct: 100,
        risk_assessment: "Recipe not found — cannot compare",
      };
    }

    const comparisons: StepComparison[] = [];
    const maxLen = Math.max(recipe.steps.length, params.adapted_steps.length);

    for (let i = 0; i < maxLen; i++) {
      const proven = recipe.steps[i];
      const adapted = params.adapted_steps[i];
      if (!proven || !adapted) {
        comparisons.push({
          step_index: i,
          operation: proven?.operation ?? adapted?.operation ?? "unknown",
          parameter: "step_existence",
          proven_value: proven ? "present" : "missing",
          adapted_value: adapted ? "present" : "missing",
          deviation_pct: 100,
          risk: "high",
        });
        continue;
      }

      // Compare numeric parameters
      const numericParams: { key: string; provenVal: number; adaptedVal: number }[] = [
        { key: "rpm", provenVal: proven.rpm, adaptedVal: adapted.rpm },
        { key: "feed_mmmin", provenVal: proven.feed_mmmin, adaptedVal: adapted.feed_mmmin },
        { key: "axial_depth_mm", provenVal: proven.axial_depth_mm, adaptedVal: adapted.axial_depth_mm },
        { key: "radial_depth_mm", provenVal: proven.radial_depth_mm, adaptedVal: adapted.radial_depth_mm },
        { key: "tool_diameter_mm", provenVal: proven.tool_diameter_mm, adaptedVal: adapted.tool_diameter_mm },
      ];

      for (const np of numericParams) {
        const dev =
          np.provenVal === 0
            ? np.adaptedVal === 0
              ? 0
              : 100
            : Math.abs(np.adaptedVal - np.provenVal) / np.provenVal * 100;
        const risk: "low" | "medium" | "high" =
          dev <= 10 ? "low" : dev <= 30 ? "medium" : "high";
        comparisons.push({
          step_index: i,
          operation: proven.operation,
          parameter: np.key,
          proven_value: np.provenVal,
          adapted_value: np.adaptedVal,
          deviation_pct: Math.round(dev * 100) / 100,
          risk,
        });
      }

      // Compare string parameters
      if (proven.coolant !== adapted.coolant) {
        comparisons.push({
          step_index: i,
          operation: proven.operation,
          parameter: "coolant",
          proven_value: proven.coolant,
          adapted_value: adapted.coolant,
          deviation_pct: 100,
          risk: "medium",
        });
      }
    }

    const avgDev =
      comparisons.length === 0
        ? 0
        : comparisons.reduce((s, c) => s + c.deviation_pct, 0) / comparisons.length;
    const highCount = comparisons.filter((c) => c.risk === "high").length;
    const riskAssessment =
      highCount === 0
        ? avgDev < 10
          ? "Low risk — close match to proven parameters"
          : "Moderate risk — some parameters deviate from proven values"
        : `High risk — ${highCount} parameter(s) deviate significantly from proven values`;

    return {
      source_recipe_id: params.recipe_id,
      steps: comparisons,
      overall_deviation_pct: Math.round(avgDev * 100) / 100,
      risk_assessment: riskAssessment,
    };
  }

  /**
   * proven_record_outcome — Append to recipe's reuse_history, update similarity weights via EMA.
   */
  recordOutcome(params: {
    recipe_id: string;
    success: boolean;
    actual_cycle_time_min?: number;
    dimension_accuracy_pct?: number;
    surface_finish_actual_ra?: number;
    notes?: string;
  }): { recorded: boolean; updated_weights?: Record<string, number>; reuse_count: number } {
    const recipe = provenPartRecipeEngine.get(params.recipe_id);
    if (!recipe) {
      return { recorded: false, reuse_count: 0 };
    }

    const outcome: OutcomeRecord = {
      recipe_id: params.recipe_id,
      timestamp: new Date().toISOString(),
      success: params.success,
      actual_cycle_time_min: params.actual_cycle_time_min,
      dimension_accuracy_pct: params.dimension_accuracy_pct,
      surface_finish_actual_ra: params.surface_finish_actual_ra,
      notes: params.notes,
    };

    // Append outcome to recipe
    provenPartRecipeEngine.recordReuse(params.recipe_id, outcome);

    // EMA weight learning based on outcome
    const currentWeights = partSimilarityEngine.getWeights();
    const updatedWeights = { ...currentWeights };
    const dimScore = params.dimension_accuracy_pct ?? 50;

    if (params.success && dimScore > 80) {
      // Good outcome with high dimension accuracy — boost dimension weight
      updatedWeights.dimensions = (updatedWeights.dimensions ?? 0.20) * 1.02;
      updatedWeights.tolerances = (updatedWeights.tolerances ?? 0.15) * 1.02;
    } else if (!params.success && dimScore > 80) {
      // Failure despite high dimension accuracy — dimension similarity was misleading
      updatedWeights.dimensions = (updatedWeights.dimensions ?? 0.20) * 0.95;
    }

    if (params.success && params.surface_finish_actual_ra !== undefined) {
      updatedWeights.surface_finish = (updatedWeights.surface_finish ?? 0.10) * 1.02;
    } else if (!params.success && params.surface_finish_actual_ra !== undefined) {
      updatedWeights.surface_finish = (updatedWeights.surface_finish ?? 0.10) * 0.95;
    }

    // Normalize weights to sum to 1.0
    const total = Object.values(updatedWeights).reduce((s, v) => s + v, 0);
    if (total > 0) {
      for (const key of Object.keys(updatedWeights)) {
        updatedWeights[key] = updatedWeights[key] / total;
      }
    }

    partSimilarityEngine.setWeights(updatedWeights);

    const reuse = provenPartRecipeEngine.getReuseHistory(params.recipe_id);
    return {
      recorded: true,
      updated_weights: updatedWeights,
      reuse_count: reuse.length,
    };
  }

  /**
   * proven_dashboard — Summary stats: total recipes, reuses, success rate, top recipes.
   */
  dashboard(): DashboardResult {
    const allRecipes = provenPartRecipeEngine.list();
    const totalRecipes = allRecipes.length;
    let totalReuses = 0;
    let totalSuccesses = 0;
    let confidenceSum = 0;
    const materialDist: Record<string, number> = {};

    const recipeStats: {
      recipe_id: string;
      part_name: string;
      reuse_count: number;
      success_rate: number;
    }[] = [];

    for (const recipe of allRecipes) {
      const history = provenPartRecipeEngine.getReuseHistory(recipe.id);
      const reuseCount = history.length;
      totalReuses += reuseCount;
      const successes = history.filter((h: OutcomeRecord) => h.success).length;
      totalSuccesses += successes;
      confidenceSum += recipe.confidence ?? 0.5;

      materialDist[recipe.material] = (materialDist[recipe.material] ?? 0) + 1;

      recipeStats.push({
        recipe_id: recipe.id,
        part_name: recipe.part_name,
        reuse_count: reuseCount,
        success_rate: reuseCount > 0 ? successes / reuseCount : 0,
      });
    }

    // Sort by reuse count descending, take top 10
    recipeStats.sort((a, b) => b.reuse_count - a.reuse_count);
    const topRecipes = recipeStats.slice(0, 10);

    return {
      total_recipes: totalRecipes,
      total_reuses: totalReuses,
      overall_success_rate: totalReuses > 0 ? totalSuccesses / totalReuses : 0,
      top_recipes: topRecipes,
      material_distribution: materialDist,
      avg_confidence:
        totalRecipes > 0 ? confidenceSum / totalRecipes : 0,
    };
  }
}

/** Singleton */
export const provenPipelineOrchestratorEngine =
  new ProvenPipelineOrchestratorEngine();
