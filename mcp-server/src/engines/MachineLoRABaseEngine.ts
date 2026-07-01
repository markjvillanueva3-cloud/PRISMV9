/**
 * MachineLoRABaseEngine — shared foundation for per-machine LoRA pipelines
 * ========================================================================
 *
 * CAM-ML-CLOSEDLOOP-MS0 foundation. Extracted from the production Lathe
 * LoRA pattern (49 engines) so that the 8 machine-type pipelines
 * (milling, 5-axis, mill-turn, WEDM, sinker EDM, laser, waterjet,
 * grinding) can share machine-agnostic logic without duplicating the
 * ~300 LOC of cadence / drift / version bookkeeping.
 *
 * Provides TWO reusable classes:
 *   1. {@link BaseLoRADatasetBuilder} — geometry-hashed dataset assembly,
 *      stratified train/val/test split, Alpaca-format export.
 *   2. {@link BaseLoRACadence} — cadence scheduler with drift triggers,
 *      version management, auto-promotion, and retention pruning.
 *
 * Each per-machine engine (e.g. MillingLoRACadenceEngine) is a thin
 * TypeScript wrapper around these classes with machine-specific defaults
 * and fingerprint axes.
 *
 * Pattern reference: src/engines/LatheLoRADatasetBuilderEngine.ts
 *                    src/engines/LatheLoRACadenceEngine.ts
 *
 * @module engines/MachineLoRABaseEngine
 * @version 1.0.0
 */

import { createHash } from "node:crypto";

// ════════════════════════════════════════════════════════════════════
// DATASET BUILDER
// ════════════════════════════════════════════════════════════════════

/** Raw job record ingested by the dataset builder. */
export interface RawJob {
  /** Stable job identifier (e.g. program filename + rev). */
  id: string;
  /** Feature fingerprint keys for geometry hashing. */
  fingerprint: Record<string, string | number>;
  /** Free-form feature map — will be embedded in instruction/input. */
  features: Record<string, unknown>;
  /** Actual observed result (CMM, cycle time, pierce outcome, etc.). */
  actual: Record<string, unknown>;
  /** Optional weighting: 1.0 = typical; 0<w<1 = down-weight; >1 up-weight. */
  weight?: number;
  /** Optional labels (e.g. "wire-break", "burn", "pierce-fail"). */
  labels?: string[];
}

/** Instruction-tuning example produced by the dataset builder. */
export interface LoRAExample {
  id: string;
  instruction: string;
  input: string;
  output: string;
  metadata: {
    source_job: string;
    geometry_hash: string;
    fingerprint: Record<string, string | number>;
    weight: number;
    labels: string[];
  };
}

export interface DatasetSplitConfig {
  trainRatio: number;
  valRatio: number;
  testRatio: number;
  /** Deterministic seed for the split (mulberry32). */
  seed: number;
  /** Optional stratification axis — must be a key present in every fingerprint. */
  stratifyBy?: string;
}

export interface DatasetBuildResult {
  examples: {
    train: LoRAExample[];
    val: LoRAExample[];
    test: LoRAExample[];
  };
  stats: {
    totalJobs: number;
    validJobs: number;
    geometryHashCollisions: number;
    byLabel: Record<string, number>;
    avgWeight: number;
    trainCount: number;
    valCount: number;
    testCount: number;
  };
  datasetFingerprint: string;
}

export const DEFAULT_SPLIT: DatasetSplitConfig = {
  trainRatio: 0.8,
  valRatio: 0.1,
  testRatio: 0.1,
  seed: 1,
};

/** Small deterministic PRNG — mulberry32 (keeps splits reproducible). */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function next(): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build a stable hash of a fingerprint so jobs with identical geometry
 * collide deterministically. This keeps the train/val/test split stable
 * across reruns even when the underlying job corpus grows.
 */
export function geometryHash(fingerprint: Record<string, string | number>): string {
  const sorted = Object.keys(fingerprint).sort().map((k) => `${k}=${fingerprint[k]}`).join("|");
  return createHash("sha1").update(sorted).digest("hex").slice(0, 16);
}

/**
 * Deterministic shuffle by geometry hash — jobs with the same hash stay
 * adjacent, and the mulberry32 PRNG re-orders the groups.
 */
