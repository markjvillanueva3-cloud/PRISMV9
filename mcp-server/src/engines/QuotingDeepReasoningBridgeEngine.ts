/**
 * QuotingDeepReasoningBridgeEngine — JM-DIE-QUOTE-TRAINING-MS0 / U-QT07
 *
 * Routes quoting accuracy-improvement questions through PRISM's deep-reasoning
 * + NN/GNN substrate. Given a TrainingLoopReport (from U-QT01), generates
 * structured deep-reasoning prompts that PRISMCreativeReasoningEngine can
 * consume to suggest concrete bias-correction strategies.
 *
 * The bridge itself is PURE — it builds prompt envelopes + selects which AI
 * substrate to route to (deterministic by question class). The actual NN/GNN
 * call happens downstream via aiSystemRouterEngine (caller's choice).
 *
 * Question classes routed here:
 *   - "explain-bias"       → why is customer X systematically off?
 *   - "find-pattern"       → what part-features correlate with high MAPE?
 *   - "suggest-rate-adjust" → which default rate would minimize MAPE?
 *   - "cross-customer-rec" → can we transfer ACCURATE's learnings to BETA?
 *   - "outlier-investigate" → top-5 worst predictions — what's wrong?
 *
 * Per R5 (model-for-judgment): we use Claude/Ollama for the JUDGMENT, but
 * the routing decision is deterministic + the citation list is curated from
 * U-QT06's external knowledge catalog.
 *
 * @milestone JM-DIE-QUOTE-TRAINING-MS0/U-QT07
 * @author slot:charlie /goal-17 iter1, 2026-05-24
 */

import type { AccuracyReport, PerCustomerBias } from "./QuotingTrainingLoopEngine.js";
import { outsideKnowledgeSourceCatalogEngine } from "./OutsideKnowledgeSourceCatalogEngine.js";

export type DeepReasoningQuestionClass =
  | "explain-bias"
  | "find-pattern"
  | "suggest-rate-adjust"
  | "cross-customer-rec"
  | "outlier-investigate";

export type AISubstrate =
  | "prism-creative-reasoning"
  | "claude-deep-reasoning"
  | "ollama-fast-classify"
  | "psn-nn-gnn"
  | "tribal-rag";

export interface DeepReasoningPrompt {
  question_class: DeepReasoningQuestionClass;
  ai_substrate: AISubstrate;
  prompt_text: string;
  context_facts: string[];       // structured evidence (no fluff)
  citations: string;             // from U-QT06 catalog
  expected_output_shape: string;
  reason_for_substrate: string;
}

const ROUTING_MAP: Record<DeepReasoningQuestionClass, AISubstrate> = {
  "explain-bias":         "prism-creative-reasoning",  // needs cross-domain synthesis
  "find-pattern":         "psn-nn-gnn",                // graph + feature correlation
  "suggest-rate-adjust":  "claude-deep-reasoning",     // careful numeric reasoning
  "cross-customer-rec":   "prism-creative-reasoning",  // hybrid/innovative bridges
  "outlier-investigate":  "tribal-rag",                // probable causes from shop tribal knowledge
};

const SUBSTRATE_REASONS: Record<AISubstrate, string> = {
  "prism-creative-reasoning": "explores conventional → exploratory → hybrid → innovative → optimal modes for synthesis",
  "claude-deep-reasoning": "careful step-by-step numeric reasoning with citation chains",
  "ollama-fast-classify": "cheap local LLM for high-volume classify tasks",
  "psn-nn-gnn": "feature-correlation analysis over 110K-node graph + psi_delta history",
  "tribal-rag": "retrieves shop-floor tribal knowledge for probable-cause hypotheses",
};

