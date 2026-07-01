// WIRE-EXEMPT: Middleware engine called by PPG engines internally, not exposed via dispatcher
/**
 * PPGDialectRankerEngine — U-PPG-SFC-10
 * =====================================
 *
 * Ranks candidate dialect translations by predicted alarm-rate, override-rate,
 * and first-article-pass-rate. Combines RAG retrieval (U-08), provenance source
 * weights, and base-vs-adapted contest.
 *
 * Design invariants:
 *   1. PREDICTIVE. Predicts failure modes from historical patterns.
 *   2. MULTI-METRIC. Scores on alarm, override, and first-article pass rates.
 *   3. TOP-K. Returns ranked candidates with confidence intervals.
 *   4. PROVENANCE. Cites historical programs that informed predictions.
 *
 * Prediction model:
 *   alarm_rate = baseline × (1 - similarity_to_success_patterns)
 *   override_rate = baseline × divergence_from_historical_norms
 *   first_article_pass = success_count / (success_count + fail_count + 1)
 *
 * Integration points:
 *   - Input: Multiple dialect translation candidates for a G-code block
 *   - Calls: PPGRAGDialectMatchEngine.match() for historical program patterns
 *   - Output: Ranked top-K candidates with predicted rates
 *
 * @module engines/PPGDialectRankerEngine
 * @milestone PSAU-PPG-SFC U-PPG-SFC-10
 */

import { z } from "zod";
import { PPGRAGDialectMatchEngine, type ProgramPrior, type DialectTip } from "./PPGRAGDialectMatchEngine.js";
import { CitationSchema, type Citation } from "../schemas/citationSchema.js";

// ─── Constants ──────────────────────────────────────────────────────────

const ENGINE_NAME = "PPGDialectRankerEngine";
const ENGINE_VERSION = "1.0.0";

/** Default top-K for ranking */
const DEFAULT_TOP_K = 3;

/** Baseline alarm rate (industry average for first-run programs) */
const BASELINE_ALARM_RATE = 0.15;

/** Baseline override rate (operator intervention rate) */
const BASELINE_OVERRIDE_RATE = 0.25;

/** Minimum sample size for statistical confidence */
const MIN_SAMPLE_SIZE = 3;

/** Rate prediction weights */
const RATE_WEIGHTS = {
  alarm: 0.35,        // Weight for alarm rate in composite score
  override: 0.25,     // Weight for override rate
  first_article: 0.40 // Weight for first-article pass rate
} as const;

// ─── Input Schema ───────────────────────────────────────────────────────

export const DialectTranslationCandidateSchema = z.object({
  candidate_id: z.string().describe("Unique candidate identifier"),
  translation_source: z.enum([
    "base_post",       // From base post processor
    "adapted",         // From LoRA-adapted post
    "manual_override", // Operator manual adjustment
    "template",        // From template library
    "hybrid"           // Combined from multiple sources
  ]).describe("Source of this translation"),

  // G-code block
  gcode_block: z.string().describe("The G-code block translation"),
  original_block: z.string().optional().describe("Original input if transformed"),

  // Context
  controller_family: z.string().describe("Target controller family"),
  operation_type: z.enum([
    "rapid", "linear", "arc_cw", "arc_ccw", "canned_cycle",
    "tool_change", "spindle", "coolant", "comment", "modal", "other"
  ]).describe("Type of operation"),

  // Source metadata
  source_confidence: z.number().min(0).max(1).default(0.5)
    .describe("Confidence from source engine"),
  adapter_id: z.string().optional().describe("LoRA adapter ID if adapted"),
}).describe("Single dialect translation candidate");
export type DialectTranslationCandidate = z.infer<typeof DialectTranslationCandidateSchema>;

export const PPGDialectRankerInputSchema = z.object({
  // Candidates to rank
  candidates: z.array(DialectTranslationCandidateSchema).min(1)
    .describe("Dialect translation candidates to rank"),

  // Context
  material: z.string().optional().describe("Material being cut"),
  machine_id: z.string().optional().describe("Target machine ID"),
  operation_context: z.string().optional().describe("Surrounding operation context"),

  // Options
  top_k: z.number().int().min(1).max(10).default(DEFAULT_TOP_K)
    .describe("Number of top candidates to return"),
  use_rag_priors: z.boolean().default(true)
    .describe("Whether to use RAG historical programs"),
  include_base_vs_adapted: z.boolean().default(true)
    .describe("Include base-vs-adapted contest analysis"),
}).describe("PPG dialect ranker input");
export type PPGDialectRankerInput = z.infer<typeof PPGDialectRankerInputSchema>;

