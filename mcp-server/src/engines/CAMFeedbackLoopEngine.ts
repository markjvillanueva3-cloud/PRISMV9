/**
 * CAMFeedbackLoopEngine — CAM-EXHAUST-MS0/U-CAM120
 *
 * Continuous-learning feedback collection for CAM AGI decisions. Distinct
 * from existing engines:
 *   - CAMMLDriftMonitorEngine — watches MAE drift on a held-out test set;
 *     this engine watches accuracy drift on LIVE production decisions.
 *   - FeedbackCollectorEngine — shop-floor thumbs-up/down on whole NC
 *     programs; this engine captures fine-grained AI decision overrides
 *     (operator changed original strategy/parameter/tool to a different
 *     one — that pair becomes a training signal).
 *   - CAMConfidenceCalibrationEngine (U-CAM119) — consumes outcomes to
 *     calibrate confidence; this engine collects the outcomes and
 *     surfaces drift / patterns / training pairs.
 *
 * Capabilities:
 *   - recordCorrection(...)        — operator overrode the AI's pick. Stored
 *                                    as a training pair (original, corrected,
 *                                    reason).
 *   - recordOutcome(...)           — AI's pick was confirmed (or implicitly
 *                                    accepted with no override). Used for
 *                                    rolling-window accuracy drift.
 *   - getCorrections(filter?)      — filter stored corrections by task /
 *                                    source / time window.
 *   - accuracyDrift(opts)          — rolling-window accuracy + Mann-Kendall
 *                                    non-parametric trend test (Mann 1945,
 *                                    Kendall 1975). Returns slope sign,
 *                                    p-value heuristic, and verdict.
 *   - correctionPatterns(opts)     — group corrections by reason / source /
 *                                    canonical (original→corrected) edge to
 *                                    surface repeating themes.
 *   - loraTrainingExport(opts)     — emit structured (input, original,
 *                                    corrected, weight) tuples for the LoRA
 *                                    fine-tuning pipeline. Corrections get
 *                                    weight=1.0; positive outcomes weight=0.5.
 *   - feedbackStats()              — total corrections + override rate
 *                                    + top-N corrected sources.
 *
 * Storage: in-memory ring buffers per task (default cap 10000 each, FIFO).
 * Per-process; persistence is deliberately out of scope for U-CAM120.
 *
 * Mann-Kendall trend test:
 *   S = Σ_{i<j} sign(x_j - x_i)
 *   var(S) under H0 (no trend) = n(n-1)(2n+5)/18 (no ties)
 *   Z = (S - sign(S)) / sqrt(var(S))
 *   |Z| > 1.96 ⇒ trend at α=0.05; |Z| > 2.576 ⇒ α=0.01.
 *   Reference: Mann (1945) "Nonparametric tests against trend";
 *   Kendall (1975) "Rank correlation methods" 4th ed.
 */

import type {
  AGIDecision,
  AGIDecisionTask,
  SourceKind,
} from "./CAMDeepLearningOrchestratorEngine.js";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/** Per-task ring-buffer cap for corrections + outcomes before FIFO eviction. */
const DEFAULT_BUFFER_CAP = 10_000;
/** Default rolling window size for accuracy-drift measurement (samples). */
const DEFAULT_DRIFT_WINDOW = 100;
/** Minimum samples required before drift trend is considered conclusive. */
const MIN_DRIFT_SAMPLES = 30;
/** Mann-Kendall α=0.05 two-tailed critical Z. */
const MANN_KENDALL_Z_05 = 1.959963984540054;
/** Mann-Kendall α=0.01 two-tailed critical Z. */
const MANN_KENDALL_Z_01 = 2.5758293035489004;
/** Default top-N for correction-pattern aggregation. */
const DEFAULT_PATTERN_TOP_N = 10;
/** Default top-N for source-leaderboard. */
const DEFAULT_SOURCE_TOP_N = 5;
/** Truncate operator notes / reason free-text to keep storage bounded. */
const REASON_TEXT_LIMIT = 480;
/** Truncate input prompts in stored training pairs. */
const PROMPT_STORAGE_LIMIT = 4096;
/** Weight applied to direct corrections in LoRA training export. */
const LORA_WEIGHT_CORRECTION = 1.0;
/** Weight applied to confirmed (non-corrected) decisions in LoRA export. */
const LORA_WEIGHT_CONFIRMED = 0.5;

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface CorrectionRecord {
  recordId: string;
  decisionId: string;
  task: AGIDecisionTask;
  /** The AI's original pick (whatever the orchestrator emitted as decision.value). */
  originalValue: unknown;
  /** What the operator actually used / wanted. */
  correctedValue: unknown;
  /** Source the AI cited as winning the original decision. */
  originalSource: SourceKind | null;
  /** AI's stated confidence in the original decision. */
  originalConfidence: number;
  /** Operator-supplied reason for the correction. Free text. */
  reason: string;
  /** Operator id, if known. */
  operatorId: string;
  /** Original prompt that produced the decision. Truncated to PROMPT_STORAGE_LIMIT. */
  prompt: string;
  recordedAt: number;
}

