/**
 * WEDMLoRAAdapterEngine — Rank-4 Low-Rank Adaptation for WEDM physics base models.
 *
 * MS-P4-DL-CORE / U-P4-DL-02
 *
 * Purpose
 * -------
 * Implements the math from Hu et al. 2021 "LoRA: Low-Rank Adaptation of Large
 * Language Models" (arXiv:2106.09685). Each adapter parameterises a weight
 * update ΔW of a frozen base model as the product of two small matrices:
 *
 *     ΔW = B · A      with    A ∈ ℝ^{r × d_in},   B ∈ ℝ^{d_out × r}
 *     h  = W₀·x + (α/r) · (B · A · x)
 *
 * where r is the rank (fixed at 4 per envelope), α is the scaling constant,
 * and `scale` is a runtime multiplier (default 1.0). Init follows Hu 2021 §4.1:
 *   • A ~ N(0, σ² = 1/r) — Gaussian, deterministic when a seed is supplied
 *   • B = 0 — guarantees ΔW = 0 at initialisation (identity invariant: the
 *            base model is untouched until training modifies B)
 *
 * The engine is the math-kernel for the P4 learning loop. It does NOT know
 * about Klocke Ra, DiBitonto crater depth, or any specific base model — it
 * composes with whatever base prediction the caller supplies via
 * `forwardWithBase(x, basePrediction)`. Downstream consumers:
 *
 *   • U-P4-DL-03 (WEDMEWCMemoryEngine) reads B and A to compute Fisher-info
 *     diagonals
 *   • U-P4-DL-04 (WEDMFewShotEngine extension) bootstraps a per-material
 *     adapter from 3–5 records in WEDM_JOB_HISTORY.json
 *
 * Persistence: `save(path)` writes a JSON file with shape declared in
 * `LoRAWeightsFileSchema`. The adapter registry is keyed by `name` so multiple
 * adapters (e.g. per-material, per-thickness-bucket) coexist in one file.
 *
 * References
 * ----------
 *   • Hu, E. et al. "LoRA: Low-Rank Adaptation of Large Language Models".
 *     arXiv:2106.09685 (2021). §3 formulation, §4.1 init scheme, §4.2 scaling.
 *   • Deterministic Gaussian generator: Mulberry32 PRNG + Box-Muller transform.
 *
 * @module engines/WEDMLoRAAdapterEngine
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS (envelope-locked)
// ─────────────────────────────────────────────────────────────────────────────

/** Rank is LOCKED at 4 per envelope. Do not parameterise. */
export const LORA_RANK = 4 as const;

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

const finiteNumber = z
  .number()
  .refine((n) => Number.isFinite(n), { message: "must be finite (no NaN/Infinity)" });

const matrixOfFinites = z.array(z.array(finiteNumber));

/** Single adapter on-disk representation. */
export const LoRAAdapterSchema = z.object({
  name: z.string().min(1),
  rank: z.literal(LORA_RANK),
  alpha: finiteNumber.refine((n) => n > 0, { message: "alpha must be > 0" }),
  input_dim: z.number().int().min(1),
  output_dim: z.number().int().min(1),
  /** A ∈ ℝ^{rank × input_dim}. */
  A: matrixOfFinites,
  /** B ∈ ℝ^{output_dim × rank}. */
  B: matrixOfFinites,
  /** Number of gradient-update steps applied since init. */
  training_steps: z.number().int().min(0),
  created_at: z.string(),
  /** Human-readable base-model identifier ("Klocke-Ra-v1", "DiBitonto-crater-v1"). */
  base_model: z.string().optional(),
  /** Material key this adapter is specialised for, if any. */
  material: z.string().optional(),
  /** Seed used for the Gaussian init of A (for reproducibility). */
  seed: z.number().int().optional(),
});
export type LoRAAdapter = z.infer<typeof LoRAAdapterSchema>;

export const LoRAWeightsFileSchema = z.object({
  schemaVersion: z.literal(1),
  generated_at: z.string(),
  adapters: z.record(z.string(), LoRAAdapterSchema),
});
export type LoRAWeightsFile = z.infer<typeof LoRAWeightsFileSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// PATH RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_FILE_REL = "../../data/state/WEDM_LORA_WEIGHTS.json";

