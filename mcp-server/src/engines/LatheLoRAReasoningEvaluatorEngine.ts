/**
 * LatheLoRAReasoningEvaluatorEngine — LATHE-LORA-MS0 U-LLR15
 * ==========================================================
 *
 * Evaluates LatheLoRA model outputs for reasoning quality.
 * Validates chain-of-thought coherence, domain knowledge,
 * and explanation completeness.
 *
 * Evaluation dimensions:
 *   - Chain-of-thought coherence
 *   - Domain terminology usage
 *   - Justification quality
 *   - Step-by-step reasoning
 *   - Conclusion validity
 *
 * @module engines/LatheLoRAReasoningEvaluatorEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Reasoning evaluation result */
export interface ReasoningEvaluation {
  overall_score: number;        // 0-100
  coherence_score: number;      // 0-100
  domain_score: number;         // 0-100
  justification_score: number;  // 0-100
  structure_score: number;      // 0-100
  completeness_score: number;   // 0-100
  findings: ReasoningFinding[];
  passed: boolean;
}

/** Reasoning finding */
export interface ReasoningFinding {
  dimension: "coherence" | "domain" | "justification" | "structure" | "completeness";
  quality: "excellent" | "good" | "adequate" | "weak" | "missing";
  observation: string;
  suggestion?: string;
}

