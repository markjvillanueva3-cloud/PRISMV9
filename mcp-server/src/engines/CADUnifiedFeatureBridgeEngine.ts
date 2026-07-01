/**
 * CADUnifiedFeatureBridgeEngine — CAD-DRAW-MAX-MS0/P1-U07
 *
 * Composes the three encoder tiers — NN01 (token+BRep+sketch), P1-U04
 * (per-op args), P1-U05 (position-aware pool) — into a single
 * UNIFIED_FEATURE_DIM vector that LP04 (and downstream heads) can
 * consume verbatim. This is the "promote φ" closure: today LP04's
 * value head v=θ·φ uses a 4-d φ; this bridge exposes a 33-d unified
 * feature vector that *future* LP04 heads can promote onto without
 * touching the already-committed 4-d formulas (forward compatible).
 *
 * **Strategy (risk-free promotion).** This engine does NOT modify LP04
 * or its tests. It produces the richer feature vector as a separate
 * output the AI can read via `cad_unified_feature_*` dispatcher
 * actions. When a follow-up unit (P2) upgrades LP04's φ, the *value*
 * side of the upgrade is one line: `featureVector(sample)` becomes
 * `bridge.encode(sample.opHistory, sample.brep, sample.sketch)`. The
 * 4-d existing formulas stay valid as a fallback for samples without
 * op history.
 *
 * **Layout (33-d total).**
 *   - [0..16]  — NN01.encodeFull (op-stream tokens + BRep + sketch, 17-d)
 *   - [17..24] — CADArgEncoder pooled (per-op args, 8-d)
 *   - [25..32] — CADSequencePool (NN01 per-token rows, default exp-decay, 8-d)
 *
 * The arg pool + token pool are intentionally *both* present: the AI
 * gains BOTH "what ops did I do" (NN01 tokens) AND "what magnitudes
 * did I use" (args) at the same point in time, which is what "draw
 * any part" requires.
 *
 * **Determinism.** Every tier is deterministic. Same input → same
 * 33-d vector across restarts, machines, and slots.
 *
 * Refs: CADFoundationEncoderEngine (NN01, U-CADC-NN01); CADArgEncoderEngine
 * (P1-U04); CADSequencePoolEngine (P1-U05);
 * MasterBrainBackpropPropagatorEngine (LP04, U-CADC-LP04).
 */

import { cadFoundationEncoderEngine, OP_EMBED_DIM, BREP_FEATURE_DIM, SKETCH_FEATURE_DIM } from "./CADFoundationEncoderEngine.js";
import { cadArgEncoderEngine, ARG_EMBED_DIM } from "./CADArgEncoderEngine.js";
import { cadSequencePoolEngine, type PoolStrategy } from "./CADSequencePoolEngine.js";
import type { CADOperation } from "../interfaces/ICADCodeGenerator.js";
import type { BRepSummary, SketchSummary } from "./CADFoundationEncoderEngine.js";

// ── Constants ────────────────────────────────────────────────────────────────

/** NN01 unified embedding dim (op + BRep + sketch). */
export const NN01_UNIFIED_DIM = OP_EMBED_DIM + BREP_FEATURE_DIM + SKETCH_FEATURE_DIM;
/** Total unified feature dim = NN01 + CADArg + Pool. */
export const UNIFIED_FEATURE_DIM = NN01_UNIFIED_DIM + ARG_EMBED_DIM + OP_EMBED_DIM;

// Layout offsets — exported so downstream heads can decode by slot
export const NN01_SLICE: readonly [number, number] = [0, NN01_UNIFIED_DIM];
export const ARG_SLICE: readonly [number, number] = [NN01_UNIFIED_DIM, NN01_UNIFIED_DIM + ARG_EMBED_DIM];
export const POOL_SLICE: readonly [number, number] = [NN01_UNIFIED_DIM + ARG_EMBED_DIM, UNIFIED_FEATURE_DIM];

// ── Types ────────────────────────────────────────────────────────────────────

export interface UnifiedFeatureInput {
  /** Op stream; may be empty for a fresh part. */
  ops?: ReadonlyArray<CADOperation>;
  /** BRep topology counts (optional). */
  brep?: BRepSummary;
  /** Sketch entity counts (optional). */
  sketch?: SketchSummary;
  /** Pool strategy for the per-token sequence pool slot (default: "exp-decay"). */
  poolStrategy?: PoolStrategy;
  /** Override exp-decay rate when poolStrategy="exp-decay". */
  alpha?: number;
}