function resolveWeightsFile(override?: string): string {
  if (override) return resolve(override);
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, DEFAULT_FILE_REL);
}

// ─────────────────────────────────────────────────────────────────────────────
// DETERMINISTIC GAUSSIAN GENERATOR (Mulberry32 PRNG + Box-Muller)
// ─────────────────────────────────────────────────────────────────────────────

/** Mulberry32: fast 32-bit deterministic PRNG, uniform in [0, 1). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Box-Muller transform: returns a pair of independent N(0, 1) samples from
 * two uniform [0, 1) samples. We discard the second sample to keep the code
 * simple — the caller re-invokes for each scalar.
 */
function gaussianFrom(rng: () => number, stddev: number): number {
  // Reject 0 to avoid log(0) → -Infinity
  let u1 = rng();
  while (u1 <= 1e-12) u1 = rng();
  const u2 = rng();
  const mag = Math.sqrt(-2 * Math.log(u1));
  return mag * Math.cos(2 * Math.PI * u2) * stddev;
}

// ─────────────────────────────────────────────────────────────────────────────
// MATRIX HELPERS (plain number[][], no external BLAS — correctness over speed)
// ─────────────────────────────────────────────────────────────────────────────

function zerosMatrix(rows: number, cols: number): number[][] {
  const out: number[][] = new Array(rows);
  for (let i = 0; i < rows; i++) out[i] = new Array(cols).fill(0);
  return out;
}

/** y = M · x  where M is rows×cols and x is length cols. */
function matVec(M: number[][], x: number[]): number[] {
  const rows = M.length;
  const cols = M[0]?.length ?? 0;
  if (x.length !== cols) {
    throw new RangeError(
      `matVec: dim mismatch — matrix is ${rows}×${cols}, vector length is ${x.length}`,
    );
  }
  const y = new Array(rows).fill(0);
  for (let i = 0; i < rows; i++) {
    let sum = 0;
    const row = M[i];
    for (let j = 0; j < cols; j++) sum += row[j] * x[j];
    y[i] = sum;
  }
  return y;
}

/** y = Mᵀ · x  where M is rows×cols; result length is cols. */
function matTransposeVec(M: number[][], x: number[]): number[] {
  const rows = M.length;
  const cols = M[0]?.length ?? 0;
  if (x.length !== rows) {
    throw new RangeError(
      `matTransposeVec: dim mismatch — matrix is ${rows}×${cols}, vector length is ${x.length}`,
    );
  }
  const y = new Array(cols).fill(0);
  for (let i = 0; i < rows; i++) {
    const xi = x[i];
    const row = M[i];
    for (let j = 0; j < cols; j++) y[j] += row[j] * xi;
  }
  return y;
}

/** Outer product: a (length m) ⊗ b (length n) → m×n matrix. */
function outer(a: number[], b: number[]): number[][] {
  const m = a.length;
  const n = b.length;
  const out = new Array(m);
  for (let i = 0; i < m; i++) {
    const row = new Array(n);
    const ai = a[i];
    for (let j = 0; j < n; j++) row[j] = ai * b[j];
    out[i] = row;
  }
  return out;
}

function deepCopyMatrix(M: number[][]): number[][] {
  return M.map((row) => row.slice());
}

// ─────────────────────────────────────────────────────────────────────────────
// ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateAdapterOptions {
  name: string;
  inputDim: number;
  outputDim: number;
  /** Scaling constant α. Default 8 (yields α/r = 2 at rank-4). */
  alpha?: number;
  seed?: number;
  baseModel?: string;
  material?: string;
}

export interface BackwardResult {
  gradA: number[][];
  gradB: number[][];
}

export class WEDMLoRAAdapterEngine {
  readonly name = "WEDMLoRAAdapterEngine";
  readonly version = "1.0.0";
  readonly schemaVersion = 1 as const;
  readonly rank = LORA_RANK;

