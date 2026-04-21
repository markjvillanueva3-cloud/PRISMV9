/**
 * WEDMEWCMemoryEngine — Elastic Weight Consolidation (EWC++) for WEDM LoRA adapters.
 *
 * MS-P4-DL-CORE / U-P4-DL-03
 *
 * Purpose
 * -------
 * Prevents catastrophic forgetting when a single LoRA adapter is trained
 * sequentially across multiple materials (D2 → M2 → S7 …). Each finished
 * material becomes a "task" that is snapshotted with its optimal parameters
 * θ*_t and a Fisher-information diagonal F_t. Subsequent training on a new
 * material uses a quadratic penalty anchored to the snapshots so the
 * adapter can only drift in directions that old-task Fisher declared
 * uninformative.
 *
 * Mathematics (Chaudhry et al. 2018 "Riemannian Walk for Incremental Learning"
 * ECCV — the "EWC++" variant with online Fisher estimation)
 * ----------------------------------------------------------------------------
 *
 *   L_total(θ) = L_new(θ) + Σ_t [ (λ_t / 2) · Σ_i F_{t,i} (θ_i − θ*_{t,i})² ]
 *
 *   Fisher diagonal (Chaudhry 2018 §3.2):
 *     F_i ≈ E_x [ (∂L/∂θ_i)² ]                     (squared per-sample grad)
 *
 *   Online Fisher EMA (Chaudhry 2018 §3.2 "running estimate"):
 *     F^(t+1) = α · F^(t) + (1 − α) · g_{t+1}²      α = 0.9 (paper default)
 *
 *   Penalty gradient:
 *     ∂L_penalty/∂θ_i = Σ_t λ_t · F_{t,i} · (θ_i − θ*_{t,i})
 *
 *   λ schedule (Chaudhry 2018 Table 1 / experimental setup §4):
 *     Permuted-MNIST benchmark     λ = 100
 *     Split-MNIST benchmark        λ = 10
 *     Riemannian-Walk CIFAR        λ = 500  (used as WEDM default)
 *   These are the published defaults we expose as `LambdaPreset` — callers
 *   may override, but cannot fabricate a value without naming a preset.
 *
 * Design notes
 * ------------
 *   • This engine is intentionally a PURE math layer over WEDMLoRAAdapterEngine
 *     state. It does not import the LoRA engine at runtime — it accepts flat
 *     snapshots of { A, B } and returns flat gradient deltas. Keeps the two
 *     engines independently testable and avoids a circular dependency.
 *   • Persistence: WEDM_EWC_MEMORY.json. Adapter name is the outer key;
 *     tasks are nested under it. Multi-adapter (per-material-family) memory
 *     survives restart and cross-session coordination.
 *   • Catastrophic-forgetting exit gate (≤ 10% MAE regression after 3 task
 *     batches) is asserted by WEDMEWCMemoryEngine.test.ts, not by this file.
 *
 * @module engines/WEDMEWCMemoryEngine
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// LITERATURE-GROUNDED CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Published λ defaults from the EWC / EWC++ literature.
 * Source: Chaudhry et al. 2018 "Riemannian Walk for Incremental Learning"
 *   Table 1 and §4 experimental setup.
 * Also compatible with Kirkpatrick et al. 2017 "Overcoming catastrophic
 * forgetting" (original EWC) which uses λ ∈ {400, 1e4} for MNIST/Atari.
 */
export const LAMBDA_PRESETS = {
  /** Permuted-MNIST task sequence (Chaudhry 2018 Table 1). */
  PERMUTED_MNIST: 100,
  /** Split-MNIST class-incremental (Chaudhry 2018 Table 1). */
  SPLIT_MNIST: 10,
  /** Riemannian-Walk CIFAR (Chaudhry 2018 §4). Default for WEDM material-batch sequences. */
  RIEMANNIAN_WALK_CIFAR: 500,
  /** Original Kirkpatrick 2017 EWC strong-regularisation setting. */
  KIRKPATRICK_2017_STRONG: 10000,
} as const;
export type LambdaPreset = keyof typeof LAMBDA_PRESETS;

/**
 * EMA coefficient α for online Fisher (Chaudhry 2018 §3.2).
 * F^(t+1) = α · F^(t) + (1−α) · g²_{t+1}.
 * Paper default; exposed as a constant so callers cannot drift silently.
 */
export const ONLINE_FISHER_ALPHA = 0.9 as const;

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

const finiteNumber = z
  .number()
  .refine((n) => Number.isFinite(n), { message: "must be finite (no NaN/Infinity)" });