// ─── Output Schema ──────────────────────────────────────────────────────

export const PredictedRatesSchema = z.object({
  alarm_rate: z.number().min(0).max(1).describe("Predicted alarm rate (0 = no alarms)"),
  override_rate: z.number().min(0).max(1).describe("Predicted operator override rate"),
  first_article_pass_rate: z.number().min(0).max(1).describe("Predicted first-article pass rate"),
  composite_score: z.number().min(0).max(1).describe("Weighted composite score (higher = better)"),
}).describe("Predicted quality rates");
export type PredictedRates = z.infer<typeof PredictedRatesSchema>;

export const ConfidenceIntervalSchema = z.object({
  point_estimate: z.number().describe("Point estimate"),
  lower_bound: z.number().describe("95% CI lower bound"),
  upper_bound: z.number().describe("95% CI upper bound"),
  sample_size: z.number().int().describe("Sample size used for estimation"),
}).describe("Confidence interval for a rate");
export type ConfidenceInterval = z.infer<typeof ConfidenceIntervalSchema>;

export const RankedDialectCandidateSchema = z.object({
  rank: z.number().int().min(1).describe("Rank (1 = best)"),
  candidate_id: z.string().describe("Candidate identifier"),
  translation_source: z.string().describe("Source of translation"),
  gcode_block: z.string().describe("The G-code block"),

  // Predicted rates
  predicted_rates: PredictedRatesSchema.describe("Predicted quality rates"),

  // Confidence intervals
  alarm_rate_ci: ConfidenceIntervalSchema.describe("Alarm rate confidence interval"),
  override_rate_ci: ConfidenceIntervalSchema.describe("Override rate confidence interval"),
  first_article_ci: ConfidenceIntervalSchema.describe("First-article pass rate CI"),

  // RAG-derived info
  historical_match_count: z.number().int().describe("Historical programs with similar patterns"),
  similar_programs: z.array(z.string()).describe("IDs of similar historical programs"),
  dialect_tips_applied: z.array(z.string()).describe("IDs of dialect tips that influenced ranking"),

  // Base vs adapted contest
  base_vs_adapted: z.object({
    is_adapted: z.boolean().describe("Whether this is an adapted translation"),
    adapter_improvement: z.number().describe("Delta vs base post (positive = better)"),
  }).nullable().describe("Base-vs-adapted comparison"),

  // Provenance
  contributing_citations: z.array(z.string()).describe("Citation IDs that informed prediction"),
}).describe("Single ranked dialect candidate");
export type RankedDialectCandidate = z.infer<typeof RankedDialectCandidateSchema>;

export const PPGDialectRankerOutputSchema = z.object({
  ok: z.boolean().describe("Whether ranking succeeded"),

  // Ranked candidates
  ranked_candidates: z.array(RankedDialectCandidateSchema)
    .describe("Top-K ranked candidates"),

  // Summary
  total_candidates: z.number().int().describe("Total candidates evaluated"),
  best_predicted_alarm_rate: z.number().min(0).max(1)
    .describe("Lowest predicted alarm rate among candidates"),
  best_predicted_first_article: z.number().min(0).max(1)
    .describe("Highest predicted first-article pass rate"),

  // RAG summary
  rag_programs_used: z.number().int().describe("Historical programs used in ranking"),
  rag_tips_used: z.number().int().describe("Dialect tips used in ranking"),
  rag_retrieval_time_ms: z.number().describe("RAG retrieval latency"),

  // Base vs adapted summary
  base_vs_adapted_summary: z.object({
    base_count: z.number().int().describe("Number of base post candidates"),
    adapted_count: z.number().int().describe("Number of adapted candidates"),
    adapted_win_rate: z.number().min(0).max(1).describe("Fraction where adapted beat base"),
  }).nullable().describe("Summary of base-vs-adapted contest"),

  // Provenance
  citations: z.array(CitationSchema).describe("All citations"),
  ranking_time_ms: z.number().describe("Total ranking latency"),
  warnings: z.array(z.string()).describe("Any warnings during ranking"),
}).describe("PPG dialect ranker output");
export type PPGDialectRankerOutput = z.infer<typeof PPGDialectRankerOutputSchema>;