export interface OutcomeRecord {
  recordId: string;
  decisionId: string;
  task: AGIDecisionTask;
  /** Whether the AI's pick was correct (no override required). */
  wasCorrect: boolean;
  /** Confidence the AI emitted (used for drift x-axis). */
  predictedConfidence: number;
  recordedAt: number;
}

export type DriftVerdict =
  | "no_trend"
  | "improving_05"
  | "improving_01"
  | "degrading_05"
  | "degrading_01"
  | "insufficient_data";

export interface AccuracyDriftReport {
  task: AGIDecisionTask | "all";
  windowSize: number;
  sampleCount: number;
  /** Sliding-window accuracy series. */
  accuracySeries: number[];
  /** Mann-Kendall S-statistic (sign-aware). */
  mannKendallS: number;
  /** Mann-Kendall standard normal Z. */
  mannKendallZ: number;
  /** Verdict: trend direction + significance level. */
  verdict: DriftVerdict;
  /** Slope from linear regression on the accuracy series (auxiliary). */
  ordinarySlope: number;
}

export interface CorrectionPattern {
  /** Group key (e.g. "reason:thin-wall", "source:ollama", "edge:trochoidal→adaptive"). */
  group: string;
  /** Group dimension (reason | source | edge). */
  dimension: "reason" | "source" | "edge";
  count: number;
  /** Fraction of total corrections in the filtered set this group represents. */
  share: number;
  examples: string[];
}

export interface CorrectionPatternsReport {
  task: AGIDecisionTask | "all";
  totalCorrections: number;
  byReason: CorrectionPattern[];
  bySource: CorrectionPattern[];
  byEdge: CorrectionPattern[];
}

export interface LoRATrainingPair {
  task: AGIDecisionTask;
  prompt: string;
  /** AI's original output (for negative example or self-confirmation). */
  originalValue: unknown;
  /** Ground-truth output to train towards. */
  correctedValue: unknown;
  /** Sample weight (1.0 for corrections, 0.5 for confirmed). */
  weight: number;
  /** Source kind (helps stratified training). */
  source: "correction" | "confirmation";
  recordId: string;
  recordedAt: number;
}

export interface FeedbackStats {
  totalCorrections: number;
  totalOutcomes: number;
  overrideRate: number;
  /** Top sources whose decisions get overridden (descending). */
  topCorrectedSources: Array<{ source: SourceKind; count: number; share: number }>;
  /** Sample timestamps for context. */
  earliestRecord?: number;
  latestRecord?: number;
}

export interface RecordCorrectionInput {
  decisionId: string;
  task: AGIDecisionTask;
  originalValue: unknown;
  correctedValue: unknown;
  originalSource?: SourceKind | null;
  originalConfidence?: number;
  reason?: string;
  operatorId?: string;
  prompt?: string;
  recordedAt?: number;
}

export interface RecordOutcomeInput {
  decisionId: string;
  task: AGIDecisionTask;
  wasCorrect: boolean;
  predictedConfidence?: number;
  recordedAt?: number;
}

export interface DriftOptions {
  task?: AGIDecisionTask;
  windowSize?: number;
}

export interface PatternsOptions {
  task?: AGIDecisionTask;
  topN?: number;
}

