/**
 * ActualVsPredictedCollectorEngine — Neural Training Feedback Collector (U-MIO31A)
 * =================================================================================
 *
 * Collects post-machining observations (CMM dimensions, measured cutting forces,
 * tool wear, surface finish, thermal measurements, chatter events) and pairs
 * them with the orchestrator's predictions to produce neural-training examples.
 *
 * Key capabilities:
 *   1. In-memory example buffer with bounded capacity (ring buffer)
 *   2. JM-DIE-proven program detection → 2× training weight (Weibull-proven priors)
 *   3. Per-target residual statistics (mean absolute error, bias, variance)
 *   4. Readiness gate: only emit training batch when buffer has N ≥ min_batch
 *   5. Export to neural-model adapter format expected by MillingInferenceOrchestrator
 *
 * This closes the feedback loop between quality metrology (U-MIO31) and neural
 * predictors. Without it, predictions never improve — the system is "trained
 * once, predict forever" and drifts silently.
 *
 * Design choices:
 *   - NO network I/O — pure in-memory buffer + stats engine
 *   - NO direct neural-model training here — emits examples; trainer consumes
 *   - NOT a database — for persistence use IncrementalLearningEngine downstream
 *   - Thread-safe by construction (single-process, no mutation during emit)
 *
 * References:
 *   - Shalev-Shwartz (2012) Online Learning and Online Convex Optimization
 *   - Domingos & Hulten (2000) Mining High-Speed Data Streams (VFDT)
 *   - Weibull weighting derives from reliability engineering proven-prior literature
 *
 * @module engines/ActualVsPredictedCollectorEngine
 * @milestone MIO-MS0 U-MIO31A
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type NeuralTarget =
  | "cutting_force_n"
  | "power_kw"
  | "tool_life_min"
  | "surface_finish_um"
  | "temperature_c"
  | "chatter_probability";

/**
 * A single observation pairing predicted vs actual values for one or more targets.
 * Optional JM-DIE provenance flag multiplies training weight 2×.
 */
export interface ObservationInput {
  /** Unique observation ID (auto-generated if omitted) */
  observation_id?: string;
  /** Job / part identifier */
  job_id: string;
  /** Optional program ID if this came from a JM DIE program */
  program_id?: string;
  /** True if this program is in the JM DIE proven-program registry (2× weight) */
  jm_die_proven?: boolean;
  /** Context features the predictor used (pass-through to trainer) */
  context: {
    material: string;
    iso_group?: string;
    tool_type?: string;
    tool_diameter_mm?: number;
    operation_type?: string;
    cutting_speed_m_min?: number;
    feed_per_tooth_mm?: number;
    axial_depth_mm?: number;
    [k: string]: unknown;
  };
  /** Predicted vs actual values keyed by target name */
  targets: Partial<Record<NeuralTarget, { predicted: number; actual: number }>>;
  /** Observation timestamp (ISO); default: now */
  timestamp?: string;
}

export interface TrainingExample {
  observation_id: string;
  job_id: string;
  program_id?: string;
  features: ObservationInput["context"];
  labels: Partial<Record<NeuralTarget, number>>;     // actual values
  predictions: Partial<Record<NeuralTarget, number>>; // predicted values (for residual analysis)
  residuals: Partial<Record<NeuralTarget, number>>;   // actual − predicted
  weight: number;                                     // 1.0 default, 2.0 for JM DIE proven
  jm_die_proven: boolean;
  timestamp: string;
}

export interface ResidualStats {
  target: NeuralTarget;
  n: number;
  mae: number;     // mean absolute error
  bias: number;    // mean (actual − predicted); negative = predictor over-estimates
  rmse: number;    // root mean squared error
  min_residual: number;
  max_residual: number;
}

export interface CollectorBatch {
  batch_id: string;
  created_at: string;
  examples: TrainingExample[];
  per_target_stats: ResidualStats[];
  total_weight: number;            // sum of example.weight
  jm_die_proven_count: number;
  coverage: NeuralTarget[];        // targets represented in this batch
}

