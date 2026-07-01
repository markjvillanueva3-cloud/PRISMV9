/**
 * CAMOutcomeCaptureWireEngine.test.ts — U5 (CLOSE-THE-LOOP CAM training producer)
 * ==============================================================================
 *
 * These tests PROVE (not assert-by-stub) that a CAM outcome, handed to the wire
 * engine, actually LANDS in the training path:
 *   - Leg 1 (durable): a real OutcomeCaptureBusEngine writes a `cam.jsonl`
 *     event that round-trips back out of `query({domain:"cam"})`.
 *   - Leg 2 (training): a real CrossProcessOutcomeStore.record() fires
 *     `outcome.recorded` on the SHARED FeedbackBus singleton, and a real
 *     CrossProcessNeuralLearningEngine with enableAutoTrain() buffers the
 *     labelled CAM record and TRAINS on it (samplesUsed > 0, a neural.train.tick
 *     fires). This is the end-to-end proof CAM is now a training PRODUCER.
 *
 * Coverage: happy (x3 outcome types) + >=3 failure modes + >=2 adversarial.
 *
 * @milestone CLOSE-THE-LOOP-CAM U5
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  CAMOutcomeCaptureWireEngine,
  routeFor,
  verdictFor,
  buildMetrics,
  type CAMOutcomeInput,
} from "../engines/CAMOutcomeCaptureWireEngine.js";
import { OutcomeCaptureBusEngine } from "../engines/OutcomeCaptureBusEngine.js";
import { CrossProcessOutcomeStore } from "../engines/CrossProcessOutcomeStore.js";
import {
  feedbackBusEngine,
  type FeedbackEvent,
} from "../engines/FeedbackBusEngine.js";
import { CrossProcessNeuralLearningEngine } from "../engines/CrossProcessNeuralLearningEngine.js";

/** Let the FeedbackBus queueMicrotask fan-out drain before asserting. */
const MICROTASK_DRAIN_MS = 0;

/** Spin up a fresh isolated OutcomeCaptureBus rooted at a temp dir. */
function freshBus(): { bus: OutcomeCaptureBusEngine; root: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cam-outcome-bus-"));
  return { bus: new OutcomeCaptureBusEngine(root), root };
}

/** The three real seed records from state/features/cam/*_outcome/v1.jsonl. */
const TOOLPATH_SEED: CAMOutcomeInput = {
  type: "toolpath",
  entityId: "jmd_cam_iMachining_alcoa_001",
  process: "mill",
  camSystem: "SolidCAM_iMachining",
  strategy: "adaptive_morph",
  simCollisions: 0, // a completion signal that read zero
  metrics: {
    stock_engagement_pct_avg: 32,
    cycle_time_min: 14.2,
    tool_changes: 0,
    lift_count: 0,
    retract_count: 2,
    mrr_avg_mm3_min: 4250,
  },
};

const POST_SEED: CAMOutcomeInput = {
  type: "post",
  entityId: "jmd_cam_post_okuma_l5000_003",
  process: "lathe",
  postSystem: "PRISM_post",
  controller: "okuma_osp",
  validated: true,
  simCollisions: 0,
  simOvertravel: 0,
  metrics: { lines_emitted: 1842, m_codes_inserted: 12, t_changes: 4 },
};

const NC_VALIDATE_SEED: CAMOutcomeInput = {
  type: "nc_validate",
  entityId: "jmd_cam_validate_haas_vf2_004",
  process: "mill",
  controller: "haas_ngc",
  fatalErrors: 0,
  metrics: { nc_size_bytes: 38420, warnings: 1 },
};

describe("routeFor — CAM outcome type → bridge + stage", () => {
  it("toolpath → feature/toolpath_generate", () => {
    expect(routeFor("toolpath")).toEqual({ bridge: "feature", stage: "toolpath_generate" });
  });
  it("post → post/post_process", () => {
    expect(routeFor("post")).toEqual({ bridge: "post", stage: "post_process" });
  });
  it("nc_validate → post/nc_validate", () => {
    expect(routeFor("nc_validate")).toEqual({ bridge: "post", stage: "nc_validate" });
  });
});

