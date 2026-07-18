/**
 * MasterBrainBackpropPropagatorEngine — U-CADC-LP04 / CAD-COMPLETE-MS0
 *
 * Closed-form numeric verification of LP04's acceptance criteria. Gradients
 * derived by hand from L = (1/n)·Σ w_i·(v_i-r_i)², φ=[1,t/2000,coll,regen]:
 *   1. Dual-target step — master + head produce IDENTICAL first-step deltas
 *      (both start at zeros); exact closed-form value asserted.
 *   2. EWC++ preservation — protected drift < unprotected baseline drift.
 *   3. LoRA-safe — base θ stays at zeros; loraDelta moves by closed-form step.
 *   4. Reward shaping — hand-derived shaped reward + closed-form delta.
 *   5. Empty / malformed batch — element-wise zero deltas, no throw,
 *      totalDroppedEntries == 5 (P1-4 telemetry fix).
 *   6. Fail-loud on caller error — null / empty-headId throws TypeError.
 *   7. consolidate() no-op guard — Fisher element-wise equal to prior
 *      snapshot after repeated bare consolidate; totalConsolidations
 *      stays at 1 (P1-1 fix).
 *   8. Per-sample empirical Fisher — Fisher[0] closed-form value 1.94045
 *      on the varied 2-sample batch, NOT 0.97 (P1-3 fix; 2× divergence).
 *   9. Dispatcher schema round-trip — schemas accept + reject documented
 *      shapes.
 *
 * No mocks — LP04 has no runtime dependencies (`import type` only).
 *
 * @module __tests__/MasterBrainBackpropPropagatorEngine.test
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  MasterBrainBackpropPropagatorEngine,
} from "../engines/MasterBrainBackpropPropagatorEngine.js";
import type { FeedbackSample } from "../engines/CADPerAdapterFeedbackCollectorEngine.js";
import type { ReplayBatch, ReplayEntry } from "../engines/CADHeadReplayBufferEngine.js";
import { ACTION_CAD_SCHEMAS } from "../schemas/cadActionSchemas.js";

/** Build a FeedbackSample fixture for LP04 tests. */
function fb(opts: Partial<FeedbackSample> & { headId: string }): FeedbackSample {
  return {
    headId: opts.headId,
    success: opts.success ?? true,
    timingMs: opts.timingMs ?? 100,
    collision: opts.collision ?? false,
    regenerationOk: opts.regenerationOk ?? true,
    errorMessage: opts.errorMessage,
    scriptId: opts.scriptId,
    lineageId: opts.lineageId ?? "",
    timestamp: opts.timestamp ?? "2026-05-20T00:00:00.000Z",
  };
}

/** Build a ReplayBatch from a list of FeedbackSamples (PER weights all 1). */
function batchOf(headId: string, samples: FeedbackSample[], weights?: number[]): ReplayBatch {
  const entries: ReplayEntry[] = samples.map((sample, i) => ({
    id: i,
    headId,
    sample,
    priority: 1,
  }));
  return {
    headId,
    entries,
    ids: entries.map((e) => e.id),
    weights: weights ?? entries.map(() => 1),
  };
}

const FEATURE_DIM = 4;
const zerosN = (n: number) => Array.from({ length: n }, () => 0);