export interface CollectorConfig {
  /** Max examples retained in buffer (ring-buffer) */
  buffer_capacity?: number;
  /** Minimum examples before emitTrainingBatch returns a non-empty batch */
  min_batch_size?: number;
  /** Multiplier applied to jm_die_proven observations (default 2.0) */
  proven_program_weight?: number;
}

const DEFAULT_CONFIG: Required<CollectorConfig> = {
  buffer_capacity: 10000,
  min_batch_size: 32,
  proven_program_weight: 2.0,
};

// ── Engine ─────────────────────────────────────────────────────────────────

export class ActualVsPredictedCollectorEngine {
  private buffer: TrainingExample[] = [];
  private readonly config: Required<CollectorConfig>;
  private batchCounter = 0;
  private idCounter = 0;

  constructor(config: CollectorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    if (this.config.buffer_capacity < 1) throw new Error("buffer_capacity must be >= 1");
    if (this.config.min_batch_size < 1) throw new Error("min_batch_size must be >= 1");
    if (this.config.proven_program_weight <= 0) throw new Error("proven_program_weight must be > 0");
  }

  /** Number of examples currently in the buffer */
  get size(): number {
    return this.buffer.length;
  }

  /** Configuration snapshot */
  getConfig(): Required<CollectorConfig> {
    return { ...this.config };
  }

  /**
   * Record a single observation. Computes residuals, applies JM DIE weight,
   * and appends to the ring buffer (oldest evicted at capacity).
   */
  record(input: ObservationInput): TrainingExample {
    if (!input || !input.context || !input.targets) {
      throw new Error("ActualVsPredictedCollector: observation requires context and targets");
    }

    const residuals: Partial<Record<NeuralTarget, number>> = {};
    const labels: Partial<Record<NeuralTarget, number>> = {};
    const predictions: Partial<Record<NeuralTarget, number>> = {};
    let validTargets = 0;

    for (const [target, pair] of Object.entries(input.targets) as Array<[NeuralTarget, { predicted: number; actual: number }]>) {
      if (pair === undefined || typeof pair.actual !== "number" || typeof pair.predicted !== "number") continue;
      if (!isFinite(pair.actual) || !isFinite(pair.predicted)) continue;
      labels[target] = pair.actual;
      predictions[target] = pair.predicted;
      residuals[target] = pair.actual - pair.predicted;
      validTargets++;
    }

    if (validTargets === 0) {
      throw new Error("ActualVsPredictedCollector: no valid target pairs in observation");
    }

    const jmDieProven = !!input.jm_die_proven;
    const weight = jmDieProven ? this.config.proven_program_weight : 1.0;

    const example: TrainingExample = {
      observation_id: input.observation_id ?? this.generateId(),
      job_id: input.job_id,
      program_id: input.program_id,
      features: { ...input.context },
      labels,
      predictions,
      residuals,
      weight,
      jm_die_proven: jmDieProven,
      timestamp: input.timestamp ?? new Date().toISOString(),
    };

    this.buffer.push(example);
    if (this.buffer.length > this.config.buffer_capacity) {
      this.buffer.shift();
    }

    return example;
  }

  /**
   * Batch-record multiple observations. Returns the examples in insertion order.
   */
  recordBatch(inputs: ObservationInput[]): TrainingExample[] {
    return inputs.map(i => this.record(i));
  }

  /**
   * Compute per-target residual statistics over the current buffer.
   */
  getResidualStats(target: NeuralTarget): ResidualStats | null {
    const residuals: number[] = [];
    for (const ex of this.buffer) {
      const r = ex.residuals[target];
      if (r !== undefined && isFinite(r)) residuals.push(r);
    }
    if (residuals.length === 0) return null;

    const n = residuals.length;
    const abs = residuals.map(r => Math.abs(r));
    const mae = abs.reduce((s, v) => s + v, 0) / n;
    const bias = residuals.reduce((s, v) => s + v, 0) / n;
    const sqSum = residuals.reduce((s, v) => s + v * v, 0);
    const rmse = Math.sqrt(sqSum / n);

    return {
      target,
      n,
      mae: round(mae, 6),
      bias: round(bias, 6),
      rmse: round(rmse, 6),
      min_residual: round(Math.min(...residuals), 6),
      max_residual: round(Math.max(...residuals), 6),
    };
  }