describe("verdictFor — honest success/failure derivation (never fabricate)", () => {
  it("explicit verdict override wins", () => {
    expect(verdictFor({ ...NC_VALIDATE_SEED, verdict: "failure" })).toBe("failure");
  });
  it("operatorOverride → operator_override", () => {
    expect(verdictFor({ ...POST_SEED, operatorOverride: true })).toBe("operator_override");
  });
  it("fatalErrors>0 → failure", () => {
    expect(verdictFor({ ...NC_VALIDATE_SEED, fatalErrors: 2 })).toBe("failure");
  });
  it("simCollisions>0 → failure", () => {
    expect(verdictFor({ ...POST_SEED, simCollisions: 1 })).toBe("failure");
  });
  it("validated===false → failure", () => {
    expect(verdictFor({ ...POST_SEED, validated: false })).toBe("failure");
  });
  it("validated===true → success", () => {
    expect(verdictFor(POST_SEED)).toBe("success");
  });
  it("zero failure signals + metrics present → success (clean completion)", () => {
    expect(verdictFor(NC_VALIDATE_SEED)).toBe("success");
    expect(verdictFor(TOOLPATH_SEED)).toBe("success");
  });
  it("no signals + no metrics → pending (NOT a fabricated success)", () => {
    expect(verdictFor({ type: "toolpath", entityId: "x" })).toBe("pending");
  });
});

describe("buildMetrics — free-form finite-only numeric map (drop-trap guard)", () => {
  it("keeps finite metrics, drops NaN/Infinity", () => {
    const m = buildMetrics({
      type: "toolpath",
      entityId: "x",
      metrics: { cycle_time_min: 14.2, bad_nan: NaN, bad_inf: Infinity, mrr: 4250 },
    });
    expect(m.cycle_time_min).toBe(14.2);
    expect(m.mrr).toBe(4250);
    expect("bad_nan" in m).toBe(false);
    expect("bad_inf" in m).toBe(false);
  });
  it("folds verdict flags in so they are queryable", () => {
    const m = buildMetrics({ type: "post", entityId: "x", simCollisions: 0, simOvertravel: 0, fatalErrors: 1 });
    expect(m.fatal_errors).toBe(1);
    expect(m.sim_collisions).toBe(0);
    expect(m.sim_overtravel).toBe(0);
  });
});

describe("recordOutcome — Leg 1: durable universal bus (cam.jsonl round-trip)", () => {
  let root = "";
  afterEach(() => {
    if (root && fs.existsSync(root)) fs.rmSync(root, { recursive: true, force: true });
  });

  it("writes a cam-domain event that round-trips out of the bus for all 3 types", () => {
    const f = freshBus();
    root = f.root;
    const store = new CrossProcessOutcomeStore();
    const wire = new CAMOutcomeCaptureWireEngine(f.bus, store);

    for (const seed of [TOOLPATH_SEED, POST_SEED, NC_VALIDATE_SEED]) {
      const res = wire.recordOutcome(seed);
      expect(res.busOk).toBe(true);
      expect(res.busEventId).not.toBe("");
    }

    const { events } = f.bus.query({ domain: "cam", limit: 100 });
    expect(events.length).toBe(3);
    // Every event carries the CAM stage + verdict + free-form metrics on `actual`.
    for (const ev of events) {
      expect(ev.domain).toBe("cam");
      expect(ev.kind).toBe("cross_process_stage_complete");
      // v1.1.0-only kind → schema must have auto-stamped 1.1.0 (else it dropped).
      expect(ev.schemaVersion).toBe("1.1.0");
      expect((ev.context as Record<string, unknown>).pipeline_stage).toBeTruthy();
      expect((ev.actual as Record<string, unknown>).verdict).toBeTruthy();
    }
    // Prove the toolpath cycle_time metric survived on the free-form surface.
    const tp = events.find((e) => e.lineage_id === "jmd_cam_iMachining_alcoa_001");
    expect(tp?.lineage_id).toBe("jmd_cam_iMachining_alcoa_001");
    const tpMetrics = (tp!.actual as { metrics: Record<string, number> }).metrics;
    expect(tpMetrics.cycle_time_min).toBe(14.2);
    expect(tpMetrics.mrr_avg_mm3_min).toBe(4250);
  });
});