export interface LoRAExportOptions {
  task?: AGIDecisionTask;
  /** If true, include positive (non-corrected) outcomes alongside corrections. */
  includeConfirmed?: boolean;
  /** Cap on emitted pairs (default unlimited). */
  limit?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════════

export class CAMFeedbackLoopEngine {
  private static correctionsByTask: Map<AGIDecisionTask, CorrectionRecord[]> = new Map();
  private static outcomesByTask: Map<AGIDecisionTask, OutcomeRecord[]> = new Map();
  private static globalCorrections: CorrectionRecord[] = [];
  private static globalOutcomes: OutcomeRecord[] = [];
  private static bufferCap: number = DEFAULT_BUFFER_CAP;
  private static idCounter: number = 0;

  /** Override the per-task ring-buffer cap. Tests use small caps to verify FIFO. */
  static setBufferCap(cap: number): void {
    if (!Number.isFinite(cap) || cap < 1) {
      throw new Error(`bufferCap must be a positive integer, got ${cap}`);
    }
    this.bufferCap = Math.floor(cap);
    this.evictAll();
  }

  /** Drop all stored corrections + outcomes. Test hook. */
  static clearAll(): void {
    this.correctionsByTask.clear();
    this.outcomesByTask.clear();
    this.globalCorrections = [];
    this.globalOutcomes = [];
    this.idCounter = 0;
  }

  /**
   * Record an operator override of the AI's decision. The pair becomes a
   * training signal for downstream LoRA fine-tuning.
   */
  static recordCorrection(input: RecordCorrectionInput): CorrectionRecord {
    if (!input || typeof input.decisionId !== "string" || input.decisionId.length === 0) {
      throw new Error("recordCorrection: decisionId must be a non-empty string");
    }
    if (typeof input.task !== "string" || input.task.length === 0) {
      throw new Error("recordCorrection: task must be a non-empty string");
    }
    // originalValue / correctedValue may legally be null/undefined (abstain
    // → operator-supplied value), but they cannot both be undefined.
    if (input.originalValue === undefined && input.correctedValue === undefined) {
      throw new Error(
        "recordCorrection: at least one of originalValue/correctedValue must be defined"
      );
    }
    if (
      input.originalConfidence !== undefined &&
      (!Number.isFinite(input.originalConfidence) ||
        input.originalConfidence < 0 ||
        input.originalConfidence > 1)
    ) {
      throw new Error(
        "recordCorrection: originalConfidence must be a finite number in [0, 1]"
      );
    }

    const now = input.recordedAt ?? Date.now();
    const record: CorrectionRecord = {
      recordId: this.nextId("corr", now),
      decisionId: input.decisionId,
      task: input.task,
      originalValue: input.originalValue ?? null,
      correctedValue: input.correctedValue ?? null,
      originalSource: input.originalSource ?? null,
      originalConfidence: input.originalConfidence ?? 0,
      reason: truncate(input.reason ?? "", REASON_TEXT_LIMIT),
      operatorId: input.operatorId ?? "",
      prompt: truncate(input.prompt ?? "", PROMPT_STORAGE_LIMIT),
      recordedAt: now,
    };

    let perTask = this.correctionsByTask.get(input.task);
    if (!perTask) {
      perTask = [];
      this.correctionsByTask.set(input.task, perTask);
    }
    perTask.push(record);
    this.globalCorrections.push(record);
    this.evictBuffer(perTask);
    this.evictBuffer(this.globalCorrections);
    return record;
  }

  /** Convenience wrapper that captures a correction directly from an AGIDecision. */
  static recordCorrectionFromDecision<V>(
    decision: AGIDecision<V>,
    correctedValue: unknown,
    extras: {
      decisionId?: string;
      reason?: string;
      operatorId?: string;
      prompt?: string;
    } = {}
  ): CorrectionRecord {
    if (!decision || typeof decision !== "object") {
      throw new Error("recordCorrectionFromDecision: decision must be a non-null AGIDecision");
    }
    const winningSource =
      (decision.agreeingSources && decision.agreeingSources[0]) ||
      (decision.voices && decision.voices[0]?.source) ||
      null;
    return this.recordCorrection({
      decisionId: extras.decisionId ?? this.nextId("dec", Date.now()),
      task: decision.task,
      originalValue: decision.value,
      correctedValue,
      originalSource: winningSource,
      originalConfidence: decision.confidence,
      reason: extras.reason,
      operatorId: extras.operatorId,
      prompt: extras.prompt,
    });
  }