function shuffleByHash<T extends { metadata: { geometry_hash: string } }>(
  examples: T[],
  seed: number,
): T[] {
  const groups = new Map<string, T[]>();
  for (const ex of examples) {
    const k = ex.metadata.geometry_hash;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(ex);
  }
  const keys = Array.from(groups.keys()).sort();
  const rand = mulberry32(seed);
  // Fisher-Yates on the group keys.
  for (let i = keys.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [keys[i], keys[j]] = [keys[j], keys[i]];
  }
  const out: T[] = [];
  for (const k of keys) out.push(...groups.get(k)!);
  return out;
}

export interface DatasetBuilderOptions {
  /** Machine-type tag (e.g. "milling", "5axis"). Embedded in metadata. */
  machineType: string;
  /**
   * Render function: takes a raw job and produces (instruction, input,
   * output) strings for Alpaca-format fine-tuning. Implementations that
   * call this from per-machine engines are where the domain-specific
   * knowledge lives.
   */
  render(job: RawJob): { instruction: string; input: string; output: string };
  /**
   * Optional validation. Return null to drop the job (e.g. incomplete
   * actuals) or a reason string. Default: accept all.
   */
  validate?(job: RawJob): string | null;
}

/**
 * Machine-agnostic LoRA dataset builder. Per-machine engines compose
 * with a render function that knows how to convert (features, actual)
 * into instruction-tuning text.
 *
 * Keeps split reproducible across retrains via (a) deterministic
 * geometry hash, (b) mulberry32 seeded PRNG, (c) stable sort keys.
 */
export class BaseLoRADatasetBuilder {
  constructor(private readonly opts: DatasetBuilderOptions) {}

  /**
   * Build a dataset from an array of raw jobs.
   * @param jobs Raw job records.
   * @param split Split configuration (default 80/10/10 seed=1).
   */
  build(jobs: RawJob[], split: DatasetSplitConfig = DEFAULT_SPLIT): DatasetBuildResult {
    this.validateSplit(split);
    const examples: LoRAExample[] = [];
    const labelCounts: Record<string, number> = {};
    let totalWeight = 0;
    const hashCounts = new Map<string, number>();

    for (const job of jobs) {
      const reason = this.opts.validate ? this.opts.validate(job) : null;
      if (reason !== null) continue; // drop invalid
      const rendered = this.opts.render(job);
      const gh = geometryHash(job.fingerprint);
      hashCounts.set(gh, (hashCounts.get(gh) || 0) + 1);
      const weight = job.weight ?? 1;
      totalWeight += weight;
      const labels = job.labels ?? [];
      for (const l of labels) labelCounts[l] = (labelCounts[l] || 0) + 1;
      examples.push({
        id: `${this.opts.machineType}-${job.id}`,
        instruction: rendered.instruction,
        input: rendered.input,
        output: rendered.output,
        metadata: {
          source_job: job.id,
          geometry_hash: gh,
          fingerprint: { ...job.fingerprint },
          weight,
          labels,
        },
      });
    }

    const shuffled = shuffleByHash(examples, split.seed);
    const n = shuffled.length;
    const nTrain = Math.floor(n * split.trainRatio);
    const nVal = Math.floor(n * split.valRatio);
    const train = shuffled.slice(0, nTrain);
    const val = shuffled.slice(nTrain, nTrain + nVal);
    const test = shuffled.slice(nTrain + nVal);

    let collisions = 0;
    for (const c of hashCounts.values()) if (c > 1) collisions += c - 1;

    const datasetFingerprint = createHash("sha1")
      .update(`${this.opts.machineType}|${n}|${split.seed}|${JSON.stringify(Array.from(hashCounts.entries()).sort())}`)
      .digest("hex")
      .slice(0, 24);

    return {
      examples: { train, val, test },
      stats: {
        totalJobs: jobs.length,
        validJobs: examples.length,
        geometryHashCollisions: collisions,
        byLabel: labelCounts,
        avgWeight: examples.length > 0 ? totalWeight / examples.length : 0,
        trainCount: train.length,
        valCount: val.length,
        testCount: test.length,
      },
      datasetFingerprint,
    };
  }

  private validateSplit(s: DatasetSplitConfig): void {
    if (s.trainRatio < 0 || s.valRatio < 0 || s.testRatio < 0) {
      throw new Error("Split ratios must be non-negative");
    }
    const sum = s.trainRatio + s.valRatio + s.testRatio;
    if (Math.abs(sum - 1) > 1e-6) {
      throw new Error(`Split ratios must sum to 1 (got ${sum.toFixed(6)})`);
    }
    if (!Number.isFinite(s.seed)) throw new Error("Seed must be finite");
  }
}

