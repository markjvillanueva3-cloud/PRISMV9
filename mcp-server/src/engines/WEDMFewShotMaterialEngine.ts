/**
 * WEDMFewShotMaterialEngine — Few-shot LoRA bootstrap for new WEDM materials.
 *
 * MS-P4-DL-CORE / U-P4-DL-04
 *
 * Distinct from WEDMFewShotEngine (spark-signature k-NN blending, P3-MS2):
 * this engine bootstraps a rank-r LoRA adapter from 3–5 labelled jobs in a
 * previously unseen material, then serves corrected Ra predictions for the
 * next job. Degrades gracefully to the base model when <2 samples exist.
 *
 * Protocol:
 *   1. Collect ≥1 labelled samples for the new material (feature_vec, target).
 *   2. Call `bootstrap(material, samples, baseForward)`.
 *   3. Engine fits a rank-r LoRA (default r=4, α=8) over `nEpochs` passes.
 *   4. Returns {adapter, mae, baselineMae, improvementPct}.
 *   5. `predict(material, x, baseForward)` uses the bootstrapped adapter; or
 *      base model if no adapter fit exists (degenerate fallback).
 *
 * Improvement target (EXIT U-P4-DL-04 #1):
 *   3-job bootstrap on a stale material must improve Ra MAE by ≥20% vs
 *   the base model. If `baselineMae == 0`, there is no room to improve and
 *   the engine reports `improvementPct: 0` without error.
 *
 * Coupling:
 *   - `wedmLoRAAdapterEngine` owns the adapter math.
 *   - `wedmEWCMemoryEngine` consolidates the adapter after a successful
 *     bootstrap if `consolidate: true`.
 *   - Base model is injected as a `BaseForward` callback, so this engine
 *     stays agnostic to whether the base is Klocke Ra, Kunieda MRR, etc.
 *
 * @module engines/WEDMFewShotMaterialEngine
 */

import { log } from "../utils/Logger.js";
import {
  wedmLoRAAdapterEngine,
  type LoRAAdapter,
  type LoRAConfig,
} from "./WEDMLoRAAdapterEngine.js";
import { wedmEWCMemoryEngine } from "./WEDMEWCMemoryEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type BaseForward = (x: number[]) => number[];

export interface FewShotSample {
  /** Feature vector, length = dIn. */
  x: number[];
  /** Target vector, length = dOut. */
  target: number[];
  /** Optional weight (defaults to 1). */
  weight?: number;
}

export interface FewShotBootstrapOptions {
  dIn: number;
  dOut: number;
  rank?: number;         // default 4
  alpha?: number;        // default 8
  lr?: number;           // default 5e-2
  nEpochs?: number;      // default 50
  seed?: number;         // default deterministic
  /** Consolidate into EWC memory after fit. */
  consolidate?: boolean;
}

export interface FewShotBootstrapResult {
  material: string;
  accepted: boolean;
  reason?: string;
  nSamples: number;
  baselineMae: number;
  adaptedMae: number;
  improvementPct: number;
  adapterName: string;
  epochs: number;
  finalLoss: number;
}

export interface FewShotPredictResult {
  y: number[];
  source: "lora-adapter" | "base-only";
  adapterName?: string;
}

// ============================================================================
// ENGINE
// ============================================================================

class WEDMFewShotMaterialEngine {
  private registry = new Map<string, { adapter: LoRAAdapter; W0: number[][]; opts: FewShotBootstrapOptions }>();