  /**
   * Record an outcome (AI's pick was confirmed correct or not). Used for
   * accuracy-drift tracking. Does NOT create a training pair on its own —
   * that requires recordCorrection().
   */
  static recordOutcome(input: RecordOutcomeInput): OutcomeRecord {
    if (!input || typeof input.decisionId !== "string" || input.decisionId.length === 0) {
      throw new Error("recordOutcome: decisionId must be a non-empty string");
    }
    if (typeof input.task !== "string" || input.task.length === 0) {
      throw new Error("recordOutcome: task must be a non-empty string");
    }
    if (typeof input.wasCorrect !== "boolean") {
      throw new Error("recordOutcome: wasCorrect must be a boolean");
    }
    const conf =
      input.predictedConfidence === undefined
        ? 0
        : input.predictedConfidence;
    if (!Number.isFinite(conf)) {
      throw new Error("recordOutcome: predictedConfidence must be a finite number");
    }

    const now = input.recordedAt ?? Date.now();
    const record: OutcomeRecord = {
      recordId: this.nextId("out", now),
      decisionId: input.decisionId,
      task: input.task,
      wasCorrect: input.wasCorrect,
      predictedConfidence: clamp01(conf),
      recordedAt: now,
    };

    let perTask = this.outcomesByTask.get(input.task);
    if (!perTask) {
      perTask = [];
      this.outcomesByTask.set(input.task, perTask);
    }
    perTask.push(record);
    this.globalOutcomes.push(record);
    this.evictBuffer(perTask);
    this.evictBuffer(this.globalOutcomes);
    return record;
  }

  /** Filter and return stored corrections. */
  static getCorrections(filter: {
    task?: AGIDecisionTask;
    sinceMs?: number;
    operatorId?: string;
    limit?: number;
  } = {}): CorrectionRecord[] {
    let arr = filter.task
      ? [...(this.correctionsByTask.get(filter.task) ?? [])]
      : [...this.globalCorrections];
    if (filter.sinceMs !== undefined) {
      arr = arr.filter((r) => r.recordedAt >= filter.sinceMs!);
    }
    if (filter.operatorId !== undefined) {
      arr = arr.filter((r) => r.operatorId === filter.operatorId);
    }
    if (filter.limit !== undefined) {
      const lim = Math.max(0, Math.floor(filter.limit));
      arr = arr.slice(-lim);
    }
    return arr;
  }

  /**
   * Compute rolling-window accuracy + Mann-Kendall trend test on production
   * outcomes for one task (or aggregated across tasks).
   */
  static accuracyDrift(opts: DriftOptions = {}): AccuracyDriftReport {
    const window = Math.max(2, Math.floor(opts.windowSize ?? DEFAULT_DRIFT_WINDOW));
    const outcomes = opts.task
      ? (this.outcomesByTask.get(opts.task) ?? [])
      : this.globalOutcomes;
    const n = outcomes.length;

    if (n < MIN_DRIFT_SAMPLES) {
      return {
        task: opts.task ?? "all",
        windowSize: window,
        sampleCount: n,
        accuracySeries: [],
        mannKendallS: 0,
        mannKendallZ: 0,
        verdict: "insufficient_data",
        ordinarySlope: 0,
      };
    }

    // Sort by recordedAt to ensure chronological order even if pushed out of
    // sequence (shouldn't happen with the production path, but tests can
    // inject explicit timestamps).
    const ordered = [...outcomes].sort((a, b) => a.recordedAt - b.recordedAt);

    // Build sliding-window accuracy series.
    const series: number[] = [];
    let correct = 0;
    for (let i = 0; i < window && i < ordered.length; i++) {
      if (ordered[i].wasCorrect) correct++;
    }
    if (ordered.length >= window) {
      series.push(correct / window);
      for (let i = window; i < ordered.length; i++) {
        if (ordered[i].wasCorrect) correct++;
        if (ordered[i - window].wasCorrect) correct--;
        series.push(correct / window);
      }
    } else {
      // n in [MIN_DRIFT_SAMPLES, window): use cumulative accuracy as series.
      let runningCorrect = 0;
      for (let i = 0; i < ordered.length; i++) {
        if (ordered[i].wasCorrect) runningCorrect++;
        series.push(runningCorrect / (i + 1));
      }
    }

    const { S, Z } = mannKendall(series);
    const slope = ordinarySlope(series);

    let verdict: DriftVerdict = "no_trend";
    const absZ = Math.abs(Z);
    if (absZ >= MANN_KENDALL_Z_01) {
      verdict = S > 0 ? "improving_01" : "degrading_01";
    } else if (absZ >= MANN_KENDALL_Z_05) {
      verdict = S > 0 ? "improving_05" : "degrading_05";
    }

    return {
      task: opts.task ?? "all",
      windowSize: window,
      sampleCount: n,
      accuracySeries: series,
      mannKendallS: S,
      mannKendallZ: Z,
      verdict,
      ordinarySlope: slope,
    };
  }

