/**
 * CrossProcessTimeSeriesTabularFusionEngine — XPROC-NEURAL Tier 10 (T10-02)
 *
 * Gated Multimodal Unit (GMU) fusion of a time-series embedding and tabular
 * features. Per Arevalo, Solorio, Montes-y-Gómez, González 2017 "Gated
 * Multimodal Units for Information Fusion" §3 (eqs. 1-4).
 *
 * ## Why GMU vs T10-01 concat-project
 *
 * T10-01 VisionTabularFusion uses ONE projection over the concatenated input
 * — fine when both modalities are similarly informative across the whole
 * dataset (vision is the dominant signal for blueprint-rich tasks).
 *
 * Time-series + tabular is different: per-sample, the two modalities can be
 * differentially informative. For a steady-state cut, the tabular feed/speed
 * record fully determines the load — the time-series sensor stream adds
 * noise. For a chatter event, the time-series carries the entire signal —
 * the tabular record looks identical to a healthy cut. A FIXED weighting
 * cannot capture both regimes; a GATE that learns to switch per-element
 * does.
 *
 * GMU (Arevalo 2017 §3, eqs. 1-4):
 *   h_ts  = tanh(W_ts  · timeSeriesEmbedding)        ∈ ℝ^d
 *   h_tab = tanh(W_tab · tabularFeatures)            ∈ ℝ^d
 *   z     = σ(W_z · [timeSeriesEmbedding || tabularFeatures])  ∈ ℝ^d
 *   out   = z ⊙ h_ts + (1 - z) ⊙ h_tab               ∈ ℝ^d
 *
 * Each output dimension picks its own mix of the two modalities, learned
 * end-to-end. When z[k] ≈ 1 the k-th output channel reads time-series only;
 * z[k] ≈ 0 reads tabular only; intermediate values blend.
 *
 * ## Why also segment()
 *
 * Pure-aggregator pattern means this engine does NOT contain a 1D-CNN. The
 * caller supplies a pre-computed embedding from whatever encoder they like
 * (1D-CNN, TCN, Transformer). But raw spindle/audio/force traces don't
 * arrive as embeddings — they arrive as scalar streams. `segment()` is the
 * single piece of pre-encoder plumbing every caller needs: chop the raw
 * stream into fixed windows with stride, optionally z-score per window.
 *
 *   segment(x ∈ ℝ^N, windowSize W, stride S) → matrix ∈ ℝ^{n × W}
 *   where n = ⌊(N - W) / S⌋ + 1
 *
 * This is the same windowing scheme used in Wen et al. 2021 "Time Series
 * Data Augmentation for Deep Learning" §2 and the standard input pipeline
 * for sktime / tslearn. Z-score normalization (Brockwell & Davis 2002 §1.5)
 * makes the windows scale-invariant — necessary because spindle current
 * (~10A) and acoustic emission (~µV) live on radically different scales.
 *
 * ## Why caller supplies W_ts, W_tab, W_z, b_z
 *
 * Pure-aggregator pattern: this engine doesn't TRAIN the GMU weights.
 * Caller (T1-02 NeuralLearningEngine, or any external trainer) owns the
 * three projection matrices and the gate bias. The engine just performs
 * the forward pass + gate-statistics extraction. Same composability
 * principle as T6/T7/T10-01/T10-04.
 *
 * ## Acceptance (XPROC-NEURAL-ROADMAP.md Tier 10 R2)
 *
 *   "Time-series fusion enables ≥10% better predictions on chatter,
 *   tool wear, and surface anomaly tasks vs tabular-only baseline."
 *
 * Verified by simulation in test suite: synthetic chatter detection where
 * the chatter signature lives entirely in the time-series amplitude
 * variance; tabular cut params are identical for healthy and chatter
 * samples. Gated fusion learns z ≈ 1 on the chatter channel and beats the
 * tabular-only baseline by >10% L2.
 *
 * ## Failure modes covered
 *
 *   1. Empty timeSeriesEmbedding or tabularFeatures   → invalid_input
 *   2. NaN/Inf in any input                           → invalid_input (Zod)
 *   3. W_ts rows != fusionDim                         → invalid_input
 *   4. W_tab rows != fusionDim                        → invalid_input
 *   5. W_z rows != fusionDim or cols != tsDim+tabDim  → invalid_input
 *   6. Bias length != fusionDim                       → invalid_input
 *   7. segment(): windowSize > N or stride <= 0       → invalid_input
 *
 * @module CrossProcessTimeSeriesTabularFusionEngine
 */

import { z } from "zod";

// ============================================================================
// Constants
// ============================================================================

const MAX_TS_DIM = 4096;
const MAX_TAB_DIM = 256;
const MAX_FUSION_DIM = 1024;
const MAX_RAW_LENGTH = 1_000_000;
const MAX_WINDOW_SIZE = 16_384;
const SOFTMAX_EPS = 1e-30;

// ============================================================================
// Schemas
// ============================================================================

