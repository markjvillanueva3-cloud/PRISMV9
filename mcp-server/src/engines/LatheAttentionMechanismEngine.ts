/**
 * LatheAttentionMechanismEngine — LATHE-ATTENTION-MS0
 * =====================================================
 * Attention Mechanisms for Lathe Program Analysis
 *
 * Implements specialized attention mechanisms for understanding and analyzing
 * CNC lathe G-code programs. Based on transformer attention (Vaswani et al., 2017)
 * with manufacturing-domain adaptations.
 *
 * Attention Components:
 *   1. Self-Attention — Query/Key/Value projections with scaled dot-product
 *   2. Multi-Head Attention — 8 parallel attention heads
 *   3. Cross-Attention — Material → Operation, Tool → Parameter attention
 *   4. Local/Global/Causal/Sparse — Attention pattern variants
 *   5. Manufacturing-Specific — Tool change, NAT blocks, safety tokens
 *
 * Key Features:
 *   - Positional encoding (sinusoidal) for sequence order
 *   - Attention weight visualization and heat maps
 *   - Critical token identification
 *   - Operation dependency analysis
 *   - Physics-aware attention biasing
 *
 * Reference: "Attention Is All You Need" (Vaswani et al., NeurIPS 2017)
 * Adaptation: CNC G-code tokenization with manufacturing semantics
 *
 * @module engines/LatheAttentionMechanismEngine
 * @milestone LATHE-ATTENTION-MS0
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPE DEFINITIONS — Attention Configuration
// ============================================================================

/** Attention mechanism configuration */
export interface AttentionConfig {
  d_model: number;          // Model dimension (default: 256)
  n_heads: number;          // Number of attention heads (default: 8)
  d_k: number;              // Key dimension (d_model / n_heads)
  d_v: number;              // Value dimension (d_model / n_heads)
  dropout_rate: number;     // Attention dropout (default: 0.1)
  max_seq_length: number;   // Maximum sequence length (default: 512)
  use_bias: boolean;        // Use bias in projections
  attention_type: AttentionType;
  causal_mask: boolean;     // For autoregressive attention
}

/** Attention type variants */
export type AttentionType =
  | "standard"      // Full pairwise attention
  | "local"         // Sliding window attention
  | "global"        // Global + local attention
  | "sparse"        // Sparse attention patterns
  | "causal"        // Masked future positions
  | "cross"         // Cross-modal attention
  | "manufacturing"; // Manufacturing-specific patterns

/** G-code token for attention */
export interface GCodeToken {
  id: number;
  token: string;
  type: GCodeTokenType;
  position: number;
  embedding: number[];
  value?: number;
  line_number?: number;
  semantic_role?: SemanticRole;
}

/** G-code token types */
export type GCodeTokenType =
  | "G_CODE"        // G0, G1, G2, G3, G32, G70-G76, G96, G97, etc.
  | "M_CODE"        // M0, M3, M4, M5, M8, M9, M30, etc.
  | "T_CODE"        // T0101, T0202, etc.
  | "S_CODE"        // S1200, S800, etc.
  | "F_CODE"        // F0.012, F.008, etc.
  | "X_COORD"       // X1.5, X-0.25, etc.
  | "Z_COORD"       // Z0.1, Z-2.5, etc.
  | "I_COORD"       // I (arc center)
  | "K_COORD"       // K (arc center)
  | "R_CODE"        // R (radius/chamfer)
  | "P_CODE"        // P (dwell time, cycle param)
  | "Q_CODE"        // Q (peck depth)
  | "U_CODE"        // U (incremental X)
  | "W_CODE"        // W (incremental Z)
  | "N_LINE"        // N0010, N0020 (line number)
  | "NAT_BLOCK"     // (NAT#...) operation marker
  | "COMMENT"       // (COMMENT), ; comment
  | "SPECIAL"       // [CLS], [SEP], [MASK], [PAD]
  | "NUMBER"        // Standalone numeric value
  | "UNKNOWN";      // Unrecognized token

/** Semantic role of token in manufacturing context */
export type SemanticRole =
  | "motion_command"       // G0, G1, G2, G3
  | "cycle_command"        // G70-G76, G32
  | "spindle_control"      // G96, G97, S codes
  | "feed_control"         // G98, G99, F codes
  | "tool_selection"       // T codes
  | "positioning"          // X, Z coordinates
  | "arc_definition"       // I, K, R codes
  | "dwell"                // G4, P codes
  | "safety_critical"      // G50, M30, G28
  | "coolant_control"      // M8, M9
  | "program_control"      // M0, M1, M2, M98, M99
  | "operation_boundary"   // NAT blocks
  | "work_offset"          // G54-G59
  | "compensation"         // G40-G42
  | "unknown";

// ============================================================================
// TYPE DEFINITIONS — Attention Results
// ============================================================================

/** Self-attention result */
export interface SelfAttentionResult {
  output: number[][];           // [seq_len, d_model]
  attention_weights: number[][]; // [seq_len, seq_len]
  head_outputs: HeadOutput[];   // Per-head details
  computation_stats: ComputationStats;
}

/** Multi-head attention result */
export interface MultiHeadAttentionResult {
  output: number[][];
  attention_weights_per_head: number[][][]; // [n_heads, seq_len, seq_len]
  aggregated_weights: number[][];           // Averaged across heads
  head_entropy: number[];                   // Attention entropy per head
  head_sparsity: number[];                  // Sparsity per head
  computation_stats: ComputationStats;
}

/** Cross-attention result */
export interface CrossAttentionResult {
  output: number[][];
  attention_weights: number[][];  // [query_len, key_len]
  query_source: string;
  key_source: string;
  alignment_scores: AlignmentScore[];
  computation_stats: ComputationStats;
}

/** Per-head output details */
export interface HeadOutput {
  head_id: number;
  weights: number[][];
  entropy: number;
  max_attention_positions: number[];
  dominant_patterns: AttentionPattern[];
}

/** Attention pattern classification */
export interface AttentionPattern {
  pattern_type: "diagonal" | "vertical" | "horizontal" | "block" | "sparse" | "mixed";
  strength: number;
  description: string;
}

/** Alignment score for cross-attention */
export interface AlignmentScore {
  query_position: number;
  query_token: string;
  aligned_key_position: number;
  aligned_key_token: string;
  score: number;
}

/** Computation statistics */
export interface ComputationStats {
  seq_length: number;
  n_heads: number;
  total_operations: number;
  memory_estimate_mb: number;
  computation_time_ms: number;
}

// ============================================================================
// TYPE DEFINITIONS — Visualization
// ============================================================================

/** Attention visualization request */
export interface VisualizationRequest {
  program: string[];
  layer?: number;
  head?: number;
  attention_type: AttentionType;
  highlight_tokens?: string[];
  threshold?: number;
}

/** Attention heat map */
export interface AttentionHeatMap {
  tokens: string[];
  positions: number[];
  weights: number[][];
  row_labels: string[];
  col_labels: string[];
  normalization: "row" | "column" | "none";
  color_scheme: "viridis" | "hot" | "cool" | "grayscale";
}

/** Token importance result */
export interface TokenImportance {
  token: string;
  position: number;
  type: GCodeTokenType;
  importance_score: number;
  incoming_attention: number;
  outgoing_attention: number;
  semantic_role: SemanticRole;
  is_critical: boolean;
  dependencies: TokenDependency[];
}

/** Token dependency */
export interface TokenDependency {
  dependent_position: number;
  dependent_token: string;
  attention_weight: number;
  dependency_type: "strong" | "moderate" | "weak";
}

// ============================================================================
// TYPE DEFINITIONS — Manufacturing-Specific
// ============================================================================

/** Tool change attention pattern */
export interface ToolChangeAttention {
  tool_position: number;
  tool_code: string;
  affected_positions: number[];
  spindle_associations: number[];
  feed_associations: number[];
  coolant_associations: number[];
  operation_span: [number, number];
}

/** Operation boundary attention */
export interface OperationBoundaryAttention {
  nat_position: number;
  nat_label: string;
  operation_start: number;
  operation_end: number;
  tokens_in_operation: number;
  internal_attention_density: number;
  cross_operation_attention: number;
}

/** Safety-critical attention */
export interface SafetyCriticalAttention {
  position: number;
  token: string;
  safety_type: "max_rpm" | "program_end" | "home_return" | "stop" | "limit";
  attention_to_parameters: number[];
  warning_if_low_attention: boolean;
  recommended_attention_threshold: number;
}

/** Parameter continuity attention */
export interface ParameterContinuityAttention {
  parameter_type: "F" | "S" | "X" | "Z";
  positions: number[];
  values: number[];
  attention_flow: number[][];
  continuity_score: number;
  discontinuities: ParameterDiscontinuity[];
}

/** Parameter discontinuity */
export interface ParameterDiscontinuity {
  position: number;
  previous_value: number;
  new_value: number;
  change_magnitude: number;
  attention_coverage: number;
}

// ============================================================================
// TYPE DEFINITIONS — Analysis
// ============================================================================

/** Operation dependency analysis */
export interface OperationDependencyAnalysis {
  operations: OperationInfo[];
  dependency_matrix: number[][];
  critical_path: number[];
  parallel_opportunities: number[][];
  bottleneck_operations: number[];
}

/** Operation information */
export interface OperationInfo {
  operation_id: number;
  name: string;
  start_position: number;
  end_position: number;
  tool_used: string;
  cycle_type?: string;
  dependencies_on: number[];
  dependents: number[];
}

/** Attention analysis result */
export interface AttentionAnalysis {
  program_length: number;
  total_tokens: number;
  attention_entropy: number;
  attention_sparsity: number;
  dominant_patterns: AttentionPattern[];
  critical_tokens: TokenImportance[];
  tool_changes: ToolChangeAttention[];
  operation_boundaries: OperationBoundaryAttention[];
  safety_tokens: SafetyCriticalAttention[];
  parameter_continuity: ParameterContinuityAttention[];
  recommendations: AttentionRecommendation[];
}

/** Attention-based recommendation */
export interface AttentionRecommendation {
  type: "warning" | "optimization" | "safety" | "quality";
  position: number;
  token: string;
  message: string;
  attention_evidence: number;
  suggested_action?: string;
}

// ============================================================================
// TYPE DEFINITIONS — Sparse Attention
// ============================================================================

/** Sparse attention configuration */
export interface SparseAttentionConfig {
  window_size: number;          // Local window size
  global_tokens: number[];      // Positions with global attention
  stride: number;               // Strided attention stride
  random_attention_ratio: number; // Random attention percentage
  block_size: number;           // Block sparse attention block size
}

/** Sparse attention mask */
export interface SparseAttentionMask {
  mask: boolean[][];
  sparsity_ratio: number;
  pattern_description: string;
  memory_savings_ratio: number;
}

// ============================================================================
// CONSTANTS — Attention Defaults
// ============================================================================

