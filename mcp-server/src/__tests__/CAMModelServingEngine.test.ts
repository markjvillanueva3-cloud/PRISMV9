/**
 * CAMModelServingEngine.test.ts — CAM-EXHAUST-MS0/U-CAM122
 *
 * Real behavior tests for the production model-serving fabric. Covers:
 *
 *   - registry CRUD + dedup + bounds-checked inputs
 *   - deterministic FNV-1a routing under canary split, sticky_active,
 *     shadow_only, and "no policy" defaults
 *   - canary→active promotion gate (sample-count, Wilson95-success,
 *     p95-latency)
 *   - canary auto-rollback on error_rate spike and on p95 regression
 *   - lifecycle envelopes (deploy_shadow, promote_to_canary, demote,
 *     retire, rollback) with applied/requires_human_approval flags
 *   - SLO health: Wilson95, quantiles, top error classes, uptime
 *   - request batching (size threshold, timeout, force-drain)
 *   - rate limiting (token bucket consume + refill + retry_after_ms)
 *   - metric ring buffer FIFO eviction at the configured cap
 *   - math primitives (FNV-1a, hashBucket, Wilson, quantile, Hoeffding)
 *   - input validation throws on malformed inputs
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CAMModelServingEngine,
  __testing,
  type ModelSpec,
  type Model,
  type ConfirmationEnvelope,
  type BatchDrainResult,
} from "../engines/CAMModelServingEngine.js";

const T0 = 1_700_000_000_000;
const BASELINE_SAMPLES = 250;
const ROLLBACK_SAMPLES = 35;
const SPLIT_TRIAL_COUNT = 5000;
const MIN_DISTINCT_BUCKETS_PER_1000 = 500;

function spec(id: string, overrides: Partial<ModelSpec> = {}): ModelSpec {
  return {
    id,
    name: `Model ${id}`,
    version: "1.0.0",
    backend: "ollama",
    endpoint_url: `http://serve.local/${id}`,
    cam_systems: ["mastercam"],
    tasks: ["strategy_recommend"],
    weight: 0,
    ...overrides,
  };
}

function getOrThrow(id: string): Model {
  const m = CAMModelServingEngine.getModel(id);
  if (!m) throw new Error(`expected model ${id} to be registered`);
  return m;
}

function expectDrained(d: BatchDrainResult | null): BatchDrainResult {
  if (d === null) throw new Error("expected batch to be drained, got null");
  return d;
}

function deployActive(id: string, opts: Partial<ModelSpec> = {}): void {
  CAMModelServingEngine.registerModel(spec(id, opts));
  // Loosen the promotion gate for tests — production stays strict via the
  // engine defaults (ε=0.05 ⇒ Hoeffding≈738 samples). With ε=0.20 the
  // sample-count floor drops to ~46, fast enough for the test harness.
  const camSys = (opts.cam_systems ?? ["mastercam"])[0];
  const task = (opts.tasks ?? ["strategy_recommend"])[0];
  if (!CAMModelServingEngine.getRoutingPolicy(camSys, task)) {
    CAMModelServingEngine.setRoutingPolicy(camSys, task, "canary_split", {
      epsilon: 0.20,
      min_samples_for_promotion: 100,
    });
  }
  CAMModelServingEngine.deployShadow(id);
  CAMModelServingEngine.promoteToCanary(id, 1);
  for (let i = 0; i < BASELINE_SAMPLES; i++) {
    CAMModelServingEngine.recordMetric(id, { latency_ms: 50 + (i % 10), success: true });
  }
  const env = CAMModelServingEngine.promoteToActive(id);
  if (!env.applied) throw new Error(`baseline promote failed: ${env.rationale}`);
}

beforeEach(() => {
  CAMModelServingEngine.clearAll();
  CAMModelServingEngine.setNowSource(() => T0);
});

describe("CAMModelServingEngine — registry", () => {
  it("registers a model in pending status with explicit defaults", () => {
    const m = CAMModelServingEngine.registerModel(spec("m1"));
    expect(m.status).toBe("pending");
    expect(m.weight).toBe(0);
    expect(m.rate_capacity).toBe(100);
    expect(m.rate_refill_per_sec).toBe(50);
    expect(m.max_batch_size).toBe(8);
    expect(m.max_batch_wait_ms).toBe(25);
    expect(m.cam_systems).toEqual(["mastercam"]);
    expect(m.registered_at).toBe(T0);
    expect(m.status_changed_at).toBe(T0);
  });

  it("rejects duplicate id, missing arrays, and out-of-range weight", () => {
    CAMModelServingEngine.registerModel(spec("m1"));
    expect(() => CAMModelServingEngine.registerModel(spec("m1"))).toThrow(/already registered/);
    expect(() =>
      CAMModelServingEngine.registerModel(spec("bad-cam", { cam_systems: [] }))
    ).toThrow(/cam_systems/);
    expect(() =>
      CAMModelServingEngine.registerModel(spec("bad-task", { tasks: [] }))
    ).toThrow(/tasks/);
    expect(() =>
      CAMModelServingEngine.registerModel(spec("bad-w", { weight: 1.5 }))
    ).toThrow(/weight/);
  });

  it("filters listModels by status and cam_system", () => {
    CAMModelServingEngine.registerModel(spec("a"));
    CAMModelServingEngine.registerModel(spec("b", { cam_systems: ["fusion360"] }));
    expect(CAMModelServingEngine.listModels({ status: "pending" })).toHaveLength(2);
    const fusion = CAMModelServingEngine.listModels({ cam_system: "fusion360" });
    expect(fusion).toHaveLength(1);
    expect(fusion[0].id).toBe("b");
    expect(CAMModelServingEngine.listModels({ cam_system: "hypermill" })).toHaveLength(0);
  });

  it("deregister removes model + metrics + rate bucket + batch queue", () => {
    CAMModelServingEngine.registerModel(spec("m1"));
    CAMModelServingEngine.deregisterModel("m1");
    expect(CAMModelServingEngine.getModel("m1")).toBeNull();
    expect(() => CAMModelServingEngine.recordMetric("m1", { latency_ms: 10, success: true })).toThrow(
      /unknown model id/
    );
    expect(() => CAMModelServingEngine.checkRateLimit("m1")).toThrow(/unknown model id/);
  });

  it("updateModelEndpoint changes URL on the live record", () => {
    CAMModelServingEngine.registerModel(spec("m1"));
    const updated = CAMModelServingEngine.updateModelEndpoint("m1", "http://new.local/m1");
    expect(updated.endpoint_url).toBe("http://new.local/m1");
    expect(getOrThrow("m1").endpoint_url).toBe("http://new.local/m1");
  });
});

describe("CAMModelServingEngine — lifecycle", () => {
  it("pending → shadow → canary path applies envelopes and updates state", () => {
    CAMModelServingEngine.registerModel(spec("m1"));
    const e1 = CAMModelServingEngine.deployShadow("m1");
    expect(e1.applied).toBe(true);
    expect(e1.requires_human_approval).toBe(false);
    expect(e1.decision).toBe("deploy_shadow");
    expect(getOrThrow("m1").status).toBe("shadow");

    const e2 = CAMModelServingEngine.promoteToCanary("m1", 0.25);
    expect(e2.applied).toBe(true);
    expect(e2.decision).toBe("promote_to_canary");
    const m = getOrThrow("m1");
    expect(m.status).toBe("canary");
    expect(m.weight).toBeCloseTo(0.25, 5);
  });

  it("blocks status transitions that violate the FSM", () => {
    CAMModelServingEngine.registerModel(spec("m1"));
    expect(() => CAMModelServingEngine.promoteToCanary("m1", 0.1)).toThrow(/status/);
    CAMModelServingEngine.deployShadow("m1");
    expect(() => CAMModelServingEngine.promoteToActive("m1")).toThrow(/status=canary/);
    expect(() => CAMModelServingEngine.demoteFromActive("m1", "test")).toThrow(/status=active/);
  });

  it("retire sets status=retired and records the previous status", () => {
    CAMModelServingEngine.registerModel(spec("m1"));
    const env = CAMModelServingEngine.retireModel("m1");
    expect(env.applied).toBe(true);
    expect(env.evidence.previous_status).toBe("pending");
    expect(env.evidence.new_status).toBe("retired");
    expect(getOrThrow("m1").status).toBe("retired");
    expect(getOrThrow("m1").weight).toBe(0);
  });

  it("demoteFromActive moves active → canary@0 and emits envelope", () => {
    deployActive("m-active");
    const env = CAMModelServingEngine.demoteFromActive("m-active", "operator request");
    expect(env.applied).toBe(true);
    expect(env.evidence.reason).toBe("operator request");
    const m = getOrThrow("m-active");
    expect(m.status).toBe("canary");
    expect(m.weight).toBe(0);
  });
});

describe("CAMModelServingEngine — promotion gate", () => {
  it("FAILs gate with too-few samples and demands human approval", () => {
    CAMModelServingEngine.registerModel(spec("m-canary"));
    CAMModelServingEngine.deployShadow("m-canary");
    CAMModelServingEngine.promoteToCanary("m-canary", 0.5);
    for (let i = 0; i < 10; i++) {
      CAMModelServingEngine.recordMetric("m-canary", { latency_ms: 30, success: true });
    }
    const env = CAMModelServingEngine.promoteToActive("m-canary");
    expect(env.applied).toBe(false);
    expect(env.requires_human_approval).toBe(true);
    expect(String(env.evidence.failures)).toMatch(/samples/);
    expect(getOrThrow("m-canary").status).toBe("canary");
  });

  it("FAILs gate when canary success rate is materially worse than active baseline", () => {
    deployActive("m-active");
    // Pre-disable auto-rollback so we can build up errors and reach the promotion call.
    // Keep the loose Hoeffding budget so the gate doesn't FAIL on sample-count first.
    CAMModelServingEngine.setRoutingPolicy("mastercam", "strategy_recommend", "canary_split", {
      max_error_rate: 0.95,
      rollback_latency_mult: 100,
      epsilon: 0.20,
      min_samples_for_promotion: 100,
    });
    CAMModelServingEngine.registerModel(spec("m-canary"));
    CAMModelServingEngine.deployShadow("m-canary");
    CAMModelServingEngine.promoteToCanary("m-canary", 0.5);
    for (let i = 0; i < BASELINE_SAMPLES; i++) {
      CAMModelServingEngine.recordMetric("m-canary", {
        latency_ms: 30,
        success: i % 3 !== 0, // ~67% success vs baseline 100%
      });
    }
    const env = CAMModelServingEngine.promoteToActive("m-canary");
    expect(env.applied).toBe(false);
    expect(String(env.evidence.failures)).toMatch(/wilson95/);
    expect(getOrThrow("m-canary").status).toBe("canary");
  });

  it("PASSes gate, demotes prior actives to canary@0, and elevates new active", () => {
    deployActive("m-active");
    CAMModelServingEngine.registerModel(spec("m-canary"));
    CAMModelServingEngine.deployShadow("m-canary");
    CAMModelServingEngine.promoteToCanary("m-canary", 0.5);
    for (let i = 0; i < BASELINE_SAMPLES; i++) {
      CAMModelServingEngine.recordMetric("m-canary", { latency_ms: 45, success: true });
    }
    const env = CAMModelServingEngine.promoteToActive("m-canary");
    expect(env.applied).toBe(true);
    expect(env.requires_human_approval).toBe(false);
    expect(getOrThrow("m-canary").status).toBe("active");
    expect(getOrThrow("m-canary").weight).toBe(1);
    expect(getOrThrow("m-active").status).toBe("canary");
    expect(getOrThrow("m-active").weight).toBe(0);
  });
});

describe("CAMModelServingEngine — auto-rollback", () => {
  it("rolls back canary when error_rate exceeds policy threshold", () => {
    deployActive("m-active");
    CAMModelServingEngine.setRoutingPolicy("mastercam", "strategy_recommend", "canary_split", {
      max_error_rate: 0.20,
      min_samples_for_rollback: 30,
    });
    CAMModelServingEngine.registerModel(spec("m-canary"));
    CAMModelServingEngine.deployShadow("m-canary");
    CAMModelServingEngine.promoteToCanary("m-canary", 0.3);
    for (let i = 0; i < ROLLBACK_SAMPLES; i++) {
      CAMModelServingEngine.recordMetric("m-canary", {
        latency_ms: 50,
        success: i % 2 === 0,
        error_class: i % 2 === 0 ? undefined : "TIMEOUT",
      });
    }
    expect(getOrThrow("m-canary").status).toBe("rollback_pending");
    const rollbackEnvs = CAMModelServingEngine.listPendingConfirmations({
      requires_human_approval: true,
    }).filter((e: ConfirmationEnvelope) => e.decision === "rollback_canary");
    expect(rollbackEnvs).toHaveLength(1);
    expect(rollbackEnvs[0].model_id).toBe("m-canary");
    expect(String(rollbackEnvs[0].evidence.reason)).toMatch(/error_rate/);
  });

  it("rolls back canary when p95 latency regresses past rollback multiplier", () => {
    deployActive("m-active");
    CAMModelServingEngine.setRoutingPolicy("mastercam", "strategy_recommend", "canary_split", {
      max_error_rate: 0.99,
      rollback_latency_mult: 1.5,
      min_samples_for_rollback: 50,
    });
    CAMModelServingEngine.registerModel(spec("m-canary"));
    CAMModelServingEngine.deployShadow("m-canary");
    CAMModelServingEngine.promoteToCanary("m-canary", 0.3);
    // active baseline p95 ~59ms; canary at 1000ms is 16× over → rollback
    for (let i = 0; i < 60; i++) {
      CAMModelServingEngine.recordMetric("m-canary", { latency_ms: 1000, success: true });
    }
    expect(getOrThrow("m-canary").status).toBe("rollback_pending");
  });

  it("does NOT rollback when sample count below min_samples_for_rollback", () => {
    deployActive("m-active");
    CAMModelServingEngine.setRoutingPolicy("mastercam", "strategy_recommend", "canary_split", {
      max_error_rate: 0.10,
      min_samples_for_rollback: 100,
    });
    CAMModelServingEngine.registerModel(spec("m-canary"));
    CAMModelServingEngine.deployShadow("m-canary");
    CAMModelServingEngine.promoteToCanary("m-canary", 0.3);
    for (let i = 0; i < 20; i++) {
      CAMModelServingEngine.recordMetric("m-canary", { latency_ms: 30, success: false });
    }
    expect(getOrThrow("m-canary").status).toBe("canary");
  });
});

describe("CAMModelServingEngine — routing", () => {
  it("returns null primary when no models match", () => {
    const decision = CAMModelServingEngine.routeRequest({
      cam_system: "fusion360",
      task: "strategy_recommend",
      request_key: "k1",
    });
    expect(decision.primary_model_id).toBeNull();
    expect(decision.policy_kind).toBe("default");
    expect(decision.fallback_model_ids).toEqual([]);
  });

  it("routes to active when no canary registered", () => {
    deployActive("m-active");
    const decision = CAMModelServingEngine.routeRequest({
      cam_system: "mastercam",
      task: "strategy_recommend",
      request_key: "anything",
    });
    expect(decision.primary_model_id).toBe("m-active");
  });

  it("split routes deterministically: identical key → identical model & bucket", () => {
    deployActive("m-active");
    CAMModelServingEngine.registerModel(spec("m-canary"));
    CAMModelServingEngine.deployShadow("m-canary");
    CAMModelServingEngine.promoteToCanary("m-canary", 0.5);

    const a = CAMModelServingEngine.routeRequest({
      cam_system: "mastercam",
      task: "strategy_recommend",
      request_key: "user-42:job-7",
    });
    const b = CAMModelServingEngine.routeRequest({
      cam_system: "mastercam",
      task: "strategy_recommend",
      request_key: "user-42:job-7",
    });
    expect(a.primary_model_id).toBe(b.primary_model_id);
    expect(a.bucket).toBe(b.bucket);
  });

  it("split distribution matches canary weight to within 4 percentage points", () => {
    deployActive("m-active");
    CAMModelServingEngine.registerModel(spec("m-canary"));
    CAMModelServingEngine.deployShadow("m-canary");
    CAMModelServingEngine.promoteToCanary("m-canary", 0.30);

    let canary = 0;
    for (let i = 0; i < SPLIT_TRIAL_COUNT; i++) {
      const d = CAMModelServingEngine.routeRequest({
        cam_system: "mastercam",
        task: "strategy_recommend",
        request_key: `req-${i}`,
      });
      if (d.primary_model_id === "m-canary") canary++;
    }
    const observed = canary / SPLIT_TRIAL_COUNT;
    expect(Math.abs(observed - 0.30)).toBeLessThan(0.04);
  });

  it("shadow_only policy null-primaries but lists shadow ids", () => {
    deployActive("m-active");
    CAMModelServingEngine.registerModel(spec("m-shadow"));
    CAMModelServingEngine.deployShadow("m-shadow");
    CAMModelServingEngine.setRoutingPolicy("mastercam", "strategy_recommend", "shadow_only");
    const d = CAMModelServingEngine.routeRequest({
      cam_system: "mastercam",
      task: "strategy_recommend",
      request_key: "x",
    });
    expect(d.primary_model_id).toBeNull();
    expect(d.shadow_model_ids).toContain("m-shadow");
    expect(d.policy_kind).toBe("shadow_only");
  });

  it("sticky_active forces all traffic to active even with full-weight canary", () => {
    deployActive("m-active");
    CAMModelServingEngine.registerModel(spec("m-canary"));
    CAMModelServingEngine.deployShadow("m-canary");
    CAMModelServingEngine.promoteToCanary("m-canary", 1.0);
    CAMModelServingEngine.setRoutingPolicy("mastercam", "strategy_recommend", "sticky_active");
    const counts = { active: 0, canary: 0 };
    for (let i = 0; i < 200; i++) {
      const d = CAMModelServingEngine.routeRequest({
        cam_system: "mastercam",
        task: "strategy_recommend",
        request_key: `k-${i}`,
      });
      if (d.primary_model_id === "m-active") counts.active++;
      else if (d.primary_model_id === "m-canary") counts.canary++;
    }
    expect(counts.active).toBe(200);
    expect(counts.canary).toBe(0);
  });
});

describe("CAMModelServingEngine — health", () => {
  it("computes Wilson95, quantiles, mean, and top error classes", () => {
    CAMModelServingEngine.registerModel(spec("m1"));
    CAMModelServingEngine.deployShadow("m1");
    CAMModelServingEngine.promoteToCanary("m1", 0.5);

    const latencies = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    for (const L of latencies) {
      CAMModelServingEngine.recordMetric("m1", { latency_ms: L, success: true });
    }
    CAMModelServingEngine.recordMetric("m1", { latency_ms: 250, success: false, error_class: "TIMEOUT" });
    CAMModelServingEngine.recordMetric("m1", { latency_ms: 250, success: false, error_class: "TIMEOUT" });
    CAMModelServingEngine.recordMetric("m1", { latency_ms: 250, success: false, error_class: "5XX" });

    const h = CAMModelServingEngine.getModelHealth("m1");
    expect(h.samples).toBe(13);
    expect(h.successes).toBe(10);
    expect(h.errors).toBe(3);
    expect(h.error_rate).toBeCloseTo(3 / 13, 5);
    expect(h.wilson_lower_95_success).toBeGreaterThan(0);
    expect(h.wilson_lower_95_success).toBeLessThan(10 / 13);
    expect(h.p99_latency_ms).toBeGreaterThanOrEqual(h.p95_latency_ms);
    expect(h.p95_latency_ms).toBeGreaterThanOrEqual(h.p50_latency_ms);
    expect(h.top_error_classes[0].class).toBe("TIMEOUT");
    expect(h.top_error_classes[0].count).toBe(2);
    expect(h.top_error_classes[1].class).toBe("5XX");
    expect(h.top_error_classes[1].count).toBe(1);
  });

  it("zero-sample health reports clean defaults without throwing", () => {
    CAMModelServingEngine.registerModel(spec("m1"));
    const h = CAMModelServingEngine.getModelHealth("m1");
    expect(h.samples).toBe(0);
    expect(h.successes).toBe(0);
    expect(h.errors).toBe(0);
    expect(h.error_rate).toBe(0);
    expect(h.uptime_pct).toBe(100);
    expect(h.last_sample_ts).toBeNull();
    expect(h.p50_latency_ms).toBe(0);
  });

  it("evicts metrics in FIFO once buffer cap is reached", () => {
    CAMModelServingEngine.setMetricBufferSize(50);
    CAMModelServingEngine.registerModel(spec("m1"));
    for (let i = 0; i < 200; i++) {
      CAMModelServingEngine.recordMetric("m1", { latency_ms: i, success: true });
    }
    expect(CAMModelServingEngine.getMetricCount("m1")).toBe(50);
    const h = CAMModelServingEngine.getModelHealth("m1");
    // Last 50 samples are i=150..199 → mean = (150+199)/2 = 174.5
    expect(h.mean_latency_ms).toBeCloseTo(174.5, 5);
  });
});

describe("CAMModelServingEngine — batching", () => {
  it("size-based drain returns FIFO ordered payloads when threshold reached", () => {
    CAMModelServingEngine.registerModel(
      spec("m1", { max_batch_size: 3, max_batch_wait_ms: 10000 })
    );
    CAMModelServingEngine.enqueueBatchRequest("m1", "k1", "r1", { v: 1 });
    CAMModelServingEngine.enqueueBatchRequest("m1", "k1", "r2", { v: 2 });
    expect(CAMModelServingEngine.drainBatch("m1", "k1")).toBeNull();
    CAMModelServingEngine.enqueueBatchRequest("m1", "k1", "r3", { v: 3 });
    const drained = expectDrained(CAMModelServingEngine.drainBatch("m1", "k1"));
    expect(drained.reason).toBe("size");
    expect(drained.payloads.map((p) => p.request_id)).toEqual(["r1", "r2", "r3"]);
    expect(CAMModelServingEngine.peekBatchSize("m1", "k1")).toBe(0);
  });

  it("timeout drain triggers when wait window elapsed", () => {
    let now = T0;
    CAMModelServingEngine.setNowSource(() => now);
    CAMModelServingEngine.registerModel(
      spec("m1", { max_batch_size: 100, max_batch_wait_ms: 25 })
    );
    CAMModelServingEngine.enqueueBatchRequest("m1", "k1", "r1", { v: 1 });
    expect(CAMModelServingEngine.drainBatch("m1", "k1")).toBeNull();
    now = T0 + 30;
    const drained = expectDrained(CAMModelServingEngine.drainBatch("m1", "k1"));
    expect(drained.reason).toBe("timeout");
    expect(drained.payloads).toHaveLength(1);
    expect(drained.span_ms).toBeGreaterThanOrEqual(25);
  });

  it("force drain returns batch regardless of size or time", () => {
    CAMModelServingEngine.registerModel(
      spec("m1", { max_batch_size: 100, max_batch_wait_ms: 100000 })
    );
    CAMModelServingEngine.enqueueBatchRequest("m1", "k1", "r1", { v: 1 });
    const drained = expectDrained(CAMModelServingEngine.drainBatch("m1", "k1", true));
    expect(drained.reason).toBe("force");
    expect(drained.payloads).toHaveLength(1);
  });
});

describe("CAMModelServingEngine — rate limit", () => {
  it("token bucket consumes 1 per call until empty, then refills over time", () => {
    let now = T0;
    CAMModelServingEngine.setNowSource(() => now);
    CAMModelServingEngine.registerModel(spec("m1", { rate_capacity: 3, rate_refill_per_sec: 2 }));
    expect(CAMModelServingEngine.checkRateLimit("m1").allowed).toBe(true);
    expect(CAMModelServingEngine.checkRateLimit("m1").allowed).toBe(true);
    expect(CAMModelServingEngine.checkRateLimit("m1").allowed).toBe(true);
    const denied = CAMModelServingEngine.checkRateLimit("m1");
    expect(denied.allowed).toBe(false);
    expect(denied.retry_after_ms).toBeGreaterThan(0);
    now += 600; // at 2 tok/sec → 1.2 tokens regenerated
    const allowedAgain = CAMModelServingEngine.checkRateLimit("m1");
    expect(allowedAgain.allowed).toBe(true);
  });

  it("setRateLimit caps current tokens to new capacity", () => {
    CAMModelServingEngine.registerModel(spec("m1", { rate_capacity: 100, rate_refill_per_sec: 10 }));
    CAMModelServingEngine.setRateLimit("m1", 5, 1);
    let allowed = 0;
    for (let i = 0; i < 10; i++) {
      if (CAMModelServingEngine.checkRateLimit("m1").allowed) allowed++;
    }
    expect(allowed).toBeLessThanOrEqual(5);
    expect(getOrThrow("m1").rate_capacity).toBe(5);
    expect(getOrThrow("m1").rate_refill_per_sec).toBe(1);
  });

  it("refill_per_sec=0 yields infinite retry_after_ms when bucket empty", () => {
    CAMModelServingEngine.registerModel(spec("m1", { rate_capacity: 1, rate_refill_per_sec: 0 }));
    expect(CAMModelServingEngine.checkRateLimit("m1").allowed).toBe(true);
    const denied = CAMModelServingEngine.checkRateLimit("m1");
    expect(denied.allowed).toBe(false);
    expect(denied.retry_after_ms).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("CAMModelServingEngine — math primitives", () => {
  it("FNV-1a is deterministic and well-distributed across 1000 distinct inputs", () => {
    expect(__testing.fnv1a32("hello")).toBe(__testing.fnv1a32("hello"));
    expect(__testing.fnv1a32("hello")).not.toBe(__testing.fnv1a32("world"));
    const buckets = new Set<number>();
    for (let i = 0; i < 1000; i++) buckets.add(__testing.hashBucket(`req-${i}`));
    expect(buckets.size).toBeGreaterThan(MIN_DISTINCT_BUCKETS_PER_1000);
  });

  it("Wilson95 lower bound at 0/0 is 0 and at 1/1 is below 1", () => {
    expect(__testing.wilsonLower95(0, 0)).toBe(0);
    const w11 = __testing.wilsonLower95(1, 1);
    expect(w11).toBeGreaterThan(0);
    expect(w11).toBeLessThan(1);
    // Bound increases with sample size for the same proportion
    const w50 = __testing.wilsonLower95(50, 100);
    const w500 = __testing.wilsonLower95(500, 1000);
    expect(w500).toBeGreaterThan(w50);
  });

  it("quantile handles edges: empty, q≤0, q≥1, single", () => {
    expect(__testing.quantile([], 0.5)).toBe(0);
    expect(__testing.quantile([10], 0.5)).toBe(10);
    expect(__testing.quantile([1, 2, 3, 4], 0)).toBe(1);
    expect(__testing.quantile([1, 2, 3, 4], 1)).toBe(4);
    expect(__testing.quantile([1, 2, 3, 4], 0.5)).toBe(2);
  });

  it("Hoeffding sample size grows as 1/ε² and is finite for ε>0", () => {
    const n5 = __testing.hoeffdingMinSamples(0.05);
    const n1 = __testing.hoeffdingMinSamples(0.01);
    expect(n1).toBeGreaterThan(n5 * 20);
    expect(Number.isFinite(n5)).toBe(true);
    expect(__testing.hoeffdingMinSamples(0)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("CAMModelServingEngine — confirmations", () => {
  it("buffers pending confirmations and supports filter+clear", () => {
    CAMModelServingEngine.registerModel(spec("m1"));
    CAMModelServingEngine.deployShadow("m1");
    CAMModelServingEngine.promoteToCanary("m1", 0.5);
    CAMModelServingEngine.retireModel("m1");
    const all = CAMModelServingEngine.listPendingConfirmations();
    expect(all).toHaveLength(3);
    const decisions = all.map((e) => e.decision);
    expect(decisions).toEqual(["deploy_shadow", "promote_to_canary", "retire_model"]);
    expect(CAMModelServingEngine.listPendingConfirmations({ model_id: "m1" })).toHaveLength(3);
    expect(CAMModelServingEngine.listPendingConfirmations({ model_id: "other" })).toHaveLength(0);
    expect(CAMModelServingEngine.clearConfirmations()).toBe(3);
    expect(CAMModelServingEngine.listPendingConfirmations()).toHaveLength(0);
  });
});

describe("CAMModelServingEngine — input validation", () => {
  it("recordMetric throws on negative latency or non-bool success", () => {
    CAMModelServingEngine.registerModel(spec("m1"));
    expect(() =>
      // @ts-expect-error wrong type intentional
      CAMModelServingEngine.recordMetric("m1", { latency_ms: 10, success: "yes" })
    ).toThrow(/boolean/);
    expect(() =>
      CAMModelServingEngine.recordMetric("m1", { latency_ms: -1, success: true })
    ).toThrow(/≥ 0/);
  });

  it("setMetricBufferSize rejects non-positive", () => {
    expect(() => CAMModelServingEngine.setMetricBufferSize(0)).toThrow(/positive integer/);
    expect(() => CAMModelServingEngine.setMetricBufferSize(-5)).toThrow(/positive integer/);
  });

  it("setRoutingPolicy rejects invalid bounds", () => {
    expect(() =>
      CAMModelServingEngine.setRoutingPolicy("mastercam", "strategy_recommend", "canary_split", {
        rollback_latency_mult: 0.5,
      })
    ).toThrow(/rollback_latency_mult/);
    expect(() =>
      CAMModelServingEngine.setRoutingPolicy("mastercam", "strategy_recommend", "canary_split", {
        epsilon: 1.5,
      })
    ).toThrow(/epsilon/);
    expect(() =>
      CAMModelServingEngine.setRoutingPolicy("mastercam", "strategy_recommend", "canary_split", {
        max_error_rate: 2,
      })
    ).toThrow(/max_error_rate/);
  });
});