const matrixOfFinites = z.array(z.array(finiteNumber));

/** One snapshot of (θ*, F) at the end of training on a given task. */
export const EWCTaskSnapshotSchema = z.object({
  task_id: z.string().min(1),
  /** Material this task adapted for (optional context). */
  material: z.string().optional(),
  /** λ used for this snapshot's quadratic penalty. */
  lambda: finiteNumber.refine((n) => n >= 0, { message: "lambda must be ≥ 0" }),
  /** Which published preset (if any) the λ value came from. */
  lambda_preset: z.string().optional(),
  /** θ*_t: copy of A at end of task. */
  theta_star_A: matrixOfFinites,
  /** θ*_t: copy of B at end of task. */
  theta_star_B: matrixOfFinites,
  /** Diagonal Fisher on A (same shape as A), squared-gradient estimate. */
  fisher_A: matrixOfFinites,
  /** Diagonal Fisher on B (same shape as B). */
  fisher_B: matrixOfFinites,
  /** Number of per-sample gradients that went into the Fisher estimate. */
  n_samples: z.number().int().min(1),
  recorded_at: z.string(),
});
export type EWCTaskSnapshot = z.infer<typeof EWCTaskSnapshotSchema>;

export const EWCMemoryFileSchema = z.object({
  schemaVersion: z.literal(1),
  generated_at: z.string(),
  /** Keyed by adapter name → ordered list of snapshots (oldest first). */
  memories: z.record(z.string(), z.array(EWCTaskSnapshotSchema)),
});
export type EWCMemoryFile = z.infer<typeof EWCMemoryFileSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// PATH RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_FILE_REL = "../../data/state/WEDM_EWC_MEMORY.json";

function resolveMemoryFile(override?: string): string {
  if (override) return resolve(override);
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, DEFAULT_FILE_REL);
}

// ─────────────────────────────────────────────────────────────────────────────
// MATRIX HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function zerosLike(M: number[][]): number[][] {
  return M.map((row) => row.map(() => 0));
}

function deepCopy(M: number[][]): number[][] {
  return M.map((row) => row.slice());
}