export class QuotingDeepReasoningBridgeEngine {
  /** Build a deep-reasoning prompt envelope for a bias-explanation question. */
  buildExplainBias(report: AccuracyReport, customer: string): DeepReasoningPrompt {
    const bias = report.per_customer_bias.find((b) => b.customer === customer);
    const facts: string[] = [];
    if (bias) {
      facts.push(`customer=${customer}`);
      facts.push(`record_count=${bias.record_count}`);
      facts.push(`mean_signed_pct_error=${bias.mean_pct_error.toFixed(2)}%`);
      facts.push(`mean_abs_pct_error=${bias.mean_abs_pct_error.toFixed(2)}%`);
      facts.push(`systematic_direction=${bias.systematic_direction}`);
    } else {
      facts.push(`customer=${customer}`, `record_count=0`, `note=no-records-for-customer`);
    }
    facts.push(`global_mape=${report.metrics.mape_pct.toFixed(2)}%`);
    facts.push(`global_mae_usd=${report.metrics.mae_usd.toFixed(2)}`);

    const citations = outsideKnowledgeSourceCatalogEngine.citationsFor({
      tokens: ["speeds", "feeds", "cost", "benchmark"],
      categories: ["speeds-feeds", "cost-benchmark"],
      minReliability: 0.85,
      limit: 5,
    });

    const ai_substrate = ROUTING_MAP["explain-bias"];
    return {
      question_class: "explain-bias",
      ai_substrate,
      prompt_text: `Customer ${customer} shows ${bias?.systematic_direction ?? "no detected"} bias of ${bias?.mean_pct_error.toFixed(2) ?? "n/a"}% across ${bias?.record_count ?? 0} records. Identify 3 plausible root causes (material assumption mismatch, machine-rate drift, tolerance creep, surface-finish escalation, or customer-specific operational pattern), citing the catalog sources below. For each cause, propose ONE concrete correction the FMV engine can apply.`,
      context_facts: facts,
      citations,
      expected_output_shape: "{root_causes: [{cause, evidence, correction}], confidence: 0-1}",
      reason_for_substrate: SUBSTRATE_REASONS[ai_substrate],
    };
  }

  /** Build a prompt for "find pattern" — what features correlate with high MAPE? */
  buildFindPattern(report: AccuracyReport): DeepReasoningPrompt {
    const facts: string[] = [
      `total_predicted=${report.total_predicted}`,
      `global_mape=${report.metrics.mape_pct.toFixed(2)}%`,
      `global_mae_usd=${report.metrics.mae_usd.toFixed(2)}`,
      `mean_signed_bias=${report.metrics.mean_signed_pct_error.toFixed(2)}%`,
      `worst_records_count=${report.worst_5_records.length}`,
    ];
    for (const w of report.worst_5_records.slice(0, 3)) {
      facts.push(`worst:${w.customer}:${w.part_id}=actual ${w.actual_usd.toFixed(2)} vs predicted ${w.predicted_fmv_usd.toFixed(2)} (${w.pct_error.toFixed(1)}%)`);
    }
    const citations = outsideKnowledgeSourceCatalogEngine.citationsFor({
      tokens: ["predictive", "ml", "manufacturing"],
      categories: ["process-capability"],
      minReliability: 0.85,
      limit: 3,
    });
    const ai_substrate = ROUTING_MAP["find-pattern"];
    return {
      question_class: "find-pattern",
      ai_substrate,
      prompt_text: `Across the worst 3 prediction failures (above), identify the SHARED feature(s) (material, process, customer, lot size, lead time) that correlate with high MAPE. Use graph-feature correlation on the 110K-node PSN graph to find latent clusters.`,
      context_facts: facts,
      citations,
      expected_output_shape: "{correlated_features: [feature, correlation, evidence], cluster_id?}",
      reason_for_substrate: SUBSTRATE_REASONS[ai_substrate],
    };
  }

