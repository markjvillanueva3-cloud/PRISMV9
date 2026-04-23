/**
 * WEDMLoRAAdapterEngine — Rank-r Low-Rank Adaptation for WEDM physics models.
 *
 * MS-P4-DL-CORE / U-P4-DL-02
 *
 * Implements LoRA (Hu et al. 2021, "LoRA: Low-Rank Adaptation of Large Language
 * Models") as a correction layer on top of deterministic WEDM physics models
 * (Klocke Ra, Kunieda MRR, Carslaw–Jaeger recast). The base-model prediction is
 * preserved when the adapter scale (alpha/rank) is zero — all drift comes from
 * BA x * (alpha / rank).
 *
 * Mathematical form (per layer):
 *
 *     y = W0·x + (α / r) · B · A · x
 *
 * where W0 is frozen, A ∈ ℝ^(r×d_in), B ∈ ℝ^(d_out×r). Only A and B are trained.
 * r is the rank (4 per roadmap); α is the scaling constant (default 8, ratio
 * α/r = 2.0 per Hu 2021 §5.1).
 *
 * NUMERICAL CONTRACT (asserted by tests):
 *   1. Base-only output: scale=0  ⇒  y == W0·x bit-exact.
 *   2. Reference vector: with W0=I, A and B per Hu §4.1 Table 2 equiv, output
 *      matches the forward-pass reference within 1%.
 *   3. Gradient check: ∂L/∂A and ∂L/∂B match numerical autodiff within ±0.5%.
 *   4. Serialization: toJSON → fromJSON round-trip bit-exact.
 *
 * EWC coupling: the engine owns `fisherDiag()` which returns the per-parameter
 * Fisher-information diagonal (approximated by squared gradient accumulator).
 * WEDMEWCMemoryEngine consumes this directly.
 *
 * @module engines/WEDMLoRAAdapterEngine
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { log } from "../utils/Logger.js";

const DATA_ROOT = path.resolve(process.cwd(), "data/state");
const WEIGHTS_PATH = path.join(DATA_ROOT, "WEDM_LORA_WEIGHTS.json");

// ============================================================================
// TYPES
// ============================================================================

export interface LoRAConfig {
  name: string;           // e.g. "klocke-ra"
  rank: number;           // r — must be ≥1, roadmap fixes at 4
  alpha: number;          // α — scaling
  dIn: number;            // input dimension
  dOut: number;           // output dimension
  seed?: number;          // RNG seed for reproducible init
}

export interface LoRASerialized {
  schemaVersion: 1;
  config: LoRAConfig;
  A: number[][];          // [r][dIn]
  B: number[][];          // [dOut][r]
  /** Accumulated squared-gradient sum over training (Fisher diagonal). */
  fisherA: number[][];    // [r][dIn]
  fisherB: number[][];    // [dOut][r]
  /** Number of optimizer steps taken against this adapter. */
  steps: number;
}

export interface ForwardResult {
  y: number[];            // dOut
  basePart: number[];     // W0·x
  adapterPart: number[];  // (α/r)·B·A·x
}

export interface UpdateResult {
  lossDelta: number;
  gradNormA: number;
  gradNormB: number;
  stepsTotal: number;
}

// ============================================================================
// ENGINE
// ============================================================================

class WEDMLoRAAdapterEngine {
  private adapters = new Map<string, LoRAAdapter>();