  /**
   * Aggregate corrections by reason / source / canonical edge to surface
   * repeating themes for prioritization.
   */
  static correctionPatterns(opts: PatternsOptions = {}): CorrectionPatternsReport {
    const corrections = opts.task
      ? (this.correctionsByTask.get(opts.task) ?? [])
      : this.globalCorrections;
    const total = corrections.length;
    const topN = Math.max(1, Math.floor(opts.topN ?? DEFAULT_PATTERN_TOP_N));

    if (total === 0) {
      return {
        task: opts.task ?? "all",
        totalCorrections: 0,
        byReason: [],
        bySource: [],
        byEdge: [],
      };
    }

    const byReason = aggregate(
      corrections,
      (r) => normalizeReason(r.reason),
      (r) => r.reason || "(no reason)",
      total,
      "reason",
      topN
    );
    const bySource = aggregate(
      corrections,
      (r) => r.originalSource ?? "(unknown)",
      (r) => `decision_id=${r.decisionId}`,
      total,
      "source",
      topN
    );
    const byEdge = aggregate(
      corrections,
      (r) => `${formatValue(r.originalValue)}→${formatValue(r.correctedValue)}`,
      (r) => r.reason || `id=${r.recordId}`,
      total,
      "edge",
      topN
    );

    return {
      task: opts.task ?? "all",
      totalCorrections: total,
      byReason,
      bySource,
      byEdge,
    };
  }

  /**
   * Emit structured (input, original, corrected, weight) tuples ready for
   * the LoRA fine-tuning pipeline. Corrections are weighted 1.0; confirmed
   * outcomes (when includeConfirmed=true) are weighted 0.5 to act as
   * regularizing positive examples.
   */
  static loraTrainingExport(opts: LoRAExportOptions = {}): LoRATrainingPair[] {
    const corrections = opts.task
      ? (this.correctionsByTask.get(opts.task) ?? [])
      : this.globalCorrections;
    const outcomes = opts.includeConfirmed
      ? opts.task
        ? (this.outcomesByTask.get(opts.task) ?? [])
        : this.globalOutcomes
      : [];

    const pairs: LoRATrainingPair[] = [];
    for (const c of corrections) {
      pairs.push({
        task: c.task,
        prompt: c.prompt,
        originalValue: c.originalValue,
        correctedValue: c.correctedValue,
        weight: LORA_WEIGHT_CORRECTION,
        source: "correction",
        recordId: c.recordId,
        recordedAt: c.recordedAt,
      });
    }
    for (const o of outcomes) {
      if (!o.wasCorrect) continue;
      pairs.push({
        task: o.task,
        prompt: "",
        originalValue: null,
        correctedValue: null,
        weight: LORA_WEIGHT_CONFIRMED,
        source: "confirmation",
        recordId: o.recordId,
        recordedAt: o.recordedAt,
      });
    }
    pairs.sort((a, b) => a.recordedAt - b.recordedAt);
    if (opts.limit !== undefined) {
      const lim = Math.max(0, Math.floor(opts.limit));
      return pairs.slice(0, lim);
    }
    return pairs;
  }