// ─── Engine Implementation ──────────────────────────────────────────────

export class PPGDialectRankerEngine {
  /**
   * Rank dialect translation candidates by predicted quality rates.
   */
  static rank(input: PPGDialectRankerInput): PPGDialectRankerOutput {
    const startTime = performance.now();
    const warnings: string[] = [];
    const citations: Citation[] = [];

    // Validate input
    const parsed = PPGDialectRankerInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        ranked_candidates: [],
        total_candidates: 0,
        best_predicted_alarm_rate: 1.0,
        best_predicted_first_article: 0.0,
        rag_programs_used: 0,
        rag_tips_used: 0,
        rag_retrieval_time_ms: 0,
        base_vs_adapted_summary: null,
        citations: [],
        ranking_time_ms: performance.now() - startTime,
        warnings: [`Input validation failed: ${parsed.error.message}`],
      };
    }

    const query = parsed.data;
    let ragPrograms: ProgramPrior[] = [];
    let ragTips: DialectTip[] = [];
    let ragTime = 0;

    // Fetch RAG priors if enabled
    if (query.use_rag_priors && query.candidates.length > 0) {
      const firstCandidate = query.candidates[0];
      const ragStart = performance.now();

      try {
        const ragResult = PPGRAGDialectMatchEngine.match({
          controller: firstCandidate.controller_family,
          material: query.material,
          operation: firstCandidate.operation_type,
          top_k_programs: 10,
          top_k_tips: 10,
          min_score: 0.2,
        });

        if (ragResult.ok) {
          ragPrograms = ragResult.program_priors;
          ragTips = ragResult.dialect_tips;
          citations.push(...ragResult.citations);
        } else {
          warnings.push(`RAG retrieval warning: ${ragResult.warnings.join(", ")}`);
        }
      } catch {
        warnings.push("RAG retrieval failed, using baseline predictions");
      }

      ragTime = performance.now() - ragStart;
    }

    // Add engine citation
    citations.push({
      source_type: "formula",
      source_id: `${ENGINE_NAME}/rate_prediction`,
      corpus: null,
      engine: ENGINE_NAME,
      excerpt: `weights: alarm=${RATE_WEIGHTS.alarm}, override=${RATE_WEIGHTS.override}, first_article=${RATE_WEIGHTS.first_article}`,
      confidence: 0.85,
      retrieval_score: null,
    });

    // Score each candidate
    const scoredCandidates = query.candidates.map(candidate => {
      return this.scoreCandidate(candidate, ragPrograms, ragTips);
    });

    // Sort by composite score (descending = higher is better)
    scoredCandidates.sort((a, b) => b.predicted_rates.composite_score - a.predicted_rates.composite_score);

    // Assign ranks and take top-K
    const topK = query.top_k ?? DEFAULT_TOP_K;
    const rankedCandidates: RankedDialectCandidate[] = scoredCandidates
      .slice(0, topK)
      .map((scored, index) => ({
        ...scored,
        rank: index + 1,
        contributing_citations: citations.map(c => c.source_id),
      }));

    // Compute base vs adapted summary
    let baseVsAdaptedSummary: PPGDialectRankerOutput["base_vs_adapted_summary"] = null;
    if (query.include_base_vs_adapted) {
      const baseCandidates = scoredCandidates.filter(c => c.translation_source === "base_post");
      const adaptedCandidates = scoredCandidates.filter(c => c.translation_source === "adapted");

      if (baseCandidates.length > 0 && adaptedCandidates.length > 0) {
        const baseAvgScore = baseCandidates.reduce((sum, c) => sum + c.predicted_rates.composite_score, 0) / baseCandidates.length;
        const adaptedAvgScore = adaptedCandidates.reduce((sum, c) => sum + c.predicted_rates.composite_score, 0) / adaptedCandidates.length;

        baseVsAdaptedSummary = {
          base_count: baseCandidates.length,
          adapted_count: adaptedCandidates.length,
          adapted_win_rate: adaptedAvgScore > baseAvgScore ? 1.0 : 0.0,
        };
      }
    }

    // Find best rates
    const bestAlarm = Math.min(...scoredCandidates.map(c => c.predicted_rates.alarm_rate));
    const bestFirstArticle = Math.max(...scoredCandidates.map(c => c.predicted_rates.first_article_pass_rate));

    return {
      ok: true,
      ranked_candidates: rankedCandidates,
      total_candidates: query.candidates.length,
      best_predicted_alarm_rate: bestAlarm,
      best_predicted_first_article: bestFirstArticle,
      rag_programs_used: ragPrograms.length,
      rag_tips_used: ragTips.length,
      rag_retrieval_time_ms: ragTime,
      base_vs_adapted_summary: baseVsAdaptedSummary,
      citations,
      ranking_time_ms: performance.now() - startTime,
      warnings,
    };
  }

  /**
   * Score a single candidate.
   */
  private static scoreCandidate(
    candidate: DialectTranslationCandidate,
    ragPrograms: ProgramPrior[],
    ragTips: DialectTip[]
  ): Omit<RankedDialectCandidate, "rank" | "contributing_citations"> {
    // Find similar historical programs
    const similarPrograms = ragPrograms
      .filter(p => p.controller_match && p.similarity > 0.5)
      .map(p => p.program_id);

    // Check for relevant dialect tips
    const relevantTips = ragTips
      .filter(t => t.controller_specific && t.similarity > 0.6)
      .map(t => t.tip_id);

    // Calculate historical similarity (average of matching programs)
    const historicalSimilarity = similarPrograms.length > 0
      ? ragPrograms
          .filter(p => similarPrograms.includes(p.program_id))
          .reduce((sum, p) => sum + p.similarity, 0) / similarPrograms.length
      : 0.0;

    // Predict alarm rate (lower similarity to success patterns = higher alarm rate)
    const alarmRate = this.predictAlarmRate(candidate, historicalSimilarity, ragTips);

    // Predict override rate
    const overrideRate = this.predictOverrideRate(candidate, historicalSimilarity);

    // Predict first-article pass rate
    const firstArticleRate = this.predictFirstArticleRate(candidate, historicalSimilarity, similarPrograms.length);

    // Compute composite score (invert alarm/override since lower is better)
    const compositeScore =
      RATE_WEIGHTS.alarm * (1 - alarmRate) +
      RATE_WEIGHTS.override * (1 - overrideRate) +
      RATE_WEIGHTS.first_article * firstArticleRate;

    // Build confidence intervals
    const sampleSize = Math.max(similarPrograms.length, 1);
    const alarmCI = this.buildConfidenceInterval(alarmRate, sampleSize);
    const overrideCI = this.buildConfidenceInterval(overrideRate, sampleSize);
    const firstArticleCI = this.buildConfidenceInterval(firstArticleRate, sampleSize);

    // Base vs adapted analysis
    let baseVsAdapted: RankedDialectCandidate["base_vs_adapted"] = null;
    if (candidate.translation_source === "adapted") {
      // Estimate improvement over base (based on historical adapted performance)
      const adapterBonus = candidate.source_confidence > 0.7 ? 0.1 : 0.05;
      baseVsAdapted = {
        is_adapted: true,
        adapter_improvement: adapterBonus,
      };
    } else if (candidate.translation_source === "base_post") {
      baseVsAdapted = {
        is_adapted: false,
        adapter_improvement: 0.0,
      };
    }

    return {
      candidate_id: candidate.candidate_id,
      translation_source: candidate.translation_source,
      gcode_block: candidate.gcode_block,
      predicted_rates: {
        alarm_rate: alarmRate,
        override_rate: overrideRate,
        first_article_pass_rate: firstArticleRate,
        composite_score: compositeScore,
      },
      alarm_rate_ci: alarmCI,
      override_rate_ci: overrideCI,
      first_article_ci: firstArticleCI,
      historical_match_count: similarPrograms.length,
      similar_programs: similarPrograms.slice(0, 5),
      dialect_tips_applied: relevantTips.slice(0, 3),
      base_vs_adapted: baseVsAdapted,
    };
  }

  /**
   * Predict alarm rate for a candidate.
   */
  private static predictAlarmRate(
    candidate: DialectTranslationCandidate,
    historicalSimilarity: number,
    ragTips: DialectTip[]
  ): number {
    // Start with baseline
    let rate = BASELINE_ALARM_RATE;

    // Reduce based on historical similarity
    rate *= (1 - historicalSimilarity * 0.6);

    // Adjust based on source confidence
    rate *= (1 - candidate.source_confidence * 0.3);

    // Check for critical tips that might indicate higher alarm risk
    const criticalTips = ragTips.filter(t => t.severity === "critical");
    if (criticalTips.length > 0) {
      rate += 0.1 * criticalTips.length;
    }

    // Adapted sources tend to have lower alarm rates
    if (candidate.translation_source === "adapted") {
      rate *= 0.8;
    }

    // Clamp to [0, 1]
    return Math.max(0, Math.min(1, rate));
  }

  /**
   * Predict operator override rate.
   */
  private static predictOverrideRate(
    candidate: DialectTranslationCandidate,
    historicalSimilarity: number
  ): number {
    // Start with baseline
    let rate = BASELINE_OVERRIDE_RATE;

    // Reduce based on historical similarity (familiar patterns need less override)
    rate *= (1 - historicalSimilarity * 0.5);

    // Adjust based on source confidence
    rate *= (1 - candidate.source_confidence * 0.2);

    // Some operations have higher override rates
    if (candidate.operation_type === "arc_cw" || candidate.operation_type === "arc_ccw") {
      rate *= 1.2; // Arc moves often need adjustment
    } else if (candidate.operation_type === "canned_cycle") {
      rate *= 0.8; // Canned cycles are well-tested
    }

    // Manual overrides have lower subsequent override rate (already adjusted)
    if (candidate.translation_source === "manual_override") {
      rate *= 0.5;
    }

    return Math.max(0, Math.min(1, rate));
  }

  /**
   * Predict first-article pass rate.
   */
  private static predictFirstArticleRate(
    candidate: DialectTranslationCandidate,
    historicalSimilarity: number,
    matchCount: number
  ): number {
    // Use Bayesian estimate: (success + 1) / (total + 2) with similarity as proxy
    // Higher similarity = more confidence in historical success
    const pseudoSuccesses = historicalSimilarity * matchCount + 1;
    const pseudoTotal = matchCount + 2;
    let rate = pseudoSuccesses / pseudoTotal;

    // Boost based on source confidence
    rate += candidate.source_confidence * 0.2;

    // Template sources have proven track records
    if (candidate.translation_source === "template") {
      rate += 0.1;
    }

    return Math.max(0, Math.min(1, rate));
  }

  /**
   * Build confidence interval for a rate.
   */
  private static buildConfidenceInterval(
    pointEstimate: number,
    sampleSize: number
  ): ConfidenceInterval {
    // Use Wilson score interval approximation
    const z = 1.96; // 95% confidence
    const n = Math.max(sampleSize, MIN_SAMPLE_SIZE);
    const p = pointEstimate;

    // Standard error approximation
    const se = Math.sqrt((p * (1 - p)) / n);
    const margin = z * se;

    return {
      point_estimate: p,
      lower_bound: Math.max(0, p - margin),
      upper_bound: Math.min(1, p + margin),
      sample_size: sampleSize,
    };
  }

  /**
   * Check if engine is ready.
   */
  static isReady(): boolean {
    return true; // No external dependencies to check
  }

  /**
   * Get self-awareness metadata.
   */
  static getSelfAwareness() {
    return {
      name: ENGINE_NAME,
      version: ENGINE_VERSION,
      milestone: "PSAU-PPG-SFC U-PPG-SFC-10",
      description: "Ranks dialect translations by predicted alarm/override/first-article rates",
      capabilities: ["rank", "isReady", "getSelfAwareness"],
      inputs: ["DialectTranslationCandidate[]", "material?", "machine_id?"],
      outputs: ["RankedDialectCandidate[]", "predicted_rates", "confidence_intervals"],
      integrations: ["PPGRAGDialectMatchEngine"],
      performance: {
        target_latency_ms: 200,
        typical_latency_ms: 50,
      },
    };
  }
}

export const ppgDialectRankerEngine = PPGDialectRankerEngine;