  /**
   * Create (or reset) an adapter. Initialization follows Hu et al. 2021 §4.1:
   *   - A is drawn from N(0, σ²) with σ = 1/sqrt(dIn) (scaled Gaussian)
   *   - B is zero-initialized, so the adapter contribution is zero at step 0
   */
  create(config: LoRAConfig): LoRAAdapter {
    if (!Number.isFinite(config.rank) || config.rank < 1) {
      throw new Error(`WEDMLoRAAdapterEngine: rank must be ≥1, got ${config.rank}`);
    }
    if (!Number.isFinite(config.alpha) || config.alpha <= 0) {
      throw new Error(`WEDMLoRAAdapterEngine: alpha must be >0, got ${config.alpha}`);
    }
    if (!Number.isFinite(config.dIn) || config.dIn < 1) {
      throw new Error(`WEDMLoRAAdapterEngine: dIn must be ≥1, got ${config.dIn}`);
    }
    if (!Number.isFinite(config.dOut) || config.dOut < 1) {
      throw new Error(`WEDMLoRAAdapterEngine: dOut must be ≥1, got ${config.dOut}`);
    }

    const adapter = new LoRAAdapter(config);
    this.adapters.set(config.name, adapter);
    return adapter;
  }

  get(name: string): LoRAAdapter | null {
    return this.adapters.get(name) ?? null;
  }

  list(): string[] {
    return Array.from(this.adapters.keys());
  }

  /** Remove an adapter if it exists. Idempotent. */
  remove(name: string): boolean {
    return this.adapters.delete(name);
  }

  /**
   * Forward pass. Base matrix W0 must be provided by the caller (LoRA is
   * agnostic to the base model; the correction is additive).
   */
  forward(name: string, x: number[], W0: number[][]): ForwardResult {
    const adapter = this.require(name);
    return adapter.forward(x, W0);
  }

  /** Training step — SGD with optional learning rate. */
  step(
    name: string,
    x: number[],
    target: number[],
    W0: number[][],
    lr: number = 1e-2
  ): UpdateResult {
    const adapter = this.require(name);
    return adapter.step(x, target, W0, lr);
  }

  /** Set adapter scale. scale=0 freezes to base model (bit-exact). */
  setScale(name: string, scale: number): void {
    const adapter = this.require(name);
    adapter.scale = scale;
  }

  /** Return Fisher diagonal (squared-grad accumulator / steps). */
  fisherDiag(name: string): { A: number[][]; B: number[][]; steps: number } {
    const adapter = this.require(name);
    return adapter.fisherDiag();
  }

  // --------------------------------------------------------------------------
  // PERSISTENCE
  // --------------------------------------------------------------------------

  serialize(): Record<string, LoRASerialized> {
    const out: Record<string, LoRASerialized> = {};
    for (const [name, a] of this.adapters) out[name] = a.toJSON();
    return out;
  }

  hydrate(blob: Record<string, LoRASerialized>): void {
    this.adapters.clear();
    for (const [name, rec] of Object.entries(blob)) {
      this.adapters.set(name, LoRAAdapter.fromJSON(rec));
    }
  }

  save(): void {
    try {
      fs.mkdirSync(DATA_ROOT, { recursive: true });
      const blob = { schemaVersion: 1 as const, adapters: this.serialize() };
      fs.writeFileSync(WEIGHTS_PATH, JSON.stringify(blob, null, 2), "utf8");
    } catch (err: any) {
      log.warn(`[WEDMLoRAAdapterEngine] save failed: ${err?.message}`);
    }
  }

  load(): boolean {
    try {
      if (!fs.existsSync(WEIGHTS_PATH)) return false;
      const raw = fs.readFileSync(WEIGHTS_PATH, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed?.schemaVersion !== 1 || typeof parsed.adapters !== "object") return false;
      this.hydrate(parsed.adapters);
      return true;
    } catch (err: any) {
      log.warn(`[WEDMLoRAAdapterEngine] load failed: ${err?.message}`);
      return false;
    }
  }

  _resetForTests(): void {
    this.adapters.clear();
    try {
      if (fs.existsSync(WEIGHTS_PATH)) fs.unlinkSync(WEIGHTS_PATH);
    } catch { /* best effort */ }
  }

  private require(name: string): LoRAAdapter {
    const a = this.adapters.get(name);
    if (!a) throw new Error(`WEDMLoRAAdapterEngine: unknown adapter '${name}'`);
    return a;
  }
}

// ============================================================================
// ADAPTER
// ============================================================================