  /** Build a prompt for "suggest rate adjust" — what default rate would minimize MAPE? */
  buildSuggestRateAdjust(report: AccuracyReport): DeepReasoningPrompt {
    const facts: string[] = [
      `current_default_machine_rate_usd_per_hr=95`,
      `global_signed_bias_pct=${report.metrics.mean_signed_pct_error.toFixed(2)}`,
      `global_mape_pct=${report.metrics.mape_pct.toFixed(2)}`,
      `total_predicted=${report.total_predicted}`,
    ];
    if (report.metrics.mean_signed_pct_error > 0) {
      facts.push(`hint=over-prediction-suggests-rate-or-overhead-too-high`);
    } else if (report.metrics.mean_signed_pct_error < 0) {
      facts.push(`hint=under-prediction-suggests-rate-or-overhead-too-low`);
    }
    const citations = outsideKnowledgeSourceCatalogEngine.citationsFor({
      tokens: ["labor-rate", "machine-rate", "industry"],
      categories: ["cost-benchmark"],
      minReliability: 0.80,
      limit: 3,
    });
    const ai_substrate = ROUTING_MAP["suggest-rate-adjust"];
    return {
      question_class: "suggest-rate-adjust",
      ai_substrate,
      prompt_text: `Current default machine rate is $95/hr; pipeline shows signed bias of ${report.metrics.mean_signed_pct_error.toFixed(2)}%. Recommend a new default rate that would minimize MAPE, citing AMT/MFG.com benchmarks below. Show the math (target_rate = current_rate / (1 + bias_decimal)).`,
      context_facts: facts,
      citations,
      expected_output_shape: "{recommended_rate_usd_per_hr: number, expected_mape_reduction_pct: number, math: string}",
      reason_for_substrate: SUBSTRATE_REASONS[ai_substrate],
    };
  }

  /** Build a prompt for "cross-customer-rec" — transfer learnings between customers. */
  buildCrossCustomerRec(report: AccuracyReport, sourceCustomer: string, targetCustomer: string): DeepReasoningPrompt {
    const source = report.per_customer_bias.find((b) => b.customer === sourceCustomer);
    const target = report.per_customer_bias.find((b) => b.customer === targetCustomer);
    const facts: string[] = [];
    if (source) facts.push(`source=${sourceCustomer}: ${source.systematic_direction} ${source.mean_pct_error.toFixed(2)}% across ${source.record_count} recs`);
    if (target) facts.push(`target=${targetCustomer}: ${target.systematic_direction} ${target.mean_pct_error.toFixed(2)}% across ${target.record_count} recs`);
    const citations = outsideKnowledgeSourceCatalogEngine.citationsFor({
      tokens: ["transfer", "machinability", "material"],
      categories: ["material-property", "machining-handbook"],
      minReliability: 0.85,
      limit: 3,
    });
    const ai_substrate = ROUTING_MAP["cross-customer-rec"];
    return {
      question_class: "cross-customer-rec",
      ai_substrate,
      prompt_text: `Source customer ${sourceCustomer} and target ${targetCustomer} show different bias profiles. Identify whether the source's correction factor transfers to target (same material? same process? same tolerance class?) — if YES, propose the transfer; if NO, explain the blocking variable.`,
      context_facts: facts,
      citations,
      expected_output_shape: "{transferable: boolean, blocking_variable?: string, proposed_correction?: number}",
      reason_for_substrate: SUBSTRATE_REASONS[ai_substrate],
    };
  }

  /** Build a prompt for "outlier-investigate" — top worst predictions, probable causes. */
  buildOutlierInvestigate(report: AccuracyReport): DeepReasoningPrompt {
    const facts: string[] = [];
    for (const w of report.worst_5_records) {
      facts.push(`outlier:${w.customer}:${w.part_id}=$${w.abs_error_usd.toFixed(2)} error (${w.pct_error.toFixed(1)}%)`);
    }
    const citations = outsideKnowledgeSourceCatalogEngine.citationsFor({
      categories: ["machining-handbook", "speeds-feeds"],
      minReliability: 0.90,
      limit: 5,
    });
    const ai_substrate = ROUTING_MAP["outlier-investigate"];
    return {
      question_class: "outlier-investigate",
      ai_substrate,
      prompt_text: `5 outlier predictions above. For each, draw on shop tribal knowledge (per-machine quirks, material lot variance, fixture-specific setup times) to propose the most likely cause + a one-line diagnostic question the operator could answer to confirm.`,
      context_facts: facts,
      citations,
      expected_output_shape: "{outliers: [{part_id, probable_cause, diagnostic_question}]}",
      reason_for_substrate: SUBSTRATE_REASONS[ai_substrate],
    };
  }

  /** Returns the routing decision (which AI substrate handles which class). */
  getRoutingMap(): Record<DeepReasoningQuestionClass, AISubstrate> {
    return { ...ROUTING_MAP };
  }
}

export const quotingDeepReasoningBridgeEngine = new QuotingDeepReasoningBridgeEngine();