describe("MasterBrainBackpropPropagatorEngine — U-CADC-LP04", () => {
  let engine: MasterBrainBackpropPropagatorEngine;
  beforeEach(() => {
    engine = new MasterBrainBackpropPropagatorEngine();
  });

  it("dual-target: ONE batch produces identical first-step closed-form deltas on master AND head", () => {
    // Hand-derived gradient for batch [t=100, t=200] (both success+regenOk):
    //   r₁ = 0.985; v=0; g₀,₁ = 2*(0-0.985)*1 = -1.97
    //   r₂ = 0.97;  v=0; g₀,₂ = 2*(0-0.97)*1  = -1.94
    //   meanGrad₀ = (-1.97 + -1.94)/2 = -1.955
    //   step₀ = 0.05 * -1.955 = -0.09775
    //   theta₀ -= step₀ → delta₀ = +0.09775
    const out = engine.propagate(batchOf("freecad", [
      fb({ headId: "freecad", timingMs: 100 }),
      fb({ headId: "freecad", timingMs: 200 }),
    ]));
    expect(out.headId).toBe("freecad");
    expect(out.batchSize).toBe(2);
    expect(out.master.target).toBe(MasterBrainBackpropPropagatorEngine.MASTER);
    expect(out.head.target).toBe("freecad");
    expect(out.master.delta[0]).toBeCloseTo(0.09775, 5);
    expect(out.head.delta[0]).toBeCloseTo(0.09775, 5);
    // Both targets start at zeros + see the SAME batch → identical first-step deltas.
    expect(out.master.delta).toEqual(out.head.delta);
  });

  it("listTargets() returns exactly [master, head] sorted after one propagate()", () => {
    engine.propagate(batchOf("cadquery", [fb({ headId: "cadquery" })]));
    expect(engine.listTargets()).toEqual(
      [MasterBrainBackpropPropagatorEngine.MASTER, "cadquery"].sort()
    );
  });

  it("EWC++ preservation: consolidated high-Fisher bias drift < unprotected baseline drift", () => {
    const taskA = batchOf("freecad", [
      fb({ headId: "freecad", timingMs: 100 }),
      fb({ headId: "freecad", timingMs: 150 }),
      fb({ headId: "freecad", timingMs: 200 }),
    ]);
    engine.propagate(taskA);
    engine.consolidate("freecad");
    const afterTaskA = engine.getParams("freecad");
    // Collision feature was 0 in task A → Fisher[2] is exactly 0 (no protection there).
    expect(afterTaskA.fisher[2]).toBe(0);

    // Baseline: same training history, NO consolidate (zero Fisher → no EWC penalty).
    const baseline = new MasterBrainBackpropPropagatorEngine();
    baseline.propagate(taskA);
    const baselineAfterA = baseline.getParams("freecad");

    // Phase 2: task B applied THREE times. On the first task-B step the EWC
    // penalty is exactly zero (θ_eff just equals θ* immediately post-consolidate),
    // so the protected drift only diverges from baseline once θ has moved away
    // from θ* — i.e. on step 2 onward. The cumulative effect over 3 steps is the
    // observable EWC resistance.
    const taskB = batchOf("freecad", [
      fb({ headId: "freecad", success: false, regenerationOk: false, collision: true, timingMs: 1000 }),
    ]);
    engine.propagate(taskB);
    engine.propagate(taskB);
    engine.propagate(taskB);
    baseline.propagate(taskB);
    baseline.propagate(taskB);
    baseline.propagate(taskB);

    const protectedDeltaBias = Math.abs(engine.getParams("freecad").effective[0] - afterTaskA.effective[0]);
    const baselineDeltaBias = Math.abs(baseline.getParams("freecad").effective[0] - baselineAfterA.effective[0]);
    expect(protectedDeltaBias).toBeLessThan(baselineDeltaBias);
  });

  it("EWC consolidate() no-op guard: Fisher preserved element-wise + totalConsolidations stays at 1 (P1-1)", () => {
    engine.propagate(batchOf("h", [fb({ headId: "h", timingMs: 100 })]));
    const first = engine.consolidate("h");
    // First consolidate folds gradSqAccum into Fisher. Hand-computed:
    //   1 sample (happy, t=100): g₀ = -1.97, g₃ = -1.97; gradSqAccum[0]=gradSqAccum[3]=3.8809
    //   gradSqCount=1 → fisher[0]=fisher[3]=3.8809 → fisherNorm = 3.8809*sqrt(2) ≈ 5.4884
    expect(first.fisherNorm).toBeCloseTo(5.4884, 3);
    expect(first.skipped).toBe(undefined);

    const fisherAfterFirst = engine.getParams("h").fisher.slice();
    const second = engine.consolidate("h");
    expect(second.skipped).toBe(true);
    expect(second.fisherNorm).toBeCloseTo(first.fisherNorm, 12);

    engine.consolidate("h"); // third bare consolidate
    expect(engine.getParams("h").fisher).toEqual(fisherAfterFirst); // NO γ-decay
    expect(engine.getStats().totalConsolidations).toBe(1);          // skipped ones NOT counted
  });

  it("LoRA-safe: base theta stays at zeros + loraDelta moves by closed-form step 0.0985", () => {
    // 1 sample (success+regenOk, t=100):  g₀ = -1.97; meanGrad₀ = -1.97;
    // step₀ = 0.05 * -1.97 = -0.0985; loraDelta₀ -= step₀ → loraDelta₀ = 0.0985.
    const lora = new MasterBrainBackpropPropagatorEngine({ loraMode: true });
    lora.propagate(batchOf("freecad", [fb({ headId: "freecad", timingMs: 100 })]));
    const masterParams = lora.getParams(MasterBrainBackpropPropagatorEngine.MASTER);
    const headParams = lora.getParams("freecad");
    expect(masterParams.theta).toEqual(zerosN(FEATURE_DIM));
    expect(headParams.theta).toEqual(zerosN(FEATURE_DIM));
    expect(masterParams.loraDelta[0]).toBeCloseTo(0.0985, 5);
    expect(headParams.loraDelta[0]).toBeCloseTo(0.0985, 5);
    expect(masterParams.effective[0]).toBeCloseTo(0.0985, 5);
    expect(headParams.effective[0]).toBeCloseTo(0.0985, 5);
    expect(lora.getStats().loraMode).toBe(true);
  });

  it("LoRA-safe strict equality: loraMode:1 does NOT enable LoRA; theta moves by closed-form step", () => {
    // @ts-expect-error — intentionally bad shape for the test.
    const fake = new MasterBrainBackpropPropagatorEngine({ loraMode: 1 });
    fake.propagate(batchOf("h", [fb({ headId: "h", timingMs: 100 })]));
    const params = fake.getParams("h");
    expect(params.theta[0]).toBeCloseTo(0.0985, 5);    // theta moves (NOT LoRA mode)
    expect(params.loraDelta).toEqual(zerosN(FEATURE_DIM));
    expect(fake.getStats().loraMode).toBe(false);
  });

  it("Reward shaping: happy sample → closed-form theta[0] = 0.0985 (hand-derived gradient)", () => {
    //   r = clamp01(0.8 + 0.2 - 0 - 0.3*(100/2000)) = 0.985; v=0; g₀ = -1.97
    //   step₀ = 0.05 * -1.97 = -0.0985; theta₀ -= step₀ → theta₀ = 0.0985.
    const out = engine.propagate(batchOf("h", [
      fb({ headId: "h", success: true, regenerationOk: true, collision: false, timingMs: 100 }),
    ]));
    expect(out.head.delta[0]).toBeCloseTo(0.0985, 5);
    expect(engine.getParams("h").effective[0]).toBeCloseTo(0.0985, 5);
  });

  it("Reward shaping: collision dominates → r clamped to 0, effectively zero parameter drift", () => {
    // success=true (+0.8), collision=true (-0.5), regenOk=false (+0),
    // timingMs=2000 → normTiming=1 → -0.3*1 = -0.3
    // analytic raw = 0.8 - 0.5 - 0.3 = 0.0 → clamp01 = 0 → r = 0; v = 0; grad = 0.
    // In IEEE 754, (0.8 - 0.5 - 0.3) leaves a 5.55e-17 residue, so the gradient
    // is at the machine-epsilon floor — assert |delta| ≤ 1e-15 (effectively zero).
    const out = engine.propagate(batchOf("h", [
      fb({ headId: "h", success: true, regenerationOk: false, collision: true, timingMs: 2000 }),
    ]));
    const maxAbsDelta = Math.max(...out.head.delta.map((d) => Math.abs(d)));
    expect(maxAbsDelta).toBeLessThan(1e-15);
    const maxAbsEffective = Math.max(...engine.getParams("h").effective.map((d) => Math.abs(d)));
    expect(maxAbsEffective).toBeLessThan(1e-15);
  });

  it("Empty batch is a no-op step: element-wise zero deltas on both master + head", () => {
    const out = engine.propagate(batchOf("h", []));
    expect(out.batchSize).toBe(0);
    expect(out.master.delta).toEqual(zerosN(FEATURE_DIM));
    expect(out.head.delta).toEqual(zerosN(FEATURE_DIM));
    expect(out.master.gradNorm).toBe(0);
    expect(out.head.gradNorm).toBe(0);
  });

  it("Malformed entries surface via droppedEntries counter; step is no-op instead of throw (P1-4)", () => {
    const malformed: ReplayBatch = {
      headId: "h",
      // @ts-expect-error — deliberately injecting bad shapes to verify the filter.
      entries: [null, undefined, { sample: null }, "bad", { id: 0, headId: "h", priority: 1 }],
      ids: [0, 1, 2, 3, 4],
      weights: [1, 1, 1, 1, 1],
    };
    const out = engine.propagate(malformed);
    expect(out.batchSize).toBe(0);
    expect(out.master.delta).toEqual(zerosN(FEATURE_DIM));
    expect(out.head.delta).toEqual(zerosN(FEATURE_DIM));
    expect(engine.getStats().totalDroppedEntries).toBe(5); // P1-4 telemetry
  });

  it("Fail-loud: propagate(null) / {} / empty-headId throws TypeError", () => {
    // @ts-expect-error — testing the runtime guard.
    expect(() => engine.propagate(null)).toThrow(TypeError);
    // @ts-expect-error — testing the runtime guard.
    expect(() => engine.propagate({})).toThrow(TypeError);
    expect(() => engine.propagate(batchOf("", [fb({ headId: "h" })]))).toThrow(TypeError);
  });

  it("Fail-loud: consolidate('') / consolidate(non-string) throws TypeError", () => {
    expect(() => engine.consolidate("")).toThrow(TypeError);
    // @ts-expect-error — testing the runtime guard.
    expect(() => engine.consolidate(null)).toThrow(TypeError);
  });

  it("Per-sample empirical Fisher: bias-dim Fisher == 1.94045 on the 2-sample varied batch (P1-3)", () => {
    // Hand-computed signal that distinguishes the two estimators:
    //   sample A (happy, t=100): r=0.985, v=0 → g₀ = -1.97; g₀² = 3.8809
    //   sample B (r clamped to 0): g₀ = 0; g₀² = 0
    //   per-sample E[g²] / sample-count = (3.8809 + 0) / 2 = 1.94045  ← P1-3 correct
    //   (E[g])² (biased) = ((-1.97 + 0)/2)² = 0.970225                  ← OLD pre-fix
    const eng = new MasterBrainBackpropPropagatorEngine();
    eng.propagate(batchOf("h", [
      fb({ headId: "h", success: true,  regenerationOk: true,  collision: false, timingMs: 100 }),
      fb({ headId: "h", success: true,  regenerationOk: false, collision: true,  timingMs: 2000 }),
    ]));
    eng.consolidate("h");
    expect(eng.getParams("h").fisher[0]).toBeCloseTo(1.94045, 3);
  });

  it("Stats snapshot: counters + per-target fisher/effective norms match closed-form expectations", () => {
    engine.propagate(batchOf("freecad", [fb({ headId: "freecad", timingMs: 100 })]));
    engine.propagate(batchOf("cadquery", [fb({ headId: "cadquery", timingMs: 100 })]));
    engine.consolidate("freecad");
    const stats = engine.getStats();
    expect(stats.totalPropagations).toBe(2);
    expect(stats.totalConsolidations).toBe(1);
    expect(stats.totalDroppedEntries).toBe(0);
    expect(stats.loraMode).toBe(false);
    expect(stats.targetCount).toBe(3); // master + freecad + cadquery
    expect(stats.byTarget[MasterBrainBackpropPropagatorEngine.MASTER].updates).toBe(2);
    expect(stats.byTarget["freecad"].updates).toBe(1);
    expect(stats.byTarget["cadquery"].updates).toBe(1);
    // freecad was consolidated → fisher[0]=fisher[3]=3.8809 → norm = 3.8809*sqrt(2) ≈ 5.4884.
    expect(stats.byTarget["freecad"].fisherNorm).toBeCloseTo(5.4884, 3);
    expect(stats.byTarget["cadquery"].fisherNorm).toBe(0); // never consolidated
    // freecad + cadquery each saw 1 happy sample → effective[0]=effective[3]=0.0985 →
    // norm = 0.0985*sqrt(2) ≈ 0.1393. MASTER saw BOTH samples (one from each head's
    // batch), so its 2-step accumulation is:
    //   step 1 (theta=0): r=0.985, v=0, g₀=-1.97 → theta₀=+0.0985.
    //   step 2 (theta nonzero): v=0.0985+0.0985=0.197; err=-0.788; g₀=-1.5755;
    //     theta₀ -= 0.05*-1.5755 → theta₀ = 0.0985 + 0.07878 = 0.17728.
    //   (theta₁ also moves slightly to 0.008863.) norm = sqrt(2*0.17728² + 0.008863²) ≈ 0.2508.
    expect(stats.byTarget["freecad"].effectiveNorm).toBeCloseTo(0.1393, 3);
    expect(stats.byTarget["cadquery"].effectiveNorm).toBeCloseTo(0.1393, 3);
    expect(stats.byTarget[MasterBrainBackpropPropagatorEngine.MASTER].effectiveNorm).toBeCloseTo(0.2508, 3);
  });

  it("Dispatcher schema round-trip: cad_backprop_params (optional target) + cad_backprop_stats (strict empty)", () => {
    const paramsSchema = ACTION_CAD_SCHEMAS["cad_backprop_params"];
    const statsSchema = ACTION_CAD_SCHEMAS["cad_backprop_stats"];
    // params: target optional, min(1), strict, must be string.
    expect(paramsSchema!.safeParse({}).success).toBe(true);
    expect(paramsSchema!.safeParse({ target: "freecad" }).success).toBe(true);
    expect(paramsSchema!.safeParse({ target: MasterBrainBackpropPropagatorEngine.MASTER }).success).toBe(true);
    expect(paramsSchema!.safeParse({ target: "" }).success).toBe(false);
    expect(paramsSchema!.safeParse({ target: "h", extra: "junk" }).success).toBe(false);
    expect(paramsSchema!.safeParse({ target: 123 }).success).toBe(false);
    // stats: strict empty.
    expect(statsSchema!.safeParse({}).success).toBe(true);
    expect(statsSchema!.safeParse({ anything: 1 }).success).toBe(false);
  });
});