/** Default attention configuration */
const DEFAULT_ATTENTION_CONFIG: AttentionConfig = {
  d_model: 256,
  n_heads: 8,
  d_k: 32,  // 256 / 8
  d_v: 32,
  dropout_rate: 0.1,
  max_seq_length: 512,
  use_bias: true,
  attention_type: "standard",
  causal_mask: false,
};

/** Safety-critical G-codes that require high attention */
const SAFETY_CRITICAL_CODES = new Set([
  "G50",  // Max spindle speed
  "G28",  // Return to reference
  "G30",  // Secondary reference
  "M30",  // Program end and rewind
  "M0",   // Program stop
  "M00",  // Program stop (alternate)
  "M1",   // Optional stop
  "M01",  // Optional stop (alternate)
  "M2",   // Program end
  "M02",  // Program end (alternate)
]);

/** Tool change codes */
const TOOL_CHANGE_PATTERN = /^T(\d{2,4})$/;

/** NAT block pattern for operation boundaries */
const NAT_BLOCK_PATTERN = /^\(NAT#?\d*[^)]*\)$/i;

/** Operation cycle G-codes */
const CYCLE_CODES = new Set([
  "G70", "G71", "G72", "G73", "G74", "G75", "G76", // Canned cycles
  "G32", "G33", "G34", "G92", // Threading
]);

/** Motion G-codes */
const MOTION_CODES = new Set([
  "G0", "G00", "G1", "G01", "G2", "G02", "G3", "G03",
]);

// ============================================================================
// MAIN ENGINE CLASS
// ============================================================================

export class LatheAttentionMechanismEngine {
  private config: AttentionConfig;

  // Weight matrices for attention projections
  private W_q: number[][][];  // [n_heads, d_model, d_k]
  private W_k: number[][][];
  private W_v: number[][][];
  private W_o: number[][];    // [n_heads * d_v, d_model]

  // Bias vectors
  private b_q: number[][];
  private b_k: number[][];
  private b_v: number[][];
  private b_o: number[];

  // Positional encoding cache
  private positionalEncodings: number[][] = [];

  // Token vocabulary (simplified)
  private vocabulary: Map<string, number> = new Map();

  // Manufacturing semantic weights
  private semanticBiases: Map<SemanticRole, number> = new Map();

  constructor(config?: Partial<AttentionConfig>) {
    this.config = {
      ...DEFAULT_ATTENTION_CONFIG,
      ...config,
      d_k: config?.d_k ?? Math.floor((config?.d_model ?? 256) / (config?.n_heads ?? 8)),
      d_v: config?.d_v ?? Math.floor((config?.d_model ?? 256) / (config?.n_heads ?? 8)),
    };

    this.W_q = [];
    this.W_k = [];
    this.W_v = [];
    this.W_o = [];
    this.b_q = [];
    this.b_k = [];
    this.b_v = [];
    this.b_o = [];

    this.initializeWeights();
    this.initializePositionalEncodings();
    this.initializeVocabulary();
    this.initializeSemanticBiases();

    log.info(`[LatheAttention] Initialized: d_model=${this.config.d_model}, heads=${this.config.n_heads}`);
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize attention weight matrices using Xavier initialization.
   * Reference: "Understanding the difficulty of training deep feedforward neural networks"
   * (Glorot & Bengio, AISTATS 2010)
   */
  private initializeWeights(): void {
    const { d_model, n_heads, d_k, d_v } = this.config;

    // Initialize per-head weight matrices
    for (let h = 0; h < n_heads; h++) {
      // Xavier scale for each projection
      const qk_scale = Math.sqrt(2.0 / (d_model + d_k));
      const v_scale = Math.sqrt(2.0 / (d_model + d_v));

      this.W_q.push(this.initializeMatrix(d_model, d_k, qk_scale));
      this.W_k.push(this.initializeMatrix(d_model, d_k, qk_scale));
      this.W_v.push(this.initializeMatrix(d_model, d_v, v_scale));

      // Initialize biases to zero
      this.b_q.push(new Array(d_k).fill(0));
      this.b_k.push(new Array(d_k).fill(0));
      this.b_v.push(new Array(d_v).fill(0));
    }

    // Output projection
    const o_scale = Math.sqrt(2.0 / (n_heads * d_v + d_model));
    this.W_o = this.initializeMatrix(n_heads * d_v, d_model, o_scale);
    this.b_o = new Array(d_model).fill(0);

    log.info(`[LatheAttention] Weights initialized: ${n_heads} heads, d_k=${d_k}, d_v=${d_v}`);
  }

  /**
   * Initialize a weight matrix with random values scaled by given factor.
   */
  private initializeMatrix(rows: number, cols: number, scale: number): number[][] {
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => (Math.random() * 2 - 1) * scale)
    );
  }

  /**
   * Initialize sinusoidal positional encodings.
   * Reference: "Attention Is All You Need" (Vaswani et al., 2017) Section 3.5
   *
   * PE(pos, 2i) = sin(pos / 10000^(2i/d_model))
   * PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))
   */
  private initializePositionalEncodings(): void {
    const { d_model, max_seq_length } = this.config;
    this.positionalEncodings = [];

    for (let pos = 0; pos < max_seq_length; pos++) {
      const encoding = new Array(d_model);

      for (let i = 0; i < d_model; i++) {
        const angle = pos / Math.pow(10000, (2 * Math.floor(i / 2)) / d_model);

        if (i % 2 === 0) {
          encoding[i] = Math.sin(angle);
        } else {
          encoding[i] = Math.cos(angle);
        }
      }

      this.positionalEncodings.push(encoding);
    }

    log.info(`[LatheAttention] Positional encodings computed for ${max_seq_length} positions`);
  }

  /**
   * Initialize basic G-code vocabulary for tokenization.
   */
  private initializeVocabulary(): void {
    let id = 0;

    // Special tokens
    const specialTokens = ["[PAD]", "[CLS]", "[SEP]", "[MASK]", "[UNK]", "[BOS]", "[EOS]"];
    for (const token of specialTokens) {
      this.vocabulary.set(token, id++);
    }

    // G-codes
    const gCodes = [
      "G0", "G00", "G1", "G01", "G2", "G02", "G3", "G03", "G4", "G04",
      "G20", "G21", "G28", "G30", "G40", "G41", "G42", "G50", "G53", "G54", "G55", "G56",
      "G70", "G71", "G72", "G73", "G74", "G75", "G76",
      "G32", "G33", "G34", "G92",
      "G96", "G97", "G98", "G99",
    ];
    for (const code of gCodes) {
      this.vocabulary.set(code, id++);
    }

    // M-codes
    const mCodes = [
      "M0", "M00", "M1", "M01", "M2", "M02", "M3", "M03", "M4", "M04",
      "M5", "M05", "M8", "M08", "M9", "M09", "M30", "M98", "M99",
    ];
    for (const code of mCodes) {
      this.vocabulary.set(code, id++);
    }

    // Coordinate prefixes
    const prefixes = ["X", "Z", "I", "K", "R", "P", "Q", "U", "W", "N", "T", "S", "F"];
    for (const prefix of prefixes) {
      this.vocabulary.set(prefix, id++);
    }

    log.info(`[LatheAttention] Vocabulary initialized: ${this.vocabulary.size} tokens`);
  }

  /**
   * Initialize semantic role biases for manufacturing-aware attention.
   */
  private initializeSemanticBiases(): void {
    // Higher bias = more attention weight
    this.semanticBiases.set("safety_critical", 2.0);
    this.semanticBiases.set("tool_selection", 1.5);
    this.semanticBiases.set("cycle_command", 1.3);
    this.semanticBiases.set("operation_boundary", 1.4);
    this.semanticBiases.set("spindle_control", 1.2);
    this.semanticBiases.set("feed_control", 1.2);
    this.semanticBiases.set("motion_command", 1.0);
    this.semanticBiases.set("positioning", 0.9);
    this.semanticBiases.set("arc_definition", 0.9);
    this.semanticBiases.set("coolant_control", 0.8);
    this.semanticBiases.set("dwell", 0.7);
    this.semanticBiases.set("work_offset", 1.1);
    this.semanticBiases.set("compensation", 1.1);
    this.semanticBiases.set("program_control", 1.0);
    this.semanticBiases.set("unknown", 0.5);
  }

  // ==========================================================================
  // CORE ATTENTION OPERATIONS
  // ==========================================================================

  /**
   * Compute standard scaled dot-product self-attention.
   *
   * Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) * V
   *
   * Reference: Vaswani et al., 2017, Equation 1
   *
   * @param tokens - Input tokens with embeddings
   * @returns Self-attention result with weights and output
   */
  computeSelfAttention(tokens: GCodeToken[]): SelfAttentionResult {
    const startTime = performance.now();
    const seqLen = tokens.length;
    const { d_model, d_k, d_v, n_heads } = this.config;

    // Extract embeddings matrix [seq_len, d_model]
    const embeddings = tokens.map((t) => this.getTokenEmbedding(t));

    // Compute per-head attention
    const headOutputs: HeadOutput[] = [];
    const allHeadOutputValues: number[][][] = [];
    const allAttentionWeights: number[][][] = [];

    for (let h = 0; h < n_heads; h++) {
      // Project to Q, K, V for this head
      const Q = this.projectToHead(embeddings, this.W_q[h], this.b_q[h]); // [seq_len, d_k]
      const K = this.projectToHead(embeddings, this.W_k[h], this.b_k[h]); // [seq_len, d_k]
      const V = this.projectToHead(embeddings, this.W_v[h], this.b_v[h]); // [seq_len, d_v]

      // Compute attention scores: QK^T / sqrt(d_k)
      const scores = this.computeAttentionScores(Q, K, d_k);

      // Apply causal mask if needed
      const maskedScores = this.config.causal_mask
        ? this.applyCausalMask(scores)
        : scores;

      // Apply softmax to get attention weights
      const weights = this.softmax2D(maskedScores);

      // Apply attention dropout (during training)
      const droppedWeights = this.applyDropout(weights, this.config.dropout_rate);

      // Compute weighted values: weights @ V
      const headOutput = this.matmul(droppedWeights, V);

      // Analyze attention patterns for this head
      const entropy = this.computeAttentionEntropy(weights);
      const maxPositions = this.findMaxAttentionPositions(weights);
      const patterns = this.classifyAttentionPatterns(weights);

      headOutputs.push({
        head_id: h,
        weights: weights,
        entropy: entropy,
        max_attention_positions: maxPositions,
        dominant_patterns: patterns,
      });

      allHeadOutputValues.push(headOutput);
      allAttentionWeights.push(weights);
    }

    // Concatenate head outputs and project
    const concatenated = this.concatenateHeads(allHeadOutputValues);
    const output = this.projectOutput(concatenated, this.W_o, this.b_o);

    // Aggregate attention weights (average across heads)
    const aggregatedWeights = this.averageWeights(allAttentionWeights);

    const endTime = performance.now();

    return {
      output: output,
      attention_weights: aggregatedWeights,
      head_outputs: headOutputs,
      computation_stats: {
        seq_length: seqLen,
        n_heads: n_heads,
        total_operations: seqLen * seqLen * d_k * n_heads * 3, // Q, K, V projections + attention
        memory_estimate_mb: (seqLen * seqLen * n_heads * 8) / (1024 * 1024),
        computation_time_ms: endTime - startTime,
      },
    };
  }

  /**
   * Compute multi-head attention with detailed per-head analysis.
   *
   * MultiHead(Q, K, V) = Concat(head_1, ..., head_h) * W_O
   * where head_i = Attention(Q*W_Q^i, K*W_K^i, V*W_V^i)
   *
   * @param tokens - Input tokens with embeddings
   * @returns Multi-head attention result
   */
  computeMultiHeadAttention(tokens: GCodeToken[]): MultiHeadAttentionResult {
    const startTime = performance.now();
    const seqLen = tokens.length;
    const { n_heads, d_model, d_k, d_v } = this.config;

    const embeddings = tokens.map((t) => this.getTokenEmbedding(t));

    const headAttentionWeights: number[][][] = [];
    const headEntropy: number[] = [];
    const headSparsity: number[] = [];
    const headOutputs: number[][][] = [];

    for (let h = 0; h < n_heads; h++) {
      const Q = this.projectToHead(embeddings, this.W_q[h], this.b_q[h]);
      const K = this.projectToHead(embeddings, this.W_k[h], this.b_k[h]);
      const V = this.projectToHead(embeddings, this.W_v[h], this.b_v[h]);

      const scores = this.computeAttentionScores(Q, K, d_k);
      const weights = this.softmax2D(scores);

      const headOutput = this.matmul(weights, V);

      headAttentionWeights.push(weights);
      headEntropy.push(this.computeAttentionEntropy(weights));
      headSparsity.push(this.computeSparsity(weights, 0.1));
      headOutputs.push(headOutput);
    }

    // Concatenate and project
    const concatenated = this.concatenateHeads(headOutputs);
    const output = this.projectOutput(concatenated, this.W_o, this.b_o);

    // Aggregate weights
    const aggregatedWeights = this.averageWeights(headAttentionWeights);

    const endTime = performance.now();

    return {
      output: output,
      attention_weights_per_head: headAttentionWeights,
      aggregated_weights: aggregatedWeights,
      head_entropy: headEntropy,
      head_sparsity: headSparsity,
      computation_stats: {
        seq_length: seqLen,
        n_heads: n_heads,
        total_operations: seqLen * seqLen * d_k * n_heads * 4,
        memory_estimate_mb: (seqLen * seqLen * n_heads * 8) / (1024 * 1024),
        computation_time_ms: endTime - startTime,
      },
    };
  }

  /**
   * Compute cross-attention between query and context sequences.
   *
   * CrossAttention(Q_source, K_context, V_context) = softmax(Q_source * K_context^T / sqrt(d_k)) * V_context
   *
   * @param queryTokens - Query sequence tokens (e.g., material features)
   * @param contextTokens - Context sequence tokens (e.g., operation features)
   * @param querySource - Name of query source for logging
   * @param keySource - Name of key/value source for logging
   * @returns Cross-attention result
   */
  computeCrossAttention(
    queryTokens: GCodeToken[],
    contextTokens: GCodeToken[],
    querySource: string = "query",
    keySource: string = "context"
  ): CrossAttentionResult {
    const startTime = performance.now();
    const queryLen = queryTokens.length;
    const contextLen = contextTokens.length;
    const { n_heads, d_k, d_v } = this.config;

    const queryEmbeddings = queryTokens.map((t) => this.getTokenEmbedding(t));
    const contextEmbeddings = contextTokens.map((t) => this.getTokenEmbedding(t));

    const headCrossWeights: number[][][] = [];
    const headOutputs: number[][][] = [];

    for (let h = 0; h < n_heads; h++) {
      // Query from source sequence
      const Q = this.projectToHead(queryEmbeddings, this.W_q[h], this.b_q[h]);
      // Key and Value from context sequence
      const K = this.projectToHead(contextEmbeddings, this.W_k[h], this.b_k[h]);
      const V = this.projectToHead(contextEmbeddings, this.W_v[h], this.b_v[h]);

      // Cross-attention scores [query_len, context_len]
      const scores = this.computeCrossAttentionScores(Q, K, d_k);
      const weights = this.softmax2D(scores);

      const headOutput = this.matmul(weights, V);

      headCrossWeights.push(weights);
      headOutputs.push(headOutput);
    }

    // Concatenate and project
    const concatenated = this.concatenateHeads(headOutputs);
    const output = this.projectOutput(concatenated, this.W_o, this.b_o);

    // Aggregate weights
    const aggregatedWeights = this.averageWeights(headCrossWeights);

    // Extract alignment scores
    const alignmentScores = this.extractAlignmentScores(
      aggregatedWeights,
      queryTokens,
      contextTokens
    );

    const endTime = performance.now();

    return {
      output: output,
      attention_weights: aggregatedWeights,
      query_source: querySource,
      key_source: keySource,
      alignment_scores: alignmentScores,
      computation_stats: {
        seq_length: queryLen + contextLen,
        n_heads: n_heads,
        total_operations: queryLen * contextLen * d_k * n_heads * 3,
        memory_estimate_mb: (queryLen * contextLen * n_heads * 8) / (1024 * 1024),
        computation_time_ms: endTime - startTime,
      },
    };
  }

  // ==========================================================================
  // ATTENTION VARIANTS
  // ==========================================================================

  /**
   * Compute local (sliding window) attention.
   * Each position attends only to positions within a fixed window.
   *
   * @param tokens - Input tokens
   * @param windowSize - Size of the attention window (default: 64)
   * @returns Self-attention result with local pattern
   */
  computeLocalAttention(tokens: GCodeToken[], windowSize: number = 64): SelfAttentionResult {
    const startTime = performance.now();
    const seqLen = tokens.length;
    const { n_heads, d_k, d_v } = this.config;

    const embeddings = tokens.map((t) => this.getTokenEmbedding(t));
    const headOutputs: HeadOutput[] = [];
    const allHeadOutputValues: number[][][] = [];
    const allAttentionWeights: number[][][] = [];

    for (let h = 0; h < n_heads; h++) {
      const Q = this.projectToHead(embeddings, this.W_q[h], this.b_q[h]);
      const K = this.projectToHead(embeddings, this.W_k[h], this.b_k[h]);
      const V = this.projectToHead(embeddings, this.W_v[h], this.b_v[h]);

      // Compute scores with local window masking
      const scores = this.computeAttentionScores(Q, K, d_k);
      const localScores = this.applyLocalMask(scores, windowSize);
      const weights = this.softmax2D(localScores);

      const headOutput = this.matmul(weights, V);

      const entropy = this.computeAttentionEntropy(weights);
      const maxPositions = this.findMaxAttentionPositions(weights);
      const patterns = this.classifyAttentionPatterns(weights);

      headOutputs.push({
        head_id: h,
        weights: weights,
        entropy: entropy,
        max_attention_positions: maxPositions,
        dominant_patterns: patterns,
      });

      allHeadOutputValues.push(headOutput);
      allAttentionWeights.push(weights);
    }

    const concatenated = this.concatenateHeads(allHeadOutputValues);
    const output = this.projectOutput(concatenated, this.W_o, this.b_o);
    const aggregatedWeights = this.averageWeights(allAttentionWeights);

    const endTime = performance.now();

    return {
      output: output,
      attention_weights: aggregatedWeights,
      head_outputs: headOutputs,
      computation_stats: {
        seq_length: seqLen,
        n_heads: n_heads,
        total_operations: seqLen * windowSize * d_k * n_heads * 3,
        memory_estimate_mb: (seqLen * windowSize * n_heads * 8) / (1024 * 1024),
        computation_time_ms: endTime - startTime,
      },
    };
  }

  /**
   * Compute global attention with global tokens.
   * Selected positions attend globally while others use local attention.
   *
   * Reference: Longformer (Beltagy et al., 2020)
   *
   * @param tokens - Input tokens
   * @param globalPositions - Positions with global attention
   * @param localWindowSize - Local window size
   * @returns Self-attention result with global+local pattern
   */
  computeGlobalAttention(
    tokens: GCodeToken[],
    globalPositions: number[],
    localWindowSize: number = 64
  ): SelfAttentionResult {
    const startTime = performance.now();
    const seqLen = tokens.length;
    const { n_heads, d_k, d_v } = this.config;

    const embeddings = tokens.map((t) => this.getTokenEmbedding(t));
    const globalSet = new Set(globalPositions);

    const headOutputs: HeadOutput[] = [];
    const allHeadOutputValues: number[][][] = [];
    const allAttentionWeights: number[][][] = [];

    for (let h = 0; h < n_heads; h++) {
      const Q = this.projectToHead(embeddings, this.W_q[h], this.b_q[h]);
      const K = this.projectToHead(embeddings, this.W_k[h], this.b_k[h]);
      const V = this.projectToHead(embeddings, this.W_v[h], this.b_v[h]);

      const scores = this.computeAttentionScores(Q, K, d_k);

      // Apply global + local mask
      const maskedScores = this.applyGlobalLocalMask(scores, globalSet, localWindowSize);
      const weights = this.softmax2D(maskedScores);

      const headOutput = this.matmul(weights, V);

      headOutputs.push({
        head_id: h,
        weights: weights,
        entropy: this.computeAttentionEntropy(weights),
        max_attention_positions: this.findMaxAttentionPositions(weights),
        dominant_patterns: this.classifyAttentionPatterns(weights),
      });

      allHeadOutputValues.push(headOutput);
      allAttentionWeights.push(weights);
    }

    const concatenated = this.concatenateHeads(allHeadOutputValues);
    const output = this.projectOutput(concatenated, this.W_o, this.b_o);
    const aggregatedWeights = this.averageWeights(allAttentionWeights);

    const endTime = performance.now();

    return {
      output: output,
      attention_weights: aggregatedWeights,
      head_outputs: headOutputs,
      computation_stats: {
        seq_length: seqLen,
        n_heads: n_heads,
        total_operations: seqLen * (globalPositions.length + localWindowSize) * d_k * n_heads,
        memory_estimate_mb: (seqLen * (globalPositions.length + localWindowSize) * n_heads * 8) / (1024 * 1024),
        computation_time_ms: endTime - startTime,
      },
    };
  }

  /**
   * Compute sparse attention using configurable sparsity patterns.
   *
   * Reference: Sparse Transformers (Child et al., 2019)
   *
   * @param tokens - Input tokens
   * @param sparseConfig - Sparse attention configuration
   * @returns Self-attention result with sparse pattern
   */
  computeSparseAttention(
    tokens: GCodeToken[],
    sparseConfig: SparseAttentionConfig
  ): SelfAttentionResult {
    const startTime = performance.now();
    const seqLen = tokens.length;
    const { n_heads, d_k, d_v } = this.config;

    const embeddings = tokens.map((t) => this.getTokenEmbedding(t));

    // Generate sparse attention mask
    const sparseMask = this.generateSparseAttentionMask(seqLen, sparseConfig);

    const headOutputs: HeadOutput[] = [];
    const allHeadOutputValues: number[][][] = [];
    const allAttentionWeights: number[][][] = [];

    for (let h = 0; h < n_heads; h++) {
      const Q = this.projectToHead(embeddings, this.W_q[h], this.b_q[h]);
      const K = this.projectToHead(embeddings, this.W_k[h], this.b_k[h]);
      const V = this.projectToHead(embeddings, this.W_v[h], this.b_v[h]);

      const scores = this.computeAttentionScores(Q, K, d_k);

      // Apply sparse mask
      const maskedScores = this.applySparseMask(scores, sparseMask.mask);
      const weights = this.softmax2D(maskedScores);

      const headOutput = this.matmul(weights, V);

      headOutputs.push({
        head_id: h,
        weights: weights,
        entropy: this.computeAttentionEntropy(weights),
        max_attention_positions: this.findMaxAttentionPositions(weights),
        dominant_patterns: this.classifyAttentionPatterns(weights),
      });

      allHeadOutputValues.push(headOutput);
      allAttentionWeights.push(weights);
    }

    const concatenated = this.concatenateHeads(allHeadOutputValues);
    const output = this.projectOutput(concatenated, this.W_o, this.b_o);
    const aggregatedWeights = this.averageWeights(allAttentionWeights);

    const endTime = performance.now();

    const nonZeroPositions = sparseMask.mask.flat().filter((v) => v).length;

    return {
      output: output,
      attention_weights: aggregatedWeights,
      head_outputs: headOutputs,
      computation_stats: {
        seq_length: seqLen,
        n_heads: n_heads,
        total_operations: nonZeroPositions * d_k * n_heads * 3,
        memory_estimate_mb: (nonZeroPositions * n_heads * 8) / (1024 * 1024),
        computation_time_ms: endTime - startTime,
      },
    };
  }

  /**
   * Compute causal (autoregressive) attention.
   * Each position can only attend to previous positions.
   *
   * @param tokens - Input tokens
   * @returns Self-attention result with causal masking
   */
  computeCausalAttention(tokens: GCodeToken[]): SelfAttentionResult {
    const originalCausalMask = this.config.causal_mask;
    this.config.causal_mask = true;

    const result = this.computeSelfAttention(tokens);

    this.config.causal_mask = originalCausalMask;
    return result;
  }

  // ==========================================================================
  // MANUFACTURING-SPECIFIC ATTENTION
  // ==========================================================================

  /**
   * Compute manufacturing-aware attention with semantic biases.
   * Biases attention toward safety-critical tokens, tool changes, and operation boundaries.
   *
   * @param tokens - Input tokens with semantic roles
   * @returns Self-attention result with manufacturing biases
   */
  computeManufacturingAttention(tokens: GCodeToken[]): SelfAttentionResult {
    const startTime = performance.now();
    const seqLen = tokens.length;
    const { n_heads, d_k, d_v } = this.config;

    const embeddings = tokens.map((t) => this.getTokenEmbedding(t));

    // Compute semantic bias matrix
    const semanticBiasMatrix = this.computeSemanticBiasMatrix(tokens);

    const headOutputs: HeadOutput[] = [];
    const allHeadOutputValues: number[][][] = [];
    const allAttentionWeights: number[][][] = [];

    for (let h = 0; h < n_heads; h++) {
      const Q = this.projectToHead(embeddings, this.W_q[h], this.b_q[h]);
      const K = this.projectToHead(embeddings, this.W_k[h], this.b_k[h]);
      const V = this.projectToHead(embeddings, this.W_v[h], this.b_v[h]);

      const scores = this.computeAttentionScores(Q, K, d_k);

      // Apply semantic biases to attention scores
      const biasedScores = this.addMatrices(scores, semanticBiasMatrix);

      // Apply causal mask if needed
      const maskedScores = this.config.causal_mask
        ? this.applyCausalMask(biasedScores)
        : biasedScores;

      const weights = this.softmax2D(maskedScores);
      const headOutput = this.matmul(weights, V);

      headOutputs.push({
        head_id: h,
        weights: weights,
        entropy: this.computeAttentionEntropy(weights),
        max_attention_positions: this.findMaxAttentionPositions(weights),
        dominant_patterns: this.classifyAttentionPatterns(weights),
      });

      allHeadOutputValues.push(headOutput);
      allAttentionWeights.push(weights);
    }

    const concatenated = this.concatenateHeads(allHeadOutputValues);
    const output = this.projectOutput(concatenated, this.W_o, this.b_o);
    const aggregatedWeights = this.averageWeights(allAttentionWeights);

    const endTime = performance.now();

    return {
      output: output,
      attention_weights: aggregatedWeights,
      head_outputs: headOutputs,
      computation_stats: {
        seq_length: seqLen,
        n_heads: n_heads,
        total_operations: seqLen * seqLen * d_k * n_heads * 4,
        memory_estimate_mb: (seqLen * seqLen * n_heads * 8) / (1024 * 1024),
        computation_time_ms: endTime - startTime,
      },
    };
  }

  /**
   * Analyze tool change attention patterns.
   * Tracks how tool change commands (T##) relate to subsequent parameters.
   *
   * @param tokens - Program tokens
   * @param attentionWeights - Computed attention weights
   * @returns Tool change attention analysis
   */
  analyzeToolChangeAttention(
    tokens: GCodeToken[],
    attentionWeights: number[][]
  ): ToolChangeAttention[] {
    const toolChanges: ToolChangeAttention[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.type === "T_CODE" && TOOL_CHANGE_PATTERN.test(token.token)) {
        const affected: number[] = [];
        const spindles: number[] = [];
        const feeds: number[] = [];
        const coolants: number[] = [];

        // Find positions that attend strongly to this tool change
        for (let j = 0; j < tokens.length; j++) {
          if (j === i) continue;

          // Check both directions of attention
          const forwardWeight = attentionWeights[j]?.[i] ?? 0;
          const backwardWeight = attentionWeights[i]?.[j] ?? 0;
          const combinedWeight = Math.max(forwardWeight, backwardWeight);

          if (combinedWeight > 0.1) {
            affected.push(j);

            const targetToken = tokens[j];
            if (targetToken.type === "S_CODE") {
              spindles.push(j);
            } else if (targetToken.type === "F_CODE") {
              feeds.push(j);
            } else if (targetToken.type === "M_CODE" &&
                       (targetToken.token === "M8" || targetToken.token === "M08" ||
                        targetToken.token === "M9" || targetToken.token === "M09")) {
              coolants.push(j);
            }
          }
        }

        // Determine operation span
        const opStart = i;
        let opEnd = tokens.length - 1;

        // Find next tool change to determine operation end
        for (let k = i + 1; k < tokens.length; k++) {
          if (tokens[k].type === "T_CODE" && TOOL_CHANGE_PATTERN.test(tokens[k].token)) {
            opEnd = k - 1;
            break;
          }
        }

        toolChanges.push({
          tool_position: i,
          tool_code: token.token,
          affected_positions: affected,
          spindle_associations: spindles,
          feed_associations: feeds,
          coolant_associations: coolants,
          operation_span: [opStart, opEnd],
        });
      }
    }

    return toolChanges;
  }

  /**
   * Analyze operation boundary attention (NAT blocks).
   * Examines attention flow within and across operation boundaries.
   *
   * @param tokens - Program tokens
   * @param attentionWeights - Computed attention weights
   * @returns Operation boundary attention analysis
   */
  analyzeOperationBoundaryAttention(
    tokens: GCodeToken[],
    attentionWeights: number[][]
  ): OperationBoundaryAttention[] {
    const boundaries: OperationBoundaryAttention[] = [];
    const natPositions: number[] = [];

    // Find all NAT block positions
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type === "NAT_BLOCK" || NAT_BLOCK_PATTERN.test(tokens[i].token)) {
        natPositions.push(i);
      }
    }

    // Analyze each operation boundary
    for (let idx = 0; idx < natPositions.length; idx++) {
      const natPos = natPositions[idx];
      const opStart = natPos;
      const opEnd = idx < natPositions.length - 1 ? natPositions[idx + 1] - 1 : tokens.length - 1;
      const tokensInOp = opEnd - opStart + 1;

      // Calculate internal attention density
      let internalSum = 0;
      let internalCount = 0;
      for (let i = opStart; i <= opEnd; i++) {
        for (let j = opStart; j <= opEnd; j++) {
          if (i !== j) {
            internalSum += attentionWeights[i]?.[j] ?? 0;
            internalCount++;
          }
        }
      }
      const internalDensity = internalCount > 0 ? internalSum / internalCount : 0;

      // Calculate cross-operation attention
      let crossSum = 0;
      let crossCount = 0;
      for (let i = opStart; i <= opEnd; i++) {
        for (let j = 0; j < tokens.length; j++) {
          if (j < opStart || j > opEnd) {
            crossSum += attentionWeights[i]?.[j] ?? 0;
            crossCount++;
          }
        }
      }
      const crossOpAttention = crossCount > 0 ? crossSum / crossCount : 0;

      boundaries.push({
        nat_position: natPos,
        nat_label: tokens[natPos].token,
        operation_start: opStart,
        operation_end: opEnd,
        tokens_in_operation: tokensInOp,
        internal_attention_density: internalDensity,
        cross_operation_attention: crossOpAttention,
      });
    }

    return boundaries;
  }

  /**
   * Analyze safety-critical token attention.
   * Ensures critical safety tokens receive adequate attention.
   *
   * @param tokens - Program tokens
   * @param attentionWeights - Computed attention weights
   * @returns Safety-critical attention analysis
   */
  analyzeSafetyCriticalAttention(
    tokens: GCodeToken[],
    attentionWeights: number[][]
  ): SafetyCriticalAttention[] {
    const safetyAnalysis: SafetyCriticalAttention[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const tokenUpper = token.token.toUpperCase();

      if (SAFETY_CRITICAL_CODES.has(tokenUpper)) {
        // Calculate attention to this safety token from parameters
        const parameterAttention: number[] = [];

        for (let j = 0; j < tokens.length; j++) {
          const sourceToken = tokens[j];
          if (sourceToken.type === "S_CODE" ||
              sourceToken.type === "F_CODE" ||
              sourceToken.type === "X_COORD" ||
              sourceToken.type === "Z_COORD") {
            parameterAttention.push(attentionWeights[j]?.[i] ?? 0);
          }
        }

        // Determine safety type
        let safetyType: SafetyCriticalAttention["safety_type"];
        if (tokenUpper === "G50") {
          safetyType = "max_rpm";
        } else if (tokenUpper === "M30" || tokenUpper === "M2" || tokenUpper === "M02") {
          safetyType = "program_end";
        } else if (tokenUpper === "G28" || tokenUpper === "G30") {
          safetyType = "home_return";
        } else if (tokenUpper === "M0" || tokenUpper === "M00" || tokenUpper === "M1" || tokenUpper === "M01") {
          safetyType = "stop";
        } else {
          safetyType = "limit";
        }

        // Calculate recommended threshold based on safety type
        const recommendedThreshold = safetyType === "max_rpm" ? 0.3 :
                                     safetyType === "program_end" ? 0.2 :
                                     safetyType === "home_return" ? 0.25 : 0.15;

        const avgAttention = parameterAttention.length > 0
          ? parameterAttention.reduce((a, b) => a + b, 0) / parameterAttention.length
          : 0;

        safetyAnalysis.push({
          position: i,
          token: token.token,
          safety_type: safetyType,
          attention_to_parameters: parameterAttention,
          warning_if_low_attention: avgAttention < recommendedThreshold,
          recommended_attention_threshold: recommendedThreshold,
        });
      }
    }

    return safetyAnalysis;
  }

  /**
   * Analyze parameter continuity attention.
   * Tracks how feeds/speeds flow through the program.
   *
   * @param tokens - Program tokens
   * @param attentionWeights - Computed attention weights
   * @param parameterType - Parameter type to analyze ("F", "S", "X", "Z")
   * @returns Parameter continuity attention analysis
   */
  analyzeParameterContinuityAttention(
    tokens: GCodeToken[],
    attentionWeights: number[][],
    parameterType: "F" | "S" | "X" | "Z"
  ): ParameterContinuityAttention {
    const positions: number[] = [];
    const values: number[] = [];

    // Find all positions of this parameter type
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const tokenType: GCodeTokenType = parameterType === "F" ? "F_CODE" :
                                        parameterType === "S" ? "S_CODE" :
                                        parameterType === "X" ? "X_COORD" : "Z_COORD";

      if (token.type === tokenType) {
        positions.push(i);
        values.push(token.value ?? 0);
      }
    }

    // Build attention flow matrix between parameter occurrences
    const attentionFlow: number[][] = [];
    for (let i = 0; i < positions.length; i++) {
      const row: number[] = [];
      for (let j = 0; j < positions.length; j++) {
        row.push(attentionWeights[positions[i]]?.[positions[j]] ?? 0);
      }
      attentionFlow.push(row);
    }

    // Detect discontinuities (large value changes with low attention coverage)
    const discontinuities: ParameterDiscontinuity[] = [];

    for (let i = 1; i < positions.length; i++) {
      const prevValue = values[i - 1];
      const currValue = values[i];
      const changeMagnitude = Math.abs(currValue - prevValue) / (Math.abs(prevValue) + 0.001);

      // Calculate attention coverage between consecutive occurrences
      const attentionCoverage = attentionFlow[i]?.[i - 1] ?? 0;

      if (changeMagnitude > 0.5 && attentionCoverage < 0.1) {
        discontinuities.push({
          position: positions[i],
          previous_value: prevValue,
          new_value: currValue,
          change_magnitude: changeMagnitude,
          attention_coverage: attentionCoverage,
        });
      }
    }

    // Calculate continuity score (higher = more continuous attention flow)
    let continuitySum = 0;
    for (let i = 0; i < positions.length; i++) {
      for (let j = 0; j < positions.length; j++) {
        if (Math.abs(i - j) <= 2 && i !== j) {
          continuitySum += attentionFlow[i]?.[j] ?? 0;
        }
      }
    }
    const continuityScore = positions.length > 1
      ? continuitySum / (positions.length * 4)
      : 1.0;

    return {
      parameter_type: parameterType,
      positions: positions,
      values: values,
      attention_flow: attentionFlow,
      continuity_score: Math.min(continuityScore, 1.0),
      discontinuities: discontinuities,
    };
  }

  // ==========================================================================
  // VISUALIZATION
  // ==========================================================================

  /**
   * Generate attention visualization for a program.
   *
   * @param program - G-code program lines
   * @param options - Visualization options
   * @returns Complete attention analysis with heat maps
   */
  visualizeAttention(
    program: string[],
    options: Partial<VisualizationRequest> = {}
  ): AttentionAnalysis {
    // Tokenize program
    const tokens = this.tokenizeProgram(program);

    // Compute attention based on type
    const attentionType = options.attention_type ?? "standard";
    let attentionResult: SelfAttentionResult;

    switch (attentionType) {
      case "local":
        attentionResult = this.computeLocalAttention(tokens, 64);
        break;
      case "global":
        const globalPositions = this.identifyGlobalPositions(tokens);
        attentionResult = this.computeGlobalAttention(tokens, globalPositions);
        break;
      case "sparse":
        attentionResult = this.computeSparseAttention(tokens, {
          window_size: 64,
          global_tokens: [],
          stride: 16,
          random_attention_ratio: 0.1,
          block_size: 8,
        });
        break;
      case "causal":
        attentionResult = this.computeCausalAttention(tokens);
        break;
      case "manufacturing":
        attentionResult = this.computeManufacturingAttention(tokens);
        break;
      default:
        attentionResult = this.computeSelfAttention(tokens);
    }

    // Analyze attention patterns
    const toolChanges = this.analyzeToolChangeAttention(tokens, attentionResult.attention_weights);
    const opBoundaries = this.analyzeOperationBoundaryAttention(tokens, attentionResult.attention_weights);
    const safetyTokens = this.analyzeSafetyCriticalAttention(tokens, attentionResult.attention_weights);

    // Analyze parameter continuity for F, S, X, Z
    const parameterContinuity = [
      this.analyzeParameterContinuityAttention(tokens, attentionResult.attention_weights, "F"),
      this.analyzeParameterContinuityAttention(tokens, attentionResult.attention_weights, "S"),
    ];

    // Find critical tokens
    const criticalTokens = this.findCriticalTokensFromAttention(tokens, attentionResult);

    // Calculate attention metrics
    const entropy = this.computeAttentionEntropy(attentionResult.attention_weights);
    const sparsity = this.computeSparsity(attentionResult.attention_weights, 0.1);

    // Extract dominant patterns across all heads
    const allPatterns: AttentionPattern[] = [];
    for (const head of attentionResult.head_outputs) {
      allPatterns.push(...head.dominant_patterns);
    }

    // Generate recommendations
    const recommendations = this.generateAttentionRecommendations(
      tokens,
      attentionResult,
      toolChanges,
      safetyTokens
    );

    return {
      program_length: program.length,
      total_tokens: tokens.length,
      attention_entropy: entropy,
      attention_sparsity: sparsity,
      dominant_patterns: allPatterns.slice(0, 5),
      critical_tokens: criticalTokens,
      tool_changes: toolChanges,
      operation_boundaries: opBoundaries,
      safety_tokens: safetyTokens,
      parameter_continuity: parameterContinuity,
      recommendations: recommendations,
    };
  }

  /**
   * Generate attention heat map data.
   *
   * @param tokens - Program tokens
   * @param attentionWeights - Attention weight matrix
   * @param options - Heat map options
   * @returns Heat map data structure
   */
  generateHeatMap(
    tokens: GCodeToken[],
    attentionWeights: number[][],
    options: {
      normalization?: "row" | "column" | "none";
      colorScheme?: "viridis" | "hot" | "cool" | "grayscale";
      threshold?: number;
    } = {}
  ): AttentionHeatMap {
    const normalization = options.normalization ?? "row";
    const colorScheme = options.colorScheme ?? "viridis";
    const threshold = options.threshold ?? 0;

    // Extract token strings
    const tokenStrings = tokens.map((t) => t.token);
    const positions = tokens.map((t) => t.position);

    // Normalize weights if requested
    let normalizedWeights = attentionWeights;

    if (normalization === "row") {
      normalizedWeights = attentionWeights.map((row) => {
        const sum = row.reduce((a, b) => a + b, 0.001);
        return row.map((v) => v / sum);
      });
    } else if (normalization === "column") {
      const colSums = new Array(attentionWeights[0]?.length ?? 0).fill(0);
      for (const row of attentionWeights) {
        row.forEach((v, i) => colSums[i] += v);
      }
      normalizedWeights = attentionWeights.map((row) =>
        row.map((v, i) => v / (colSums[i] + 0.001))
      );
    }

    // Apply threshold
    const thresholdedWeights = normalizedWeights.map((row) =>
      row.map((v) => v >= threshold ? v : 0)
    );

    return {
      tokens: tokenStrings,
      positions: positions,
      weights: thresholdedWeights,
      row_labels: tokenStrings.map((t, i) => `${i}:${t}`),
      col_labels: tokenStrings.map((t, i) => `${i}:${t}`),
      normalization: normalization,
      color_scheme: colorScheme,
    };
  }

  /**
   * Find critical tokens based on attention analysis.
   *
   * @param program - G-code program lines
   * @returns List of most critical tokens with importance scores
   */
  findCriticalTokens(program: string[]): TokenImportance[] {
    const tokens = this.tokenizeProgram(program);
    const attentionResult = this.computeManufacturingAttention(tokens);
    return this.findCriticalTokensFromAttention(tokens, attentionResult);
  }

  /**
   * Analyze operation-level dependencies using attention.
   *
   * @param program - G-code program lines
   * @returns Operation dependency analysis
   */
  analyzeOperationDependencies(program: string[]): OperationDependencyAnalysis {
    const tokens = this.tokenizeProgram(program);
    const attentionResult = this.computeManufacturingAttention(tokens);

    // Identify operation boundaries
    const operationBoundaries = this.analyzeOperationBoundaryAttention(
      tokens,
      attentionResult.attention_weights
    );

    // Build operation list
    const operations: OperationInfo[] = [];
    const toolChanges = this.analyzeToolChangeAttention(tokens, attentionResult.attention_weights);

    for (let i = 0; i < operationBoundaries.length; i++) {
      const boundary = operationBoundaries[i];

      // Find tool used in this operation
      let toolUsed = "unknown";
      for (const tc of toolChanges) {
        if (tc.tool_position >= boundary.operation_start &&
            tc.tool_position <= boundary.operation_end) {
          toolUsed = tc.tool_code;
          break;
        }
      }

      // Find cycle type if any
      let cycleType: string | undefined;
      for (let j = boundary.operation_start; j <= boundary.operation_end; j++) {
        const tokenUpper = tokens[j].token.toUpperCase();
        if (CYCLE_CODES.has(tokenUpper)) {
          cycleType = tokenUpper;
          break;
        }
      }

      operations.push({
        operation_id: i,
        name: boundary.nat_label,
        start_position: boundary.operation_start,
        end_position: boundary.operation_end,
        tool_used: toolUsed,
        cycle_type: cycleType,
        dependencies_on: [],
        dependents: [],
      });
    }

    // Build dependency matrix based on cross-operation attention
    const numOps = operations.length;
    const dependencyMatrix: number[][] = Array.from({ length: numOps }, () =>
      new Array(numOps).fill(0)
    );

    for (let i = 0; i < numOps; i++) {
      for (let j = 0; j < numOps; j++) {
        if (i === j) continue;

        const op_i = operations[i];
        const op_j = operations[j];

        // Calculate attention from op_i to op_j
        let attentionSum = 0;
        let count = 0;

        for (let pi = op_i.start_position; pi <= op_i.end_position; pi++) {
          for (let pj = op_j.start_position; pj <= op_j.end_position; pj++) {
            attentionSum += attentionResult.attention_weights[pi]?.[pj] ?? 0;
            count++;
          }
        }

        dependencyMatrix[i][j] = count > 0 ? attentionSum / count : 0;
      }
    }

    // Determine dependencies based on significant attention
    const dependencyThreshold = 0.1;

    for (let i = 0; i < numOps; i++) {
      for (let j = 0; j < numOps; j++) {
        if (i !== j && dependencyMatrix[i][j] > dependencyThreshold) {
          // Operation i depends on operation j (attends to j)
          if (j < i) {
            operations[i].dependencies_on.push(j);
            operations[j].dependents.push(i);
          }
        }
      }
    }

    // Find critical path (longest dependency chain)
    const criticalPath = this.findCriticalPath(operations);

    // Find parallel opportunities (operations with no dependencies on each other)
    const parallelOpportunities = this.findParallelOpportunities(operations);

    // Find bottleneck operations (most dependents)
    const bottleneckOps = operations
      .map((op, idx) => ({ idx, dependents: op.dependents.length }))
      .sort((a, b) => b.dependents - a.dependents)
      .filter((op) => op.dependents > 0)
      .slice(0, 3)
      .map((op) => op.idx);

    return {
      operations: operations,
      dependency_matrix: dependencyMatrix,
      critical_path: criticalPath,
      parallel_opportunities: parallelOpportunities,
      bottleneck_operations: bottleneckOps,
    };
  }

  // ==========================================================================
  // HELPER METHODS — Linear Algebra
  // ==========================================================================

  /**
   * Project embeddings through a weight matrix for one attention head.
   */
  private projectToHead(
    embeddings: number[][],
    W: number[][],
    b: number[]
  ): number[][] {
    return embeddings.map((emb) => {
      const result = new Array(W[0].length).fill(0);
      for (let j = 0; j < W[0].length; j++) {
        for (let i = 0; i < emb.length; i++) {
          result[j] += emb[i] * W[i][j];
        }
        result[j] += b[j];
      }
      return result;
    });
  }

  /**
   * Compute scaled dot-product attention scores.
   * score(i,j) = Q[i] . K[j]^T / sqrt(d_k)
   */
  private computeAttentionScores(
    Q: number[][],
    K: number[][],
    d_k: number
  ): number[][] {
    const seqLen = Q.length;
    const scale = Math.sqrt(d_k);
    const scores: number[][] = [];

    for (let i = 0; i < seqLen; i++) {
      const row: number[] = [];
      for (let j = 0; j < seqLen; j++) {
        let dot = 0;
        for (let k = 0; k < Q[i].length; k++) {
          dot += Q[i][k] * K[j][k];
        }
        row.push(dot / scale);
      }
      scores.push(row);
    }

    return scores;
  }

  /**
   * Compute cross-attention scores between query and key sequences.
   */
  private computeCrossAttentionScores(
    Q: number[][],
    K: number[][],
    d_k: number
  ): number[][] {
    const queryLen = Q.length;
    const keyLen = K.length;
    const scale = Math.sqrt(d_k);
    const scores: number[][] = [];

    for (let i = 0; i < queryLen; i++) {
      const row: number[] = [];
      for (let j = 0; j < keyLen; j++) {
        let dot = 0;
        for (let k = 0; k < Q[i].length; k++) {
          dot += Q[i][k] * K[j][k];
        }
        row.push(dot / scale);
      }
      scores.push(row);
    }

    return scores;
  }

  /**
   * Apply softmax to 2D matrix (row-wise).
   */
  private softmax2D(matrix: number[][]): number[][] {
    return matrix.map((row) => {
      const maxVal = Math.max(...row);
      const expVals = row.map((v) => Math.exp(v - maxVal));
      const sum = expVals.reduce((a, b) => a + b, 0.0001);
      return expVals.map((v) => v / sum);
    });
  }

  /**
   * Matrix multiplication.
   */
  private matmul(A: number[][], B: number[][]): number[][] {
    const rowsA = A.length;
    const colsA = A[0]?.length ?? 0;
    const colsB = B[0]?.length ?? 0;

    const result: number[][] = [];

    for (let i = 0; i < rowsA; i++) {
      const row: number[] = new Array(colsB).fill(0);
      for (let j = 0; j < colsB; j++) {
        for (let k = 0; k < colsA; k++) {
          row[j] += A[i][k] * (B[k]?.[j] ?? 0);
        }
      }
      result.push(row);
    }

    return result;
  }

  /**
   * Concatenate head outputs along last dimension.
   */
  private concatenateHeads(headOutputs: number[][][]): number[][] {
    const seqLen = headOutputs[0]?.length ?? 0;
    const result: number[][] = [];

    for (let i = 0; i < seqLen; i++) {
      const concatenated: number[] = [];
      for (const headOutput of headOutputs) {
        concatenated.push(...(headOutput[i] ?? []));
      }
      result.push(concatenated);
    }

    return result;
  }

  /**
   * Project concatenated output through output weight matrix.
   */
  private projectOutput(
    concatenated: number[][],
    W_o: number[][],
    b_o: number[]
  ): number[][] {
    return concatenated.map((vec) => {
      const result = new Array(W_o[0]?.length ?? 0).fill(0);
      for (let j = 0; j < (W_o[0]?.length ?? 0); j++) {
        for (let i = 0; i < vec.length; i++) {
          result[j] += vec[i] * (W_o[i]?.[j] ?? 0);
        }
        result[j] += b_o[j];
      }
      return result;
    });
  }

  /**
   * Average attention weights across heads.
   */
  private averageWeights(headWeights: number[][][]): number[][] {
    const numHeads = headWeights.length;
    const seqLen = headWeights[0]?.length ?? 0;

    const averaged: number[][] = [];

    for (let i = 0; i < seqLen; i++) {
      const row: number[] = [];
      for (let j = 0; j < seqLen; j++) {
        let sum = 0;
        for (const weights of headWeights) {
          sum += weights[i]?.[j] ?? 0;
        }
        row.push(sum / numHeads);
      }
      averaged.push(row);
    }

    return averaged;
  }

  /**
   * Add two matrices element-wise.
   */
  private addMatrices(A: number[][], B: number[][]): number[][] {
    return A.map((row, i) => row.map((v, j) => v + (B[i]?.[j] ?? 0)));
  }

  /**
   * Apply dropout to matrix (during training).
   */
  private applyDropout(matrix: number[][], dropoutRate: number): number[][] {
    if (dropoutRate <= 0) return matrix;

    const scale = 1 / (1 - dropoutRate);
    return matrix.map((row) =>
      row.map((v) => Math.random() < dropoutRate ? 0 : v * scale)
    );
  }

  // ==========================================================================
  // HELPER METHODS — Masks
  // ==========================================================================

  /**
   * Apply causal mask (upper triangular masking).
   */
  private applyCausalMask(scores: number[][]): number[][] {
    const seqLen = scores.length;
    const masked = scores.map((row) => [...row]);

    for (let i = 0; i < seqLen; i++) {
      for (let j = i + 1; j < seqLen; j++) {
        masked[i][j] = -Infinity;
      }
    }

    return masked;
  }

  /**
   * Apply local attention mask (sliding window).
   */
  private applyLocalMask(scores: number[][], windowSize: number): number[][] {
    const seqLen = scores.length;
    const halfWindow = Math.floor(windowSize / 2);
    const masked = scores.map((row) => [...row]);

    for (let i = 0; i < seqLen; i++) {
      for (let j = 0; j < seqLen; j++) {
        if (Math.abs(i - j) > halfWindow) {
          masked[i][j] = -Infinity;
        }
      }
    }

    return masked;
  }

  /**
   * Apply global + local attention mask.
   */
  private applyGlobalLocalMask(
    scores: number[][],
    globalPositions: Set<number>,
    localWindowSize: number
  ): number[][] {
    const seqLen = scores.length;
    const halfWindow = Math.floor(localWindowSize / 2);
    const masked = scores.map((row) => [...row]);

    for (let i = 0; i < seqLen; i++) {
      for (let j = 0; j < seqLen; j++) {
        const isGlobal = globalPositions.has(i) || globalPositions.has(j);
        const isLocal = Math.abs(i - j) <= halfWindow;

        if (!isGlobal && !isLocal) {
          masked[i][j] = -Infinity;
        }
      }
    }

    return masked;
  }

  /**
   * Generate sparse attention mask.
   */
  private generateSparseAttentionMask(
    seqLen: number,
    config: SparseAttentionConfig
  ): SparseAttentionMask {
    const mask: boolean[][] = Array.from({ length: seqLen }, () =>
      new Array(seqLen).fill(false)
    );

    const halfWindow = Math.floor(config.window_size / 2);
    const globalSet = new Set(config.global_tokens);

    // Local window attention
    for (let i = 0; i < seqLen; i++) {
      for (let j = Math.max(0, i - halfWindow); j <= Math.min(seqLen - 1, i + halfWindow); j++) {
        mask[i][j] = true;
      }
    }

    // Global attention
    const globalArray = Array.from(globalSet);
    for (const g of globalArray) {
      if (g < seqLen) {
        for (let j = 0; j < seqLen; j++) {
          mask[g][j] = true;
          mask[j][g] = true;
        }
      }
    }

    // Strided attention
    for (let i = 0; i < seqLen; i++) {
      for (let j = 0; j < seqLen; j += config.stride) {
        mask[i][j] = true;
      }
    }

    // Random attention
    const numRandom = Math.floor(seqLen * seqLen * config.random_attention_ratio);
    for (let r = 0; r < numRandom; r++) {
      const i = Math.floor(Math.random() * seqLen);
      const j = Math.floor(Math.random() * seqLen);
      mask[i][j] = true;
    }

    // Calculate sparsity ratio
    const totalPositions = seqLen * seqLen;
    const activePositions = mask.flat().filter((v) => v).length;
    const sparsityRatio = 1 - (activePositions / totalPositions);

    return {
      mask: mask,
      sparsity_ratio: sparsityRatio,
      pattern_description: `Local(${config.window_size}) + Global(${config.global_tokens.length}) + Stride(${config.stride}) + Random(${(config.random_attention_ratio * 100).toFixed(0)}%)`,
      memory_savings_ratio: sparsityRatio,
    };
  }

  /**
   * Apply sparse mask to scores.
   */
  private applySparseMask(scores: number[][], mask: boolean[][]): number[][] {
    return scores.map((row, i) =>
      row.map((v, j) => mask[i][j] ? v : -Infinity)
    );
  }

  // ==========================================================================
  // HELPER METHODS — Metrics
  // ==========================================================================

  /**
   * Compute attention entropy (measure of attention distribution).
   * Higher entropy = more uniform attention.
   */
  private computeAttentionEntropy(weights: number[][]): number {
    let totalEntropy = 0;
    let count = 0;

    for (const row of weights) {
      let entropy = 0;
      for (const w of row) {
        if (w > 1e-10) {
          entropy -= w * Math.log2(w);
        }
      }
      totalEntropy += entropy;
      count++;
    }

    return count > 0 ? totalEntropy / count : 0;
  }

  /**
   * Compute attention sparsity (fraction of weights below threshold).
   */
  private computeSparsity(weights: number[][], threshold: number): number {
    let belowThreshold = 0;
    let total = 0;

    for (const row of weights) {
      for (const w of row) {
        if (w < threshold) {
          belowThreshold++;
        }
        total++;
      }
    }

    return total > 0 ? belowThreshold / total : 0;
  }

  /**
   * Find positions with maximum attention for each query position.
   */
  private findMaxAttentionPositions(weights: number[][]): number[] {
    return weights.map((row) => {
      let maxIdx = 0;
      let maxVal = row[0] ?? 0;
      for (let i = 1; i < row.length; i++) {
        if (row[i] > maxVal) {
          maxVal = row[i];
          maxIdx = i;
        }
      }
      return maxIdx;
    });
  }

  /**
   * Classify attention patterns in weight matrix.
   */
  private classifyAttentionPatterns(weights: number[][]): AttentionPattern[] {
    const patterns: AttentionPattern[] = [];
    const seqLen = weights.length;

    // Check for diagonal pattern (self-attention)
    let diagonalSum = 0;
    for (let i = 0; i < seqLen; i++) {
      diagonalSum += weights[i]?.[i] ?? 0;
    }
    const diagonalStrength = seqLen > 0 ? diagonalSum / seqLen : 0;
    if (diagonalStrength > 0.3) {
      patterns.push({
        pattern_type: "diagonal",
        strength: diagonalStrength,
        description: "Strong self-attention (tokens attend to themselves)",
      });
    }

    // Check for vertical stripes (certain positions receive global attention)
    const colSums = new Array(seqLen).fill(0);
    for (const row of weights) {
      row.forEach((v, j) => colSums[j] += v);
    }
    const avgColSum = colSums.reduce((a, b) => a + b, 0) / seqLen;
    const highAttentionCols = colSums.filter((s) => s > avgColSum * 1.5).length;
    if (highAttentionCols > 0 && highAttentionCols < seqLen * 0.1) {
      patterns.push({
        pattern_type: "vertical",
        strength: highAttentionCols / seqLen,
        description: `${highAttentionCols} tokens receive concentrated global attention`,
      });
    }

    // Check for block patterns (operations attending within themselves)
    // Simplified check for now
    const blockStrength = this.estimateBlockPatternStrength(weights);
    if (blockStrength > 0.2) {
      patterns.push({
        pattern_type: "block",
        strength: blockStrength,
        description: "Block-wise attention (operations attend internally)",
      });
    }

    // Check for sparse pattern
    const sparsity = this.computeSparsity(weights, 0.05);
    if (sparsity > 0.7) {
      patterns.push({
        pattern_type: "sparse",
        strength: sparsity,
        description: "Sparse attention distribution",
      });
    }

    // Sort by strength
    patterns.sort((a, b) => b.strength - a.strength);

    return patterns;
  }

  /**
   * Estimate block pattern strength in attention matrix.
   */
  private estimateBlockPatternStrength(weights: number[][]): number {
    const seqLen = weights.length;
    if (seqLen < 4) return 0;

    // Check if nearby positions have higher attention than distant ones
    let nearSum = 0;
    let nearCount = 0;
    let farSum = 0;
    let farCount = 0;

    for (let i = 0; i < seqLen; i++) {
      for (let j = 0; j < seqLen; j++) {
        const dist = Math.abs(i - j);
        const weight = weights[i]?.[j] ?? 0;

        if (dist <= 5) {
          nearSum += weight;
          nearCount++;
        } else if (dist > 10) {
          farSum += weight;
          farCount++;
        }
      }
    }

    const nearAvg = nearCount > 0 ? nearSum / nearCount : 0;
    const farAvg = farCount > 0 ? farSum / farCount : 0;

    if (nearAvg + farAvg === 0) return 0;
    return (nearAvg - farAvg) / (nearAvg + farAvg);
  }

  // ==========================================================================
  // HELPER METHODS — Token Processing
  // ==========================================================================

  /**
   * Get token embedding with positional encoding.
   */
  private getTokenEmbedding(token: GCodeToken): number[] {
    const { d_model } = this.config;

    // Start with position-based embedding if no embedding provided
    let embedding = token.embedding;
    if (!embedding || embedding.length === 0) {
      embedding = this.generateTokenEmbedding(token);
    }

    // Add positional encoding
    const pos = token.position;
    if (pos < this.positionalEncodings.length) {
      const posEnc = this.positionalEncodings[pos];
      embedding = embedding.map((v, i) => v + (posEnc[i] ?? 0));
    }

    return embedding;
  }

  /**
   * Generate embedding for a token based on its type and value.
   */
  private generateTokenEmbedding(token: GCodeToken): number[] {
    const { d_model } = this.config;
    const embedding = new Array(d_model).fill(0);

    // Type-based initialization
    const typeIndex = this.getTypeIndex(token.type);
    const typePhase = (typeIndex * Math.PI) / 10;

    for (let i = 0; i < d_model; i++) {
      const freq = (i + 1) / d_model;
      embedding[i] = Math.sin(typePhase + freq * 2 * Math.PI) * 0.5;
    }

    // Value-based modulation
    if (token.value !== undefined) {
      const valuePhase = Math.log1p(Math.abs(token.value)) * 0.1;
      for (let i = 0; i < d_model; i += 2) {
        embedding[i] += Math.cos(valuePhase * (i + 1)) * 0.3;
      }
    }

    // Semantic role modulation
    const bias = this.semanticBiases.get(token.semantic_role ?? "unknown") ?? 0.5;
    for (let i = 0; i < d_model; i++) {
      embedding[i] *= bias;
    }

    return embedding;
  }

  /**
   * Get numeric index for token type.
   */
  private getTypeIndex(type: GCodeTokenType): number {
    const typeMap: Record<GCodeTokenType, number> = {
      G_CODE: 0,
      M_CODE: 1,
      T_CODE: 2,
      S_CODE: 3,
      F_CODE: 4,
      X_COORD: 5,
      Z_COORD: 6,
      I_COORD: 7,
      K_COORD: 8,
      R_CODE: 9,
      P_CODE: 10,
      Q_CODE: 11,
      U_CODE: 12,
      W_CODE: 13,
      N_LINE: 14,
      NAT_BLOCK: 15,
      COMMENT: 16,
      SPECIAL: 17,
      NUMBER: 18,
      UNKNOWN: 19,
    };
    return typeMap[type] ?? 19;
  }

  /**
   * Tokenize a G-code program into tokens.
   */
  private tokenizeProgram(program: string[]): GCodeToken[] {
    const tokens: GCodeToken[] = [];
    let position = 0;
    let lineNumber = 0;

    for (const line of program) {
      lineNumber++;
      const trimmed = line.trim().toUpperCase();

      if (!trimmed || trimmed.startsWith(";")) {
        // Comment line
        tokens.push({
          id: this.vocabulary.get("COMMENT") ?? -1,
          token: trimmed || ";",
          type: "COMMENT",
          position: position++,
          embedding: [],
          line_number: lineNumber,
          semantic_role: "unknown",
        });
        continue;
      }

      // Check for NAT block
      if (NAT_BLOCK_PATTERN.test(trimmed)) {
        tokens.push({
          id: this.vocabulary.get("NAT") ?? -1,
          token: trimmed,
          type: "NAT_BLOCK",
          position: position++,
          embedding: [],
          line_number: lineNumber,
          semantic_role: "operation_boundary",
        });
        continue;
      }

      // Parse G-code tokens
      const regex = /([GMNSTFXZIJKRPQUW])(-?\d*\.?\d*)/g;
      let match;

      while ((match = regex.exec(trimmed)) !== null) {
        const prefix = match[1];
        const valueStr = match[2];
        const fullToken = prefix + valueStr;
        const value = valueStr ? parseFloat(valueStr) : undefined;

        const type = this.getTokenType(prefix);
        const role = this.getSemanticRole(prefix, valueStr);

        tokens.push({
          id: this.vocabulary.get(fullToken) ?? this.vocabulary.get(prefix) ?? -1,
          token: fullToken,
          type: type,
          position: position++,
          embedding: [],
          value: value,
          line_number: lineNumber,
          semantic_role: role,
        });
      }
    }

    return tokens;
  }

  /**
   * Get token type from prefix character.
   */
  private getTokenType(prefix: string): GCodeTokenType {
    const typeMap: Record<string, GCodeTokenType> = {
      G: "G_CODE",
      M: "M_CODE",
      T: "T_CODE",
      S: "S_CODE",
      F: "F_CODE",
      X: "X_COORD",
      Z: "Z_COORD",
      I: "I_COORD",
      K: "K_COORD",
      R: "R_CODE",
      P: "P_CODE",
      Q: "Q_CODE",
      U: "U_CODE",
      W: "W_CODE",
      N: "N_LINE",
    };
    return typeMap[prefix] ?? "UNKNOWN";
  }

  /**
   * Get semantic role based on token prefix and value.
   */
  private getSemanticRole(prefix: string, value?: string): SemanticRole {
    if (prefix === "G") {
      const code = value ? parseInt(value, 10) : 0;
      if (code === 0 || code === 1 || code === 2 || code === 3) return "motion_command";
      if (code >= 70 && code <= 76) return "cycle_command";
      if (code === 32 || code === 33 || code === 34 || code === 92) return "cycle_command";
      if (code === 96 || code === 97) return "spindle_control";
      if (code === 98 || code === 99) return "feed_control";
      if (code === 50 || code === 28 || code === 30) return "safety_critical";
      if (code >= 54 && code <= 59) return "work_offset";
      if (code >= 40 && code <= 42) return "compensation";
      if (code === 4) return "dwell";
      return "unknown";
    }

    if (prefix === "M") {
      const code = value ? parseInt(value, 10) : 0;
      if (code === 3 || code === 4 || code === 5) return "spindle_control";
      if (code === 8 || code === 9) return "coolant_control";
      if (code === 0 || code === 1 || code === 2 || code === 30) return "safety_critical";
      if (code === 98 || code === 99) return "program_control";
      return "program_control";
    }

    const roleMap: Record<string, SemanticRole> = {
      T: "tool_selection",
      S: "spindle_control",
      F: "feed_control",
      X: "positioning",
      Z: "positioning",
      I: "arc_definition",
      K: "arc_definition",
      R: "arc_definition",
      P: "dwell",
      Q: "motion_command",
      U: "positioning",
      W: "positioning",
      N: "unknown",
    };

    return roleMap[prefix] ?? "unknown";
  }

  /**
   * Compute semantic bias matrix for manufacturing-aware attention.
   */
  private computeSemanticBiasMatrix(tokens: GCodeToken[]): number[][] {
    const seqLen = tokens.length;
    const biasMatrix: number[][] = [];

    for (let i = 0; i < seqLen; i++) {
      const row: number[] = [];
      for (let j = 0; j < seqLen; j++) {
        const qBias = this.semanticBiases.get(tokens[i].semantic_role ?? "unknown") ?? 0.5;
        const kBias = this.semanticBiases.get(tokens[j].semantic_role ?? "unknown") ?? 0.5;

        // Combine biases: higher bias on important keys
        row.push(Math.log(kBias) * 0.5);
      }
      biasMatrix.push(row);
    }

    return biasMatrix;
  }

  /**
   * Identify positions that should have global attention.
   */
  private identifyGlobalPositions(tokens: GCodeToken[]): number[] {
    const globalPositions: number[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      // Tool changes always global
      if (token.type === "T_CODE") {
        globalPositions.push(i);
      }

      // Safety-critical codes always global
      if (SAFETY_CRITICAL_CODES.has(token.token.toUpperCase())) {
        globalPositions.push(i);
      }

      // Operation boundaries (NAT blocks) always global
      if (token.type === "NAT_BLOCK") {
        globalPositions.push(i);
      }

      // Cycle start codes
      if (token.type === "G_CODE" && CYCLE_CODES.has(token.token.toUpperCase())) {
        globalPositions.push(i);
      }
    }

    return Array.from(new Set(globalPositions));
  }

  /**
   * Extract alignment scores from cross-attention weights.
   */
  private extractAlignmentScores(
    weights: number[][],
    queryTokens: GCodeToken[],
    contextTokens: GCodeToken[]
  ): AlignmentScore[] {
    const alignments: AlignmentScore[] = [];

    for (let i = 0; i < queryTokens.length; i++) {
      let maxScore = 0;
      let maxJ = 0;

      for (let j = 0; j < contextTokens.length; j++) {
        const score = weights[i]?.[j] ?? 0;
        if (score > maxScore) {
          maxScore = score;
          maxJ = j;
        }
      }

      if (maxScore > 0.1) {
        alignments.push({
          query_position: i,
          query_token: queryTokens[i].token,
          aligned_key_position: maxJ,
          aligned_key_token: contextTokens[maxJ]?.token ?? "unknown",
          score: maxScore,
        });
      }
    }

    return alignments.sort((a, b) => b.score - a.score);
  }

  /**
   * Find critical tokens from attention analysis.
   */
  private findCriticalTokensFromAttention(
    tokens: GCodeToken[],
    attentionResult: SelfAttentionResult
  ): TokenImportance[] {
    const weights = attentionResult.attention_weights;
    const tokenImportance: TokenImportance[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      // Calculate incoming attention (how much other tokens attend to this one)
      let incomingAttention = 0;
      for (let j = 0; j < tokens.length; j++) {
        incomingAttention += weights[j]?.[i] ?? 0;
      }

      // Calculate outgoing attention (how much this token attends to others)
      let outgoingAttention = 0;
      const dependencies: TokenDependency[] = [];
      for (let j = 0; j < tokens.length; j++) {
        const w = weights[i]?.[j] ?? 0;
        outgoingAttention += w;

        if (w > 0.1 && i !== j) {
          dependencies.push({
            dependent_position: j,
            dependent_token: tokens[j].token,
            attention_weight: w,
            dependency_type: w > 0.3 ? "strong" : w > 0.15 ? "moderate" : "weak",
          });
        }
      }

      // Normalize by sequence length
      const seqLen = tokens.length;
      incomingAttention /= seqLen;
      outgoingAttention /= seqLen;

      // Calculate importance score
      const semanticBias = this.semanticBiases.get(token.semantic_role ?? "unknown") ?? 0.5;
      const importanceScore = (incomingAttention * 0.4 + outgoingAttention * 0.3 + semanticBias * 0.3);

      // Determine if critical
      const isCritical = importanceScore > 0.5 ||
        SAFETY_CRITICAL_CODES.has(token.token.toUpperCase()) ||
        token.type === "T_CODE" ||
        token.type === "NAT_BLOCK";

      tokenImportance.push({
        token: token.token,
        position: i,
        type: token.type,
        importance_score: importanceScore,
        incoming_attention: incomingAttention,
        outgoing_attention: outgoingAttention,
        semantic_role: token.semantic_role ?? "unknown",
        is_critical: isCritical,
        dependencies: dependencies.slice(0, 5),
      });
    }

    // Sort by importance score
    return tokenImportance.sort((a, b) => b.importance_score - a.importance_score);
  }

  /**
   * Generate attention-based recommendations.
   */
  private generateAttentionRecommendations(
    tokens: GCodeToken[],
    attentionResult: SelfAttentionResult,
    toolChanges: ToolChangeAttention[],
    safetyTokens: SafetyCriticalAttention[]
  ): AttentionRecommendation[] {
    const recommendations: AttentionRecommendation[] = [];

    // Check for safety tokens with low attention
    for (const safety of safetyTokens) {
      if (safety.warning_if_low_attention) {
        const avgAttention = safety.attention_to_parameters.length > 0
          ? safety.attention_to_parameters.reduce((a, b) => a + b, 0) / safety.attention_to_parameters.length
          : 0;

        recommendations.push({
          type: "safety",
          position: safety.position,
          token: safety.token,
          message: `Safety token ${safety.token} (${safety.safety_type}) has low attention coverage (${(avgAttention * 100).toFixed(1)}%). Parameters may not properly reference this constraint.`,
          attention_evidence: avgAttention,
          suggested_action: `Verify that ${safety.safety_type === "max_rpm" ? "spindle speed" : "program flow"} correctly accounts for this safety token.`,
        });
      }
    }

    // Check for isolated tool changes
    for (const tc of toolChanges) {
      if (tc.spindle_associations.length === 0) {
        recommendations.push({
          type: "warning",
          position: tc.tool_position,
          token: tc.tool_code,
          message: `Tool change ${tc.tool_code} has no spindle speed association detected in attention patterns.`,
          attention_evidence: 0,
          suggested_action: "Verify spindle speed is set appropriately after this tool change.",
        });
      }

      if (tc.feed_associations.length === 0) {
        recommendations.push({
          type: "warning",
          position: tc.tool_position,
          token: tc.tool_code,
          message: `Tool change ${tc.tool_code} has no feed rate association detected in attention patterns.`,
          attention_evidence: 0,
          suggested_action: "Verify feed rate is set appropriately after this tool change.",
        });
      }
    }

    // Check attention entropy for optimization opportunities
    const entropy = this.computeAttentionEntropy(attentionResult.attention_weights);
    if (entropy > 4.0) {
      recommendations.push({
        type: "optimization",
        position: 0,
        token: "PROGRAM",
        message: `High attention entropy (${entropy.toFixed(2)}) suggests complex interdependencies. Consider breaking into smaller operations.`,
        attention_evidence: entropy,
        suggested_action: "Review program structure for potential simplification or modularization.",
      });
    }

    // Check for quality issues based on attention patterns
    const sparsity = this.computeSparsity(attentionResult.attention_weights, 0.05);
    if (sparsity > 0.9) {
      recommendations.push({
        type: "quality",
        position: 0,
        token: "PROGRAM",
        message: `Very sparse attention (${(sparsity * 100).toFixed(1)}%) suggests disconnected program sections.`,
        attention_evidence: sparsity,
        suggested_action: "Review program flow for logical continuity between operations.",
      });
    }

    return recommendations;
  }

  /**
   * Find critical path through operation dependencies.
   */
  private findCriticalPath(operations: OperationInfo[]): number[] {
    if (operations.length === 0) return [];

    // Simple longest path algorithm
    const visited = new Set<number>();
    const memo = new Map<number, number[]>();

    const findLongestPath = (opId: number): number[] => {
      if (visited.has(opId)) return memo.get(opId) ?? [];
      visited.add(opId);

      const op = operations[opId];
      if (!op || op.dependents.length === 0) {
        memo.set(opId, [opId]);
        return [opId];
      }

      let longestSubpath: number[] = [];
      for (const dep of op.dependents) {
        const subpath = findLongestPath(dep);
        if (subpath.length > longestSubpath.length) {
          longestSubpath = subpath;
        }
      }

      const path = [opId, ...longestSubpath];
      memo.set(opId, path);
      return path;
    };

    // Find longest path starting from operations with no dependencies
    let criticalPath: number[] = [];
    for (let i = 0; i < operations.length; i++) {
      if (operations[i].dependencies_on.length === 0) {
        visited.clear();
        const path = findLongestPath(i);
        if (path.length > criticalPath.length) {
          criticalPath = path;
        }
      }
    }

    return criticalPath;
  }

  /**
   * Find parallel opportunities in operations.
   */
  private findParallelOpportunities(operations: OperationInfo[]): number[][] {
    const opportunities: number[][] = [];
    const numOps = operations.length;

    // Find groups of operations that have no dependencies on each other
    const visited = new Set<number>();

    for (let i = 0; i < numOps; i++) {
      if (visited.has(i)) continue;

      const parallelGroup: number[] = [i];
      visited.add(i);

      for (let j = i + 1; j < numOps; j++) {
        if (visited.has(j)) continue;

        // Check if j can run parallel with all current group members
        let canParallel = true;
        for (const k of parallelGroup) {
          if (operations[j].dependencies_on.includes(k) ||
              operations[k].dependencies_on.includes(j)) {
            canParallel = false;
            break;
          }
        }

        if (canParallel) {
          parallelGroup.push(j);
          visited.add(j);
        }
      }

      if (parallelGroup.length > 1) {
        opportunities.push(parallelGroup);
      }
    }

    return opportunities;
  }

  // ==========================================================================
  // PUBLIC API — Configuration
  // ==========================================================================

  /**
   * Get current configuration.
   */
  getConfig(): AttentionConfig {
    return { ...this.config };
  }

  /**
   * Update configuration (reinitializes weights if d_model changes).
   */
  updateConfig(config: Partial<AttentionConfig>): void {
    const needsReinit = config.d_model !== undefined && config.d_model !== this.config.d_model ||
                        config.n_heads !== undefined && config.n_heads !== this.config.n_heads;

    this.config = {
      ...this.config,
      ...config,
      d_k: config.d_k ?? Math.floor((config.d_model ?? this.config.d_model) / (config.n_heads ?? this.config.n_heads)),
      d_v: config.d_v ?? Math.floor((config.d_model ?? this.config.d_model) / (config.n_heads ?? this.config.n_heads)),
    };

    if (needsReinit) {
      this.initializeWeights();
      this.initializePositionalEncodings();
      log.info(`[LatheAttention] Configuration updated, weights reinitialized`);
    }
  }

  /**
   * Get vocabulary size.
   */
  getVocabularySize(): number {
    return this.vocabulary.size;
  }

  /**
   * Get semantic bias for a role.
   */
  getSemanticBias(role: SemanticRole): number {
    return this.semanticBiases.get(role) ?? 0.5;
  }

  /**
   * Update semantic bias for a role.
   */
  setSemanticBias(role: SemanticRole, bias: number): void {
    this.semanticBiases.set(role, Math.max(0.1, Math.min(5.0, bias)));
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheAttentionMechanismEngine = new LatheAttentionMechanismEngine();

export default latheAttentionMechanismEngine;