  /** Returns stats for every target that has at least one observation */
  getAllResidualStats(): ResidualStats[] {
    const targets: NeuralTarget[] = [
      "cutting_force_n", "power_kw", "tool_life_min",
      "surface_finish_um", "temperature_c", "chatter_probability",
    ];
    const stats: ResidualStats[] = [];
    for (const t of targets) {
      const s = this.getResidualStats(t);
      if (s) stats.push(s);
    }
    return stats;
  }

  /**
   * Emit a training batch if buffer has ≥ min_batch_size examples.
   * Returns null if not ready. Does NOT clear the buffer — call clear() to do so.
   */
  emitTrainingBatch(): CollectorBatch | null {
    if (this.buffer.length < this.config.min_batch_size) return null;

    const examples = [...this.buffer];
    const stats = this.getAllResidualStats();
    const totalWeight = examples.reduce((s, e) => s + e.weight, 0);
    const provenCount = examples.filter(e => e.jm_die_proven).length;

    const coverageSet = new Set<NeuralTarget>();
    for (const ex of examples) {
      for (const k of Object.keys(ex.labels) as NeuralTarget[]) coverageSet.add(k);
    }

    return {
      batch_id: this.generateBatchId(),
      created_at: new Date().toISOString(),
      examples,
      per_target_stats: stats,
      total_weight: round(totalWeight, 4),
      jm_die_proven_count: provenCount,
      coverage: Array.from(coverageSet),
    };
  }

  /** Clear the buffer (typically called after a trainer consumes a batch) */
  clear(): void {
    this.buffer = [];
  }

  /**
   * Count improvement: compares RMSE over first half vs second half of buffer
   * for a given target. Positive delta = accuracy improving (RMSE falling).
   */
  accuracyTrend(target: NeuralTarget): {
    n: number;
    first_half_rmse: number;
    second_half_rmse: number;
    improvement_delta: number;
    trend: "improving" | "degrading" | "stable" | "insufficient_data";
  } {
    const residuals: number[] = this.buffer
      .map(ex => ex.residuals[target])
      .filter((v): v is number => v !== undefined && isFinite(v));

    if (residuals.length < 10) {
      return {
        n: residuals.length,
        first_half_rmse: 0,
        second_half_rmse: 0,
        improvement_delta: 0,
        trend: "insufficient_data",
      };
    }

    const mid = Math.floor(residuals.length / 2);
    const rmse = (arr: number[]) => Math.sqrt(arr.reduce((s, v) => s + v * v, 0) / arr.length);
    const firstRmse = rmse(residuals.slice(0, mid));
    const secondRmse = rmse(residuals.slice(mid));
    const delta = firstRmse - secondRmse;

    const eps = firstRmse * 0.02;  // 2% noise band
    const trend: "improving" | "degrading" | "stable" =
      delta > eps ? "improving" : delta < -eps ? "degrading" : "stable";

    return {
      n: residuals.length,
      first_half_rmse: round(firstRmse, 6),
      second_half_rmse: round(secondRmse, 6),
      improvement_delta: round(delta, 6),
      trend,
    };
  }

  // ── Internal helpers ────────────────────────────────────────────────────

  private generateId(): string {
    this.idCounter++;
    return `obs-${Date.now().toString(36)}-${this.idCounter.toString(36)}`;
  }

  private generateBatchId(): string {
    this.batchCounter++;
    return `batch-${Date.now().toString(36)}-${this.batchCounter}`;
  }
}

function round(x: number, digits: number): number {
  const p = Math.pow(10, digits);
  return Math.round(x * p) / p;
}

export const actualVsPredictedCollectorEngine = new ActualVsPredictedCollectorEngine();