  private readonly filePath: string;
  /** Runtime scale multiplier applied on top of α/r in forward/backward. */
  private scale = 1.0;

  constructor(opts?: { filePath?: string }) {
    this.filePath = resolveWeightsFile(opts?.filePath);
  }

  path(): string {
    return this.filePath;
  }

  /** Runtime scale (not persisted). scale=0 ⇒ Δh = 0 (identity to base). */
  setScale(s: number): void {
    if (!Number.isFinite(s)) {
      throw new RangeError(`setScale: must be finite, got ${s}`);
    }
    this.scale = s;
  }

  getScale(): number {
    return this.scale;
  }

  /**
   * Create a new adapter with Hu 2021 §4.1 init: A ~ N(0, 1/r), B = 0.
   * The B-zero init guarantees identity behaviour (ΔW = 0) at step 0.
   */
  createAdapter(opts: CreateAdapterOptions): LoRAAdapter {
    const alpha = opts.alpha ?? 8;
    if (alpha <= 0 || !Number.isFinite(alpha)) {
      throw new RangeError(`alpha must be > 0, got ${alpha}`);
    }
    if (opts.inputDim < 1 || opts.outputDim < 1) {
      throw new RangeError("inputDim and outputDim must be ≥ 1");
    }
    const rng = mulberry32(opts.seed ?? Math.floor(Math.random() * 2 ** 31));
    const stddev = 1 / Math.sqrt(LORA_RANK); // σ² = 1/r
    const A = new Array(LORA_RANK);
    for (let i = 0; i < LORA_RANK; i++) {
      const row = new Array(opts.inputDim);
      for (let j = 0; j < opts.inputDim; j++) row[j] = gaussianFrom(rng, stddev);
      A[i] = row;
    }
    const B = zerosMatrix(opts.outputDim, LORA_RANK);
    const adapter: LoRAAdapter = {
      name: opts.name,
      rank: LORA_RANK,
      alpha,
      input_dim: opts.inputDim,
      output_dim: opts.outputDim,
      A,
      B,
      training_steps: 0,
      created_at: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
      base_model: opts.baseModel,
      material: opts.material,
      seed: opts.seed,
    };
    return LoRAAdapterSchema.parse(adapter);
  }

  /**
   * Forward pass: returns the LoRA delta only, Δy = (α/r) · scale · B · A · x.
   * Caller composes with base: y_final = y_base + forward(...).
   * When B is zero (freshly-initialised or scale=0), this returns a zero vector
   * → identity to the base model (Hu 2021 §4.1 invariant).
   */
  forward(adapter: LoRAAdapter, x: number[]): number[] {
    if (x.length !== adapter.input_dim) {
      throw new RangeError(
        `forward: x.length (${x.length}) must equal adapter.input_dim (${adapter.input_dim})`,
      );
    }
    const Ax = matVec(adapter.A, x); // length = rank
    const BAx = matVec(adapter.B, Ax); // length = output_dim
    const scaleFactor = (adapter.alpha / adapter.rank) * this.scale;
    return BAx.map((v) => v * scaleFactor);
  }

  /**
   * Compose with a base-model prediction: h = y_base + (α/r)·scale·B·A·x.
   * If the adapter is fresh (B = 0) or scale = 0, returns `basePrediction`
   * unchanged (bit-exact).
   */
  forwardWithBase(adapter: LoRAAdapter, x: number[], basePrediction: number[]): number[] {
    if (basePrediction.length !== adapter.output_dim) {
      throw new RangeError(
        `forwardWithBase: basePrediction.length (${basePrediction.length}) must equal adapter.output_dim (${adapter.output_dim})`,
      );
    }
    const delta = this.forward(adapter, x);
    const out = new Array(adapter.output_dim);
    for (let i = 0; i < adapter.output_dim; i++) out[i] = basePrediction[i] + delta[i];
    return out;
  }