// ════════════════════════════════════════════════════════════════════
// CADENCE SCHEDULER
// ════════════════════════════════════════════════════════════════════

export type CadenceInterval = "daily" | "weekly" | "biweekly" | "monthly" | "on-demand";
export type TriggerType = "scheduled" | "data-drift" | "performance-drop" | "manual";
export type RunStatus = "pending" | "running" | "completed" | "failed";

export interface CadenceConfig {
  enabled: boolean;
  interval: CadenceInterval;
  /** 0=Sunday…6=Saturday — used for weekly/biweekly cadences. */
  dayOfWeek?: number;
  /** 1..28 — used for monthly cadence. */
  dayOfMonth?: number;
  hour: number;
  minNewJobs: number;
  retrainOnDrift: boolean;
  /** Relative drop threshold (0..1): 0.10 = 10% eval score drop triggers retrain. */
  driftThreshold: number;
  /** Minimum eval score for auto-promote. */
  performanceThreshold: number;
  /** Retain the N newest versions. */
  maxVersions: number;
  autoPromote: boolean;
}

export interface TrainingRun {
  runId: string;
  version: string;
  triggeredBy: TriggerType;
  startedAt: string;
  completedAt?: string;
  status: RunStatus;
  metrics?: {
    datasetSize: number;
    trainingLoss: number;
    evalScore: number;
    newJobs: number;
  };
  modelPath?: string;
  promoted: boolean;
  notes?: string;
}

export interface VersionInfo {
  version: string;
  createdAt: string;
  modelPath: string;
  evalScore: number;
  isActive: boolean;
  promotedAt?: string;
  deprecatedAt?: string;
}

export interface CadenceState {
  config: CadenceConfig;
  lastRun?: TrainingRun;
  nextRunAt?: string;
  runs: TrainingRun[];
  versions: VersionInfo[];
  activeVersion?: string;
  jobsSinceLastRun: number;
}

export const DEFAULT_CADENCE: CadenceConfig = {
  enabled: true,
  interval: "weekly",
  dayOfWeek: 0,
  hour: 2,
  minNewJobs: 50,
  retrainOnDrift: true,
  driftThreshold: 0.1,
  performanceThreshold: 65,
  maxVersions: 5,
  autoPromote: true,
};

/**
 * Machine-agnostic LoRA cadence scheduler. Each per-machine engine
 * wraps its own instance of this class with domain-specific defaults
 * (e.g. grinding = weekly, sinker-EDM = monthly).
 *
 * Stateless with respect to external I/O — callers drive the lifecycle
 * via recordJobs()/startRun()/completeRun()/failRun(). Clock is
 * injectable for deterministic tests.
 */
export class BaseLoRACadence {
  private readonly now: () => Date;
  private config: CadenceConfig;
  private state: CadenceState;

  constructor(
    initial: Partial<CadenceConfig> = {},
    clock: () => Date = () => new Date(),
  ) {
    this.now = clock;
    this.config = { ...DEFAULT_CADENCE, ...initial };
    this.state = {
      config: { ...this.config },
      runs: [],
      versions: [],
      jobsSinceLastRun: 0,
    };
  }

  setConfig(patch: Partial<CadenceConfig>): CadenceConfig {
    this.config = { ...this.config, ...patch };
    this.state.config = { ...this.config };
    return { ...this.config };
  }

  getConfig(): CadenceConfig {
    return { ...this.config };
  }

  getState(): CadenceState {
    return JSON.parse(JSON.stringify(this.state));
  }

  recordJobs(n: number): number {
    if (!Number.isFinite(n) || n < 0) throw new Error("recordJobs expects a non-negative finite count");
    this.state.jobsSinceLastRun += Math.floor(n);
    return this.state.jobsSinceLastRun;
  }

