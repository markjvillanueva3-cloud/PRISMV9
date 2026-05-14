/**
 * KnowledgeApplicabilityEngine — U-TK05
 * Scores tribal knowledge tips for contextual applicability.
 * Multi-dimensional scoring across material, machine, operation, domain, recency, and usage.
 *
 * NOTE: Temporarily located in src/knowledge/ due to src/engines/ directory corruption.
 * Run chkdsk H: /F to repair, then move to src/engines/.
 */

import { tribalKnowledgeEngine, type KnowledgeTip } from "../engines/TribalKnowledgeEngine.js";

// ── Types ──────────────────────────────────────────────────────────────────

/** Multi-dimensional context for scoring applicability */
export interface TribalQueryContext {
  material_iso_group?: string;        // P, M, K, N, S, H, O
  material_name?: string;             // e.g., "4140", "AL6061", "Ti-6Al-4V"
  machine_id?: string;                // e.g., "VF-2SS", "NLX-2500"
  machine_type?: string;              // "mill", "lathe", "edm", "grinder"
  operation?: string;                 // e.g., "face_milling", "drilling", "turning"
  domain?: string;                    // e.g., "speeds_feeds", "tooling", "fixturing"
  subcategory?: string;               // e.g., "endmill_selection", "aluminum_speeds"
  knowledge_type?: string;            // e.g., "rule_of_thumb", "root_cause", "troubleshooting"
  urgency?: "low" | "normal" | "high"; // Affects recency weighting
  operator_level?: "novice" | "intermediate" | "expert"; // Filter complexity
}

/** Tip with applicability score and breakdown */
export interface ScoredTip {
  tip: KnowledgeTip;
  applicability_score: number;        // 0-100 composite score
  breakdown: {
    material_match: number;           // 0-25
    machine_match: number;            // 0-20
    operation_match: number;          // 0-20
    domain_match: number;             // 0-15
    recency_bonus: number;            // 0-10
    usage_bonus: number;              // 0-10
  };
  relevance_reasons: string[];        // Human-readable match explanations
}

/** Result from applicability scoring */
export interface ApplicabilityResult {
  context: TribalQueryContext;
  scored_tips: ScoredTip[];
  total_evaluated: number;
  above_threshold: number;
  threshold_used: number;
  query_time_ms: number;
}

// ── Weight Configuration ───────────────────────────────────────────────────

const SCORING_WEIGHTS = {
  material: 25,    // Material match is most critical
  machine: 20,     // Machine type/capability matters
  operation: 20,   // Operation context
  domain: 15,      // Knowledge domain
  recency: 10,     // Recent tips may be more relevant
  usage: 10,       // Well-used tips are proven
} as const;

const DEFAULT_THRESHOLD = 30; // Minimum score to include

// ── Material Compatibility Matrix ──────────────────────────────────────────

const MATERIAL_COMPATIBILITY: Record<string, string[]> = {
  P: ["P", "M"],           // Steel compatible with stainless
  M: ["M", "P"],           // Stainless compatible with steel
  K: ["K"],                // Cast iron - unique
  N: ["N"],                // Non-ferrous - unique
  S: ["S", "M"],           // Super alloys similar to stainless
  H: ["H", "P"],           // Hardened similar to steel
  O: ["O"],                // Other - unique
};

// ── Engine Implementation ──────────────────────────────────────────────────

class KnowledgeApplicabilityEngine {
  /**
   * Score tips for contextual applicability
   */
  score(
    context: TribalQueryContext,
    options: { limit?: number; threshold?: number } = {}
  ): ApplicabilityResult {
    const start = Date.now();
    const { limit = 20, threshold = DEFAULT_THRESHOLD } = options;

    // Get candidate tips from tribal knowledge
    const candidates = this.getCandidateTips(context);

    // Score each candidate
    const scored: ScoredTip[] = candidates.map(tip => this.scoreTip(tip, context));

    // Filter and sort
    const aboveThreshold = scored
      .filter(s => s.applicability_score >= threshold)
      .sort((a, b) => b.applicability_score - a.applicability_score);

    return {
      context,
      scored_tips: aboveThreshold.slice(0, limit),
      total_evaluated: candidates.length,
      above_threshold: aboveThreshold.length,
      threshold_used: threshold,
      query_time_ms: Date.now() - start,
    };
  }

  /**
   * Score a single tip against context
   */
  scoreTip(tip: KnowledgeTip, context: TribalQueryContext): ScoredTip {
    const breakdown = {
      material_match: this.scoreMaterial(tip, context),
      machine_match: this.scoreMachine(tip, context),
      operation_match: this.scoreOperation(tip, context),
      domain_match: this.scoreDomain(tip, context),
      recency_bonus: this.scoreRecency(tip, context),
      usage_bonus: this.scoreUsage(tip),
    };

    const applicability_score = Object.values(breakdown).reduce((a, b) => a + b, 0);
    const relevance_reasons = this.buildReasons(breakdown, tip, context);

    return {
      tip,
      applicability_score,
      breakdown,
      relevance_reasons,
    };
  }

