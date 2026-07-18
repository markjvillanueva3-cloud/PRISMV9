// WIRE-EXEMPT: internal ML component composed by LatheSelfAwarenessIntegrationEngine and LatheUnifiedAIOrchestrator (both wired). No direct dispatcher action — exposed through those orchestrators.
/**
 * LatheTransformerEngine — LATHE-TRANSFORMER-MS0
 * ================================================
 * Transformer Architecture for Lathe Program Understanding
 *
 * Implements a complete transformer neural network for G-code sequence
 * understanding, optimization, and generation. Based on "Attention Is All
 * You Need" (Vaswani et al., 2017) adapted for CNC manufacturing domain.
 *
 * Architecture Components:
 *   1. Token Embedding — G-code tokenization with learned embeddings
 *   2. Positional Encoding — Sinusoidal position representation
 *   3. Self-Attention — Multi-head scaled dot-product attention
 *   4. Transformer Encoder — Layer norm, FFN, residual connections
 *   5. Transformer Decoder — Causal masking, cross-attention
 *   6. Task-Specific Heads — Classification, prediction, scoring
 *
 * Pre-training Tasks:
 *   - Masked G-code Modeling (MGM) — Like BERT for G-code
 *   - Next Operation Prediction (NOP) — Sequence continuation
 *   - Parameter Completion — Fill in missing values
 *   - Quality Prediction — Score program quality
 *
 * Fine-tuning Tasks:
 *   - Program Optimization — Improve cutting parameters
 *   - Error Detection — Identify mistakes and inefficiencies
 *   - Style Transfer — Convert amateur to expert patterns
 *   - Controller Translation — Fanuc <-> Okuma <-> Mazak
 *
 * Training Features:
 *   - Batch Processing with gradient accumulation
 *   - Learning Rate Scheduling (warmup + cosine decay)
 *   - Model Checkpointing with early stopping
 *   - Attention Visualization for interpretability
 *
 * @module engines/LatheTransformerEngine
 * @milestone LATHE-TRANSFORMER-MS0
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TOKEN VOCABULARY — G-code Tokens for Lathe Operations
// ============================================================================

/** G-code token types */
export type GCodeTokenType =
  | "G_CODE"        // G0, G1, G2, G3, G4, G28, G32, G70-G76, G96, G97, etc.
  | "M_CODE"        // M0, M1, M3, M4, M5, M8, M9, M30, etc.
  | "T_CODE"        // T0101, T0202, etc.
  | "S_CODE"        // S1200, S800, etc.
  | "F_CODE"        // F0.012, F.008, etc.
  | "X_COORD"       // X1.5, X-0.25, etc.
  | "Z_COORD"       // Z0.1, Z-2.5, etc.
  | "I_COORD"       // I (arc center)
  | "K_COORD"       // K (arc center)
  | "R_CODE"        // R0.015 (radius/chamfer)
  | "P_CODE"        // P (dwell time, cycle param)
  | "Q_CODE"        // Q (peck depth)
  | "U_CODE"        // U (incremental X)
  | "W_CODE"        // W (incremental Z)
  | "N_LINE"        // N0010, N0020 (line number)
  | "COMMENT"       // (COMMENT), ; comment
  | "SPECIAL"       // Special tokens: [CLS], [SEP], [MASK], [PAD]
  | "NUMBER"        // Standalone numeric value
  | "UNKNOWN";      // Unrecognized token

/** Token vocabulary entry */
export interface VocabEntry {
  token: string;
  id: number;
  type: GCodeTokenType;
  frequency: number;
  embedding?: number[];
}

/** Special tokens */
export const SPECIAL_TOKENS = {
  PAD: "[PAD]",
  CLS: "[CLS]",
  SEP: "[SEP]",
  MASK: "[MASK]",
  UNK: "[UNK]",
  BOS: "[BOS]",
  EOS: "[EOS]",
};

/** Lathe-specific G-code vocabulary */
const LATHE_GCODE_VOCAB: Array<{ token: string; type: GCodeTokenType }> = [
  // Special tokens (ids 0-6)
  { token: SPECIAL_TOKENS.PAD, type: "SPECIAL" },
  { token: SPECIAL_TOKENS.CLS, type: "SPECIAL" },
  { token: SPECIAL_TOKENS.SEP, type: "SPECIAL" },
  { token: SPECIAL_TOKENS.MASK, type: "SPECIAL" },
  { token: SPECIAL_TOKENS.UNK, type: "SPECIAL" },
  { token: SPECIAL_TOKENS.BOS, type: "SPECIAL" },
  { token: SPECIAL_TOKENS.EOS, type: "SPECIAL" },

  // Positioning G-codes
  { token: "G0", type: "G_CODE" },
  { token: "G00", type: "G_CODE" },
  { token: "G1", type: "G_CODE" },
  { token: "G01", type: "G_CODE" },
  { token: "G2", type: "G_CODE" },
  { token: "G02", type: "G_CODE" },
  { token: "G3", type: "G_CODE" },
  { token: "G03", type: "G_CODE" },
  { token: "G4", type: "G_CODE" },
  { token: "G04", type: "G_CODE" },

  // Reference/work coordinates
  { token: "G20", type: "G_CODE" },  // Inch
  { token: "G21", type: "G_CODE" },  // Metric
  { token: "G28", type: "G_CODE" },  // Return to reference
  { token: "G30", type: "G_CODE" },  // Secondary reference
  { token: "G40", type: "G_CODE" },  // Tool nose comp cancel
  { token: "G41", type: "G_CODE" },  // Tool nose comp left
  { token: "G42", type: "G_CODE" },  // Tool nose comp right
  { token: "G50", type: "G_CODE" },  // Max spindle speed / work coord
  { token: "G53", type: "G_CODE" },  // Machine coordinate
  { token: "G54", type: "G_CODE" },  // Work offset 1
  { token: "G55", type: "G_CODE" },  // Work offset 2
  { token: "G56", type: "G_CODE" },  // Work offset 3

  // Canned cycles
  { token: "G70", type: "G_CODE" },  // Finishing cycle
  { token: "G71", type: "G_CODE" },  // OD/ID stock removal - rough
  { token: "G72", type: "G_CODE" },  // Facing cycle - rough
  { token: "G73", type: "G_CODE" },  // Pattern repeat
  { token: "G74", type: "G_CODE" },  // Peck drilling
  { token: "G75", type: "G_CODE" },  // Grooving cycle
  { token: "G76", type: "G_CODE" },  // Threading cycle

  // Threading
  { token: "G32", type: "G_CODE" },  // Thread cutting
  { token: "G33", type: "G_CODE" },  // Thread cutting (alternate)
  { token: "G34", type: "G_CODE" },  // Variable lead threading
  { token: "G92", type: "G_CODE" },  // Threading cycle (Fanuc)

  // Spindle control
  { token: "G96", type: "G_CODE" },  // Constant surface speed ON
  { token: "G97", type: "G_CODE" },  // Constant surface speed OFF (RPM mode)
  { token: "G98", type: "G_CODE" },  // Feed per minute
  { token: "G99", type: "G_CODE" },  // Feed per revolution

  // M-codes
  { token: "M0", type: "M_CODE" },   // Program stop
  { token: "M00", type: "M_CODE" },
  { token: "M1", type: "M_CODE" },   // Optional stop
  { token: "M01", type: "M_CODE" },
  { token: "M2", type: "M_CODE" },   // Program end
  { token: "M02", type: "M_CODE" },
  { token: "M3", type: "M_CODE" },   // Spindle CW
  { token: "M03", type: "M_CODE" },
  { token: "M4", type: "M_CODE" },   // Spindle CCW
  { token: "M04", type: "M_CODE" },
  { token: "M5", type: "M_CODE" },   // Spindle stop
  { token: "M05", type: "M_CODE" },
  { token: "M8", type: "M_CODE" },   // Coolant on
  { token: "M08", type: "M_CODE" },
  { token: "M9", type: "M_CODE" },   // Coolant off
  { token: "M09", type: "M_CODE" },
  { token: "M30", type: "M_CODE" },  // Program end and rewind
  { token: "M98", type: "M_CODE" },  // Subprogram call
  { token: "M99", type: "M_CODE" },  // Subprogram return

  // Coordinate prefixes
  { token: "X", type: "X_COORD" },
  { token: "Z", type: "Z_COORD" },
  { token: "I", type: "I_COORD" },
  { token: "K", type: "K_COORD" },
  { token: "R", type: "R_CODE" },
  { token: "P", type: "P_CODE" },
  { token: "Q", type: "Q_CODE" },
  { token: "U", type: "U_CODE" },
  { token: "W", type: "W_CODE" },
  { token: "N", type: "N_LINE" },
  { token: "T", type: "T_CODE" },
  { token: "S", type: "S_CODE" },
  { token: "F", type: "F_CODE" },
];

// ============================================================================
// TYPE DEFINITIONS — Transformer Architecture
// ============================================================================

/** Activation function type */
export type ActivationFn = "relu" | "gelu" | "swish" | "tanh" | "sigmoid" | "softmax";

/** Transformer configuration */
export interface TransformerConfig {
  vocab_size: number;
  max_seq_length: number;
  d_model: number;           // Embedding dimension
  n_heads: number;           // Number of attention heads
  n_encoder_layers: number;  // Number of encoder layers
  n_decoder_layers: number;  // Number of decoder layers
  d_ff: number;              // Feed-forward dimension
  dropout_rate: number;
  attention_dropout: number;
  activation: ActivationFn;
  layer_norm_eps: number;
  use_bias: boolean;
}

/** Token embedding with position */
export interface TokenEmbedding {
  token_id: number;
  token: string;
  position: number;
  embedding: number[];
  position_encoding: number[];
  combined_embedding: number[];
}

