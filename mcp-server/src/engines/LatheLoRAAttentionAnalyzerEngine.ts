/**
 * LatheLoRAAttentionAnalyzerEngine — LATHE-LORA-MS0 U-LLR34
 * ==========================================================
 *
 * Analyzes attention patterns in LatheLoRA model outputs.
 * Identifies which input tokens drive each output decision.
 *
 * Features:
 *   - Token-level attention tracking
 *   - Attention heatmap generation
 *   - Influence scoring
 *   - Explanation generation
 *
 * @module engines/LatheLoRAAttentionAnalyzerEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Attention head */
export interface AttentionHead {
  layer: number;
  head: number;
  weights: number[][]; // [from_token][to_token]
}

/** Token with attention */
export interface TokenAttention {
  token: string;
  position: number;
  total_attention: number;
  layer_attentions: number[];
  influence_score: number;
  category?: "parameter" | "material" | "operation" | "tool" | "physics" | "unit" | "other";
}

/** Attention analysis result */
export interface AttentionAnalysis {
  id: string;
  prompt: string;
  response: string;
  tokens: TokenAttention[];
  top_influencers: TokenAttention[];
  attention_entropy: number;
  focused_attention: boolean;
  created_at: number;
}

/** Heatmap data */
export interface AttentionHeatmap {
  prompt_tokens: string[];
  response_tokens: string[];
  matrix: number[][];
  max_value: number;
  min_value: number;
}