  /**
   * Bootstrap a LoRA adapter from ≤5 samples in a new material.
   */
  bootstrap(
    material: string,
    samples: FewShotSample[],
    baseForward: BaseForward,
    opts: FewShotBootstrapOptions
  ): FewShotBootstrapResult {
    if (!material || typeof material !== "string") {
      throw new Error("WEDMFewShotMaterialEngine.bootstrap: material must be a non-empty string");
    }
    if (!Number.isFinite(opts.dIn) || opts.dIn < 1) {
      throw new Error(`WEDMFewShotMaterialEngine: dIn must be ≥1 (got ${opts.dIn})`);
    }
    if (!Number.isFinite(opts.dOut) || opts.dOut < 1) {
      throw new Error(`WEDMFewShotMaterialEngine: dOut must be ≥1 (got ${opts.dOut})`);
    }

    const cleanSamples = samples.filter(
      (s) => Array.isArray(s.x) && Array.isArray(s.target)
        && s.x.length === opts.dIn && s.target.length === opts.dOut
        && s.x.every(Number.isFinite) && s.target.every(Number.isFinite)
    );
    if (cleanSamples.length < 2) {
      // Degenerate: not enough to fit — return base-only fallback signal.
      return {
        material,
        accepted: false,
        reason: cleanSamples.length === 0
          ? "no valid samples"
          : "insufficient samples (<2); falling back to base model",
        nSamples: cleanSamples.length,
        baselineMae: cleanSamples.length === 1 ? this.sampleMae(baseForward, cleanSamples) : 0,
        adaptedMae: 0,
        improvementPct: 0,
        adapterName: "",
        epochs: 0,
        finalLoss: 0,
      };
    }

    // Baseline MAE (base model only).
    const baselineMae = this.sampleMae(baseForward, cleanSamples);

    // Synthesize W0 as a constant base that reproduces baseForward outputs when
    // applied linearly. Since baseForward may be non-linear, we take the
    // residual target = real_target − baseForward(x) and train LoRA on residuals
    // with W0 = 0. At inference we re-add baseForward(x).
    const W0 = Array.from({ length: opts.dOut }, () => new Array<number>(opts.dIn).fill(0));

    const config: LoRAConfig = {
      name: `fewshot::${material}`,
      rank: opts.rank ?? 4,
      alpha: opts.alpha ?? 8,
      dIn: opts.dIn,
      dOut: opts.dOut,
      seed: Number.isFinite(opts.seed as number) ? (opts.seed as number) : hashSeed(material),
    };
    wedmLoRAAdapterEngine.remove(config.name);
    const adapter = wedmLoRAAdapterEngine.create(config);

    const lr = opts.lr ?? 5e-2;
    const epochs = Math.max(1, Math.floor(opts.nEpochs ?? 50));
    let finalLoss = 0;

    for (let e = 0; e < epochs; e++) {
      let epochLoss = 0;
      for (const s of cleanSamples) {
        const base = baseForward(s.x);
        const residualTarget = s.target.map((t, i) => t - base[i]);
        const step = adapter.step(s.x, residualTarget, W0, lr);
        epochLoss += step.lossDelta;
      }
      finalLoss = epochLoss;
    }

    this.registry.set(material, { adapter, W0, opts });

    const adaptedMae = this.adaptedMae(baseForward, adapter, W0, cleanSamples);
    const improvementPct = baselineMae === 0 ? 0 : ((baselineMae - adaptedMae) / baselineMae) * 100;

    if (opts.consolidate) {
      try {
        wedmEWCMemoryEngine.consolidate(adapter, `fewshot::${material}`, { preset: "wedm-default" });
      } catch (err: any) {
        log.warn(`[WEDMFewShotMaterialEngine] EWC consolidation failed: ${err?.message}`);
      }
    }

    return {
      material,
      accepted: true,
      nSamples: cleanSamples.length,
      baselineMae,
      adaptedMae,
      improvementPct,
      adapterName: config.name,
      epochs,
      finalLoss,
    };
  }

  predict(material: string, x: number[], baseForward: BaseForward): FewShotPredictResult {
    const entry = this.registry.get(material);
    if (!entry) {
      return { y: baseForward(x), source: "base-only" };
    }
    const base = baseForward(x);
    const fwd = entry.adapter.forward(x, entry.W0);
    // Because W0=0, fwd.basePart is zero; adapterPart carries the LoRA residual.
    const y = base.map((b, i) => b + fwd.adapterPart[i]);
    return { y, source: "lora-adapter", adapterName: entry.adapter.config.name };
  }

  hasAdapter(material: string): boolean {
    return this.registry.has(material);
  }

  listMaterials(): string[] {
    return Array.from(this.registry.keys());
  }

  _resetForTests(): void {
    this.registry.clear();
  }

  // --------------------------------------------------------------------------
  // METRICS
  // --------------------------------------------------------------------------

  private sampleMae(baseForward: BaseForward, samples: FewShotSample[]): number {
    if (samples.length === 0) return 0;
    let acc = 0;
    let n = 0;
    for (const s of samples) {
      const y = baseForward(s.x);
      for (let i = 0; i < y.length; i++) {
        acc += Math.abs(y[i] - s.target[i]);
        n += 1;
      }
    }
    return n === 0 ? 0 : acc / n;
  }

  private adaptedMae(
    baseForward: BaseForward,
    adapter: LoRAAdapter,
    W0: number[][],
    samples: FewShotSample[]
  ): number {
    if (samples.length === 0) return 0;
    let acc = 0;
    let n = 0;
    for (const s of samples) {
      const base = baseForward(s.x);
      const fwd = adapter.forward(s.x, W0);
      for (let i = 0; i < base.length; i++) {
        const y = base[i] + fwd.adapterPart[i];
        acc += Math.abs(y - s.target[i]);
        n += 1;
      }
    }
    return n === 0 ? 0 : acc / n;
  }
}

function hashSeed(s: string): number {
  let h = 5381 | 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) | 0 || 1;
}

export const wedmFewShotMaterialEngine = new WEDMFewShotMaterialEngine();
export { WEDMFewShotMaterialEngine };