  /**
   * Backward pass: given dL/dy (gradOutput) for the LoRA output, compute
   *   dL/dB = (α/r)·scale · (dL/dy) ⊗ (A·x)ᵀ     shape: output_dim × rank
   *   dL/dA = (α/r)·scale · Bᵀ·(dL/dy) ⊗ xᵀ      shape: rank × input_dim
   */
  backward(adapter: LoRAAdapter, x: number[], gradOutput: number[]): BackwardResult {
    if (x.length !== adapter.input_dim) {
      throw new RangeError(
        `backward: x.length (${x.length}) must equal adapter.input_dim (${adapter.input_dim})`,
      );
    }
    if (gradOutput.length !== adapter.output_dim) {
      throw new RangeError(
        `backward: gradOutput.length (${gradOutput.length}) must equal adapter.output_dim (${adapter.output_dim})`,
      );
    }
    const scaleFactor = (adapter.alpha / adapter.rank) * this.scale;
    // dL/dB = scaleFactor * gradOutput ⊗ (A·x)
    const Ax = matVec(adapter.A, x); // length rank
    const gradBraw = outer(gradOutput, Ax); // output_dim × rank
    const gradB = gradBraw.map((row) => row.map((v) => v * scaleFactor));
    // dL/dA = scaleFactor * (Bᵀ · gradOutput) ⊗ x
    const BtG = matTransposeVec(adapter.B, gradOutput); // length rank
    const gradAraw = outer(BtG, x); // rank × input_dim
    const gradA = gradAraw.map((row) => row.map((v) => v * scaleFactor));
    return { gradA, gradB };
  }

  /**
   * Apply gradient update (plain SGD) and return a new adapter (pure
   * function — does not mutate the input). Steps counter is incremented.
   */
  applyGradients(
    adapter: LoRAAdapter,
    grads: BackwardResult,
    lr: number,
  ): LoRAAdapter {
    if (!Number.isFinite(lr)) {
      throw new RangeError(`lr must be finite, got ${lr}`);
    }
    const A = adapter.A.map((row, i) => row.map((v, j) => v - lr * grads.gradA[i][j]));
    const B = adapter.B.map((row, i) => row.map((v, j) => v - lr * grads.gradB[i][j]));
    return LoRAAdapterSchema.parse({
      ...adapter,
      A,
      B,
      training_steps: adapter.training_steps + 1,
    });
  }

  /** Load the weights file, or return an empty envelope if absent. */
  load(): LoRAWeightsFile {
    if (!existsSync(this.filePath)) {
      return {
        schemaVersion: 1,
        generated_at: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
        adapters: {},
      };
    }
    const raw = readFileSync(this.filePath, "utf8");
    return LoRAWeightsFileSchema.parse(JSON.parse(raw));
  }

  /** Atomic write (.tmp → rename). */
  private persist(file: LoRAWeightsFile): void {
    const validated = LoRAWeightsFileSchema.parse(file);
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const tmp = this.filePath + ".tmp";
    writeFileSync(tmp, JSON.stringify(validated, null, 2) + "\n", "utf8");
    renameSync(tmp, this.filePath);
  }

  /** Insert or replace an adapter in the persisted registry. */
  saveAdapter(adapter: LoRAAdapter): void {
    const current = this.load();
    const next: LoRAWeightsFile = {
      schemaVersion: 1,
      generated_at: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
      adapters: { ...current.adapters, [adapter.name]: adapter },
    };
    this.persist(next);
  }

  /** Retrieve an adapter by name from the persisted registry (null if absent). */
  getAdapter(name: string): LoRAAdapter | null {
    const current = this.load();
    return current.adapters[name] ?? null;
  }

  listAdapters(): string[] {
    return Object.keys(this.load().adapters);
  }

  /** Deep-copy an adapter for safe in-memory mutation workflows. */
  clone(adapter: LoRAAdapter): LoRAAdapter {
    return {
      ...adapter,
      A: deepCopyMatrix(adapter.A),
      B: deepCopyMatrix(adapter.B),
    };
  }

  /** Test-only helper. */
  reset(): void {
    this.persist({
      schemaVersion: 1,
      generated_at: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
      adapters: {},
    });
  }
}

export const wedmLoRAAdapterEngine = new WEDMLoRAAdapterEngine();