  /**
   * Get candidate tips based on context
   */
  private getCandidateTips(context: TribalQueryContext): KnowledgeTip[] {
    // Build search query from context
    const queryTerms = [
      context.material_name,
      context.machine_type,
      context.operation,
      context.domain,
    ].filter(Boolean);

    // If no query terms, get all tips (limited)
    const query = queryTerms.length > 0 ? queryTerms.join(" ") : undefined;

    // Use tribal engine search — don't filter by category here, let scoring handle it
    // Category filter would reject too many candidates
    const searchResults = tribalKnowledgeEngine.search({
      query,
      limit: 100, // Get more candidates for scoring
    });

    return searchResults;
  }

  /**
   * Score material compatibility (0-25)
   */
  private scoreMaterial(tip: KnowledgeTip, context: TribalQueryContext): number {
    if (!context.material_iso_group && !context.material_name) return SCORING_WEIGHTS.material * 0.5;

    const tipText = `${tip.title} ${tip.body}`.toLowerCase();
    const tipTags = tip.tags.map(t => t.toLowerCase());

    // Direct ISO group match in tags
    if (context.material_iso_group) {
      const isoLower = context.material_iso_group.toLowerCase();
      if (tipTags.includes(isoLower) || tipTags.includes(`iso-${isoLower}`)) {
        return SCORING_WEIGHTS.material;
      }

      // Check compatible groups
      const compatible = MATERIAL_COMPATIBILITY[context.material_iso_group] || [];
      for (const compat of compatible) {
        if (tipTags.includes(compat.toLowerCase())) {
          return SCORING_WEIGHTS.material * 0.8;
        }
      }
    }

    // Material name in text/tags
    if (context.material_name) {
      const matLower = context.material_name.toLowerCase();
      if (tipText.includes(matLower) || tipTags.some(t => t.includes(matLower))) {
        return SCORING_WEIGHTS.material * 0.9;
      }

      // Common material group keywords
      const materialKeywords: Record<string, string[]> = {
        aluminum: ["6061", "7075", "2024", "al", "aluminium"],
        steel: ["4140", "1018", "1045", "4340", "a36"],
        stainless: ["304", "316", "17-4", "ss"],
        titanium: ["ti64", "ti-6al-4v", "grade5"],
        inconel: ["718", "625", "superalloy"],
      };

      for (const [group, variants] of Object.entries(materialKeywords)) {
        if (variants.some(v => matLower.includes(v))) {
          if (tipText.includes(group) || tipTags.some(t => t.includes(group))) {
            return SCORING_WEIGHTS.material * 0.7;
          }
        }
      }
    }

    return 0;
  }

  /**
   * Score machine compatibility (0-20)
   */
  private scoreMachine(tip: KnowledgeTip, context: TribalQueryContext): number {
    if (!context.machine_id && !context.machine_type) return SCORING_WEIGHTS.machine * 0.3;

    const tipText = `${tip.title} ${tip.body}`.toLowerCase();
    const tipTags = tip.tags.map(t => t.toLowerCase());

    // Direct machine ID match
    if (context.machine_id) {
      const machineId = context.machine_id.toLowerCase();
      if (tipText.includes(machineId) || tipTags.includes(machineId)) {
        return SCORING_WEIGHTS.machine;
      }
    }

    // Machine type match
    if (context.machine_type) {
      const machineType = context.machine_type.toLowerCase();
      const typeVariants: Record<string, string[]> = {
        mill: ["milling", "vmc", "hmc", "machining center", "vertical mill"],
        lathe: ["turning", "cnc lathe", "turning center", "nlx", "horizontal lathe"],
        edm: ["wire edm", "sinker edm", "electrical discharge"],
        grinder: ["grinding", "surface grinder", "cylindrical grinder"],
        swiss: ["swiss type", "sliding head", "citizen"],
      };

      const variants = typeVariants[machineType] || [machineType];
      for (const variant of variants) {
        if (tipText.includes(variant) || tipTags.some(t => t.includes(variant))) {
          return SCORING_WEIGHTS.machine * 0.9;
        }
      }
    }

    return 0;
  }

  /**
   * Score operation match (0-20)
   */
  private scoreOperation(tip: KnowledgeTip, context: TribalQueryContext): number {
    if (!context.operation) return SCORING_WEIGHTS.operation * 0.3;

    const tipText = `${tip.title} ${tip.body}`.toLowerCase();
    const tipTags = tip.tags.map(t => t.toLowerCase());
    const operation = context.operation.toLowerCase().replace(/_/g, " ");

    // Direct match
    if (tipText.includes(operation) || tipTags.some(t => t.includes(operation))) {
      return SCORING_WEIGHTS.operation;
    }

    // Operation families
    const operationFamilies: Record<string, string[]> = {
      milling: ["face milling", "pocket", "contour", "slot", "ramping"],
      drilling: ["drill", "peck", "spot", "center drill", "tap"],
      turning: ["facing", "od turning", "id turning", "boring", "threading"],
      finishing: ["finish pass", "fine", "polish", "hone"],
      roughing: ["rough", "hogging", "bulk removal"],
    };

    for (const [family, ops] of Object.entries(operationFamilies)) {
      if (ops.some(op => operation.includes(op) || op.includes(operation))) {
        if (tipText.includes(family) || tipTags.some(t => t.includes(family))) {
          return SCORING_WEIGHTS.operation * 0.7;
        }
      }
    }

    return 0;
  }