const FuseInputSchema = z.object({
  /** Pre-computed time-series embedding from external encoder (1D-CNN/TCN/Transformer). */
  timeSeriesEmbedding: z.array(z.number().finite()).min(1).max(MAX_TS_DIM),
  /** Tabular cut features (feed/speed/depth/material/etc). */
  tabularFeatures: z.array(z.number().finite()).min(1).max(MAX_TAB_DIM),
  /** d × tsDim time-series projection W_ts. */
  wTimeSeries: z.array(z.array(z.number().finite()).min(1).max(MAX_TS_DIM))
    .min(1).max(MAX_FUSION_DIM),
  /** d × tabDim tabular projection W_tab. */
  wTabular: z.array(z.array(z.number().finite()).min(1).max(MAX_TAB_DIM))
    .min(1).max(MAX_FUSION_DIM),
  /** d × (tsDim+tabDim) gate projection W_z. */
  wGate: z.array(z.array(z.number().finite()).min(1).max(MAX_TS_DIM + MAX_TAB_DIM))
    .min(1).max(MAX_FUSION_DIM),
  /** d gate bias b_z. */
  biasGate: z.array(z.number().finite()).min(1).max(MAX_FUSION_DIM),
});

const SegmentInputSchema = z.object({
  /** Raw 1-D signal (spindle current, force, acoustic emission, etc). */
  signal: z.array(z.number().finite()).min(1).max(MAX_RAW_LENGTH),
  /** Window size (samples). */
  windowSize: z.number().int().positive().max(MAX_WINDOW_SIZE),
  /** Stride between consecutive windows (samples). */
  stride: z.number().int().positive().max(MAX_WINDOW_SIZE),
  /** Per-window z-score normalization. Default true. */
  zscore: z.boolean().default(true),
});

// ============================================================================
// Public types
// ============================================================================

export interface FuseOk {
  ok: true;
  /** d-dim fused output. */
  fusedEmbedding: number[];
  /** Per-output-dim gate value z[k] ∈ [0,1]. z[k]=1 → pure time-series. */
  gate: number[];
  /** Mean gate value (modality balance summary). 0=tabular, 1=ts. */
  gateMean: number;
  /** Pre-gate time-series projection h_ts. */
  hTimeSeries: number[];
  /** Pre-gate tabular projection h_tab. */
  hTabular: number[];
  warnings: string[];
}

export interface SegmentOk {
  ok: true;
  /** [n_windows × windowSize] matrix of windows. */
  windows: number[][];
  /** Number of windows produced. */
  windowCount: number;
  /** Effective coverage: (n-1)*stride + windowSize. */
  coverage: number;
  /** Per-window mean (raw, before z-score). */
  windowMeans: number[];
  /** Per-window std (raw, before z-score). */
  windowStds: number[];
  warnings: string[];
}

export interface OpErr {
  ok: false;
  error: "invalid_input" | "invalid_state";
  message: string;
}

export type FuseResult = FuseOk | OpErr;
export type SegmentResult = SegmentOk | OpErr;

// ============================================================================
// Helpers
// ============================================================================

function sigmoid(x: number): number {
  // Numerically stable sigmoid for both signs.
  if (x >= 0) {
    const e = Math.exp(-x);
    return 1 / (1 + e);
  }
  const e = Math.exp(x);
  return e / (1 + e);
}

function matVec(W: number[][], x: number[]): number[] {
  const rows = W.length;
  const cols = x.length;
  const out = new Array<number>(rows);
  for (let i = 0; i < rows; i++) {
    let s = 0;
    const Wi = W[i];
    for (let j = 0; j < cols; j++) s += Wi[j] * x[j];
    out[i] = s;
  }
  return out;
}

// ============================================================================
// Public API
// ============================================================================

export class CrossProcessTimeSeriesTabularFusionEngine {
  static readonly tier = "T10-02";