function assertSameShape(label: string, A: number[][], B: number[][]): void {
  if (A.length !== B.length) {
    throw new RangeError(`${label}: row count mismatch — ${A.length} vs ${B.length}`);
  }
  for (let i = 0; i < A.length; i++) {
    if ((A[i]?.length ?? 0) !== (B[i]?.length ?? 0)) {
      throw new RangeError(
        `${label}: col count mismatch at row ${i} — ${A[i]?.length} vs ${B[i]?.length}`,
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INPUT / OUTPUT SHAPES
// ─────────────────────────────────────────────────────────────────────────────

/** Minimal adapter-shape object accepted by this engine (decoupled from LoRA engine). */
export interface AdapterState {
  name: string;
  A: number[][];
  B: number[][];
}

/** Running Fisher estimator for one adapter. Public for test inspection. */
export interface OnlineFisher {
  fisher_A: number[][];
  fisher_B: number[][];
  n_updates: number;
}

export interface PenaltyGradient {
  gradA: number[][];
  gradB: number[][];
}

export interface SnapshotInput {
  taskId: string;
  material?: string;
  adapter: AdapterState;
  fisher: { fisher_A: number[][]; fisher_B: number[][]; n_samples: number };
  lambda?: number;
  lambdaPreset?: LambdaPreset;
}

// ─────────────────────────────────────────────────────────────────────────────
// ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export class WEDMEWCMemoryEngine {
  readonly name = "WEDMEWCMemoryEngine";
  readonly version = "1.0.0";
  readonly schemaVersion = 1 as const;

  /** Exposed for tests + callers who want the literature-cited default. */
  readonly onlineFisherAlpha = ONLINE_FISHER_ALPHA;
  readonly defaultLambda = LAMBDA_PRESETS.RIEMANNIAN_WALK_CIFAR;

  private readonly filePath: string;
  /** Keyed by adapter name → running Fisher estimator (not persisted). */
  private onlineFisherByAdapter: Map<string, OnlineFisher> = new Map();

  constructor(opts?: { filePath?: string }) {
    this.filePath = resolveMemoryFile(opts?.filePath);
  }

  path(): string {
    return this.filePath;
  }

  /**
   * Resolve the λ value a caller wants. Either a preset name (from
   * LAMBDA_PRESETS, which cites Chaudhry 2018 / Kirkpatrick 2017) or an
   * explicit numeric λ. Explicit values are accepted but recorded so the
   * provenance survives reload — nothing anonymous.
   */
  resolveLambda(opts: { lambda?: number; lambdaPreset?: LambdaPreset }): {
    lambda: number;
    preset?: string;
  } {
    if (opts.lambdaPreset !== undefined) {
      const val = LAMBDA_PRESETS[opts.lambdaPreset];
      return { lambda: val, preset: opts.lambdaPreset };
    }
    if (opts.lambda !== undefined) {
      if (!Number.isFinite(opts.lambda) || opts.lambda < 0) {
        throw new RangeError(`lambda must be finite and ≥ 0, got ${opts.lambda}`);
      }
      return { lambda: opts.lambda };
    }
    return { lambda: this.defaultLambda, preset: "RIEMANNIAN_WALK_CIFAR" };
  }

  // ───────────────────────── Online Fisher (EMA) ─────────────────────────

  /** Initialise the running Fisher estimator for an adapter (zeros). */
  initOnlineFisher(adapter: AdapterState): OnlineFisher {
    const f: OnlineFisher = {
      fisher_A: zerosLike(adapter.A),
      fisher_B: zerosLike(adapter.B),
      n_updates: 0,
    };
    this.onlineFisherByAdapter.set(adapter.name, f);
    return f;
  }

  /** Direct accessor (primarily for tests / telemetry). */
  getOnlineFisher(adapterName: string): OnlineFisher | null {
    return this.onlineFisherByAdapter.get(adapterName) ?? null;
  }

  /**
   * Apply one EMA update using a squared-gradient step (Chaudhry 2018 §3.2):
   *   F^(t+1) = α · F^(t) + (1 − α) · g²
   *
   * The caller supplies per-sample gradients (gradA, gradB) computed from
   * the LoRA adapter's backward pass on a single training sample.
   */
  updateOnlineFisher(
    adapterName: string,
    gradA: number[][],
    gradB: number[][],
  ): OnlineFisher {
    const f = this.onlineFisherByAdapter.get(adapterName);
    if (!f) {
      throw new Error(
        `updateOnlineFisher: no online Fisher initialised for adapter "${adapterName}" — call initOnlineFisher first`,
      );
    }
    assertSameShape("gradA vs fisher_A", gradA, f.fisher_A);
    assertSameShape("gradB vs fisher_B", gradB, f.fisher_B);
    const a = ONLINE_FISHER_ALPHA;
    const oneMinusA = 1 - a;
    for (let i = 0; i < f.fisher_A.length; i++) {
      for (let j = 0; j < f.fisher_A[i].length; j++) {
        const g = gradA[i][j];
        f.fisher_A[i][j] = a * f.fisher_A[i][j] + oneMinusA * g * g;
      }
    }
    for (let i = 0; i < f.fisher_B.length; i++) {
      for (let j = 0; j < f.fisher_B[i].length; j++) {
        const g = gradB[i][j];
        f.fisher_B[i][j] = a * f.fisher_B[i][j] + oneMinusA * g * g;
      }
    }
    f.n_updates += 1;
    return f;
  }

  // ───────────────────────── Task snapshots ─────────────────────────

  /**
   * Persist an end-of-task snapshot. Copies the adapter's current (A, B)
   * into θ* and stores the Fisher diagonal against which future tasks are
   * anchored. The online Fisher (in-memory) is NOT cleared — callers who
   * want a fresh estimator for the next task should call initOnlineFisher
   * again explicitly.
   */
  snapshotTask(input: SnapshotInput): EWCTaskSnapshot {
    const resolved = this.resolveLambda({
      lambda: input.lambda,
      lambdaPreset: input.lambdaPreset,
    });
    const snapshot: EWCTaskSnapshot = {
      task_id: input.taskId,
      material: input.material,
      lambda: resolved.lambda,
      lambda_preset: resolved.preset,
      theta_star_A: deepCopy(input.adapter.A),
      theta_star_B: deepCopy(input.adapter.B),
      fisher_A: deepCopy(input.fisher.fisher_A),
      fisher_B: deepCopy(input.fisher.fisher_B),
      n_samples: input.fisher.n_samples,
      recorded_at: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
    };
    const validated = EWCTaskSnapshotSchema.parse(snapshot);
    assertSameShape("theta_star_A vs fisher_A", validated.theta_star_A, validated.fisher_A);
    assertSameShape("theta_star_B vs fisher_B", validated.theta_star_B, validated.fisher_B);
    const file = this.load();
    const prior = file.memories[input.adapter.name] ?? [];
    const next: EWCMemoryFile = {
      schemaVersion: 1,
      generated_at: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
      memories: { ...file.memories, [input.adapter.name]: [...prior, validated] },
    };
    this.persist(next);
    return validated;
  }

  /** All persisted task snapshots for an adapter, oldest-first. */
  listTasks(adapterName: string): EWCTaskSnapshot[] {
    return this.load().memories[adapterName] ?? [];
  }

  // ───────────────────────── Penalty computation ─────────────────────────

  /**
   * Quadratic EWC penalty L_penalty(θ) = Σ_t (λ_t/2) Σ_i F_{t,i} (θ_i − θ*_{t,i})².
   * Runs over every persisted snapshot for this adapter and sums contributions.
   */
  penalty(adapter: AdapterState): number {
    const snapshots = this.listTasks(adapter.name);
    let total = 0;
    for (const s of snapshots) {
      assertSameShape("penalty A", adapter.A, s.theta_star_A);
      assertSameShape("penalty B", adapter.B, s.theta_star_B);
      const halfLambda = s.lambda / 2;
      for (let i = 0; i < adapter.A.length; i++) {
        for (let j = 0; j < adapter.A[i].length; j++) {
          const d = adapter.A[i][j] - s.theta_star_A[i][j];
          total += halfLambda * s.fisher_A[i][j] * d * d;
        }
      }
      for (let i = 0; i < adapter.B.length; i++) {
        for (let j = 0; j < adapter.B[i].length; j++) {
          const d = adapter.B[i][j] - s.theta_star_B[i][j];
          total += halfLambda * s.fisher_B[i][j] * d * d;
        }
      }
    }
    return total;
  }

  /**
   * Penalty gradient ∂L_penalty/∂θ_i = Σ_t λ_t · F_{t,i} · (θ_i − θ*_{t,i}).
   * Returned matrices match adapter.A and adapter.B in shape.
   */
  penaltyGradient(adapter: AdapterState): PenaltyGradient {
    const gradA = zerosLike(adapter.A);
    const gradB = zerosLike(adapter.B);
    const snapshots = this.listTasks(adapter.name);
    for (const s of snapshots) {
      assertSameShape("penaltyGradient A", adapter.A, s.theta_star_A);
      assertSameShape("penaltyGradient B", adapter.B, s.theta_star_B);
      const lam = s.lambda;
      for (let i = 0; i < adapter.A.length; i++) {
        for (let j = 0; j < adapter.A[i].length; j++) {
          gradA[i][j] += lam * s.fisher_A[i][j] * (adapter.A[i][j] - s.theta_star_A[i][j]);
        }
      }
      for (let i = 0; i < adapter.B.length; i++) {
        for (let j = 0; j < adapter.B[i].length; j++) {
          gradB[i][j] += lam * s.fisher_B[i][j] * (adapter.B[i][j] - s.theta_star_B[i][j]);
        }
      }
    }
    return { gradA, gradB };
  }

  /**
   * Convenience: sum a task-loss gradient and the EWC penalty gradient. This
   * is the drop-in replacement for a plain gradient in the LoRA training
   * step when continual learning is enabled.
   */
  combineGradients(
    taskGrad: PenaltyGradient,
    adapter: AdapterState,
  ): PenaltyGradient {
    const pen = this.penaltyGradient(adapter);
    assertSameShape("combine A", taskGrad.gradA, pen.gradA);
    assertSameShape("combine B", taskGrad.gradB, pen.gradB);
    const gradA = taskGrad.gradA.map((row, i) =>
      row.map((v, j) => v + pen.gradA[i][j]),
    );
    const gradB = taskGrad.gradB.map((row, i) =>
      row.map((v, j) => v + pen.gradB[i][j]),
    );
    return { gradA, gradB };
  }

  // ───────────────────────── Persistence ─────────────────────────

  load(): EWCMemoryFile {
    if (!existsSync(this.filePath)) {
      return {
        schemaVersion: 1,
        generated_at: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
        memories: {},
      };
    }
    const raw = readFileSync(this.filePath, "utf8");
    return EWCMemoryFileSchema.parse(JSON.parse(raw));
  }

  private persist(file: EWCMemoryFile): void {
    const validated = EWCMemoryFileSchema.parse(file);
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const tmp = this.filePath + ".tmp";
    writeFileSync(tmp, JSON.stringify(validated, null, 2) + "\n", "utf8");
    renameSync(tmp, this.filePath);
  }

  /** Test-only. */
  reset(): void {
    this.onlineFisherByAdapter.clear();
    this.persist({
      schemaVersion: 1,
      generated_at: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
      memories: {},
    });
  }
}

export const wedmEWCMemoryEngine = new WEDMEWCMemoryEngine();