  /** High-level statistics for dashboards. */
  static feedbackStats(): FeedbackStats {
    const totalCorrections = this.globalCorrections.length;
    const totalOutcomes = this.globalOutcomes.length;
    const denom = totalCorrections + totalOutcomes;
    const overrideRate = denom === 0 ? 0 : totalCorrections / denom;

    const sourceCounts = new Map<SourceKind, number>();
    for (const c of this.globalCorrections) {
      if (c.originalSource) {
        sourceCounts.set(c.originalSource, (sourceCounts.get(c.originalSource) ?? 0) + 1);
      }
    }
    const topCorrectedSources = [...sourceCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, DEFAULT_SOURCE_TOP_N)
      .map(([source, count]) => ({
        source,
        count,
        share: totalCorrections === 0 ? 0 : count / totalCorrections,
      }));

    const allTimes = [
      ...this.globalCorrections.map((r) => r.recordedAt),
      ...this.globalOutcomes.map((r) => r.recordedAt),
    ];
    const earliestRecord = allTimes.length > 0 ? Math.min(...allTimes) : undefined;
    const latestRecord = allTimes.length > 0 ? Math.max(...allTimes) : undefined;

    const stats: FeedbackStats = {
      totalCorrections,
      totalOutcomes,
      overrideRate,
      topCorrectedSources,
    };
    if (earliestRecord !== undefined) stats.earliestRecord = earliestRecord;
    if (latestRecord !== undefined) stats.latestRecord = latestRecord;
    return stats;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INTERNAL HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  private static nextId(prefix: string, ts: number): string {
    this.idCounter = (this.idCounter + 1) % 1_000_000;
    return `${prefix}-${ts.toString(36)}-${this.idCounter.toString(36)}`;
  }

  private static evictBuffer<T>(buf: T[]): void {
    while (buf.length > this.bufferCap) {
      buf.shift();
    }
  }

  private static evictAll(): void {
    for (const [, arr] of this.correctionsByTask) this.evictBuffer(arr);
    for (const [, arr] of this.outcomesByTask) this.evictBuffer(arr);
    this.evictBuffer(this.globalCorrections);
    this.evictBuffer(this.globalOutcomes);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PURE HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function truncate(s: string, max: number): string {
  if (typeof s !== "string") return "";
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return "[unserializable]";
  }
}

function normalizeReason(reason: string): string {
  return (reason || "(no reason)")
    .toLowerCase()
    .replace(/[^a-z0-9 -]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 64);
}

function aggregate<T>(
  records: T[],
  keyFn: (r: T) => string,
  exampleFn: (r: T) => string,
  total: number,
  dimension: "reason" | "source" | "edge",
  topN: number
): CorrectionPattern[] {
  const groups = new Map<string, { count: number; examples: string[] }>();
  for (const r of records) {
    const key = keyFn(r);
    const g = groups.get(key) ?? { count: 0, examples: [] };
    g.count++;
    if (g.examples.length < 3) g.examples.push(exampleFn(r));
    groups.set(key, g);
  }
  return [...groups.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, topN)
    .map(([group, { count, examples }]) => ({
      group,
      dimension,
      count,
      share: total === 0 ? 0 : count / total,
      examples,
    }));
}

/**
 * Mann-Kendall trend test on a 1D series. Returns the S statistic and the
 * standard normal Z. No tie-correction (good for rolling accuracies which
 * are continuous fractions; ties are rare in practice). Reference:
 * Mann (1945), Kendall (1975).
 */
export function mannKendall(series: number[]): { S: number; Z: number } {
  const n = series.length;
  if (n < 2) return { S: 0, Z: 0 };
  let S = 0;
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = series[j] - series[i];
      if (d > 0) S++;
      else if (d < 0) S--;
    }
  }
  const variance = (n * (n - 1) * (2 * n + 5)) / 18;
  if (variance <= 0) return { S, Z: 0 };
  let Z: number;
  if (S > 0) Z = (S - 1) / Math.sqrt(variance);
  else if (S < 0) Z = (S + 1) / Math.sqrt(variance);
  else Z = 0;
  return { S, Z };
}

/** Ordinary least-squares slope of the series against its index. */
export function ordinarySlope(series: number[]): number {
  const n = series.length;
  if (n < 2) return 0;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += series[i];
    sumXY += i * series[i];
    sumX2 += i * i;
  }
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export const camFeedbackLoopEngine = CAMFeedbackLoopEngine;