/** Engine configuration */
export interface AttentionConfig {
  top_k_influencers: number;
  entropy_threshold: number;
  enable_categorization: boolean;
  max_history: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: AttentionConfig = {
  top_k_influencers: 5,
  entropy_threshold: 2.5,
  enable_categorization: true,
  max_history: 100,
};

/** Token category keywords */
const TOKEN_CATEGORIES: Record<string, TokenAttention["category"]> = {
  // Parameters
  sfm: "parameter",
  rpm: "parameter",
  feed: "parameter",
  doc: "parameter",
  depth: "parameter",

  // Materials
  steel: "material",
  aluminum: "material",
  titanium: "material",
  inconel: "material",

  // Operations
  turn: "operation",
  face: "operation",
  bore: "operation",
  thread: "operation",
  groove: "operation",
  drill: "operation",

  // Tools
  carbide: "tool",
  insert: "tool",
  tool: "tool",

  // Physics
  force: "physics",
  torque: "physics",
  power: "physics",
  kienzle: "physics",

  // Units
  mm: "unit",
  inch: "unit",
  ipm: "unit",
  ipr: "unit",
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRAAttentionAnalyzerEngine {
  private config: AttentionConfig = DEFAULT_CONFIG;
  private analyses: AttentionAnalysis[] = [];

  /**
   * Set configuration
   */
  setConfig(config: Partial<AttentionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): AttentionConfig {
    return { ...this.config };
  }

  /**
   * Categorize token
   */
  private categorizeToken(token: string): TokenAttention["category"] {
    const lower = token.toLowerCase().trim();
    for (const [keyword, category] of Object.entries(TOKEN_CATEGORIES)) {
      if (lower.includes(keyword)) {
        return category;
      }
    }
    // Check for numbers
    if (/^\d+\.?\d*$/.test(lower)) {
      return "parameter";
    }
    return "other";
  }

  /**
   * Calculate attention entropy (measure of focus)
   */
  calculateEntropy(weights: number[]): number {
    // Normalize weights
    const sum = weights.reduce((a, b) => a + b, 0);
    if (sum === 0) return 0;

    const probs = weights.map(w => w / sum);

    // Calculate entropy
    let entropy = 0;
    for (const p of probs) {
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }
    return entropy;
  }

  /**
   * Analyze attention patterns
   */
  analyzeAttention(
    prompt: string,
    response: string,
    attentionHeads: AttentionHead[]
  ): AttentionAnalysis {
    // Tokenize
    const promptTokens = prompt.split(/\s+/).filter(t => t.length > 0);

    // Aggregate attention across all heads
    const tokens: TokenAttention[] = promptTokens.map((token, position) => {
      // Sum attention for this token across all heads
      let totalAttention = 0;
      const layerAttentions: number[] = [];

      for (const head of attentionHeads) {
        let layerSum = 0;
        for (const row of head.weights) {
          if (position < row.length) {
            layerSum += row[position];
          }
        }
        layerAttentions[head.layer] = (layerAttentions[head.layer] || 0) + layerSum;
        totalAttention += layerSum;
      }

      // Normalize by number of heads
      const normalizedAttention = attentionHeads.length > 0 ? totalAttention / attentionHeads.length : 0;

      // Calculate influence score (weighted by position and attention)
      const positionWeight = 1 - position / promptTokens.length * 0.3; // Recent tokens weighted slightly more
      const influenceScore = normalizedAttention * positionWeight;

      return {
        token,
        position,
        total_attention: normalizedAttention,
        layer_attentions: layerAttentions,
        influence_score: influenceScore,
        category: this.config.enable_categorization ? this.categorizeToken(token) : undefined,
      };
    });

    // Get top influencers
    const topInfluencers = [...tokens]
      .sort((a, b) => b.influence_score - a.influence_score)
      .slice(0, this.config.top_k_influencers);

    // Calculate overall attention entropy
    const attentionEntropy = this.calculateEntropy(tokens.map(t => t.total_attention));

    const analysis: AttentionAnalysis = {
      id: `attn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      prompt,
      response,
      tokens,
      top_influencers: topInfluencers,
      attention_entropy: attentionEntropy,
      focused_attention: attentionEntropy < this.config.entropy_threshold,
      created_at: Date.now(),
    };

    this.analyses.push(analysis);

    // Trim history
    if (this.analyses.length > this.config.max_history) {
      this.analyses = this.analyses.slice(-this.config.max_history);
    }

    return analysis;
  }

  /**
   * Generate heatmap data
   */
  generateHeatmap(
    promptTokens: string[],
    responseTokens: string[],
    attentionWeights: number[][]
  ): AttentionHeatmap {
    let max = -Infinity;
    let min = Infinity;

    for (const row of attentionWeights) {
      for (const val of row) {
        if (val > max) max = val;
        if (val < min) min = val;
      }
    }

    return {
      prompt_tokens: promptTokens,
      response_tokens: responseTokens,
      matrix: attentionWeights,
      max_value: max === -Infinity ? 0 : max,
      min_value: min === Infinity ? 0 : min,
    };
  }

  /**
   * Generate explanation from attention
   */
  generateExplanation(analysis: AttentionAnalysis): string {
    const lines = [
      `Attention Analysis: ${analysis.id}`,
      `================`,
      `Response: "${analysis.response.slice(0, 80)}${analysis.response.length > 80 ? "..." : ""}"`,
      ``,
      `Attention Pattern: ${analysis.focused_attention ? "FOCUSED" : "DIFFUSE"}`,
      `Entropy: ${analysis.attention_entropy.toFixed(2)}`,
      ``,
      `Top ${this.config.top_k_influencers} Influential Tokens:`,
    ];

    for (const token of analysis.top_influencers) {
      const category = token.category ? ` [${token.category}]` : "";
      lines.push(
        `  ${token.position}. "${token.token}"${category}: ${token.influence_score.toFixed(3)}`
      );
    }

    // Category breakdown
    const categoryTotals: Record<string, number> = {};
    for (const token of analysis.tokens) {
      const cat = token.category || "other";
      categoryTotals[cat] = (categoryTotals[cat] || 0) + token.total_attention;
    }

    lines.push(``, `Attention by Category:`);
    for (const [cat, total] of Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])) {
      lines.push(`  ${cat}: ${total.toFixed(3)}`);
    }

    return lines.join("\n");
  }

  /**
   * Get analyses by pattern
   */
  findAnalysesByCategory(category: TokenAttention["category"]): AttentionAnalysis[] {
    return this.analyses.filter(a =>
      a.top_influencers.some(t => t.category === category)
    );
  }

  /**
   * Get all analyses
   */
  getAnalyses(limit?: number): AttentionAnalysis[] {
    const list = [...this.analyses];
    return limit ? list.slice(-limit) : list;
  }

  /**
   * Get analysis statistics
   */
  getStats(): {
    total_analyses: number;
    focused_count: number;
    focused_rate: number;
    avg_entropy: number;
    most_influential_categories: Array<{ category: string; count: number }>;
  } {
    const total = this.analyses.length;
    const focused = this.analyses.filter(a => a.focused_attention).length;
    const entropies = this.analyses.map(a => a.attention_entropy);
    const avgEntropy = entropies.length > 0
      ? entropies.reduce((a, b) => a + b, 0) / entropies.length
      : 0;

    // Count category occurrences in top influencers
    const categoryCount: Record<string, number> = {};
    for (const a of this.analyses) {
      for (const t of a.top_influencers) {
        const cat = t.category || "other";
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      }
    }

    const mostInfluential = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count }));

    return {
      total_analyses: total,
      focused_count: focused,
      focused_rate: total > 0 ? focused / total : 0,
      avg_entropy: avgEntropy,
      most_influential_categories: mostInfluential,
    };
  }

  /**
   * Clear analyses
   */
  clear(): void {
    this.analyses = [];
  }

  /**
   * Reset engine state
   */
  reset(): void {
    this.analyses = [];
    this.config = DEFAULT_CONFIG;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRAAttentionAnalyzerEngine = new LatheLoRAAttentionAnalyzerEngine();