export class LoRAAdapter {
  readonly config: LoRAConfig;
  A: number[][];          // [r][dIn]
  B: number[][];          // [dOut][r]
  fisherA: number[][];    // squared-grad accumulator, [r][dIn]
  fisherB: number[][];    // squared-grad accumulator, [dOut][r]
  steps: number;
  /** α/r scale factor; setting scale=0 disables the adapter (bit-exact base). */
  scale: number;

  constructor(config: LoRAConfig) {
    this.config = config;
    this.scale = 1;
    const rng = mulberry32(config.seed ?? 42);
    const sigma = 1 / Math.sqrt(config.dIn);
    this.A = Array.from({ length: config.rank }, () =>
      Array.from({ length: config.dIn }, () => gaussian(rng) * sigma)
    );
    this.B = Array.from({ length: config.dOut }, () =>
      Array.from({ length: config.rank }, () => 0)
    );
    this.fisherA = Array.from({ length: config.rank }, () => Array(config.dIn).fill(0));
    this.fisherB = Array.from({ length: config.dOut }, () => Array(config.rank).fill(0));
    this.steps = 0;
  }

  /**
   * Compute y = W0·x + scale·(α/r)·B·A·x
   */
  forward(x: number[], W0: number[][]): ForwardResult {
    assertVec(x, this.config.dIn, "x");
    assertMat(W0, this.config.dOut, this.config.dIn, "W0");

    const basePart = matvec(W0, x);           // [dOut]
    const Ax = matvec(this.A, x);             // [r]
    const BAx = matvec(this.B, Ax);           // [dOut]
    const k = (this.config.alpha / this.config.rank) * this.scale;
    const adapterPart = BAx.map((v) => v * k);
    const y = basePart.map((bp, i) => bp + adapterPart[i]);
    return { y, basePart, adapterPart };
  }

  /**
   * SGD step minimizing MSE(y, target). Returns loss delta for diagnostics.
   *
   * Gradient derivations (Hu 2021 eq. (2)):
   *   L = 0.5 ||y − t||²
   *   ∂L/∂B = k · (y − t) · (Ax)ᵀ
   *   ∂L/∂A = k · Bᵀ · (y − t) · xᵀ
   */
  step(x: number[], target: number[], W0: number[][], lr: number): UpdateResult {
    assertVec(x, this.config.dIn, "x");
    assertVec(target, this.config.dOut, "target");
    assertMat(W0, this.config.dOut, this.config.dIn, "W0");

    const fwd = this.forward(x, W0);
    const err = fwd.y.map((v, i) => v - target[i]);  // [dOut]
    const lossBefore = 0.5 * err.reduce((s, v) => s + v * v, 0);

    const k = (this.config.alpha / this.config.rank) * this.scale;
    const Ax = matvec(this.A, x);                 // [r]

    // ∂L/∂B ∈ [dOut][r] = k · err · Axᵀ
    const gradB: number[][] = Array.from({ length: this.config.dOut }, (_, i) =>
      Array.from({ length: this.config.rank }, (_, j) => k * err[i] * Ax[j])
    );

    // ∂L/∂A ∈ [r][dIn] = k · Bᵀ·err · xᵀ
    const Btranspose_err: number[] = new Array(this.config.rank).fill(0);
    for (let j = 0; j < this.config.rank; j++) {
      let acc = 0;
      for (let i = 0; i < this.config.dOut; i++) acc += this.B[i][j] * err[i];
      Btranspose_err[j] = acc;
    }
    const gradA: number[][] = Array.from({ length: this.config.rank }, (_, j) =>
      Array.from({ length: this.config.dIn }, (_, d) => k * Btranspose_err[j] * x[d])
    );

    // SGD update
    for (let i = 0; i < this.config.dOut; i++) {
      for (let j = 0; j < this.config.rank; j++) {
        this.B[i][j] -= lr * gradB[i][j];
        this.fisherB[i][j] += gradB[i][j] * gradB[i][j];
      }
    }
    for (let j = 0; j < this.config.rank; j++) {
      for (let d = 0; d < this.config.dIn; d++) {
        this.A[j][d] -= lr * gradA[j][d];
        this.fisherA[j][d] += gradA[j][d] * gradA[j][d];
      }
    }
    this.steps += 1;

    const lossAfter = this.mseLoss(x, target, W0);
    return {
      lossDelta: lossAfter - lossBefore,
      gradNormA: matNorm(gradA),
      gradNormB: matNorm(gradB),
      stepsTotal: this.steps,
    };
  }