  /**
   * GMU forward pass.
   *
   *   h_ts  = tanh(W_ts  · ts)
   *   h_tab = tanh(W_tab · tab)
   *   z     = σ(W_z · [ts || tab] + b_z)
   *   out   = z ⊙ h_ts + (1-z) ⊙ h_tab
   */
  static fuse(input: unknown): FuseResult {
    const parsed = FuseInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false, error: "invalid_input",
        message: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const {
      timeSeriesEmbedding, tabularFeatures,
      wTimeSeries, wTabular, wGate, biasGate,
    } = parsed.data;

    const dTs = timeSeriesEmbedding.length;
    const dTab = tabularFeatures.length;
    const dFusion = wTimeSeries.length;
    const dConcat = dTs + dTab;

    // Shape checks (post-Zod row-array structure).
    if (wTabular.length !== dFusion) {
      return {
        ok: false, error: "invalid_input",
        message: `wTabular rows ${wTabular.length} != fusion dim ${dFusion}`,
      };
    }
    if (wGate.length !== dFusion) {
      return {
        ok: false, error: "invalid_input",
        message: `wGate rows ${wGate.length} != fusion dim ${dFusion}`,
      };
    }
    if (biasGate.length !== dFusion) {
      return {
        ok: false, error: "invalid_input",
        message: `biasGate length ${biasGate.length} != fusion dim ${dFusion}`,
      };
    }
    for (let i = 0; i < dFusion; i++) {
      if (wTimeSeries[i].length !== dTs) {
        return {
          ok: false, error: "invalid_input",
          message: `wTimeSeries[${i}] cols=${wTimeSeries[i].length} != tsDim=${dTs}`,
        };
      }
      if (wTabular[i].length !== dTab) {
        return {
          ok: false, error: "invalid_input",
          message: `wTabular[${i}] cols=${wTabular[i].length} != tabDim=${dTab}`,
        };
      }
      if (wGate[i].length !== dConcat) {
        return {
          ok: false, error: "invalid_input",
          message: `wGate[${i}] cols=${wGate[i].length} != tsDim+tabDim=${dConcat}`,
        };
      }
    }

    // h_ts = tanh(W_ts · ts), h_tab = tanh(W_tab · tab)
    const preTs = matVec(wTimeSeries, timeSeriesEmbedding);
    const preTab = matVec(wTabular, tabularFeatures);
    const hTs = preTs.map(Math.tanh);
    const hTab = preTab.map(Math.tanh);

    // z = σ(W_z · [ts || tab] + b_z)
    const concat = new Array<number>(dConcat);
    for (let i = 0; i < dTs; i++) concat[i] = timeSeriesEmbedding[i];
    for (let i = 0; i < dTab; i++) concat[dTs + i] = tabularFeatures[i];
    const preGate = matVec(wGate, concat);
    const gate = new Array<number>(dFusion);
    let gateSum = 0;
    for (let i = 0; i < dFusion; i++) {
      gate[i] = sigmoid(preGate[i] + biasGate[i]);
      gateSum += gate[i];
    }

    // out = z ⊙ h_ts + (1-z) ⊙ h_tab
    const fused = new Array<number>(dFusion);
    for (let i = 0; i < dFusion; i++) {
      fused[i] = gate[i] * hTs[i] + (1 - gate[i]) * hTab[i];
    }

    return {
      ok: true,
      fusedEmbedding: fused,
      gate,
      gateMean: gateSum / dFusion,
      hTimeSeries: hTs,
      hTabular: hTab,
      warnings: [],
    };
  }

  /**
   * Window a raw 1-D signal into fixed-size windows with stride.
   * Per-window z-score by default (scale invariance across sensor channels).
   */
  static segment(input: unknown): SegmentResult {
    const parsed = SegmentInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false, error: "invalid_input",
        message: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const { signal, windowSize, stride, zscore } = parsed.data;
    const N = signal.length;
    if (windowSize > N) {
      return {
        ok: false, error: "invalid_input",
        message: `windowSize ${windowSize} > signal length ${N}`,
      };
    }
    const nWindows = Math.floor((N - windowSize) / stride) + 1;
    const windows: number[][] = new Array(nWindows);
    const means = new Array<number>(nWindows);
    const stds = new Array<number>(nWindows);
    for (let i = 0; i < nWindows; i++) {
      const start = i * stride;
      const w = new Array<number>(windowSize);
      let sum = 0;
      for (let j = 0; j < windowSize; j++) {
        w[j] = signal[start + j];
        sum += w[j];
      }
      const mean = sum / windowSize;
      let varSum = 0;
      for (let j = 0; j < windowSize; j++) {
        const d = w[j] - mean;
        varSum += d * d;
      }
      const std = Math.sqrt(varSum / windowSize);
      means[i] = mean;
      stds[i] = std;
      if (zscore) {
        const denom = std > SOFTMAX_EPS ? std : 1; // avoid div-by-zero on flat windows
        for (let j = 0; j < windowSize; j++) w[j] = (w[j] - mean) / denom;
      }
      windows[i] = w;
    }
    return {
      ok: true,
      windows,
      windowCount: nWindows,
      coverage: (nWindows - 1) * stride + windowSize,
      windowMeans: means,
      windowStds: stds,
      warnings: [],
    };
  }

  /** Read-only constants snapshot. */
  static constants(): {
    MAX_TS_DIM: number;
    MAX_TAB_DIM: number;
    MAX_FUSION_DIM: number;
    MAX_RAW_LENGTH: number;
    MAX_WINDOW_SIZE: number;
  } {
    return { MAX_TS_DIM, MAX_TAB_DIM, MAX_FUSION_DIM, MAX_RAW_LENGTH, MAX_WINDOW_SIZE };
  }
}

export const crossProcessTimeSeriesTabularFusionEngine
  = CrossProcessTimeSeriesTabularFusionEngine;

/** Dispatcher convenience wrapper. */
export function crossProcessTimeSeriesTabularFusion(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "xproc_timeseries_fuse":
      return CrossProcessTimeSeriesTabularFusionEngine.fuse(params);
    case "xproc_timeseries_segment":
      return CrossProcessTimeSeriesTabularFusionEngine.segment(params);
    case "xproc_timeseries_constants":
      return CrossProcessTimeSeriesTabularFusionEngine.constants();
    default:
      throw new Error(`crossProcessTimeSeriesTabularFusion: unknown action '${action}'`);
  }
}