describe("recordOutcome — Leg 2: CAM outcome REACHES the FeedbackBus + trains", () => {
  let root = "";
  let subHandle: ReturnType<typeof feedbackBusEngine.subscribe> | null = null;

  beforeEach(() => {
    feedbackBusEngine.reset();
  });
  afterEach(() => {
    if (subHandle) feedbackBusEngine.unsubscribe(subHandle);
    subHandle = null;
    if (root && fs.existsSync(root)) fs.rmSync(root, { recursive: true, force: true });
  });

  it("fires outcome.recorded on the FeedbackBus with the CAM record (PROOF: reaches the bus)", async () => {
    const f = freshBus();
    root = f.root;
    // Real CrossProcessOutcomeStore → publishes to the SHARED feedbackBusEngine.
    const store = new CrossProcessOutcomeStore();
    const wire = new CAMOutcomeCaptureWireEngine(f.bus, store);

    const seen: FeedbackEvent[] = [];
    subHandle = feedbackBusEngine.subscribe("outcome.recorded", (ev) => {
      seen.push(ev);
    });

    const res = wire.recordOutcome(POST_SEED);
    expect(res.storeOk).toBe(true);
    expect(res.verdict).toBe("success");
    expect(res.bridge).toBe("post");
    expect(res.process).toBe("lathe");

    // FeedbackBus fan-out is queueMicrotask-async — let it drain.
    await new Promise((r) => setTimeout(r, MICROTASK_DRAIN_MS));

    expect(seen.length).toBe(1);
    const payload = seen[0]!.payload as {
      bridge: string;
      process: string;
      outcomeKind: string;
      record: { outcome?: { kind?: string }; response_summary?: { metrics?: Record<string, number> } };
    };
    expect(payload.bridge).toBe("post");
    expect(payload.process).toBe("lathe");
    expect(payload.outcomeKind).toBe("success");
    // The CAM cycle metrics rode through to the store record.
    expect(payload.record.response_summary?.metrics?.lines_emitted).toBe(1842);
  });

  it("a labelled CAM outcome becomes a TRAINING sample in the neural learner (end-to-end)", async () => {
    const f = freshBus();
    root = f.root;
    const store = new CrossProcessOutcomeStore();
    const wire = new CAMOutcomeCaptureWireEngine(f.bus, store);

    // Real neural learner, auto-training off the SHARED FeedbackBus. Threshold 3
    // so exactly 3 labelled CAM outcomes trigger one train() + a neural.train.tick.
    const AUTO_TRAIN_THRESHOLD = 3;
    const learner = new CrossProcessNeuralLearningEngine();
    const ticks: FeedbackEvent[] = [];
    const tickHandle = feedbackBusEngine.subscribe("neural.train.tick", (ev) => ticks.push(ev));
    learner.enableAutoTrain({ threshold: AUTO_TRAIN_THRESHOLD });

    try {
      // Emit 3 labelled CAM outcomes (2 success + 1 failure = trainable classes).
      wire.recordOutcome(POST_SEED);                                   // success
      wire.recordOutcome(NC_VALIDATE_SEED);                            // success
      wire.recordOutcome({ ...TOOLPATH_SEED, entityId: "tp_fail", simCollisions: 3 }); // failure

      await new Promise((r) => setTimeout(r, MICROTASK_DRAIN_MS));

      const status = learner.autoTrainStatus();
      // Buffer drained → a training tick fired → the learner SAW the CAM samples.
      expect(status.totalTicks).toBe(1);
      expect(status.totalSamplesSeen).toBeGreaterThanOrEqual(AUTO_TRAIN_THRESHOLD);
      expect(ticks.length).toBe(1);
      const tick = ticks[0]!.payload as { samplesUsed: number };
      expect(tick.samplesUsed).toBe(AUTO_TRAIN_THRESHOLD); // all 3 CAM outcomes were real training samples
    } finally {
      learner.disableAutoTrain();
      feedbackBusEngine.unsubscribe(tickHandle);
    }
  });

  it("a PENDING CAM outcome does NOT train (learner skips unlabelled)", async () => {
    const f = freshBus();
    root = f.root;
    const store = new CrossProcessOutcomeStore();
    const wire = new CAMOutcomeCaptureWireEngine(f.bus, store);

    const learner = new CrossProcessNeuralLearningEngine();
    learner.enableAutoTrain({ threshold: 1 });
    try {
      // No signals + no metrics → pending → recordToLabel === null → NOT buffered.
      const res = wire.recordOutcome({ type: "toolpath", entityId: "pending_one" });
      expect(res.verdict).toBe("pending");
      expect(res.storeOk).toBe(true); // the store DID record it (as pending)
      await new Promise((r) => setTimeout(r, MICROTASK_DRAIN_MS));
      expect(learner.autoTrainStatus().totalTicks).toBe(0);
    } finally {
      learner.disableAutoTrain();
    }
  });
});

