/**
 * MasterAITrainingLedgerEngine — CAM-ML-CLOSEDLOOP-MS0 U-CMCCL09
 * ================================================================
 *
 * One ledger to track EVERY LoRA run across the 8 CAM pipelines
 * (milling, 5-axis, mill-turn, WEDM, sinker-edm, laser, waterjet,
 * grinding). Generalized from LathePerformanceSLORegistryEngine +
 * U-LPR-TRAINING-LEDGER.
 *
 * Schema v1:
 *   {
 *     runId,
 *     pipelineType: "milling" | "5axis" | ...,
 *     datasetFingerprint,     // from BaseLoRADatasetBuilder
 *     trainingMetrics: { loss, accuracy, mae, evalScore },
 *     deploymentStatus: "pending" | "deployed" | "rolled-back",
 *     sloTargets: { minEvalScore, maxLoss },
 *     actualVsPredicted: { predictedDrift, observedDrift, absoluteDelta },
 *     createdAt,
 *     promotedAt?,
 *   }
 *
 * API:
 *   - ingest(entry)              — append a ledger entry
 *   - query(filter)              — filter by pipelineType / deployment / date
 *   - replay(runId)              — fetch single entry by runId
 *   - compare(pipelineA, pipelineB) — head-to-head stability
 *   - sloStatus()                — per-pipeline SLO pass/fail dashboard
 *   - pipelineStability(pipeline)— coefficient-of-variation of evalScore
 *
 * All operations are pure (state in singleton memory — callers persist
 * externally if needed). schemaVersion pins the entry shape.
 *
 * @module engines/MasterAITrainingLedgerEngine
 * @version 1.0.0
 */

export const LEDGER_SCHEMA_VERSION = 1;

export type PipelineType =
  | "milling"
  | "5axis"
  | "millturn"
  | "wedm"
  | "sinker-edm"
  | "laser"
  | "waterjet"
  | "grinding";

export type DeploymentStatus = "pending" | "deployed" | "rolled-back";

export interface SLOTargets {
  minEvalScore: number;
  maxLoss: number;
}

export interface TrainingMetrics {
  loss: number;
  accuracy: number;
  mae: number;
  evalScore: number;
}

export interface ActualVsPredicted {
  predictedDrift: number;
  observedDrift: number;
  absoluteDelta: number;
}

export interface LedgerEntry {
  schemaVersion: number;
  runId: string;
  pipelineType: PipelineType;
  datasetFingerprint: string;
  version: string;
  trainingMetrics: TrainingMetrics;
  deploymentStatus: DeploymentStatus;
  sloTargets: SLOTargets;
  actualVsPredicted?: ActualVsPredicted;
  createdAt: string;
  promotedAt?: string;
  notes?: string;
}

export interface LedgerQuery {
  pipelineType?: PipelineType;
  deploymentStatus?: DeploymentStatus;
  createdAfter?: string; // ISO
  createdBefore?: string; // ISO
  minEvalScore?: number;
}

export interface PipelineStability {
  pipelineType: PipelineType;
  runCount: number;
  meanEvalScore: number;
  stdEvalScore: number;
  coefficientOfVariation: number; // std/mean — lower = more stable
  minEvalScore: number;
  maxEvalScore: number;
}

export interface PipelineComparison {
  pipelineA: PipelineType;
  pipelineB: PipelineType;
  aStability: PipelineStability;
  bStability: PipelineStability;
  moreStable: PipelineType | "tie";
}

export interface SLOStatus {
  pipelineType: PipelineType;
  runCount: number;
  passing: number;
  failing: number;
  passRate: number;
  lastFailReason?: string;
}

const ALL_PIPELINES: PipelineType[] = [
  "milling",
  "5axis",
  "millturn",
  "wedm",
  "sinker-edm",
  "laser",
  "waterjet",
  "grinding",
];

function isPipelineType(v: unknown): v is PipelineType {
  return typeof v === "string" && (ALL_PIPELINES as readonly string[]).includes(v);
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  let sum = 0;
  for (const x of xs) sum += x;
  return sum / xs.length;
}

function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  let ss = 0;
  for (const x of xs) ss += (x - m) ** 2;
  return Math.sqrt(ss / (xs.length - 1)); // sample stddev (n-1)
}

class MasterAITrainingLedgerEngineImpl {
  private entries: LedgerEntry[] = [];

