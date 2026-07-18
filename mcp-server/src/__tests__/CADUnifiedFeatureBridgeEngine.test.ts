/**
 * CADUnifiedFeatureBridgeEngine — vitest suite (CAD-DRAW-MAX-MS0/P1-U07).
 *
 * Closed-form assertions on the 33-d composed feature vector:
 *   - dim invariants (17+8+8=33; slice contiguity)
 *   - layout slot offsets match exported constants
 *   - empty input → correct dim + counter increments
 *   - determinism across repeated calls
 *   - pool strategy affects only the pool slot, not NN01 / Arg slots
 *   - R12 fail-loud on non-array ops
 *   - stats by-strategy bucketing
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CADUnifiedFeatureBridgeEngine,
  NN01_UNIFIED_DIM,
  UNIFIED_FEATURE_DIM,
  NN01_SLICE,
  ARG_SLICE,
  POOL_SLICE,
} from "../engines/CADUnifiedFeatureBridgeEngine.js";
import { OP_EMBED_DIM, BREP_FEATURE_DIM, SKETCH_FEATURE_DIM } from "../engines/CADFoundationEncoderEngine.js";
import { ARG_EMBED_DIM } from "../engines/CADArgEncoderEngine.js";
import type { CADOperation } from "../interfaces/ICADCodeGenerator.js";

describe("CADUnifiedFeatureBridgeEngine — P1-U07", () => {
  let eng: CADUnifiedFeatureBridgeEngine;
  beforeEach(() => {
    eng = new CADUnifiedFeatureBridgeEngine();
  });

  it("UNIFIED_FEATURE_DIM = NN01 (17) + ARG (8) + POOL (8) = 33", () => {
    expect(NN01_UNIFIED_DIM).toBe(OP_EMBED_DIM + BREP_FEATURE_DIM + SKETCH_FEATURE_DIM);
    expect(NN01_UNIFIED_DIM).toBe(17);
    expect(ARG_EMBED_DIM).toBe(8);
    expect(OP_EMBED_DIM).toBe(8);
    expect(UNIFIED_FEATURE_DIM).toBe(33);
  });

  it("layout slices are contiguous + cover the full dim with no overlap", () => {
    expect(NN01_SLICE[0]).toBe(0);
    expect(NN01_SLICE[1]).toBe(NN01_UNIFIED_DIM); // 17
    expect(ARG_SLICE[0]).toBe(NN01_SLICE[1]);     // 17
    expect(ARG_SLICE[1]).toBe(NN01_UNIFIED_DIM + ARG_EMBED_DIM); // 25
    expect(POOL_SLICE[0]).toBe(ARG_SLICE[1]);     // 25
    expect(POOL_SLICE[1]).toBe(UNIFIED_FEATURE_DIM); // 33
  });

  it("empty input → feature length 33; opCount=0; totalEmptyOpStreams++", () => {
    const r = eng.encode();
    expect(r.feature).toHaveLength(33);
    expect(r.opCount).toBe(0);
    expect(r.dim).toBe(33);
    expect(eng.getStats().totalEmptyOpStreams).toBe(1);
  });

  it("non-empty op stream produces 33-d feature; nonzero somewhere in the vector", () => {
    const ops: CADOperation[] = [
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "feature_extrude", args: { distance: 10, operation: "new_body" } },
    ];
    const r = eng.encode({ ops });
    expect(r.feature).toHaveLength(33);
    expect(r.opCount).toBe(2);
    expect(r.feature.some(v => v !== 0)).toBe(true);
  });

  it("determinism: same input → identical 33-d vector across repeated calls", () => {
    const ops: CADOperation[] = [
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "feature_extrude", args: { distance: 5 } },
    ];
    const a = eng.encode({ ops });
    const b = eng.encode({ ops });
    expect(a.feature).toEqual(b.feature);
  });

  it("BRep input affects only NN01 slice (dims 0..16); arg + pool slots unchanged", () => {
    const ops: CADOperation[] = [{ kind: "feature_extrude", args: { distance: 5 } }];
    const noBrep = eng.encode({ ops });
    const withBrep = eng.encode({ ops, brep: { vertexCount: 100, edgeCount: 200, faceCount: 50 } });
    // NN01 slice differs (BRep features change)
    expect(noBrep.feature.slice(0, NN01_UNIFIED_DIM)).not.toEqual(withBrep.feature.slice(0, NN01_UNIFIED_DIM));
    // Arg slice IDENTICAL (no arg dependence on BRep)
    expect(noBrep.feature.slice(ARG_SLICE[0], ARG_SLICE[1])).toEqual(withBrep.feature.slice(ARG_SLICE[0], ARG_SLICE[1]));
    // Pool slice IDENTICAL (token sequence unchanged)
    expect(noBrep.feature.slice(POOL_SLICE[0], POOL_SLICE[1])).toEqual(withBrep.feature.slice(POOL_SLICE[0], POOL_SLICE[1]));
  });

  it("pool strategy affects only the pool slot, not NN01 / Arg slots", () => {
    const ops: CADOperation[] = [
      { kind: "sketch_create", args: {} },
      { kind: "feature_extrude", args: { distance: 5 } },
      { kind: "feature_fillet", args: { radius: 1 } },
    ];
    const mean = eng.encode({ ops, poolStrategy: "mean" });
    const last = eng.encode({ ops, poolStrategy: "last" });
    // Pool slot differs
    expect(mean.feature.slice(POOL_SLICE[0])).not.toEqual(last.feature.slice(POOL_SLICE[0]));
    // NN01 + Arg slots identical
    expect(mean.feature.slice(0, POOL_SLICE[0])).toEqual(last.feature.slice(0, POOL_SLICE[0]));
    expect(mean.poolStrategyUsed).toBe("mean");
    expect(last.poolStrategyUsed).toBe("last");
  });

  it("default pool strategy is exp-decay (matches CADSequencePoolEngine default)", () => {
    const ops: CADOperation[] = [{ kind: "feature_extrude", args: { distance: 1 } }];
    const def = eng.encode({ ops });
    const expDecay = eng.encode({ ops, poolStrategy: "exp-decay" });
    expect(def.feature).toEqual(expDecay.feature);
    expect(def.poolStrategyUsed).toBe("exp-decay");
  });

  it("R12 fail-loud: non-array ops throws TypeError", () => {
    expect(() => eng.encode({ ops: "not-an-array" as never })).toThrow(TypeError);
  });

  it("getLayout returns the slot offsets + totalDim=33 (no encode needed)", () => {
    const layout = eng.getLayout();
    expect(layout.nn01.offset).toBe(0);
    expect(layout.nn01.dim).toBe(17);
    expect(layout.arg.offset).toBe(17);
    expect(layout.arg.dim).toBe(8);
    expect(layout.pool.offset).toBe(25);
    expect(layout.pool.dim).toBe(8);
    expect(layout.totalDim).toBe(33);
  });

  it("getStats: by-strategy bucket increments per encode call", () => {
    const ops: CADOperation[] = [{ kind: "feature_extrude", args: {} }];
    eng.encode({ ops, poolStrategy: "mean" });
    eng.encode({ ops, poolStrategy: "mean" });
    eng.encode({ ops, poolStrategy: "max" });
    eng.encode({ ops }); // default exp-decay
    const s = eng.getStats();
    expect(s.totalEncodings).toBe(4);
    expect(s.byPoolStrategy.mean).toBe(2);
    expect(s.byPoolStrategy.max).toBe(1);
    expect(s.byPoolStrategy["exp-decay"]).toBe(1);
    expect(s.byPoolStrategy.last).toBe(0);
    expect(s.byPoolStrategy.attention).toBe(0);
    expect(s.totalEmptyOpStreams).toBe(0);
  });

  it("layout in encode result matches getLayout (single source of truth)", () => {
    const r = eng.encode({ ops: [{ kind: "sketch_create", args: {} }] });
    const layout = eng.getLayout();
    expect(r.layout.nn01.offset).toBe(layout.nn01.offset);
    expect(r.layout.nn01.dim).toBe(layout.nn01.dim);
    expect(r.layout.arg.offset).toBe(layout.arg.offset);
    expect(r.layout.arg.dim).toBe(layout.arg.dim);
    expect(r.layout.pool.offset).toBe(layout.pool.offset);
    expect(r.layout.pool.dim).toBe(layout.pool.dim);
    expect(r.dim).toBe(layout.totalDim);
  });

  it("op stream of length 1: pool slot == that op's NN01 embedding (any-strategy on N=1)", () => {
    const ops: CADOperation[] = [{ kind: "sketch_create", args: { plane: "XY" } }];
    const r = eng.encode({ ops, poolStrategy: "mean" });
    // For N=1, all strategies reduce to the single row → equals NN01 op-embedding slice [0..8)
    const poolSlot = r.feature.slice(POOL_SLICE[0], POOL_SLICE[1]);
    const nn01OpSlot = r.feature.slice(0, OP_EMBED_DIM);
    for (let d = 0; d < OP_EMBED_DIM; d++) expect(poolSlot[d]).toBeCloseTo(nn01OpSlot[d], 10);
  });
});