  mseLoss(x: number[], target: number[], W0: number[][]): number {
    const { y } = this.forward(x, W0);
    let s = 0;
    for (let i = 0; i < y.length; i++) s += (y[i] - target[i]) ** 2;
    return 0.5 * s;
  }

  fisherDiag(): { A: number[][]; B: number[][]; steps: number } {
    const denom = Math.max(1, this.steps);
    const fA = this.fisherA.map((row) => row.map((v) => v / denom));
    const fB = this.fisherB.map((row) => row.map((v) => v / denom));
    return { A: fA, B: fB, steps: this.steps };
  }

  toJSON(): LoRASerialized {
    return {
      schemaVersion: 1,
      config: { ...this.config },
      A: this.A.map((r) => r.slice()),
      B: this.B.map((r) => r.slice()),
      fisherA: this.fisherA.map((r) => r.slice()),
      fisherB: this.fisherB.map((r) => r.slice()),
      steps: this.steps,
    };
  }

  static fromJSON(rec: LoRASerialized): LoRAAdapter {
    if (rec.schemaVersion !== 1) {
      throw new Error(`LoRAAdapter.fromJSON: unsupported schemaVersion ${rec.schemaVersion}`);
    }
    const a = new LoRAAdapter(rec.config);
    a.A = rec.A.map((r) => r.slice());
    a.B = rec.B.map((r) => r.slice());
    a.fisherA = rec.fisherA.map((r) => r.slice());
    a.fisherB = rec.fisherB.map((r) => r.slice());
    a.steps = rec.steps;
    return a;
  }
}

// ============================================================================
// NUMERIC HELPERS
// ============================================================================

function matvec(M: number[][], v: number[]): number[] {
  const rows = M.length;
  const cols = v.length;
  const out = new Array<number>(rows);
  for (let i = 0; i < rows; i++) {
    let acc = 0;
    const row = M[i];
    if (row.length !== cols) {
      throw new Error(`matvec dim mismatch: row=${row.length}, v=${cols}`);
    }
    for (let j = 0; j < cols; j++) acc += row[j] * v[j];
    out[i] = acc;
  }
  return out;
}

function matNorm(M: number[][]): number {
  let s = 0;
  for (const row of M) for (const v of row) s += v * v;
  return Math.sqrt(s);
}

function assertVec(v: number[], dim: number, name: string): void {
  if (!Array.isArray(v) || v.length !== dim) {
    throw new Error(`LoRAAdapter: ${name} expected length ${dim}, got ${v?.length}`);
  }
  for (let i = 0; i < v.length; i++) {
    if (!Number.isFinite(v[i])) {
      throw new Error(`LoRAAdapter: ${name}[${i}] is not finite (got ${v[i]})`);
    }
  }
}

function assertMat(M: number[][], rows: number, cols: number, name: string): void {
  if (!Array.isArray(M) || M.length !== rows) {
    throw new Error(`LoRAAdapter: ${name} expected ${rows}×${cols}, got ${M?.length} rows`);
  }
  for (let i = 0; i < rows; i++) {
    if (!Array.isArray(M[i]) || M[i].length !== cols) {
      throw new Error(`LoRAAdapter: ${name}[${i}] expected ${cols} cols, got ${M[i]?.length}`);
    }
  }
}

/** mulberry32 — small deterministic PRNG for reproducible tests. */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller transform. */
function gaussian(rng: () => number): number {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export const wedmLoRAAdapterEngine = new WEDMLoRAAdapterEngine();
export { WEDMLoRAAdapterEngine };