  /**
   * Score domain match (0-15)
   */
  private scoreDomain(tip: KnowledgeTip, context: TribalQueryContext): number {
    if (!context.domain) return SCORING_WEIGHTS.domain * 0.3;

    const tipCategory = tip.category.toLowerCase();
    const contextDomain = context.domain.toLowerCase().replace(/_/g, " ");

    // Direct category match
    if (tipCategory === contextDomain || tipCategory.includes(contextDomain)) {
      return SCORING_WEIGHTS.domain;
    }

    // Domain families
    const domainFamilies: Record<string, string[]> = {
      speeds_feeds: ["cutting parameters", "sfm", "ipm", "chip load"],
      tooling: ["tool selection", "endmill", "insert", "drill"],
      fixturing: ["workholding", "vise", "clamp", "fixture"],
      quality: ["inspection", "tolerance", "measurement", "gdt"],
      troubleshooting: ["problem", "issue", "chatter", "vibration"],
    };

    for (const [family, related] of Object.entries(domainFamilies)) {
      if (family === contextDomain || related.some(r => contextDomain.includes(r))) {
        if (tipCategory.includes(family) || related.some(r => tipCategory.includes(r))) {
          return SCORING_WEIGHTS.domain * 0.8;
        }
      }
    }

    return 0;
  }

  /**
   * Score recency (0-10)
   */
  private scoreRecency(tip: KnowledgeTip, context: TribalQueryContext): number {
    if (!tip.created_at) return SCORING_WEIGHTS.recency * 0.5;

    const tipDate = new Date(tip.created_at);
    const now = new Date();
    const ageMonths = (now.getTime() - tipDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

    // Urgency affects recency weighting
    const urgencyMultiplier = context.urgency === "high" ? 1.5 : context.urgency === "low" ? 0.5 : 1.0;

    if (ageMonths < 3) return SCORING_WEIGHTS.recency * urgencyMultiplier;
    if (ageMonths < 6) return SCORING_WEIGHTS.recency * 0.8 * urgencyMultiplier;
    if (ageMonths < 12) return SCORING_WEIGHTS.recency * 0.6 * urgencyMultiplier;
    if (ageMonths < 24) return SCORING_WEIGHTS.recency * 0.4 * urgencyMultiplier;

    return SCORING_WEIGHTS.recency * 0.2;
  }

  /**
   * Score usage popularity (0-10)
   */
  private scoreUsage(tip: KnowledgeTip): number {
    const usage = tip.usage_count || 0;

    if (usage >= 50) return SCORING_WEIGHTS.usage;
    if (usage >= 20) return SCORING_WEIGHTS.usage * 0.8;
    if (usage >= 10) return SCORING_WEIGHTS.usage * 0.6;
    if (usage >= 5) return SCORING_WEIGHTS.usage * 0.4;
    if (usage >= 1) return SCORING_WEIGHTS.usage * 0.2;

    return 0;
  }

  /**
   * Build human-readable relevance reasons
   */
  private buildReasons(
    breakdown: ScoredTip["breakdown"],
    tip: KnowledgeTip,
    context: TribalQueryContext
  ): string[] {
    const reasons: string[] = [];

    if (breakdown.material_match >= SCORING_WEIGHTS.material * 0.7) {
      reasons.push(`Material match: ${context.material_name || context.material_iso_group}`);
    }
    if (breakdown.machine_match >= SCORING_WEIGHTS.machine * 0.7) {
      reasons.push(`Machine match: ${context.machine_id || context.machine_type}`);
    }
    if (breakdown.operation_match >= SCORING_WEIGHTS.operation * 0.7) {
      reasons.push(`Operation match: ${context.operation}`);
    }
    if (breakdown.domain_match >= SCORING_WEIGHTS.domain * 0.7) {
      reasons.push(`Domain: ${tip.category}`);
    }
    if (breakdown.recency_bonus >= SCORING_WEIGHTS.recency * 0.7) {
      reasons.push(`Recent tip: ${tip.created_at}`);
    }
    if (breakdown.usage_bonus >= SCORING_WEIGHTS.usage * 0.5) {
      reasons.push(`Well-used: ${tip.usage_count} applications`);
    }

    return reasons.length > 0 ? reasons : ["General relevance"];
  }

  /**
   * Quick relevance check without full scoring
   */
  isRelevant(tip: KnowledgeTip, context: TribalQueryContext, threshold = 30): boolean {
    const scored = this.scoreTip(tip, context);
    return scored.applicability_score >= threshold;
  }

  /**
   * Get top N most applicable tips for context
   */
  topTips(context: TribalQueryContext, n = 5): ScoredTip[] {
    return this.score(context, { limit: n, threshold: 20 }).scored_tips;
  }
}

// ── Export Singleton ───────────────────────────────────────────────────────

export const knowledgeApplicabilityEngine = new KnowledgeApplicabilityEngine();
export { KnowledgeApplicabilityEngine };