/** Reasoning configuration */
export interface ReasoningConfig {
  min_explanation_length: number;
  require_justification: boolean;
  require_steps: boolean;
  domain_term_threshold: number;
  passing_score: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: ReasoningConfig = {
  min_explanation_length: 100,
  require_justification: true,
  require_steps: false,
  domain_term_threshold: 3,
  passing_score: 60,
};

/** Domain terminology categories */
const DOMAIN_TERMS: Record<string, string[]> = {
  operations: [
    "roughing", "finishing", "threading", "grooving", "facing",
    "boring", "drilling", "tapping", "parting", "chamfering",
  ],
  tools: [
    "insert", "carbide", "cermet", "ceramic", "cbn", "pcd",
    "holder", "turret", "tool post", "boring bar", "drill",
  ],
  parameters: [
    "speed", "feed", "rpm", "sfm", "ipr", "doc", "depth",
    "surface speed", "chip load", "mrr", "material removal",
  ],
  physics: [
    "force", "power", "torque", "temperature", "deflection",
    "vibration", "chatter", "stability", "wear", "stress",
  ],
  machine: [
    "spindle", "chuck", "tailstock", "carriage", "cross slide",
    "turret", "coolant", "axis", "clearance", "rapid",
  ],
};

/** Reasoning indicators */
const REASONING_INDICATORS = {
  causal: ["because", "therefore", "since", "thus", "due to", "as a result"],
  sequential: ["first", "then", "next", "finally", "step", "after"],
  comparative: ["however", "although", "while", "compared to", "rather than"],
  conclusion: ["recommend", "suggest", "advise", "conclude", "determine"],
  justification: ["reason", "justify", "explain", "rationale", "basis"],
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRAReasoningEvaluatorEngine {
  private config: ReasoningConfig = DEFAULT_CONFIG;

  /**
   * Set evaluation configuration
   */
  setConfig(config: Partial<ReasoningConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ReasoningConfig {
    return { ...this.config };
  }

  /**
   * Evaluate model output for reasoning quality
   */
  evaluate(output: string): ReasoningEvaluation {
    const findings: ReasoningFinding[] = [];

    // 1. Evaluate coherence
    const coherenceScore = this.evaluateCoherence(output, findings);

    // 2. Evaluate domain knowledge
    const domainScore = this.evaluateDomainKnowledge(output, findings);

    // 3. Evaluate justification quality
    const justificationScore = this.evaluateJustification(output, findings);

    // 4. Evaluate structure
    const structureScore = this.evaluateStructure(output, findings);

    // 5. Evaluate completeness
    const completenessScore = this.evaluateCompleteness(output, findings);

    // Calculate overall score
    const overallScore = (
      coherenceScore * 0.25 +
      domainScore * 0.20 +
      justificationScore * 0.25 +
      structureScore * 0.15 +
      completenessScore * 0.15
    );

    const passed = overallScore >= this.config.passing_score;

    return {
      overall_score: Math.round(overallScore),
      coherence_score: Math.round(coherenceScore),
      domain_score: Math.round(domainScore),
      justification_score: Math.round(justificationScore),
      structure_score: Math.round(structureScore),
      completeness_score: Math.round(completenessScore),
      findings,
      passed,
    };
  }

  /**
   * Evaluate reasoning coherence
   */
  private evaluateCoherence(output: string, findings: ReasoningFinding[]): number {
    let score = 50;
    const lower = output.toLowerCase();

    // Check for causal reasoning
    const causalCount = REASONING_INDICATORS.causal.filter(w => lower.includes(w)).length;
    if (causalCount >= 2) {
      score += 20;
      findings.push({
        dimension: "coherence",
        quality: "good",
        observation: `Strong causal reasoning (${causalCount} indicators)`,
      });
    } else if (causalCount === 1) {
      score += 10;
    } else {
      findings.push({
        dimension: "coherence",
        quality: "weak",
        observation: "Limited causal reasoning",
        suggestion: "Use 'because', 'therefore' to explain connections",
      });
    }

    // Check for comparative reasoning
    const comparativeCount = REASONING_INDICATORS.comparative.filter(w => lower.includes(w)).length;
    if (comparativeCount > 0) {
      score += 10;
    }

    // Check for logical flow (transition words)
    const hasTransitions = /however|moreover|furthermore|additionally|consequently/i.test(output);
    if (hasTransitions) {
      score += 10;
    }

    // Penalize contradictions or incoherence
    if (/but also not|increase.*decrease|faster.*slower/i.test(output)) {
      score -= 15;
      findings.push({
        dimension: "coherence",
        quality: "weak",
        observation: "Potential contradiction detected",
        suggestion: "Review for logical consistency",
      });
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Evaluate domain knowledge usage
   */
  private evaluateDomainKnowledge(output: string, findings: ReasoningFinding[]): number {
    let score = 30;
    const lower = output.toLowerCase();
    const termCounts: Record<string, number> = {};

    // Count domain terms by category
    for (const [category, terms] of Object.entries(DOMAIN_TERMS)) {
      termCounts[category] = terms.filter(term => lower.includes(term)).length;
    }

    const totalTerms = Object.values(termCounts).reduce((a, b) => a + b, 0);
    const categoriesUsed = Object.values(termCounts).filter(c => c > 0).length;

    // Score based on term usage
    if (totalTerms >= this.config.domain_term_threshold * 2) {
      score += 40;
      findings.push({
        dimension: "domain",
        quality: "excellent",
        observation: `Rich domain vocabulary (${totalTerms} terms across ${categoriesUsed} categories)`,
      });
    } else if (totalTerms >= this.config.domain_term_threshold) {
      score += 25;
      findings.push({
        dimension: "domain",
        quality: "good",
        observation: `Adequate domain vocabulary (${totalTerms} terms)`,
      });
    } else {
      findings.push({
        dimension: "domain",
        quality: "weak",
        observation: `Limited domain vocabulary (${totalTerms} terms)`,
        suggestion: "Use more manufacturing-specific terminology",
      });
    }

    // Bonus for diverse category usage
    if (categoriesUsed >= 3) {
      score += 15;
    }

    // Bonus for physics terms specifically
    if (termCounts["physics"] >= 2) {
      score += 10;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Evaluate justification quality
   */
  private evaluateJustification(output: string, findings: ReasoningFinding[]): number {
    let score = 40;
    const lower = output.toLowerCase();

    // Check for justification indicators
    const justifyCount = REASONING_INDICATORS.justification.filter(w => lower.includes(w)).length;

    // Check for numerical justification
    const hasNumbers = /\d+(?:\.\d+)?\s*(?:rpm|sfm|ipr|mm|inch|n|kw)/i.test(output);
    if (hasNumbers) {
      score += 15;
    }

    // Check for reference to standards or sources
    const hasReferences = /according\s*to|based\s*on|per\s+|standard|handbook|manual/i.test(output);
    if (hasReferences) {
      score += 15;
      findings.push({
        dimension: "justification",
        quality: "good",
        observation: "Includes references to standards or sources",
      });
    }

    // Check for reasoning about why
    const hasWhyExplanation = /why|reason|purpose|objective|goal/i.test(output);
    if (hasWhyExplanation) {
      score += 10;
    }

    // Check for tradeoff discussion
    const hasTradeoffs = /tradeoff|balance|versus|vs|compromise/i.test(output);
    if (hasTradeoffs) {
      score += 10;
      findings.push({
        dimension: "justification",
        quality: "good",
        observation: "Discusses tradeoffs in decision-making",
      });
    }

    if (this.config.require_justification && justifyCount === 0 && !hasReferences) {
      findings.push({
        dimension: "justification",
        quality: "missing",
        observation: "No explicit justification provided",
        suggestion: "Explain the reasoning behind recommendations",
      });
      score -= 20;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Evaluate response structure
   */
  private evaluateStructure(output: string, findings: ReasoningFinding[]): number {
    let score = 50;

    // Check for step-by-step structure
    const sequentialCount = REASONING_INDICATORS.sequential.filter(w =>
      output.toLowerCase().includes(w)
    ).length;

    if (sequentialCount >= 3) {
      score += 25;
      findings.push({
        dimension: "structure",
        quality: "excellent",
        observation: "Clear step-by-step structure",
      });
    } else if (sequentialCount >= 1) {
      score += 10;
    }

    // Check for markdown formatting
    const hasFormatting = /\*\*|\#\#|\-\s|\d+\./m.test(output);
    if (hasFormatting) {
      score += 15;
    }

    // Check for sections/headers
    const hasSections = /\#\#|:\s*\n/m.test(output);
    if (hasSections) {
      score += 10;
    }

    // Check for conclusion
    const conclusionCount = REASONING_INDICATORS.conclusion.filter(w =>
      output.toLowerCase().includes(w)
    ).length;
    if (conclusionCount > 0) {
      score += 10;
      findings.push({
        dimension: "structure",
        quality: "good",
        observation: "Includes clear recommendations/conclusions",
      });
    }

    // Penalize very short or very long without structure
    if (output.length < 50) {
      score -= 20;
      findings.push({
        dimension: "structure",
        quality: "weak",
        observation: "Response too brief for meaningful structure",
      });
    } else if (output.length > 1000 && !hasFormatting) {
      score -= 10;
      findings.push({
        dimension: "structure",
        quality: "adequate",
        observation: "Long response without formatting",
        suggestion: "Add headers or bullet points for readability",
      });
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Evaluate response completeness
   */
  private evaluateCompleteness(output: string, findings: ReasoningFinding[]): number {
    let score = 50;

    // Check minimum length
    if (output.length >= this.config.min_explanation_length * 2) {
      score += 20;
    } else if (output.length >= this.config.min_explanation_length) {
      score += 10;
    } else {
      score -= 20;
      findings.push({
        dimension: "completeness",
        quality: "weak",
        observation: `Response below minimum length (${output.length} < ${this.config.min_explanation_length})`,
        suggestion: "Provide more detailed explanation",
      });
    }

    // Check for G-code if expected
    const hasGCode = /G\d{1,2}|M\d{1,2}/i.test(output);
    if (hasGCode) {
      score += 15;
    }

    // Check for parameter values
    const hasParameters = /\d+\s*(?:rpm|sfm|ipr|mm)/i.test(output);
    if (hasParameters) {
      score += 15;
    }

    // Check for considerations/caveats
    const hasConsiderations = /note|consider|important|caution|warning|ensure/i.test(output);
    if (hasConsiderations) {
      score += 10;
      findings.push({
        dimension: "completeness",
        quality: "good",
        observation: "Includes important considerations or caveats",
      });
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Get summary string for evaluation
   */
  getSummary(eval_result: ReasoningEvaluation): string {
    const status = eval_result.passed ? "GOOD" : "WEAK";
    const excellent = eval_result.findings.filter(f => f.quality === "excellent").length;
    const weak = eval_result.findings.filter(f => f.quality === "weak" || f.quality === "missing").length;

    return [
      `[${status}] Score: ${eval_result.overall_score}/100`,
      `Coherence: ${eval_result.coherence_score}`,
      `Domain: ${eval_result.domain_score}`,
      `Justify: ${eval_result.justification_score}`,
      `Structure: ${eval_result.structure_score}`,
      excellent > 0 ? `Excellent: ${excellent}` : null,
      weak > 0 ? `Weak: ${weak}` : null,
    ].filter(Boolean).join(" | ");
  }

  /**
   * Get improvement suggestions
   */
  getSuggestions(eval_result: ReasoningEvaluation): string[] {
    return eval_result.findings
      .filter(f => f.suggestion)
      .map(f => f.suggestion!);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRAReasoningEvaluatorEngine = new LatheLoRAReasoningEvaluatorEngine();