  /**
   * Compute the next scheduled run strictly after {@link from}.
   * Idempotent: calling with the result of a previous call yields the
   * next cycle's tick, not the same tick.
   */
  calculateNextRun(from: Date = this.now()): Date {
    const next = new Date(from);
    next.setHours(this.config.hour, 0, 0, 0);
    switch (this.config.interval) {
      case "daily":
        if (next <= from) next.setDate(next.getDate() + 1);
        break;
      case "weekly": {
        const target = this.config.dayOfWeek ?? 0;
        let delta = (target - next.getDay() + 7) % 7;
        if (delta === 0 && next <= from) delta = 7;
        next.setDate(next.getDate() + delta);
        if (next <= from) next.setDate(next.getDate() + 7);
        break;
      }
      case "biweekly": {
        const target = this.config.dayOfWeek ?? 0;
        let delta = (target - next.getDay() + 7) % 7;
        if (delta === 0 && next <= from) delta = 14;
        next.setDate(next.getDate() + (delta || 14));
        break;
      }
      case "monthly": {
        const target = this.config.dayOfMonth ?? 1;
        next.setDate(target);
        if (next <= from) next.setMonth(next.getMonth() + 1);
        break;
      }
      case "on-demand":
        return new Date(0);
    }
    return next;
  }

  shouldTriggerRun(): { should: boolean; reason: TriggerType | null; details: string } {
    if (!this.config.enabled) return { should: false, reason: null, details: "cadence disabled" };
    if (this.config.interval === "on-demand") return { should: false, reason: null, details: "on-demand only" };
    const now = this.now();
    const reference = this.state.lastRun
      ? new Date(this.state.lastRun.completedAt ?? this.state.lastRun.startedAt)
      : new Date(0);
    const nextRun = this.calculateNextRun(reference);
    if (now < nextRun) {
      return { should: false, reason: null, details: `next run at ${nextRun.toISOString()}` };
    }
    if (this.state.jobsSinceLastRun < this.config.minNewJobs) {
      return {
        should: false,
        reason: null,
        details: `only ${this.state.jobsSinceLastRun}/${this.config.minNewJobs} new jobs`,
      };
    }
    return {
      should: true,
      reason: "scheduled",
      details: `${this.state.jobsSinceLastRun} new jobs since last run`,
    };
  }

  /**
   * Evaluate drift vs baseline and emit a trigger decision.
   * Drift is relative: (baseline - current) / baseline. A positive
   * drift above the configured threshold fires a retrain trigger.
   */
  checkDrift(currentScore: number, baselineScore: number): { drifted: boolean; delta: number; triggerRetrain: boolean } {
    if (!Number.isFinite(currentScore) || !Number.isFinite(baselineScore)) {
      throw new Error("checkDrift: scores must be finite");
    }
    if (baselineScore === 0) {
      return { drifted: false, delta: 0, triggerRetrain: false };
    }
    const delta = (baselineScore - currentScore) / baselineScore;
    const drifted = delta > this.config.driftThreshold;
    return { drifted, delta, triggerRetrain: drifted && this.config.retrainOnDrift };
  }

  startRun(triggeredBy: TriggerType, notes?: string): TrainingRun {
    const version = this.generateVersion();
    const run: TrainingRun = {
      runId: `run-${this.now().getTime()}-${this.state.runs.length}`,
      version,
      triggeredBy,
      startedAt: this.now().toISOString(),
      status: "running",
      promoted: false,
      notes,
    };
    this.state.runs.push(run);
    this.state.lastRun = run;
    return { ...run };
  }

  completeRun(runId: string, metrics: NonNullable<TrainingRun["metrics"]>, modelPath: string): TrainingRun {
    const run = this.state.runs.find((r) => r.runId === runId);
    if (!run) throw new Error(`run ${runId} not found`);
    if (run.status !== "running") throw new Error(`run ${runId} is ${run.status}, cannot complete`);
    run.status = "completed";
    run.completedAt = this.now().toISOString();
    run.metrics = metrics;
    run.modelPath = modelPath;
    this.state.versions.push({
      version: run.version,
      createdAt: run.completedAt,
      modelPath,
      evalScore: metrics.evalScore,
      isActive: false,
    });
    if (this.config.autoPromote && metrics.evalScore >= this.config.performanceThreshold) {
      this.promoteVersion(run.version);
      run.promoted = true;
    }
    this.state.jobsSinceLastRun = 0;
    this.pruneVersions();
    return { ...run };
  }