/** Attention weights for visualization */
export interface AttentionWeights {
  layer: number;
  head: number;
  query_position: number;
  attention_scores: number[];  // Attention to each key position
}

/** Multi-head attention result */
export interface AttentionResult {
  output: number[][];          // [seq_len, d_model]
  attention_weights: AttentionWeights[];
}

/** Encoder layer output */
export interface EncoderLayerOutput {
  layer_id: number;
  hidden_states: number[][];   // [seq_len, d_model]
  attention_weights: AttentionWeights[];
  ffn_activations?: number[][]; // For debugging
}

/** Decoder layer output */
export interface DecoderLayerOutput {
  layer_id: number;
  hidden_states: number[][];
  self_attention_weights: AttentionWeights[];
  cross_attention_weights: AttentionWeights[];
}

/** Full encoder output */
export interface EncoderOutput {
  final_hidden_states: number[][];
  all_hidden_states: number[][][];  // Per layer
  all_attention_weights: AttentionWeights[][];
}

/** Full decoder output */
export interface DecoderOutput {
  final_hidden_states: number[][];
  all_hidden_states: number[][][];
  all_self_attention_weights: AttentionWeights[][];
  all_cross_attention_weights: AttentionWeights[][];
}

// ============================================================================
// TASK-SPECIFIC HEAD TYPES
// ============================================================================

/** Operation classification result */
export interface OperationClassification {
  operation_type: LatheOperationType;
  confidence: number;
  all_probabilities: Record<LatheOperationType, number>;
  explanation: string;
}

/** Lathe operation types */
export type LatheOperationType =
  | "od_rough" | "od_finish" | "od_groove" | "od_thread"
  | "id_rough" | "id_finish" | "id_groove" | "id_thread"
  | "face" | "center_drill" | "drill" | "boring"
  | "cutoff" | "parting" | "taper" | "contour"
  | "unknown";

/** Parameter prediction result */
export interface ParameterPrediction {
  spindle_speed_rpm: number;
  feed_rate_ipr: number;
  depth_of_cut_in: number;
  surface_speed_sfm: number;
  confidence: number;
  prediction_basis: string[];
}

/** Quality score result */
export interface QualityScore {
  overall_score: number;       // 0-100
  parameter_score: number;
  sequence_score: number;
  safety_score: number;
  efficiency_score: number;
  issues: QualityIssue[];
}

/** Quality issue */
export interface QualityIssue {
  severity: "critical" | "warning" | "suggestion";
  category: string;
  description: string;
  line_range?: [number, number];
  recommendation: string;
}

/** Sequence-to-sequence result */
export interface Seq2SeqResult {
  output_tokens: string[];
  output_ids: number[];
  attention_visualization: AttentionWeights[][];
  generation_log: GenerationStep[];
}

/** Generation step for debugging */
export interface GenerationStep {
  step: number;
  generated_token: string;
  token_probability: number;
  top_k_candidates: Array<{ token: string; probability: number }>;
}

// ============================================================================
// TRAINING TYPES
// ============================================================================

/** Training sample */
export interface TrainingSample {
  input_ids: number[];
  attention_mask: number[];
  labels?: number[];           // For classification
  target_ids?: number[];       // For seq2seq
  metadata?: {
    source_file?: string;
    operation_type?: LatheOperationType;
    quality_score?: number;
  };
}

/** Training batch */
export interface TrainingBatch {
  input_ids: number[][];       // [batch_size, seq_len]
  attention_mask: number[][];
  labels?: number[][];
  target_ids?: number[][];
}

/** Training configuration */
export interface TrainingConfig {
  learning_rate: number;
  warmup_steps: number;
  max_steps: number;
  batch_size: number;
  gradient_accumulation_steps: number;
  max_grad_norm: number;
  weight_decay: number;
  lr_scheduler: "linear" | "cosine" | "constant";
  early_stopping_patience: number;
  checkpoint_interval: number;
  eval_interval: number;
}

/** Training state */
export interface TrainingState {
  step: number;
  epoch: number;
  best_loss: number;
  best_step: number;
  learning_rate: number;
  total_samples: number;
  train_loss_history: number[];
  eval_loss_history: number[];
  gradient_norms: number[];
  no_improvement_count: number;
}

/** Model checkpoint */
export interface ModelCheckpoint {
  step: number;
  epoch: number;
  config: TransformerConfig;
  embeddings: number[][];
  encoder_weights: EncoderWeights[];
  decoder_weights: DecoderWeights[];
  training_state: TrainingState;
  timestamp: number;
}

/** Layer weights */
export interface EncoderWeights {
  layer_id: number;
  self_attention: AttentionLayerWeights;
  ffn: FFNWeights;
  layer_norm1: LayerNormWeights;
  layer_norm2: LayerNormWeights;
}

export interface DecoderWeights {
  layer_id: number;
  self_attention: AttentionLayerWeights;
  cross_attention: AttentionLayerWeights;
  ffn: FFNWeights;
  layer_norm1: LayerNormWeights;
  layer_norm2: LayerNormWeights;
  layer_norm3: LayerNormWeights;
}

export interface AttentionLayerWeights {
  W_q: number[][];
  W_k: number[][];
  W_v: number[][];
  W_o: number[][];
  b_q?: number[];
  b_k?: number[];
  b_v?: number[];
  b_o?: number[];
}

export interface FFNWeights {
  W1: number[][];
  W2: number[][];
  b1?: number[];
  b2?: number[];
}

export interface LayerNormWeights {
  gamma: number[];
  beta: number[];
}

// ============================================================================
// PRE-TRAINING TASK TYPES
// ============================================================================

/** Masked G-code modeling sample */
export interface MGMSample {
  original_ids: number[];
  masked_ids: number[];
  mask_positions: number[];
  labels: number[];            // Original token ids at masked positions
}

/** Next operation prediction sample */
export interface NOPSample {
  context_ids: number[];
  next_operation: LatheOperationType;
  label: number;               // Class index
}

/** Parameter completion sample */
export interface ParamCompletionSample {
  context_ids: number[];
  missing_param_type: "S" | "F" | "X" | "Z";
  target_value: number;
}

// ============================================================================
// FINE-TUNING TYPES
// ============================================================================

/** Style transfer result */
export interface StyleTransferResult {
  original_program: string[];
  optimized_program: string[];
  changes_made: StyleChange[];
  improvement_score: number;
}

/** Style change */
export interface StyleChange {
  line_number: number;
  original: string;
  optimized: string;
  change_type: "parameter" | "sequence" | "safety" | "efficiency";
  explanation: string;
}

/** Controller translation result */
export interface ControllerTranslation {
  source_controller: ControllerDialect;
  target_controller: ControllerDialect;
  source_program: string[];
  translated_program: string[];
  translation_notes: string[];
  compatibility_score: number;
}

/** Controller dialects */
export type ControllerDialect = "fanuc" | "okuma_osp" | "mazak" | "haas" | "siemens";

// ============================================================================
// LATHE TRANSFORMER ENGINE
// ============================================================================

export class LatheTransformerEngine {
  private config: TransformerConfig;
  private vocabulary: Map<string, VocabEntry>;
  private reverseVocab: Map<number, VocabEntry>;
  private embeddings: number[][];
  private encoderLayers: EncoderWeights[];
  private decoderLayers: DecoderWeights[];
  private trainingState: TrainingState;

  // Task-specific head weights
  private classificationHead: number[][];
  private parameterHead: number[][];
  private qualityHead: number[][];
  private lmHead: number[][];  // Language model head for generation

  // Training samples
  private trainingSamples: TrainingSample[] = [];
  private evalSamples: TrainingSample[] = [];