  /**
   * Append a ledger entry. Validates shape, pipelineType, and metrics.
   * Duplicate runIds are rejected.
   */
  ingest(entry: Omit<LedgerEntry, "schemaVersion">): LedgerEntry {
    if (!entry.runId || typeof entry.runId !== "string") throw new Error("runId is required");
    if (!isPipelineType(entry.pipelineType)) throw new Error(`invalid pipelineType: ${entry.pipelineType}`);
    if (!entry.datasetFingerprint) throw new Error("datasetFingerprint is required");
    const m = entry.trainingMetrics;
    if (
      !m ||
      !Number.isFinite(m.loss) ||
      !Number.isFinite(m.accuracy) ||
      !Number.isFinite(m.mae) ||
      !Number.isFinite(m.evalScore)
    ) {
      throw new Error("trainingMetrics must be finite numbers (loss, accuracy, mae, evalScore)");
    }
    if (this.entries.some((e) => e.runId === entry.runId)) {
      throw new Error(`duplicate runId: ${entry.runId}`);
    }
    const full: LedgerEntry = { ...entry, schemaVersion: LEDGER_SCHEMA_VERSION };
    this.entries.push(full);
    return { ...full };
  }

  /** Replay a single entry by runId. Returns null if not found. */
  replay(runId: string): LedgerEntry | null {
    const hit = this.entries.find((e) => e.runId === runId);
    return hit ? { ...hit } : null;
  }

  /** Query entries by filter. Filters are AND-combined. */
  query(filter: LedgerQuery = {}): LedgerEntry[] {
    return this.entries
      .filter((e) => !filter.pipelineType || e.pipelineType === filter.pipelineType)
      .filter((e) => !filter.deploymentStatus || e.deploymentStatus === filter.deploymentStatus)
      .filter((e) => !filter.createdAfter || e.createdAt >= filter.createdAfter)
      .filter((e) => !filter.createdBefore || e.createdAt <= filter.createdBefore)
      .filter((e) => filter.minEvalScore === undefined || e.trainingMetrics.evalScore >= filter.minEvalScore)
      .map((e) => ({ ...e }));
  }

  /** All supported pipeline types (for dispatcher action schemas). */
  supportedPipelines(): PipelineType[] {
    return [...ALL_PIPELINES];
  }

  /**
   * Compute stability summary for a pipeline. coefficientOfVariation
   * (std/mean) is the headline metric — lower means the LoRA is
   * retraining consistently.
   */
  pipelineStability(pipelineType: PipelineType): PipelineStability {
    if (!isPipelineType(pipelineType)) throw new Error(`invalid pipelineType: ${pipelineType}`);
    const runs = this.entries.filter((e) => e.pipelineType === pipelineType);
    const scores = runs.map((r) => r.trainingMetrics.evalScore);
    const m = mean(scores);
    const s = stddev(scores);
    return {
      pipelineType,
      runCount: runs.length,
      meanEvalScore: m,
      stdEvalScore: s,
      coefficientOfVariation: m !== 0 ? s / m : 0,
      minEvalScore: scores.length ? Math.min(...scores) : 0,
      maxEvalScore: scores.length ? Math.max(...scores) : 0,
    };
  }

  /**
   * Head-to-head comparison. "More stable" = lower coefficient of
   * variation, tie if within 1e-6.
   */
  compare(a: PipelineType, b: PipelineType): PipelineComparison {
    const sa = this.pipelineStability(a);
    const sb = this.pipelineStability(b);
    let moreStable: PipelineType | "tie";
    if (Math.abs(sa.coefficientOfVariation - sb.coefficientOfVariation) < 1e-6) moreStable = "tie";
    else if (sa.coefficientOfVariation < sb.coefficientOfVariation) moreStable = a;
    else moreStable = b;
    return { pipelineA: a, pipelineB: b, aStability: sa, bStability: sb, moreStable };
  }

  /** SLO dashboard — per-pipeline pass/fail against sloTargets. */
  sloStatus(): SLOStatus[] {
    return ALL_PIPELINES.map((p) => {
      const runs = this.entries.filter((e) => e.pipelineType === p);
      let passing = 0;
      let failing = 0;
      let lastFailReason: string | undefined;
      for (const r of runs) {
        const passesEval = r.trainingMetrics.evalScore >= r.sloTargets.minEvalScore;
        const passesLoss = r.trainingMetrics.loss <= r.sloTargets.maxLoss;
        if (passesEval && passesLoss) {
          passing += 1;
        } else {
          failing += 1;
          if (!passesEval) lastFailReason = `eval ${r.trainingMetrics.evalScore} < ${r.sloTargets.minEvalScore}`;
          else lastFailReason = `loss ${r.trainingMetrics.loss} > ${r.sloTargets.maxLoss}`;
        }
      }
      return {
        pipelineType: p,
        runCount: runs.length,
        passing,
        failing,
        passRate: runs.length ? passing / runs.length : 0,
        lastFailReason,
      };
    });
  }

  /** Total runs ingested (for observability). */
  totalRuns(): number {
    return this.entries.length;
  }

  /** Clear the ledger. For tests only. */
  reset(): void {
    this.entries = [];
  }
}

export const masterAITrainingLedgerEngine = new MasterAITrainingLedgerEngineImpl();
export type MasterAITrainingLedgerEngine = typeof masterAITrainingLedgerEngine;