  failRun(runId: string, error: string): TrainingRun {
    const run = this.state.runs.find((r) => r.runId === runId);
    if (!run) throw new Error(`run ${runId} not found`);
    run.status = "failed";
    run.completedAt = this.now().toISOString();
    run.notes = run.notes ? `${run.notes}; error=${error}` : `error=${error}`;
    return { ...run };
  }

  promoteVersion(version: string): VersionInfo {
    const v = this.state.versions.find((x) => x.version === version);
    if (!v) throw new Error(`version ${version} not found`);
    for (const other of this.state.versions) {
      if (other.isActive && other.version !== version) {
        other.isActive = false;
        other.deprecatedAt = this.now().toISOString();
      }
    }
    v.isActive = true;
    v.promotedAt = this.now().toISOString();
    this.state.activeVersion = version;
    return { ...v };
  }

  private pruneVersions(): void {
    if (this.state.versions.length <= this.config.maxVersions) return;
    // Keep the newest maxVersions, preserving the active version even if old.
    const active = this.state.activeVersion;
    const sorted = [...this.state.versions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const keep = new Set(sorted.slice(0, this.config.maxVersions).map((v) => v.version));
    if (active) keep.add(active);
    this.state.versions = this.state.versions.filter((v) => keep.has(v.version));
  }

  private generateVersion(): string {
    const now = this.now();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, "0");
    const d = String(now.getUTCDate()).padStart(2, "0");
    const seq = this.state.runs.length + 1;
    return `${y}${m}${d}.${seq}`;
  }
}

/**
 * Introspection payload for the shared LoRA foundation -- returned by
 * {@link machineLoRABase.getInfo}. Pure metadata: the reusable helpers, the
 * canonical defaults consumers inherit, and the machine-type pipelines that
 * compose on this base.
 */
export interface MachineLoRABaseInfo {
  engine: string;
  version: string;
  description: string;
  /** The reusable building blocks this foundation exposes. */
  helpers: string[];
  /** Canonical defaults every per-machine wrapper inherits. */
  defaults: {
    split: DatasetSplitConfig;
    cadence: CadenceConfig;
  };
  /** Machine-type pipelines that compose on this base (CAM-ML-CLOSEDLOOP-MS0). */
  machineTypes: string[];
  /** Cadence enums available to per-machine wrappers. */
  cadence: {
    intervals: CadenceInterval[];
    triggers: TriggerType[];
    runStatuses: RunStatus[];
  };
}

// Singleton export for dispatcher-level wiring (per-machine engines also
// export their own singletons, but having a base instance lets tools
// inspect the default config.)
export const machineLoRABase = {
  buildDatasetHelper: (opts: DatasetBuilderOptions) => new BaseLoRADatasetBuilder(opts),
  createCadence: (initial?: Partial<CadenceConfig>, clock?: () => Date) => new BaseLoRACadence(initial, clock),

  /**
   * Introspect the shared LoRA foundation: the reusable helpers, the canonical
   * DEFAULT_SPLIT / DEFAULT_CADENCE every per-machine wrapper inherits, and the
   * machine-type pipelines that compose on it. Pure + deterministic (no I/O, no
   * args) -- the dispatcher's machine_lora_base_info action surfaces this so a
   * caller can discover the base contract without instantiating a builder.
   *
   * @returns Static metadata describing the MachineLoRABase foundation.
   */
  getInfo(): MachineLoRABaseInfo {
    return {
      engine: "MachineLoRABaseEngine",
      version: "1.0.0",
      description:
        "Shared foundation for per-machine LoRA pipelines: geometry-hashed dataset " +
        "assembly (stratified train/val/test split, Alpaca export) + cadence scheduling " +
        "with drift triggers, version management, auto-promotion, and retention pruning.",
      helpers: ["buildDatasetHelper", "createCadence"],
      defaults: {
        split: { ...DEFAULT_SPLIT },
        cadence: { ...DEFAULT_CADENCE },
      },
      machineTypes: [
        "milling", "5axis", "mill-turn", "wedm",
        "sinker-edm", "laser", "waterjet", "grinding",
      ],
      cadence: {
        // Each literal is checked against its union type below -- a typo or a
        // dropped member fails compilation (single honest source of the enums).
        intervals: ["daily", "weekly", "biweekly", "monthly", "on-demand"],
        triggers: ["scheduled", "data-drift", "performance-drop", "manual"],
        runStatuses: ["pending", "running", "completed", "failed"],
      },
    };
  },
};