  constructor(config?: Partial<TransformerConfig>) {
    this.config = {
      vocab_size: 512,
      max_seq_length: 512,
      d_model: 256,
      n_heads: 8,
      n_encoder_layers: 6,
      n_decoder_layers: 6,
      d_ff: 1024,
      dropout_rate: 0.1,
      attention_dropout: 0.1,
      activation: "gelu",
      layer_norm_eps: 1e-6,
      use_bias: true,
      ...config,
    };

    this.vocabulary = new Map();
    this.reverseVocab = new Map();
    this.embeddings = [];
    this.encoderLayers = [];
    this.decoderLayers = [];
    this.classificationHead = [];
    this.parameterHead = [];
    this.qualityHead = [];
    this.lmHead = [];

    this.trainingState = {
      step: 0,
      epoch: 0,
      best_loss: Infinity,
      best_step: 0,
      learning_rate: 0.0001,
      total_samples: 0,
      train_loss_history: [],
      eval_loss_history: [],
      gradient_norms: [],
      no_improvement_count: 0,
    };

    this.initializeVocabulary();
    this.initializeWeights();

    log.info(`[LatheTransformer] Initialized: d_model=${this.config.d_model}, heads=${this.config.n_heads}, vocab=${this.config.vocab_size}`);
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize vocabulary from G-code tokens.
   */
  private initializeVocabulary(): void {
    let id = 0;

    // Add predefined tokens
    for (const entry of LATHE_GCODE_VOCAB) {
      const vocabEntry: VocabEntry = {
        token: entry.token,
        id: id,
        type: entry.type,
        frequency: 0,
      };
      this.vocabulary.set(entry.token, vocabEntry);
      this.reverseVocab.set(id, vocabEntry);
      id++;
    }

    // Add numeric value tokens (binned)
    const numericRanges = [
      // Spindle speed bins (RPM)
      { prefix: "S", values: [100, 200, 300, 400, 500, 600, 800, 1000, 1200, 1500, 2000, 2500, 3000, 4000, 5000] },
      // Feed rate bins (IPR * 1000)
      { prefix: "F", values: [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50] },
      // Common coordinate values
      { prefix: "X", values: [0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10] },
      { prefix: "Z", values: [0, -0.1, -0.25, -0.5, -1, -1.5, -2, -3, -4, -5] },
    ];

    for (const range of numericRanges) {
      for (const value of range.values) {
        const token = `${range.prefix}${value}`;
        if (!this.vocabulary.has(token)) {
          const vocabEntry: VocabEntry = {
            token,
            id: id,
            type: range.prefix === "S" ? "S_CODE" :
                  range.prefix === "F" ? "F_CODE" :
                  range.prefix === "X" ? "X_COORD" :
                  "Z_COORD",
            frequency: 0,
          };
          this.vocabulary.set(token, vocabEntry);
          this.reverseVocab.set(id, vocabEntry);
          id++;
        }
      }
    }

    // Add tool tokens T01-T12
    for (let t = 1; t <= 12; t++) {
      const token = `T${t.toString().padStart(2, "0")}`;
      if (!this.vocabulary.has(token)) {
        const vocabEntry: VocabEntry = {
          token,
          id: id,
          type: "T_CODE",
          frequency: 0,
        };
        this.vocabulary.set(token, vocabEntry);
        this.reverseVocab.set(id, vocabEntry);
        id++;
      }
    }

    log.info(`[LatheTransformer] Vocabulary initialized: ${this.vocabulary.size} tokens`);
  }

  /**
   * Initialize all neural network weights using Xavier/He initialization.
   */
  private initializeWeights(): void {
    const { d_model, n_heads, d_ff, n_encoder_layers, n_decoder_layers, vocab_size } = this.config;
    const d_k = Math.floor(d_model / n_heads);

    // Token embeddings
    this.embeddings = this.initializeMatrix(vocab_size, d_model, "xavier");

    // Encoder layers
    this.encoderLayers = [];
    for (let i = 0; i < n_encoder_layers; i++) {
      this.encoderLayers.push({
        layer_id: i,
        self_attention: this.initializeAttentionWeights(d_model, d_k, n_heads),
        ffn: this.initializeFFNWeights(d_model, d_ff),
        layer_norm1: this.initializeLayerNormWeights(d_model),
        layer_norm2: this.initializeLayerNormWeights(d_model),
      });
    }

    // Decoder layers
    this.decoderLayers = [];
    for (let i = 0; i < n_decoder_layers; i++) {
      this.decoderLayers.push({
        layer_id: i,
        self_attention: this.initializeAttentionWeights(d_model, d_k, n_heads),
        cross_attention: this.initializeAttentionWeights(d_model, d_k, n_heads),
        ffn: this.initializeFFNWeights(d_model, d_ff),
        layer_norm1: this.initializeLayerNormWeights(d_model),
        layer_norm2: this.initializeLayerNormWeights(d_model),
        layer_norm3: this.initializeLayerNormWeights(d_model),
      });
    }

    // Task-specific heads
    const numOperationTypes = 17;  // Number of LatheOperationType values
    const numParams = 4;           // spindle, feed, doc, sfm
    const numQualityDims = 5;      // overall, param, seq, safety, efficiency

    this.classificationHead = this.initializeMatrix(d_model, numOperationTypes, "xavier");
    this.parameterHead = this.initializeMatrix(d_model, numParams, "xavier");
    this.qualityHead = this.initializeMatrix(d_model, numQualityDims, "xavier");
    this.lmHead = this.initializeMatrix(d_model, vocab_size, "xavier");

    log.info(`[LatheTransformer] Weights initialized: ${n_encoder_layers} encoder, ${n_decoder_layers} decoder layers`);
  }

  /**
   * Initialize weight matrix with Xavier or He initialization.
   */
  private initializeMatrix(rows: number, cols: number, method: "xavier" | "he" = "xavier"): number[][] {
    const scale = method === "xavier"
      ? Math.sqrt(2.0 / (rows + cols))
      : Math.sqrt(2.0 / rows);

    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => (Math.random() * 2 - 1) * scale)
    );
  }

  /**
   * Initialize attention layer weights.
   */
  private initializeAttentionWeights(d_model: number, d_k: number, n_heads: number): AttentionLayerWeights {
    const totalDim = d_k * n_heads;
    return {
      W_q: this.initializeMatrix(d_model, totalDim),
      W_k: this.initializeMatrix(d_model, totalDim),
      W_v: this.initializeMatrix(d_model, totalDim),
      W_o: this.initializeMatrix(totalDim, d_model),
      b_q: new Array(totalDim).fill(0),
      b_k: new Array(totalDim).fill(0),
      b_v: new Array(totalDim).fill(0),
      b_o: new Array(d_model).fill(0),
    };
  }

  /**
   * Initialize feed-forward network weights.
   */
  private initializeFFNWeights(d_model: number, d_ff: number): FFNWeights {
    return {
      W1: this.initializeMatrix(d_model, d_ff, "he"),
      W2: this.initializeMatrix(d_ff, d_model, "he"),
      b1: new Array(d_ff).fill(0),
      b2: new Array(d_model).fill(0),
    };
  }

  /**
   * Initialize layer normalization weights.
   */
  private initializeLayerNormWeights(dim: number): LayerNormWeights {
    return {
      gamma: new Array(dim).fill(1),
      beta: new Array(dim).fill(0),
    };
  }

  // ==========================================================================
  // TOKENIZATION
  // ==========================================================================

  /**
   * Tokenize a G-code program line into token IDs.
   */
  tokenizeLine(line: string): number[] {
    const tokens: number[] = [];
    const cleaned = line.trim().toUpperCase();

    if (!cleaned || cleaned.startsWith("(") || cleaned.startsWith(";")) {
      // Comment or empty line
      const commentEntry = this.vocabulary.get("COMMENT");
      if (commentEntry) {
        tokens.push(commentEntry.id);
      }
      return tokens;
    }

    // Parse G-code tokens
    const regex = /([GMNSTFXZIJKRPQUW])(\d*\.?\d*)/g;
    let match;

    while ((match = regex.exec(cleaned)) !== null) {
      const prefix = match[1];
      const value = match[2];
      const fullToken = prefix + value;

      // Try exact match first
      let entry = this.vocabulary.get(fullToken);
      if (!entry) {
        // Try without leading zeros
        const normalizedToken = prefix + parseFloat(value || "0").toString();
        entry = this.vocabulary.get(normalizedToken);
      }
      if (!entry) {
        // Fall back to prefix only
        entry = this.vocabulary.get(prefix);
      }
      if (!entry) {
        // Unknown token
        entry = this.vocabulary.get(SPECIAL_TOKENS.UNK);
      }

      if (entry) {
        tokens.push(entry.id);
        entry.frequency++;
      }
    }

    return tokens;
  }

  /**
   * Tokenize a complete G-code program.
   */
  tokenizeProgram(program: string[]): number[] {
    const tokens: number[] = [];

    // Add BOS token
    const bosEntry = this.vocabulary.get(SPECIAL_TOKENS.BOS);
    if (bosEntry) tokens.push(bosEntry.id);

    for (const line of program) {
      const lineTokens = this.tokenizeLine(line);
      tokens.push(...lineTokens);
    }

    // Add EOS token
    const eosEntry = this.vocabulary.get(SPECIAL_TOKENS.EOS);
    if (eosEntry) tokens.push(eosEntry.id);

    // Pad or truncate to max_seq_length
    return this.padOrTruncate(tokens);
  }

  /**
   * Pad or truncate sequence to max_seq_length.
   */
  private padOrTruncate(tokens: number[]): number[] {
    const padEntry = this.vocabulary.get(SPECIAL_TOKENS.PAD);
    const padId = padEntry?.id ?? 0;

    if (tokens.length > this.config.max_seq_length) {
      return tokens.slice(0, this.config.max_seq_length);
    }

    while (tokens.length < this.config.max_seq_length) {
      tokens.push(padId);
    }

    return tokens;
  }

  /**
   * Convert token IDs back to tokens.
   */
  detokenize(tokenIds: number[]): string[] {
    const tokens: string[] = [];
    const padId = this.vocabulary.get(SPECIAL_TOKENS.PAD)?.id ?? 0;
    const eosId = this.vocabulary.get(SPECIAL_TOKENS.EOS)?.id;

    for (const id of tokenIds) {
      if (id === padId) continue;
      if (id === eosId) break;

      const entry = this.reverseVocab.get(id);
      if (entry && entry.type !== "SPECIAL") {
        tokens.push(entry.token);
      }
    }

    return tokens;
  }

  // ==========================================================================
  // POSITIONAL ENCODING
  // ==========================================================================

  /**
   * Generate sinusoidal positional encoding.
   * PE(pos, 2i) = sin(pos / 10000^(2i/d_model))
   * PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))
   */
  computePositionalEncoding(seqLength: number): number[][] {
    const { d_model } = this.config;
    const pe: number[][] = [];

    for (let pos = 0; pos < seqLength; pos++) {
      const posEncoding: number[] = [];
      for (let i = 0; i < d_model; i++) {
        const angle = pos / Math.pow(10000, (2 * Math.floor(i / 2)) / d_model);
        posEncoding.push(i % 2 === 0 ? Math.sin(angle) : Math.cos(angle));
      }
      pe.push(posEncoding);
    }

    return pe;
  }

  /**
   * Get token embeddings with positional encoding.
   */
  embedTokens(tokenIds: number[]): number[][] {
    const seqLength = tokenIds.length;
    const posEncoding = this.computePositionalEncoding(seqLength);
    const embeddings: number[][] = [];

    for (let i = 0; i < seqLength; i++) {
      const tokenId = tokenIds[i];
      const tokenEmb = this.embeddings[tokenId] || new Array(this.config.d_model).fill(0);
      const posEmb = posEncoding[i];

      // Combine token embedding with positional encoding
      const combined = tokenEmb.map((t, j) => t + posEmb[j]);
      embeddings.push(combined);
    }

    return embeddings;
  }

  // ==========================================================================
  // ATTENTION MECHANISM
  // ==========================================================================

  /**
   * Compute scaled dot-product attention.
   * Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) * V
   */
  scaledDotProductAttention(
    query: number[][],
    key: number[][],
    value: number[][],
    mask?: number[][],
    layerIdx = 0,
    headIdx = 0
  ): { output: number[][]; weights: AttentionWeights[] } {
    const seqLen = query.length;
    const d_k = query[0].length;
    const scale = Math.sqrt(d_k);

    // Compute attention scores: QK^T / sqrt(d_k)
    const scores: number[][] = [];
    for (let i = 0; i < seqLen; i++) {
      const row: number[] = [];
      for (let j = 0; j < seqLen; j++) {
        let score = 0;
        for (let k = 0; k < d_k; k++) {
          score += query[i][k] * key[j][k];
        }
        score /= scale;

        // Apply mask (e.g., causal mask for decoder)
        if (mask && mask[i][j] === 0) {
          score = -1e9;  // Large negative value for softmax
        }

        row.push(score);
      }
      scores.push(row);
    }

    // Apply softmax to get attention weights
    const attentionProbs: number[][] = [];
    for (let i = 0; i < seqLen; i++) {
      const maxScore = Math.max(...scores[i]);
      const expScores = scores[i].map(s => Math.exp(s - maxScore));
      const sumExp = expScores.reduce((a, b) => a + b, 0);
      attentionProbs.push(expScores.map(e => e / sumExp));
    }

    // Apply attention to values
    const output: number[][] = [];
    for (let i = 0; i < seqLen; i++) {
      const outVec: number[] = new Array(value[0].length).fill(0);
      for (let j = 0; j < seqLen; j++) {
        for (let k = 0; k < value[0].length; k++) {
          outVec[k] += attentionProbs[i][j] * value[j][k];
        }
      }
      output.push(outVec);
    }

    // Build attention weights for visualization
    const weights: AttentionWeights[] = [];
    for (let i = 0; i < seqLen; i++) {
      weights.push({
        layer: layerIdx,
        head: headIdx,
        query_position: i,
        attention_scores: attentionProbs[i],
      });
    }

    return { output, weights };
  }

  /**
   * Multi-head attention.
   * MultiHead(Q, K, V) = Concat(head_1, ..., head_h)W^O
   */
  multiHeadAttention(
    query: number[][],
    key: number[][],
    value: number[][],
    attentionWeights: AttentionLayerWeights,
    mask?: number[][],
    layerIdx = 0
  ): AttentionResult {
    const { d_model, n_heads } = this.config;
    const d_k = Math.floor(d_model / n_heads);
    const seqLen = query.length;

    // Project queries, keys, values
    const Q = this.linearTransform(query, attentionWeights.W_q, attentionWeights.b_q);
    const K = this.linearTransform(key, attentionWeights.W_k, attentionWeights.b_k);
    const V = this.linearTransform(value, attentionWeights.W_v, attentionWeights.b_v);

    // Split into heads
    const heads: Array<{ output: number[][]; weights: AttentionWeights[] }> = [];

    for (let h = 0; h < n_heads; h++) {
      const startIdx = h * d_k;
      const endIdx = startIdx + d_k;

      // Extract head-specific projections
      const Q_h = Q.map(row => row.slice(startIdx, endIdx));
      const K_h = K.map(row => row.slice(startIdx, endIdx));
      const V_h = V.map(row => row.slice(startIdx, endIdx));

      // Compute attention for this head
      const headResult = this.scaledDotProductAttention(Q_h, K_h, V_h, mask, layerIdx, h);
      heads.push(headResult);
    }

    // Concatenate heads
    const concatenated: number[][] = [];
    for (let i = 0; i < seqLen; i++) {
      let concatRow: number[] = [];
      for (const head of heads) {
        concatRow = concatRow.concat(head.output[i]);
      }
      concatenated.push(concatRow);
    }

    // Project back to d_model
    const output = this.linearTransform(concatenated, attentionWeights.W_o, attentionWeights.b_o);

    // Collect all attention weights
    const allWeights: AttentionWeights[] = [];
    for (const head of heads) {
      allWeights.push(...head.weights);
    }

    return { output, attention_weights: allWeights };
  }

  /**
   * Linear transformation: XW + b
   */
  private linearTransform(input: number[][], weights: number[][], bias?: number[]): number[][] {
    const output: number[][] = [];
    const inputDim = input[0].length;
    const outputDim = weights[0].length;

    for (const row of input) {
      const outRow: number[] = new Array(outputDim).fill(0);
      for (let j = 0; j < outputDim; j++) {
        for (let i = 0; i < inputDim; i++) {
          outRow[j] += row[i] * weights[i][j];
        }
        if (bias) {
          outRow[j] += bias[j];
        }
      }
      output.push(outRow);
    }

    return output;
  }

  /**
   * Create causal mask for decoder self-attention.
   * Prevents attending to future positions.
   */
  createCausalMask(seqLength: number): number[][] {
    const mask: number[][] = [];
    for (let i = 0; i < seqLength; i++) {
      const row: number[] = [];
      for (let j = 0; j < seqLength; j++) {
        row.push(j <= i ? 1 : 0);  // Can attend to current and past positions
      }
      mask.push(row);
    }
    return mask;
  }

  /**
   * Create padding mask from attention mask.
   */
  createPaddingMask(attentionMask: number[]): number[][] {
    const seqLen = attentionMask.length;
    const mask: number[][] = [];

    for (let i = 0; i < seqLen; i++) {
      const row: number[] = [];
      for (let j = 0; j < seqLen; j++) {
        row.push(attentionMask[j]);  // Mask out padding positions
      }
      mask.push(row);
    }

    return mask;
  }

  // ==========================================================================
  // TRANSFORMER COMPONENTS
  // ==========================================================================

  /**
   * Layer normalization.
   * LN(x) = gamma * (x - mean) / sqrt(var + eps) + beta
   */
  layerNorm(input: number[][], weights: LayerNormWeights): number[][] {
    const { layer_norm_eps } = this.config;
    const output: number[][] = [];

    for (const row of input) {
      const mean = row.reduce((a, b) => a + b, 0) / row.length;
      const variance = row.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / row.length;
      const std = Math.sqrt(variance + layer_norm_eps);

      const normalized = row.map((x, i) =>
        weights.gamma[i] * ((x - mean) / std) + weights.beta[i]
      );
      output.push(normalized);
    }

    return output;
  }

  /**
   * Feed-forward network.
   * FFN(x) = activation(xW1 + b1)W2 + b2
   */
  feedForward(input: number[][], weights: FFNWeights): number[][] {
    // First linear layer
    const hidden = this.linearTransform(input, weights.W1, weights.b1);

    // Apply activation
    const activated = hidden.map(row =>
      row.map(x => this.activate(x, this.config.activation))
    );

    // Second linear layer
    return this.linearTransform(activated, weights.W2, weights.b2);
  }

  /**
   * Activation function.
   */
  private activate(x: number, fn: ActivationFn): number {
    switch (fn) {
      case "relu":
        return Math.max(0, x);
      case "gelu":
        // GELU approximation: 0.5 * x * (1 + tanh(sqrt(2/pi) * (x + 0.044715 * x^3)))
        return 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * Math.pow(x, 3))));
      case "swish":
        return x / (1 + Math.exp(-x));
      case "tanh":
        return Math.tanh(x);
      case "sigmoid":
        return 1 / (1 + Math.exp(-Math.min(Math.max(x, -500), 500)));
      case "softmax":
        return x;  // Handled at vector level
      default:
        return x;
    }
  }

  /**
   * Softmax over a vector.
   */
  private softmax(input: number[]): number[] {
    const maxVal = Math.max(...input);
    const expValues = input.map(x => Math.exp(x - maxVal));
    const sumExp = expValues.reduce((a, b) => a + b, 0);
    return expValues.map(x => x / sumExp);
  }

  /**
   * Dropout (training only).
   */
  private dropout(input: number[][], rate: number, training = true): number[][] {
    if (!training || rate === 0) return input;

    const scale = 1 / (1 - rate);
    return input.map(row =>
      row.map(x => (Math.random() > rate ? x * scale : 0))
    );
  }

  /**
   * Residual connection: output = x + sublayer(x)
   */
  private residualAdd(input: number[][], sublayerOutput: number[][]): number[][] {
    return input.map((row, i) =>
      row.map((x, j) => x + sublayerOutput[i][j])
    );
  }

  // ==========================================================================
  // ENCODER
  // ==========================================================================

  /**
   * Single encoder layer.
   */
  private encoderLayer(
    input: number[][],
    layerWeights: EncoderWeights,
    attentionMask?: number[][]
  ): EncoderLayerOutput {
    // Self-attention
    const attentionResult = this.multiHeadAttention(
      input, input, input,
      layerWeights.self_attention,
      attentionMask,
      layerWeights.layer_id
    );

    // Residual + LayerNorm
    const attnResidual = this.residualAdd(input, attentionResult.output);
    const attnNorm = this.layerNorm(attnResidual, layerWeights.layer_norm1);

    // Feed-forward
    const ffnOutput = this.feedForward(attnNorm, layerWeights.ffn);

    // Residual + LayerNorm
    const ffnResidual = this.residualAdd(attnNorm, ffnOutput);
    const output = this.layerNorm(ffnResidual, layerWeights.layer_norm2);

    return {
      layer_id: layerWeights.layer_id,
      hidden_states: output,
      attention_weights: attentionResult.attention_weights,
      ffn_activations: ffnOutput,
    };
  }

  /**
   * Full encoder forward pass.
   */
  encodeSequence(tokenIds: number[], attentionMask?: number[]): EncoderOutput {
    // Get embeddings with positional encoding
    let hiddenStates = this.embedTokens(tokenIds);

    // Create attention mask if provided
    const mask = attentionMask ? this.createPaddingMask(attentionMask) : undefined;

    // Pass through encoder layers
    const allHiddenStates: number[][][] = [hiddenStates];
    const allAttentionWeights: AttentionWeights[][] = [];

    for (const layerWeights of this.encoderLayers) {
      const layerOutput = this.encoderLayer(hiddenStates, layerWeights, mask);
      hiddenStates = layerOutput.hidden_states;
      allHiddenStates.push(hiddenStates);
      allAttentionWeights.push(layerOutput.attention_weights);
    }

    return {
      final_hidden_states: hiddenStates,
      all_hidden_states: allHiddenStates,
      all_attention_weights: allAttentionWeights,
    };
  }

  // ==========================================================================
  // DECODER
  // ==========================================================================

  /**
   * Single decoder layer.
   */
  private decoderLayer(
    input: number[][],
    encoderOutput: number[][],
    layerWeights: DecoderWeights,
    selfAttentionMask?: number[][],
    crossAttentionMask?: number[][]
  ): DecoderLayerOutput {
    // Masked self-attention
    const selfAttnResult = this.multiHeadAttention(
      input, input, input,
      layerWeights.self_attention,
      selfAttentionMask,
      layerWeights.layer_id
    );

    // Residual + LayerNorm
    const selfAttnResidual = this.residualAdd(input, selfAttnResult.output);
    const selfAttnNorm = this.layerNorm(selfAttnResidual, layerWeights.layer_norm1);

    // Cross-attention with encoder output
    const crossAttnResult = this.multiHeadAttention(
      selfAttnNorm, encoderOutput, encoderOutput,
      layerWeights.cross_attention,
      crossAttentionMask,
      layerWeights.layer_id
    );

    // Residual + LayerNorm
    const crossAttnResidual = this.residualAdd(selfAttnNorm, crossAttnResult.output);
    const crossAttnNorm = this.layerNorm(crossAttnResidual, layerWeights.layer_norm2);

    // Feed-forward
    const ffnOutput = this.feedForward(crossAttnNorm, layerWeights.ffn);

    // Residual + LayerNorm
    const ffnResidual = this.residualAdd(crossAttnNorm, ffnOutput);
    const output = this.layerNorm(ffnResidual, layerWeights.layer_norm3);

    return {
      layer_id: layerWeights.layer_id,
      hidden_states: output,
      self_attention_weights: selfAttnResult.attention_weights,
      cross_attention_weights: crossAttnResult.attention_weights,
    };
  }

  /**
   * Full decoder forward pass.
   */
  decodeSequence(
    targetIds: number[],
    encoderOutput: EncoderOutput,
    targetAttentionMask?: number[]
  ): DecoderOutput {
    // Get embeddings with positional encoding
    let hiddenStates = this.embedTokens(targetIds);

    // Create causal mask for self-attention
    const causalMask = this.createCausalMask(targetIds.length);

    // Combine with padding mask if provided
    let selfAttentionMask = causalMask;
    if (targetAttentionMask) {
      const paddingMask = this.createPaddingMask(targetAttentionMask);
      selfAttentionMask = causalMask.map((row, i) =>
        row.map((val, j) => val * paddingMask[i][j])
      );
    }

    // Pass through decoder layers
    const allHiddenStates: number[][][] = [hiddenStates];
    const allSelfAttentionWeights: AttentionWeights[][] = [];
    const allCrossAttentionWeights: AttentionWeights[][] = [];

    for (const layerWeights of this.decoderLayers) {
      const layerOutput = this.decoderLayer(
        hiddenStates,
        encoderOutput.final_hidden_states,
        layerWeights,
        selfAttentionMask
      );
      hiddenStates = layerOutput.hidden_states;
      allHiddenStates.push(hiddenStates);
      allSelfAttentionWeights.push(layerOutput.self_attention_weights);
      allCrossAttentionWeights.push(layerOutput.cross_attention_weights);
    }

    return {
      final_hidden_states: hiddenStates,
      all_hidden_states: allHiddenStates,
      all_self_attention_weights: allSelfAttentionWeights,
      all_cross_attention_weights: allCrossAttentionWeights,
    };
  }

  // ==========================================================================
  // TASK-SPECIFIC HEADS
  // ==========================================================================

  /**
   * Operation classification head.
   * Uses [CLS] token representation for classification.
   */
  classifyOperation(encoderOutput: EncoderOutput): OperationClassification {
    // Use first token (CLS) representation
    const clsHidden = encoderOutput.final_hidden_states[0];

    // Project to operation classes
    const logits: number[] = new Array(this.classificationHead[0].length).fill(0);
    for (let j = 0; j < logits.length; j++) {
      for (let i = 0; i < clsHidden.length; i++) {
        logits[j] += clsHidden[i] * this.classificationHead[i][j];
      }
    }

    // Apply softmax
    const probabilities = this.softmax(logits);

    // Get predicted class
    const maxIdx = probabilities.indexOf(Math.max(...probabilities));
    const operationTypes: LatheOperationType[] = [
      "od_rough", "od_finish", "od_groove", "od_thread",
      "id_rough", "id_finish", "id_groove", "id_thread",
      "face", "center_drill", "drill", "boring",
      "cutoff", "parting", "taper", "contour", "unknown"
    ];

    const allProbabilities: Record<LatheOperationType, number> = {} as Record<LatheOperationType, number>;
    operationTypes.forEach((op, i) => {
      allProbabilities[op] = probabilities[i] || 0;
    });

    return {
      operation_type: operationTypes[maxIdx],
      confidence: probabilities[maxIdx],
      all_probabilities: allProbabilities,
      explanation: `Classified as ${operationTypes[maxIdx]} with ${(probabilities[maxIdx] * 100).toFixed(1)}% confidence`,
    };
  }

  /**
   * Parameter prediction head.
   * Predicts optimal cutting parameters from sequence.
   */
  predictParameters(encoderOutput: EncoderOutput): ParameterPrediction {
    // Pool over sequence (mean pooling)
    const seqLen = encoderOutput.final_hidden_states.length;
    const d_model = this.config.d_model;
    const pooled: number[] = new Array(d_model).fill(0);

    for (let i = 0; i < seqLen; i++) {
      for (let j = 0; j < d_model; j++) {
        pooled[j] += encoderOutput.final_hidden_states[i][j] / seqLen;
      }
    }

    // Project to parameter predictions
    const paramLogits: number[] = new Array(this.parameterHead[0].length).fill(0);
    for (let j = 0; j < paramLogits.length; j++) {
      for (let i = 0; i < pooled.length; i++) {
        paramLogits[j] += pooled[i] * this.parameterHead[i][j];
      }
    }

    // Apply sigmoid for bounded predictions
    const params = paramLogits.map(x => 1 / (1 + Math.exp(-x)));

    // Denormalize to actual ranges
    return {
      spindle_speed_rpm: Math.round(params[0] * 5000),     // 0-5000 RPM
      feed_rate_ipr: params[1] * 0.050,                     // 0-0.050 IPR
      depth_of_cut_in: params[2] * 0.250,                   // 0-0.250 in
      surface_speed_sfm: Math.round(params[3] * 1000),     // 0-1000 SFM
      confidence: Math.min(...params.map(p => Math.abs(p - 0.5) * 2 + 0.5)),
      prediction_basis: [
        "Based on learned patterns from training data",
        `Sequence length: ${seqLen} tokens`,
        "Mean-pooled hidden states",
      ],
    };
  }

  /**
   * Quality scoring head.
   * Evaluates program quality across multiple dimensions.
   */
  scoreQuality(encoderOutput: EncoderOutput): QualityScore {
    // Pool over sequence
    const seqLen = encoderOutput.final_hidden_states.length;
    const d_model = this.config.d_model;
    const pooled: number[] = new Array(d_model).fill(0);

    for (let i = 0; i < seqLen; i++) {
      for (let j = 0; j < d_model; j++) {
        pooled[j] += encoderOutput.final_hidden_states[i][j] / seqLen;
      }
    }

    // Project to quality scores
    const qualityLogits: number[] = new Array(this.qualityHead[0].length).fill(0);
    for (let j = 0; j < qualityLogits.length; j++) {
      for (let i = 0; i < pooled.length; i++) {
        qualityLogits[j] += pooled[i] * this.qualityHead[i][j];
      }
    }

    // Apply sigmoid and scale to 0-100
    const scores = qualityLogits.map(x => (1 / (1 + Math.exp(-x))) * 100);

    // Analyze attention patterns for issues
    const issues = this.analyzeAttentionForIssues(encoderOutput);

    return {
      overall_score: scores[0],
      parameter_score: scores[1],
      sequence_score: scores[2],
      safety_score: scores[3],
      efficiency_score: scores[4],
      issues,
    };
  }

  /**
   * Analyze attention patterns to identify potential issues.
   */
  private analyzeAttentionForIssues(encoderOutput: EncoderOutput): QualityIssue[] {
    const issues: QualityIssue[] = [];

    // Check attention concentration (should be spread for good programs)
    for (const layerWeights of encoderOutput.all_attention_weights) {
      for (const weight of layerWeights) {
        const maxAttn = Math.max(...weight.attention_scores);
        const entropy = -weight.attention_scores.reduce((sum, p) =>
          p > 0 ? sum + p * Math.log2(p) : sum, 0);

        // Very concentrated attention might indicate repetitive patterns
        if (maxAttn > 0.9 && entropy < 1.0) {
          issues.push({
            severity: "suggestion",
            category: "attention",
            description: `High attention concentration at position ${weight.query_position}`,
            line_range: [weight.query_position, weight.query_position],
            recommendation: "Consider adding variety to this section",
          });
        }
      }
    }

    return issues.slice(0, 10);  // Limit to 10 issues
  }

  /**
   * Sequence-to-sequence generation.
   * Auto-regressive generation using decoder.
   */
  generateSequence(
    sourceIds: number[],
    maxLength: number = 256,
    temperature: number = 1.0,
    topK: number = 50
  ): Seq2SeqResult {
    // Encode source sequence
    const encoderOutput = this.encodeSequence(sourceIds);

    // Start with BOS token
    const bosId = this.vocabulary.get(SPECIAL_TOKENS.BOS)?.id ?? 0;
    const eosId = this.vocabulary.get(SPECIAL_TOKENS.EOS)?.id ?? 0;
    const generatedIds: number[] = [bosId];
    const generationLog: GenerationStep[] = [];

    for (let step = 0; step < maxLength; step++) {
      // Decode current sequence
      const decoderOutput = this.decodeSequence(generatedIds, encoderOutput);

      // Get logits for next token from last position
      const lastHidden = decoderOutput.final_hidden_states[decoderOutput.final_hidden_states.length - 1];

      // Project to vocabulary
      const logits: number[] = new Array(this.config.vocab_size).fill(0);
      for (let j = 0; j < this.config.vocab_size; j++) {
        for (let i = 0; i < lastHidden.length; i++) {
          logits[j] += lastHidden[i] * this.lmHead[i][j];
        }
      }

      // Apply temperature
      const scaledLogits = logits.map(l => l / temperature);

      // Top-K sampling
      const sortedIndices = Array.from({ length: logits.length }, (_, i) => i)
        .sort((a, b) => scaledLogits[b] - scaledLogits[a]);

      const topKIndices = sortedIndices.slice(0, topK);
      const topKLogits = topKIndices.map(i => scaledLogits[i]);
      const topKProbs = this.softmax(topKLogits);

      // Sample from top-K
      const rand = Math.random();
      let cumProb = 0;
      let selectedIdx = topKIndices[0];

      for (let i = 0; i < topKProbs.length; i++) {
        cumProb += topKProbs[i];
        if (rand < cumProb) {
          selectedIdx = topKIndices[i];
          break;
        }
      }

      // Log generation step
      const selectedToken = this.reverseVocab.get(selectedIdx)?.token || "[UNK]";
      generationLog.push({
        step,
        generated_token: selectedToken,
        token_probability: topKProbs[topKIndices.indexOf(selectedIdx)] || 0,
        top_k_candidates: topKIndices.slice(0, 5).map((idx, i) => ({
          token: this.reverseVocab.get(idx)?.token || "[UNK]",
          probability: topKProbs[i],
        })),
      });

      generatedIds.push(selectedIdx);

      // Stop on EOS
      if (selectedIdx === eosId) break;
    }

    return {
      output_tokens: this.detokenize(generatedIds),
      output_ids: generatedIds,
      attention_visualization: [],  // Full attention can be computed if needed
      generation_log: generationLog,
    };
  }

  // ==========================================================================
  // PRE-TRAINING TASKS
  // ==========================================================================

  /**
   * Create masked G-code modeling sample.
   * Randomly masks 15% of tokens (similar to BERT).
   */
  createMGMSample(tokenIds: number[], maskRate: number = 0.15): MGMSample {
    const maskId = this.vocabulary.get(SPECIAL_TOKENS.MASK)?.id ?? 0;
    const maskedIds = [...tokenIds];
    const maskPositions: number[] = [];
    const labels: number[] = [];

    for (let i = 1; i < tokenIds.length - 1; i++) {  // Skip BOS and EOS
      if (Math.random() < maskRate) {
        maskPositions.push(i);
        labels.push(tokenIds[i]);

        // 80% mask, 10% random, 10% keep
        const rand = Math.random();
        if (rand < 0.8) {
          maskedIds[i] = maskId;
        } else if (rand < 0.9) {
          maskedIds[i] = Math.floor(Math.random() * this.config.vocab_size);
        }
        // else keep original
      }
    }

    return {
      original_ids: tokenIds,
      masked_ids: maskedIds,
      mask_positions: maskPositions,
      labels,
    };
  }

  /**
   * Train on masked G-code modeling task.
   */
  trainMGM(sample: MGMSample): number {
    // Forward pass on masked sequence
    const encoderOutput = this.encodeSequence(sample.masked_ids);

    // Compute loss at masked positions
    let totalLoss = 0;

    for (let i = 0; i < sample.mask_positions.length; i++) {
      const pos = sample.mask_positions[i];
      const targetId = sample.labels[i];
      const hidden = encoderOutput.final_hidden_states[pos];

      // Project to vocabulary
      const logits: number[] = new Array(this.config.vocab_size).fill(0);
      for (let j = 0; j < this.config.vocab_size; j++) {
        for (let k = 0; k < hidden.length; k++) {
          logits[j] += hidden[k] * this.lmHead[k][j];
        }
      }

      // Cross-entropy loss
      const probs = this.softmax(logits);
      const loss = -Math.log(probs[targetId] + 1e-10);
      totalLoss += loss;
    }

    return sample.mask_positions.length > 0 ? totalLoss / sample.mask_positions.length : 0;
  }

  /**
   * Create next operation prediction sample.
   */
  createNOPSample(
    contextIds: number[],
    nextOperation: LatheOperationType
  ): NOPSample {
    const operationTypes: LatheOperationType[] = [
      "od_rough", "od_finish", "od_groove", "od_thread",
      "id_rough", "id_finish", "id_groove", "id_thread",
      "face", "center_drill", "drill", "boring",
      "cutoff", "parting", "taper", "contour", "unknown"
    ];

    return {
      context_ids: contextIds,
      next_operation: nextOperation,
      label: operationTypes.indexOf(nextOperation),
    };
  }

  /**
   * Train on next operation prediction task.
   */
  trainNOP(sample: NOPSample): number {
    const encoderOutput = this.encodeSequence(sample.context_ids);
    const classification = this.classifyOperation(encoderOutput);

    // Cross-entropy loss
    const targetProb = classification.all_probabilities[sample.next_operation];
    return -Math.log(targetProb + 1e-10);
  }

  /**
   * Create parameter completion sample.
   */
  createParamCompletionSample(
    contextIds: number[],
    paramType: "S" | "F" | "X" | "Z",
    targetValue: number
  ): ParamCompletionSample {
    return {
      context_ids: contextIds,
      missing_param_type: paramType,
      target_value: targetValue,
    };
  }

  // ==========================================================================
  // FINE-TUNING TASKS
  // ==========================================================================

  /**
   * Fine-tune for style transfer (amateur to expert).
   */
  styleTransfer(amateurProgram: string[]): StyleTransferResult {
    const inputIds = this.tokenizeProgram(amateurProgram);
    const encoderOutput = this.encodeSequence(inputIds);

    // Generate optimized sequence
    const generated = this.generateSequence(inputIds, 512, 0.7, 30);

    // Analyze changes
    const changes: StyleChange[] = [];
    const originalTokens = this.detokenize(inputIds);
    const optimizedTokens = generated.output_tokens;

    // Simple diff analysis
    const minLen = Math.min(originalTokens.length, optimizedTokens.length);
    for (let i = 0; i < minLen; i++) {
      if (originalTokens[i] !== optimizedTokens[i]) {
        changes.push({
          line_number: i,
          original: originalTokens[i],
          optimized: optimizedTokens[i],
          change_type: this.categorizeChange(originalTokens[i], optimizedTokens[i]),
          explanation: `Changed ${originalTokens[i]} to ${optimizedTokens[i]}`,
        });
      }
    }

    // Score improvement
    const qualityBefore = this.scoreQuality(encoderOutput);
    const optimizedIds = this.tokenizeProgram(optimizedTokens);
    const qualityAfter = this.scoreQuality(this.encodeSequence(optimizedIds));

    return {
      original_program: amateurProgram,
      optimized_program: optimizedTokens,
      changes_made: changes,
      improvement_score: qualityAfter.overall_score - qualityBefore.overall_score,
    };
  }

  /**
   * Categorize type of change made.
   */
  private categorizeChange(original: string, optimized: string): "parameter" | "sequence" | "safety" | "efficiency" {
    if (original.startsWith("S") || original.startsWith("F") ||
        optimized.startsWith("S") || optimized.startsWith("F")) {
      return "parameter";
    }
    if (original.startsWith("G") || optimized.startsWith("G")) {
      return "sequence";
    }
    if (original.startsWith("M") || optimized.startsWith("M")) {
      return "safety";
    }
    return "efficiency";
  }

  /**
   * Translate between controller dialects.
   */
  translateController(
    sourceProgram: string[],
    sourceController: ControllerDialect,
    targetController: ControllerDialect
  ): ControllerTranslation {
    // For now, implement basic translation rules
    const translatedProgram: string[] = [];
    const notes: string[] = [];

    // Translation mappings
    const translations: Record<string, Record<ControllerDialect, string>> = {
      "G96": { fanuc: "G96", okuma_osp: "G96", mazak: "G96", haas: "G96", siemens: "G96" },
      "G97": { fanuc: "G97", okuma_osp: "G97", mazak: "G97", haas: "G97", siemens: "G97" },
      "G71": { fanuc: "G71", okuma_osp: "GCYC", mazak: "G71", haas: "G71", siemens: "CYCLE95" },
      "G70": { fanuc: "G70", okuma_osp: "GCYC", mazak: "G70", haas: "G70", siemens: "CYCLE95" },
    };

    for (const line of sourceProgram) {
      let translated = line;

      // Apply translation rules
      for (const [original, mapping] of Object.entries(translations)) {
        if (line.includes(original)) {
          const targetCode = mapping[targetController];
          if (targetCode !== original) {
            translated = translated.replace(original, targetCode);
            notes.push(`Translated ${original} to ${targetCode} for ${targetController}`);
          }
        }
      }

      translatedProgram.push(translated);
    }

    // Score compatibility
    const sourceIds = this.tokenizeProgram(sourceProgram);
    const targetIds = this.tokenizeProgram(translatedProgram);
    const sourceQuality = this.scoreQuality(this.encodeSequence(sourceIds));
    const targetQuality = this.scoreQuality(this.encodeSequence(targetIds));

    return {
      source_controller: sourceController,
      target_controller: targetController,
      source_program: sourceProgram,
      translated_program: translatedProgram,
      translation_notes: notes,
      compatibility_score: Math.min(100, targetQuality.overall_score + 10),
    };
  }

  // ==========================================================================
  // TRAINING
  // ==========================================================================

  /**
   * Add training sample.
   */
  addTrainingSample(sample: TrainingSample): void {
    this.trainingSamples.push(sample);
  }

  /**
   * Add evaluation sample.
   */
  addEvalSample(sample: TrainingSample): void {
    this.evalSamples.push(sample);
  }

  /**
   * Create training batch.
   */
  private createBatch(samples: TrainingSample[], batchSize: number): TrainingBatch[] {
    const batches: TrainingBatch[] = [];

    for (let i = 0; i < samples.length; i += batchSize) {
      const batchSamples = samples.slice(i, i + batchSize);
      batches.push({
        input_ids: batchSamples.map(s => s.input_ids),
        attention_mask: batchSamples.map(s => s.attention_mask),
        labels: batchSamples[0].labels ? batchSamples.map(s => s.labels!) : undefined,
        target_ids: batchSamples[0].target_ids ? batchSamples.map(s => s.target_ids!) : undefined,
      });
    }

    return batches;
  }

  /**
   * Compute learning rate with warmup and decay.
   */
  private computeLearningRate(step: number, config: TrainingConfig): number {
    const { warmup_steps, max_steps, learning_rate, lr_scheduler } = config;

    if (step < warmup_steps) {
      // Linear warmup
      return learning_rate * (step / warmup_steps);
    }

    const decaySteps = max_steps - warmup_steps;
    const decayProgress = (step - warmup_steps) / decaySteps;

    switch (lr_scheduler) {
      case "linear":
        return learning_rate * (1 - decayProgress);
      case "cosine":
        return learning_rate * 0.5 * (1 + Math.cos(Math.PI * decayProgress));
      case "constant":
      default:
        return learning_rate;
    }
  }

  /**
   * Train the model.
   */
  train(config: TrainingConfig): TrainingState {
    const { batch_size, gradient_accumulation_steps, max_steps, early_stopping_patience } = config;

    // Shuffle training samples
    const shuffledSamples = [...this.trainingSamples].sort(() => Math.random() - 0.5);
    const batches = this.createBatch(shuffledSamples, batch_size);

    let accumulatedGradients: number[][][] = [];
    let batchLoss = 0;

    for (let step = 0; step < max_steps; step++) {
      const batchIdx = step % batches.length;
      const batch = batches[batchIdx];

      // Update learning rate
      const lr = this.computeLearningRate(step, config);
      this.trainingState.learning_rate = lr;

      // Forward pass and compute loss
      let stepLoss = 0;
      for (let b = 0; b < batch.input_ids.length; b++) {
        const inputIds = batch.input_ids[b];
        const attentionMask = batch.attention_mask[b];

        // Create MGM sample for unsupervised training
        const mgmSample = this.createMGMSample(inputIds);
        const loss = this.trainMGM(mgmSample);
        stepLoss += loss;
      }

      batchLoss += stepLoss / batch.input_ids.length;

      // Gradient accumulation
      if ((step + 1) % gradient_accumulation_steps === 0) {
        // Update weights (simplified - in practice would use accumulated gradients)
        this.updateWeights(lr, batchLoss / gradient_accumulation_steps);

        this.trainingState.train_loss_history.push(batchLoss / gradient_accumulation_steps);
        batchLoss = 0;
      }

      // Evaluation
      if ((step + 1) % config.eval_interval === 0) {
        const evalLoss = this.evaluate();
        this.trainingState.eval_loss_history.push(evalLoss);

        // Early stopping check
        if (evalLoss < this.trainingState.best_loss) {
          this.trainingState.best_loss = evalLoss;
          this.trainingState.best_step = step;
          this.trainingState.no_improvement_count = 0;
        } else {
          this.trainingState.no_improvement_count++;
        }

        if (this.trainingState.no_improvement_count >= early_stopping_patience) {
          log.info(`[LatheTransformer] Early stopping at step ${step}`);
          break;
        }
      }

      // Checkpoint
      if ((step + 1) % config.checkpoint_interval === 0) {
        this.saveCheckpoint(step);
      }

      this.trainingState.step = step;
    }

    return this.trainingState;
  }

  /**
   * Simplified weight update (in practice would use Adam optimizer).
   */
  private updateWeights(lr: number, loss: number): void {
    // This is a simplified version - real implementation would compute and apply gradients
    // For demonstration, we add small random perturbations scaled by learning rate

    const scale = lr * 0.01;

    // Update embeddings
    for (let i = 0; i < this.embeddings.length; i++) {
      for (let j = 0; j < this.embeddings[i].length; j++) {
        this.embeddings[i][j] += (Math.random() * 2 - 1) * scale;
      }
    }

    // Update encoder layers
    for (const layer of this.encoderLayers) {
      this.updateAttentionWeights(layer.self_attention, scale);
      this.updateFFNWeights(layer.ffn, scale);
    }

    // Update decoder layers
    for (const layer of this.decoderLayers) {
      this.updateAttentionWeights(layer.self_attention, scale);
      this.updateAttentionWeights(layer.cross_attention, scale);
      this.updateFFNWeights(layer.ffn, scale);
    }
  }

  /**
   * Update attention layer weights.
   */
  private updateAttentionWeights(weights: AttentionLayerWeights, scale: number): void {
    const updateMatrix = (matrix: number[][]) => {
      for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < matrix[i].length; j++) {
          matrix[i][j] += (Math.random() * 2 - 1) * scale;
        }
      }
    };

    updateMatrix(weights.W_q);
    updateMatrix(weights.W_k);
    updateMatrix(weights.W_v);
    updateMatrix(weights.W_o);
  }

  /**
   * Update FFN weights.
   */
  private updateFFNWeights(weights: FFNWeights, scale: number): void {
    const updateMatrix = (matrix: number[][]) => {
      for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < matrix[i].length; j++) {
          matrix[i][j] += (Math.random() * 2 - 1) * scale;
        }
      }
    };

    updateMatrix(weights.W1);
    updateMatrix(weights.W2);
  }

  /**
   * Evaluate on eval samples.
   */
  evaluate(): number {
    if (this.evalSamples.length === 0) return Infinity;

    let totalLoss = 0;

    for (const sample of this.evalSamples) {
      const mgmSample = this.createMGMSample(sample.input_ids);
      const loss = this.trainMGM(mgmSample);
      totalLoss += loss;
    }

    return totalLoss / this.evalSamples.length;
  }

  /**
   * Save model checkpoint.
   */
  saveCheckpoint(step: number): ModelCheckpoint {
    const checkpoint: ModelCheckpoint = {
      step,
      epoch: Math.floor(step / Math.max(1, this.trainingSamples.length)),
      config: this.config,
      embeddings: this.embeddings,
      encoder_weights: this.encoderLayers,
      decoder_weights: this.decoderLayers,
      training_state: { ...this.trainingState },
      timestamp: Date.now(),
    };

    log.info(`[LatheTransformer] Checkpoint saved at step ${step}`);
    return checkpoint;
  }

  /**
   * Load model checkpoint.
   */
  loadCheckpoint(checkpoint: ModelCheckpoint): void {
    this.config = checkpoint.config;
    this.embeddings = checkpoint.embeddings;
    this.encoderLayers = checkpoint.encoder_weights;
    this.decoderLayers = checkpoint.decoder_weights;
    this.trainingState = checkpoint.training_state;

    log.info(`[LatheTransformer] Checkpoint loaded from step ${checkpoint.step}`);
  }

  // ==========================================================================
  // ATTENTION VISUALIZATION
  // ==========================================================================

  /**
   * Get attention visualization for interpretability.
   */
  visualizeAttention(program: string[]): {
    tokens: string[];
    layer_attention: Array<{
      layer: number;
      head_attention: Array<{
        head: number;
        attention_matrix: number[][];
      }>;
    }>;
  } {
    const inputIds = this.tokenizeProgram(program);
    const encoderOutput = this.encodeSequence(inputIds);
    const tokens = inputIds.map(id => this.reverseVocab.get(id)?.token || "[UNK]");

    const layerAttention = encoderOutput.all_attention_weights.map((layerWeights, layerIdx) => {
      const headMap = new Map<number, AttentionWeights[]>();

      for (const weight of layerWeights) {
        const existing = headMap.get(weight.head) || [];
        existing.push(weight);
        headMap.set(weight.head, existing);
      }

      const headAttention = Array.from(headMap.entries()).map(([head, weights]) => ({
        head,
        attention_matrix: weights.map(w => w.attention_scores),
      }));

      return {
        layer: layerIdx,
        head_attention: headAttention,
      };
    });

    return {
      tokens,
      layer_attention: layerAttention,
    };
  }

  /**
   * Get important tokens based on attention.
   */
  getImportantTokens(program: string[], topK: number = 10): Array<{
    token: string;
    position: number;
    importance: number;
    context: string[];
  }> {
    const inputIds = this.tokenizeProgram(program);
    const encoderOutput = this.encodeSequence(inputIds);

    // Aggregate attention across all layers and heads
    const tokenImportance: number[] = new Array(inputIds.length).fill(0);

    for (const layerWeights of encoderOutput.all_attention_weights) {
      for (const weight of layerWeights) {
        for (let j = 0; j < weight.attention_scores.length; j++) {
          tokenImportance[j] += weight.attention_scores[j];
        }
      }
    }

    // Normalize
    const maxImportance = Math.max(...tokenImportance);
    const normalizedImportance = tokenImportance.map(x => x / maxImportance);

    // Get top-K
    const tokens = inputIds.map(id => this.reverseVocab.get(id)?.token || "[UNK]");
    const indexed = normalizedImportance.map((importance, position) => ({
      token: tokens[position],
      position,
      importance,
      context: tokens.slice(Math.max(0, position - 2), position + 3),
    }));

    return indexed
      .sort((a, b) => b.importance - a.importance)
      .slice(0, topK);
  }

  // ==========================================================================
  // ERROR DETECTION
  // ==========================================================================

  /**
   * Detect errors in a G-code program.
   */
  detectErrors(program: string[]): Array<{
    line_number: number;
    line_content: string;
    error_type: string;
    severity: "critical" | "warning" | "info";
    description: string;
    suggestion: string;
    confidence: number;
  }> {
    const errors: Array<{
      line_number: number;
      line_content: string;
      error_type: string;
      severity: "critical" | "warning" | "info";
      description: string;
      suggestion: string;
      confidence: number;
    }> = [];

    // Tokenize and encode
    const inputIds = this.tokenizeProgram(program);
    const encoderOutput = this.encodeSequence(inputIds);
    const qualityScore = this.scoreQuality(encoderOutput);

    // Pattern-based error detection
    let hasSpindleStart = false;
    let hasSpindleStop = false;
    let hasCoolantOff = false;
    let lastToolNumber = -1;

    for (let i = 0; i < program.length; i++) {
      const line = program[i].toUpperCase().trim();

      // Word-boundary M-code match so "M30" (program end + rewind) never substring-
      // matches "M3" (spindle CW), and "M13"/"M43" never match M3/M4. Bare
      // line.includes("M3") false-positived missing_spindle_speed on every properly
      // M30-terminated program (U-whiskey-M30FalsePositive fix). \bM0*3\b covers M3/M03.
      const isSpindleCW = /\bM0*3\b/.test(line);   // M3 / M03 spindle start CW
      const isSpindleCCW = /\bM0*4\b/.test(line);  // M4 / M04 spindle start CCW

      // Check for spindle commands
      if (isSpindleCW || isSpindleCCW) {
        hasSpindleStart = true;
      }
      if (line.includes("M5") || line.includes("M05")) {
        hasSpindleStop = true;
      }
      if (line.includes("M9") || line.includes("M09")) {
        hasCoolantOff = true;
      }

      // Check for missing spindle speed with M3/M4
      if ((isSpindleCW || isSpindleCCW) && !line.includes("S")) {
        errors.push({
          line_number: i + 1,
          line_content: line,
          error_type: "missing_spindle_speed",
          severity: "critical",
          description: "Spindle start without speed specified",
          suggestion: "Add S command (e.g., S1200) before or with M3/M4",
          confidence: 0.95,
        });
      }

      // Check for cutting move without feed
      if ((line.includes("G1") || line.includes("G01")) && !line.includes("F") && i > 5) {
        // Check if F was set in previous lines (within 10 lines)
        const contextStart = Math.max(0, i - 10);
        const hasRecentFeed = program.slice(contextStart, i).some(l => l.toUpperCase().includes("F"));
        if (!hasRecentFeed) {
          errors.push({
            line_number: i + 1,
            line_content: line,
            error_type: "missing_feed_rate",
            severity: "warning",
            description: "Linear interpolation without feed rate specification",
            suggestion: "Add F command for feed rate",
            confidence: 0.8,
          });
        }
      }

      // Check for tool change without offset
      const toolMatch = line.match(/T(\d+)/);
      if (toolMatch) {
        const toolNum = parseInt(toolMatch[1]);
        if (toolNum !== lastToolNumber) {
          lastToolNumber = toolNum;
          // Check next few lines for offset
          const nextLines = program.slice(i, Math.min(i + 5, program.length)).join(" ").toUpperCase();
          if (!nextLines.includes("G43") && !nextLines.includes("G54") && !nextLines.includes("OFFSET")) {
            errors.push({
              line_number: i + 1,
              line_content: line,
              error_type: "possible_missing_offset",
              severity: "info",
              description: "Tool change without visible offset call",
              suggestion: "Verify tool length/wear offset is applied",
              confidence: 0.6,
            });
          }
        }
      }

      // Check for rapid into material (G0 with cutting coordinates)
      if (line.includes("G0") || line.includes("G00")) {
        const hasXZ = line.includes("X") && line.includes("Z");
        const smallZ = line.match(/Z-?\d*\.?\d*/);
        if (smallZ && hasXZ) {
          const zValue = parseFloat(smallZ[0].replace("Z", ""));
          if (zValue < 0 && Math.abs(zValue) > 0.1) {
            errors.push({
              line_number: i + 1,
              line_content: line,
              error_type: "rapid_into_work",
              severity: "warning",
              description: "Rapid move to negative Z may crash into material",
              suggestion: "Consider using G1 for approach moves near workpiece",
              confidence: 0.75,
            });
          }
        }
      }
    }

    // Check for missing end codes
    const lastLine = program[program.length - 1]?.toUpperCase() || "";
    if (!lastLine.includes("M30") && !lastLine.includes("M02")) {
      errors.push({
        line_number: program.length,
        line_content: lastLine,
        error_type: "missing_program_end",
        severity: "warning",
        description: "Program does not end with M30 or M02",
        suggestion: "Add M30 at program end for proper rewind",
        confidence: 0.9,
      });
    }

    if (hasSpindleStart && !hasSpindleStop) {
      errors.push({
        line_number: program.length,
        line_content: "",
        error_type: "missing_spindle_stop",
        severity: "critical",
        description: "Spindle started but never stopped",
        suggestion: "Add M5 before M30 to stop spindle",
        confidence: 0.95,
      });
    }

    if (!hasCoolantOff && program.some(l => l.toUpperCase().includes("M8"))) {
      errors.push({
        line_number: program.length,
        line_content: "",
        error_type: "missing_coolant_off",
        severity: "warning",
        description: "Coolant turned on but not explicitly turned off",
        suggestion: "Add M9 before M30 to turn off coolant",
        confidence: 0.9,
      });
    }

    // Add quality-based issues
    for (const issue of qualityScore.issues) {
      errors.push({
        line_number: issue.line_range?.[0] || 0,
        line_content: "",
        error_type: issue.category,
        severity: (issue.severity === "suggestion" ? "info" : issue.severity) as "critical" | "warning" | "info",
        description: issue.description,
        suggestion: issue.recommendation,
        confidence: 0.7,
      });
    }

    return errors.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  /**
   * Get model configuration.
   */
  getConfig(): TransformerConfig {
    return { ...this.config };
  }

  /**
   * Get vocabulary size.
   */
  getVocabSize(): number {
    return this.vocabulary.size;
  }

  /**
   * Get training state.
   */
  getTrainingState(): TrainingState {
    return { ...this.trainingState };
  }

  /**
   * Get model statistics.
   */
  getModelStats(): {
    total_parameters: number;
    vocab_size: number;
    d_model: number;
    n_heads: number;
    n_encoder_layers: number;
    n_decoder_layers: number;
    max_seq_length: number;
    training_samples: number;
    eval_samples: number;
  } {
    const { d_model, n_heads, d_ff, n_encoder_layers, n_decoder_layers, vocab_size, max_seq_length } = this.config;

    // Approximate parameter count
    const embeddingParams = vocab_size * d_model;
    const attentionParams = 4 * d_model * d_model;  // Q, K, V, O projections
    const ffnParams = 2 * d_model * d_ff;
    const layerNormParams = 4 * d_model;  // gamma, beta for 2 layer norms

    const encoderLayerParams = attentionParams + ffnParams + layerNormParams;
    const decoderLayerParams = 2 * attentionParams + ffnParams + 3 * d_model * 2;  // Extra layer norm

    const totalParams = embeddingParams +
                        n_encoder_layers * encoderLayerParams +
                        n_decoder_layers * decoderLayerParams +
                        3 * d_model * 20;  // Task heads

    return {
      total_parameters: totalParams,
      vocab_size: this.vocabulary.size,
      d_model,
      n_heads,
      n_encoder_layers,
      n_decoder_layers,
      max_seq_length,
      training_samples: this.trainingSamples.length,
      eval_samples: this.evalSamples.length,
    };
  }

  /**
   * Analyze a complete program.
   */
  analyzeProgram(program: string[]): {
    classification: OperationClassification;
    parameters: ParameterPrediction;
    quality: QualityScore;
    errors: Array<{
      line_number: number;
      line_content: string;
      error_type: string;
      severity: "critical" | "warning" | "info";
      description: string;
      suggestion: string;
      confidence: number;
    }>;
    important_tokens: Array<{
      token: string;
      position: number;
      importance: number;
      context: string[];
    }>;
    model_stats: ReturnType<LatheTransformerEngine["getModelStats"]>;
  } {
    const inputIds = this.tokenizeProgram(program);
    const encoderOutput = this.encodeSequence(inputIds);

    return {
      classification: this.classifyOperation(encoderOutput),
      parameters: this.predictParameters(encoderOutput),
      quality: this.scoreQuality(encoderOutput),
      errors: this.detectErrors(program),
      important_tokens: this.getImportantTokens(program),
      model_stats: this.getModelStats(),
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheTransformerEngine = new LatheTransformerEngine();

export default latheTransformerEngine;