export interface UnifiedFeatureResult {
  /** Concatenated 33-d feature vector. */
  feature: number[];
  /** Layout: which slot covers which dims. */
  layout: {
    nn01: { offset: number; dim: number };
    arg: { offset: number; dim: number };
    pool: { offset: number; dim: number };
  };
  /** Total dim — same as UNIFIED_FEATURE_DIM (sanity check). */
  dim: number;
  /** Number of ops in the source stream (0 for empty). */
  opCount: number;
  /** Pool strategy actually used. */
  poolStrategyUsed: PoolStrategy;
}

export interface BridgeStats {
  totalEncodings: number;
  totalEmptyOpStreams: number;
  byPoolStrategy: Record<PoolStrategy, number>;
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class CADUnifiedFeatureBridgeEngine {
  private totalEncodings = 0;
  private totalEmptyOpStreams = 0;
  private byPoolStrategy: Record<PoolStrategy, number> = {
    mean: 0, max: 0, last: 0, "exp-decay": 0, attention: 0,
  };

  encode(input: UnifiedFeatureInput = {}): UnifiedFeatureResult {
    this.totalEncodings++;
    const ops = input.ops ?? [];
    if (!Array.isArray(ops)) {
      throw new TypeError("encode: input.ops must be an array");
    }
    if (ops.length === 0) this.totalEmptyOpStreams++;

    const strategy: PoolStrategy = input.poolStrategy ?? "exp-decay";
    this.byPoolStrategy[strategy]++;

    // 1. NN01 unified (17-d)
    const nn01 = cadFoundationEncoderEngine.encodeFull({ ops, brep: input.brep, sketch: input.sketch });
    // 2. CADArg pooled (8-d)
    const argPooled = cadArgEncoderEngine.encodeOpArgsPooled(ops);
    // 3. Position-aware pool over NN01's PER-TOKEN op-stream embedding (8-d).
    //    We don't have per-token rows from encodeFull (mean-pooled there);
    //    so we mimic per-row tokens by encoding each single op and pooling.
    const perOpRows: number[][] = ops.map(op => {
      const r = cadFoundationEncoderEngine.encodeOperationStream([op]);
      return r.embedding; // mean-pool of one op = its own embedding (preserves dim)
    });
    const pooled = cadSequencePoolEngine.pool(perOpRows, {
      strategy,
      alpha: input.alpha,
      expectedDim: OP_EMBED_DIM,
    });

    const feature = [...nn01.embedding, ...argPooled, ...pooled];
    return {
      feature,
      layout: {
        nn01: { offset: NN01_SLICE[0], dim: NN01_UNIFIED_DIM },
        arg: { offset: ARG_SLICE[0], dim: ARG_EMBED_DIM },
        pool: { offset: POOL_SLICE[0], dim: OP_EMBED_DIM },
      },
      dim: UNIFIED_FEATURE_DIM,
      opCount: ops.length,
      poolStrategyUsed: strategy,
    };
  }

  /** Returns layout metadata only (for callers that want to allocate before encoding). */
  getLayout(): UnifiedFeatureResult["layout"] & { totalDim: number } {
    return {
      nn01: { offset: NN01_SLICE[0], dim: NN01_UNIFIED_DIM },
      arg: { offset: ARG_SLICE[0], dim: ARG_EMBED_DIM },
      pool: { offset: POOL_SLICE[0], dim: OP_EMBED_DIM },
      totalDim: UNIFIED_FEATURE_DIM,
    };
  }

  getStats(): BridgeStats {
    return {
      totalEncodings: this.totalEncodings,
      totalEmptyOpStreams: this.totalEmptyOpStreams,
      byPoolStrategy: { ...this.byPoolStrategy },
    };
  }

  _resetForTests(): void {
    this.totalEncodings = 0;
    this.totalEmptyOpStreams = 0;
    this.byPoolStrategy = { mean: 0, max: 0, last: 0, "exp-decay": 0, attention: 0 };
  }
}

export const cadUnifiedFeatureBridgeEngine = new CADUnifiedFeatureBridgeEngine();