describe("recordOutcome — failure + adversarial modes (never throw)", () => {
  let root = "";
  afterEach(() => {
    if (root && fs.existsSync(root)) fs.rmSync(root, { recursive: true, force: true });
  });

  it("FAILURE 1: invalid outcome type → emitted:false, no throw", () => {
    const f = freshBus();
    root = f.root;
    const wire = new CAMOutcomeCaptureWireEngine(f.bus, new CrossProcessOutcomeStore());
    // deliberately bad type
    const res = wire.recordOutcome({ type: "bogus" as unknown as CAMOutcomeInput["type"], entityId: "x" });
    expect(res.emitted).toBe(false);
    expect(res.ok).toBe(false);
    expect(res.reason).toContain("invalid outcome type");
  });

  it("FAILURE 2: missing entityId → emitted:false, no throw", () => {
    const f = freshBus();
    root = f.root;
    const wire = new CAMOutcomeCaptureWireEngine(f.bus, new CrossProcessOutcomeStore());
    const res = wire.recordOutcome({ type: "post", entityId: "" });
    expect(res.emitted).toBe(false);
    expect(res.reason).toContain("missing entityId");
  });

  it("FAILURE 3: bad process defaults to mill (store would THROW) — never propagates", () => {
    const f = freshBus();
    root = f.root;
    const store = new CrossProcessOutcomeStore();
    const wire = new CAMOutcomeCaptureWireEngine(f.bus, store);
    // "swiss" is not in {mill,lathe,wedm}; must default, not throw.
    const res = wire.recordOutcome({ ...POST_SEED, process: "swiss" });
    expect(res.process).toBe("mill");
    expect(res.storeOk).toBe(true);
    expect(res.reason).toContain("defaulted");
  });

  it("ADVERSARIAL 1: a throwing bus leg does NOT break the store leg (partial success visible)", () => {
    const f = freshBus();
    root = f.root;
    // Poison the bus: force record() to throw.
    const poisonBus = new OutcomeCaptureBusEngine(f.root);
    (poisonBus as unknown as { record: () => never }).record = () => {
      throw new Error("injected bus failure");
    };
    const store = new CrossProcessOutcomeStore();
    const wire = new CAMOutcomeCaptureWireEngine(poisonBus, store);

    const res = wire.recordOutcome(POST_SEED);
    expect(res.busOk).toBe(false);
    expect(res.busWarning).toContain("injected bus failure");
    // The training leg still landed — CAM data still reaches the learner.
    expect(res.storeOk).toBe(true);
    expect(res.ok).toBe(false); // ok requires BOTH legs → honestly false
  });

  it("ADVERSARIAL 2: numeric_features drop-trap is AVOIDED — CAM extras never poison the event", () => {
    const f = freshBus();
    root = f.root;
    const wire = new CAMOutcomeCaptureWireEngine(f.bus, new CrossProcessOutcomeStore());
    // These keys are NOT in NUMERIC_FEATURE_KEYS. If the engine had put them on
    // numeric_features, the schema superRefine would drop the WHOLE event.
    const res = wire.recordOutcome({
      ...TOOLPATH_SEED,
      metrics: { cycle_time_min: 14.2, mrr_avg_mm3_min: 4250, some_exotic_cam_metric: 999 },
    });
    expect(res.busOk).toBe(true); // event survived → extras did NOT hit numeric_features
    const { events } = f.bus.query({ domain: "cam", limit: 10 });
    expect(events.length).toBe(1);
    // numeric_features must be absent — CAM extras rode `actual.metrics`.
    expect(events[0]!.numeric_features).toBeUndefined();
    const m = (events[0]!.actual as { metrics: Record<string, number> }).metrics;
    expect(m.some_exotic_cam_metric).toBe(999);
  });
});
