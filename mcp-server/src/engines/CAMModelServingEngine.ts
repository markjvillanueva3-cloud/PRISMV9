/**
 * CAMModelServingEngine — CAM-EXHAUST-MS0/U-CAM122
 *
 * Production model-serving fabric for the CAM AGI arc (U-CAM112-121).
 * Sits between dispatcher/orchestrator callers and the underlying model
 * backends (Ollama, NVIDIA Triton, vLLM, NIM) and provides:
 *
 *   1. Model registry — register/version/retire models with status lifecycle
 *      (pending → shadow → canary → active → retired) and per-model
 *      rollout weights.
 *
 *   2. Deterministic A/B + canary routing — every (cam_system, task) pair
 *      has a routing policy. Requests are routed by deterministic FNV-1a
 *      bucketing of `request_key` (operator-id, job-id, etc.) so the same
 *      logical request always lands on the same model bucket — required
 *      for sticky reproducibility and for shadow-vs-active comparison
 *      under identical inputs.
 *
 *   3. SLO tracking — ring-buffered latency + error samples per model.
 *      Computes p50 / p95 / p99 / mean latency, error_rate, request count
 *      and a Wilson 95% lower bound on success rate. Health rollups gate
 *      promotion.
 *
 *   4. Promotion gate — canary→active requires (i) sample count
 *      N ≥ ⌈ln(2/α) / 2ε²⌉ (Hoeffding two-sided, α=0.05, ε=policy.epsilon),
 *      (ii) wilson95(success) ≥ baseline_active_success - δ, and
 *      (iii) p95_latency_ms ≤ baseline_active_p95 · (1 + latencyTolerance).
 *      Failing the gate emits a {requires_human_approval: true}
 *      ConfirmationEnvelope with the failing metric explicitly named —
 *      operator-in-the-loop is unconditional (PRISM rule).
 *
 *   5. Auto-rollback — recordMetric() detects regressions on a CANARY
 *      model: if recent error_rate exceeds policy.maxErrorRate or
 *      p95_latency exceeds the active-baseline×rollbackLatencyMult, the
 *      canary is auto-quarantined ("rollback_pending") and a confirmation
 *      envelope is buffered for operator review. The canary keeps its
 *      registration but is removed from the routing pool until the
 *      operator confirms or retires it.
 *
 *   6. Request batching — per-model micro-batch queue. enqueueBatchRequest
 *      returns {batch_id, position, eta_ms}; drainBatch returns when either
 *      max_batch_size is reached OR max_wait_ms elapsed since the head was
 *      enqueued. Order is FIFO. Batching reduces GPU underutilization on
 *      Triton/vLLM backends without changing semantics.
 *
 *   7. Rate limiting — token-bucket per model (capacity, refill_rate).
 *      checkRateLimit() returns either {allowed:true, tokens_remaining}
 *      or {allowed:false, retry_after_ms} with the exact wait until the
 *      next token regenerates.
 *
 *   8. Confirmation envelopes — every lifecycle transition (deploy,
 *      promote, demote, rollback, retire) and every gate violation
 *      returns a ConfirmationEnvelope describing the decision, the
 *      evidence, and whether human approval is required. Callers must
 *      surface these to an operator before applying the change in
 *      production. PRISM unconditional rule.
 *
 * Determinism: all routing decisions are pure functions of the request
 * key + the live policy. No Math.random in the routing path. Sample
 * order in the metric ring buffer is wall-clock; quantiles are
 * recomputed by sort-on-demand (samples are capped, so the cost is
 * O(N log N) with small N).
 *
 * Storage: process-local Maps. FIFO eviction at MAX_METRICS_PER_MODEL
 * (default 5000) and MAX_BATCH_QUEUE_PER_MODEL (default 256). Cross-
 * process persistence is delegated to k8s ConfigMap (registry seed) +
 * Prometheus (metric history) — out of scope for this engine.
 *
 * References:
 *   - Hoeffding, W. (1963) "Probability Inequalities for Sums of Bounded
 *     Random Variables" J. Am. Stat. Assoc. 58, 13-30.
 *   - Wilson, E.B. (1927) "Probable Inference, the Law of Succession,
 *     and Statistical Inference" J. Am. Stat. Assoc. 22, 209-212.
 *   - Tang, D. et al. (2010) "Overlapping Experiment Infrastructure"
 *     KDD 2010 (Google A/B framework).
 *   - Argo Rollouts canary analysis spec — k8s reference for the
 *     promotion gate semantics implemented here.
 *
 * Authored 2026-05-05 — CAM-EXHAUST-MS0/U-CAM122.
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ModelStatus =
  | "pending" // registered, not deployed
  | "shadow" // receives mirrored traffic; response not used
  | "canary" // receives a slice of live traffic by weight
  | "active" // primary live model
  | "rollback_pending" // auto-quarantined; awaiting operator decision
  | "retired"; // removed from routing pool

export type ModelBackend = "ollama" | "triton" | "vllm" | "nim" | "openai" | "anthropic" | "custom";

export type RoutingPolicyKind = "weighted" | "canary_split" | "shadow_only" | "sticky_active";

export interface ModelSpec {
  id: string;
  name: string;
  version: string;
  backend: ModelBackend;
  endpoint_url: string;
  cam_systems: string[];
  tasks: string[];
  /** Initial rollout weight (0..1). Ignored when status≠canary. */
  weight?: number;
  /** Per-request capacity in token-bucket terms. */
  rate_capacity?: number;
  /** Refill rate (tokens/sec). */
  rate_refill_per_sec?: number;
  /** Batching: max requests batched together. */
  max_batch_size?: number;
  /** Batching: max ms before flush. */
  max_batch_wait_ms?: number;
  /** Free-form metadata (commit hash, training run id). */
  metadata?: Record<string, string>;
}

export interface Model extends ModelSpec {
  status: ModelStatus;
  registered_at: number;
  status_changed_at: number;
  weight: number;
  rate_capacity: number;
  rate_refill_per_sec: number;
  max_batch_size: number;
  max_batch_wait_ms: number;
  metadata: Record<string, string>;
}

export interface RoutingPolicy {
  cam_system: string;
  task: string;
  kind: RoutingPolicyKind;
  /** ε for Hoeffding sample-size gate (default 0.05). */
  epsilon: number;
  /** Max error_rate the canary may exhibit before rollback (default 0.10). */
  max_error_rate: number;
  /** Latency tolerance for canary vs active (default 1.30 = +30%). */
  latency_tolerance: number;
  /** Latency rollback multiplier (default 1.50). */
  rollback_latency_mult: number;
  /** Wilson lower-bound delta vs active (default 0.05). */
  wilson_delta: number;
  /** Min samples before promotion gate may PASS (default 200). */
  min_samples_for_promotion: number;
  /** Min samples before rollback may auto-fire (default 30). */
  min_samples_for_rollback: number;
}

export interface RouteRequest {
  cam_system: string;
  task: string;
  /** Stable per-request key used for deterministic bucketing. */
  request_key: string;
  /** Optional priority hint (informational only). */
  priority?: "low" | "normal" | "high";
}

export interface RouteDecision {
  primary_model_id: string | null;
  shadow_model_ids: string[];
  fallback_model_ids: string[];
  /** Bucket [0,1000) the request was hashed into. */
  bucket: number;
  /** Routing policy applied. */
  policy_kind: RoutingPolicyKind | "default";
  /** Empty when primary_model_id is null. */
  rationale: string;
}

export interface MetricSample {
  ts: number;
  latency_ms: number;
  success: boolean;
  /** Optional error class for taxonomy tracking. */
  error_class?: string;
}

export interface ModelHealth {
  model_id: string;
  status: ModelStatus;
  samples: number;
  successes: number;
  errors: number;
  error_rate: number;
  /** Wilson 95% lower bound on success rate. */
  wilson_lower_95_success: number;
  mean_latency_ms: number;
  p50_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  uptime_pct: number;
  last_sample_ts: number | null;
  /** Top-3 error classes by count. */
  top_error_classes: Array<{ class: string; count: number }>;
}

export interface ConfirmationEnvelope {
  decision: string;
  model_id: string;
  /** When false, decision was applied; when true, operator must confirm. */
  applied: boolean;
  requires_human_approval: boolean;
  evidence: Record<string, number | string | boolean>;
  rationale: string;
  ts: number;
}

export interface BatchEnqueueResult {
  batch_id: string;
  model_id: string;
  position: number;
  eta_ms: number;
}

export interface BatchDrainResult {
  batch_id: string;
  model_id: string;
  /** Payload list in FIFO order. */
  payloads: Array<{ request_id: string; payload: unknown }>;
  /** ms from earliest enqueue to drain. */
  span_ms: number;
  /** Reason: size threshold reached or timeout. */
  reason: "size" | "timeout" | "force";
}

export interface RateLimitDecision {
  allowed: boolean;
  tokens_remaining: number;
  retry_after_ms: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const MAX_METRICS_PER_MODEL = 5000;
const MAX_BATCH_QUEUE_PER_MODEL = 256;
const MAX_PENDING_CONFIRMATIONS = 256;
const MAX_BUCKETS = 1000;
const ALPHA_HOEFFDING = 0.05;

const DEFAULT_POLICY: Omit<RoutingPolicy, "cam_system" | "task" | "kind"> = {
  epsilon: 0.05,
  max_error_rate: 0.10,
  latency_tolerance: 0.30,
  rollback_latency_mult: 1.50,
  wilson_delta: 0.05,
  min_samples_for_promotion: 200,
  min_samples_for_rollback: 30,
};

const DEFAULT_RATE_CAPACITY = 100;
const DEFAULT_RATE_REFILL_PER_SEC = 50;
const DEFAULT_MAX_BATCH_SIZE = 8;
const DEFAULT_MAX_BATCH_WAIT_MS = 25;

// ═══════════════════════════════════════════════════════════════════════════
// MATH
// ═══════════════════════════════════════════════════════════════════════════

/** FNV-1a 32-bit hash. Pure, deterministic, no allocation per char. */
function fnv1a32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    // h * 16777619, mod 2^32
    h = (h + ((h << 1) >>> 0) + ((h << 4) >>> 0) + ((h << 7) >>> 0) + ((h << 8) >>> 0) + ((h << 24) >>> 0)) >>> 0;
  }
  return h >>> 0;
}

function hashBucket(key: string, max = MAX_BUCKETS): number {
  return fnv1a32(key) % max;
}

/** Wilson score 95% lower confidence bound on a Bernoulli success rate. */
function wilsonLower95(successes: number, n: number): number {
  if (n <= 0) return 0;
  const z = 1.96;
  const phat = successes / n;
  const denom = 1 + (z * z) / n;
  const center = phat + (z * z) / (2 * n);
  const margin = z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * n)) / n);
  return Math.max(0, (center - margin) / denom);
}

/** Quantile via sort-on-clone. q ∈ (0,1]. Empty → 0. */
function quantile(values: ReadonlyArray<number>, q: number): number {
  if (values.length === 0) return 0;
  if (q <= 0) return values.reduce((m, v) => Math.min(m, v), values[0]);
  if (q >= 1) return values.reduce((m, v) => Math.max(m, v), values[0]);
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
  return sorted[idx];
}

/** Hoeffding sample-size N for a one-sided ε at confidence 1-α. */
function hoeffdingMinSamples(epsilon: number, alpha: number = ALPHA_HOEFFDING): number {
  if (epsilon <= 0) return Number.POSITIVE_INFINITY;
  return Math.ceil(Math.log(2 / alpha) / (2 * epsilon * epsilon));
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function ensureNonEmpty(value: string, label: string): void {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function ensureFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }
}

function ensureRange(value: number, lo: number, hi: number, label: string): void {
  ensureFinite(value, label);
  if (value < lo || value > hi) {
    throw new Error(`${label} must be in [${lo}, ${hi}]; got ${value}`);
  }
}

function ensurePositiveInt(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer; got ${value}`);
  }
}

function policyKey(camSystem: string, task: string): string {
  return `${camSystem}::${task}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

interface BatchEntry {
  request_id: string;
  payload: unknown;
  enqueued_at: number;
}

interface BatchQueue {
  batch_id: string;
  entries: BatchEntry[];
  opened_at: number;
}

interface RateBucket {
  tokens: number;
  last_refill_ms: number;
  capacity: number;
  refill_per_sec: number;
}

interface InternalState {
  models: Map<string, Model>;
  policies: Map<string, RoutingPolicy>;
  metrics: Map<string, MetricSample[]>;
  rateBuckets: Map<string, RateBucket>;
  batchQueues: Map<string, Map<string, BatchQueue>>; // model_id → batch_key → queue
  pendingConfirmations: ConfirmationEnvelope[];
  metricBufferSize: number;
  batchSeq: number;
  /** Now-source — overridable for tests. */
  now: () => number;
}

function freshState(): InternalState {
  return {
    models: new Map(),
    policies: new Map(),
    metrics: new Map(),
    rateBuckets: new Map(),
    batchQueues: new Map(),
    pendingConfirmations: [],
    metricBufferSize: MAX_METRICS_PER_MODEL,
    batchSeq: 0,
    now: () => Date.now(),
  };
}

const state: InternalState = freshState();

function pushConfirmation(env: ConfirmationEnvelope): void {
  state.pendingConfirmations.push(env);
  while (state.pendingConfirmations.length > MAX_PENDING_CONFIRMATIONS) {
    state.pendingConfirmations.shift();
  }
}

function refillRate(bucket: RateBucket, now: number): void {
  const elapsed_s = Math.max(0, (now - bucket.last_refill_ms) / 1000);
  const refill = elapsed_s * bucket.refill_per_sec;
  bucket.tokens = Math.min(bucket.capacity, bucket.tokens + refill);
  bucket.last_refill_ms = now;
}

function modelOrThrow(id: string): Model {
  ensureNonEmpty(id, "model id");
  const m = state.models.get(id);
  if (!m) throw new Error(`unknown model id: ${id}`);
  return m;
}

function activeModelsFor(camSystem: string, task: string): Model[] {
  const out: Model[] = [];
  for (const m of state.models.values()) {
    if (m.status !== "active") continue;
    if (!m.cam_systems.includes(camSystem)) continue;
    if (!m.tasks.includes(task)) continue;
    out.push(m);
  }
  return out;
}

function canaryModelsFor(camSystem: string, task: string): Model[] {
  const out: Model[] = [];
  for (const m of state.models.values()) {
    if (m.status !== "canary") continue;
    if (!m.cam_systems.includes(camSystem)) continue;
    if (!m.tasks.includes(task)) continue;
    out.push(m);
  }
  return out;
}

function shadowModelsFor(camSystem: string, task: string): Model[] {
  const out: Model[] = [];
  for (const m of state.models.values()) {
    if (m.status !== "shadow") continue;
    if (!m.cam_systems.includes(camSystem)) continue;
    if (!m.tasks.includes(task)) continue;
    out.push(m);
  }
  return out;
}

function computeHealth(modelId: string): ModelHealth {
  const m = modelOrThrow(modelId);
  const samples = state.metrics.get(modelId) ?? [];
  const total = samples.length;
  const successes = samples.reduce((s, x) => s + (x.success ? 1 : 0), 0);
  const errors = total - successes;
  const errorRate = total === 0 ? 0 : errors / total;
  const latencies = samples.map((s) => s.latency_ms);
  const sumL = latencies.reduce((a, b) => a + b, 0);
  const meanL = total === 0 ? 0 : sumL / total;

  const errClassCounts = new Map<string, number>();
  for (const s of samples) {
    if (!s.success && s.error_class) {
      errClassCounts.set(s.error_class, (errClassCounts.get(s.error_class) ?? 0) + 1);
    }
  }
  const top_error_classes = [...errClassCounts.entries()]
    .map(([cls, count]) => ({ class: cls, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return {
    model_id: modelId,
    status: m.status,
    samples: total,
    successes,
    errors,
    error_rate: errorRate,
    wilson_lower_95_success: wilsonLower95(successes, total),
    mean_latency_ms: meanL,
    p50_latency_ms: quantile(latencies, 0.50),
    p95_latency_ms: quantile(latencies, 0.95),
    p99_latency_ms: quantile(latencies, 0.99),
    uptime_pct: total === 0 ? 100 : (1 - errorRate) * 100,
    last_sample_ts: total === 0 ? null : samples[samples.length - 1].ts,
    top_error_classes,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * CAMModelServingEngine — production model-serving fabric for CAM AGI
 * (registry, deterministic routing, SLO tracking, promotion gates,
 * batching, rate-limit, operator confirmation envelopes).
 */
export class CAMModelServingEngine {
  // ─── REGISTRY ──────────────────────────────────────────────────────────

  /** Register a model. New models start in "pending". */
  static registerModel(spec: ModelSpec): Model {
    ensureNonEmpty(spec.id, "spec.id");
    ensureNonEmpty(spec.name, "spec.name");
    ensureNonEmpty(spec.version, "spec.version");
    ensureNonEmpty(spec.endpoint_url, "spec.endpoint_url");
    if (!Array.isArray(spec.cam_systems) || spec.cam_systems.length === 0) {
      throw new Error("spec.cam_systems must be a non-empty array");
    }
    if (!Array.isArray(spec.tasks) || spec.tasks.length === 0) {
      throw new Error("spec.tasks must be a non-empty array");
    }
    if (state.models.has(spec.id)) {
      throw new Error(`model already registered: ${spec.id}`);
    }
    const weight = spec.weight ?? 0;
    ensureRange(weight, 0, 1, "spec.weight");

    const rate_capacity = spec.rate_capacity ?? DEFAULT_RATE_CAPACITY;
    const rate_refill_per_sec = spec.rate_refill_per_sec ?? DEFAULT_RATE_REFILL_PER_SEC;
    ensurePositiveInt(rate_capacity, "spec.rate_capacity");
    ensureFinite(rate_refill_per_sec, "spec.rate_refill_per_sec");
    if (rate_refill_per_sec < 0) throw new Error("spec.rate_refill_per_sec must be ≥ 0");

    const max_batch_size = spec.max_batch_size ?? DEFAULT_MAX_BATCH_SIZE;
    const max_batch_wait_ms = spec.max_batch_wait_ms ?? DEFAULT_MAX_BATCH_WAIT_MS;
    ensurePositiveInt(max_batch_size, "spec.max_batch_size");
    ensurePositiveInt(max_batch_wait_ms, "spec.max_batch_wait_ms");

    const now = state.now();
    const model: Model = {
      ...spec,
      cam_systems: [...spec.cam_systems],
      tasks: [...spec.tasks],
      weight,
      rate_capacity,
      rate_refill_per_sec,
      max_batch_size,
      max_batch_wait_ms,
      metadata: { ...(spec.metadata ?? {}) },
      status: "pending",
      registered_at: now,
      status_changed_at: now,
    };
    state.models.set(model.id, model);
    state.metrics.set(model.id, []);
    state.rateBuckets.set(model.id, {
      tokens: rate_capacity,
      last_refill_ms: now,
      capacity: rate_capacity,
      refill_per_sec: rate_refill_per_sec,
    });
    state.batchQueues.set(model.id, new Map());
    return { ...model };
  }

  static deregisterModel(id: string): void {
    modelOrThrow(id);
    state.models.delete(id);
    state.metrics.delete(id);
    state.rateBuckets.delete(id);
    state.batchQueues.delete(id);
  }

  static listModels(filter?: { status?: ModelStatus; cam_system?: string; task?: string }): Model[] {
    const out: Model[] = [];
    for (const m of state.models.values()) {
      if (filter?.status && m.status !== filter.status) continue;
      if (filter?.cam_system && !m.cam_systems.includes(filter.cam_system)) continue;
      if (filter?.task && !m.tasks.includes(filter.task)) continue;
      out.push({ ...m });
    }
    return out;
  }

  static getModel(id: string): Model | null {
    const m = state.models.get(id);
    return m ? { ...m } : null;
  }

  /** Update endpoint URL (e.g. after k8s service rollover). */
  static updateModelEndpoint(id: string, url: string): Model {
    ensureNonEmpty(url, "url");
    const m = modelOrThrow(id);
    m.endpoint_url = url;
    return { ...m };
  }

  // ─── ROUTING POLICY ────────────────────────────────────────────────────

  static setRoutingPolicy(
    camSystem: string,
    task: string,
    kind: RoutingPolicyKind,
    overrides: Partial<typeof DEFAULT_POLICY> = {}
  ): RoutingPolicy {
    ensureNonEmpty(camSystem, "camSystem");
    ensureNonEmpty(task, "task");
    const policy: RoutingPolicy = {
      cam_system: camSystem,
      task,
      kind,
      ...DEFAULT_POLICY,
      ...overrides,
    };
    if (overrides.epsilon !== undefined) ensureRange(overrides.epsilon, 0.001, 0.5, "epsilon");
    if (overrides.max_error_rate !== undefined) ensureRange(overrides.max_error_rate, 0, 1, "max_error_rate");
    if (overrides.wilson_delta !== undefined) ensureRange(overrides.wilson_delta, 0, 1, "wilson_delta");
    if (overrides.latency_tolerance !== undefined) {
      ensureRange(overrides.latency_tolerance, 0, 10, "latency_tolerance");
    }
    if (overrides.rollback_latency_mult !== undefined) {
      if (overrides.rollback_latency_mult <= 1) {
        throw new Error("rollback_latency_mult must be > 1");
      }
    }
    if (overrides.min_samples_for_promotion !== undefined) {
      ensurePositiveInt(overrides.min_samples_for_promotion, "min_samples_for_promotion");
    }
    if (overrides.min_samples_for_rollback !== undefined) {
      ensurePositiveInt(overrides.min_samples_for_rollback, "min_samples_for_rollback");
    }
    state.policies.set(policyKey(camSystem, task), policy);
    return { ...policy };
  }

  static getRoutingPolicy(camSystem: string, task: string): RoutingPolicy | null {
    const p = state.policies.get(policyKey(camSystem, task));
    return p ? { ...p } : null;
  }

  static listRoutingPolicies(): RoutingPolicy[] {
    return [...state.policies.values()].map((p) => ({ ...p }));
  }

  // ─── ROUTING ───────────────────────────────────────────────────────────

  /**
   * Route a request to a primary model + shadow models + fallbacks. Pure
   * function of the request key + current registry/policy state.
   *
   * Bucketing: hashBucket(request_key) → b ∈ [0,1000). Canary models with
   * cumulative weight wᵢ claim buckets [Σ_{j<i} wⱼ·1000, (Σ_{j<i} wⱼ +
   * wᵢ)·1000). Otherwise the active model takes the request. If multiple
   * actives exist (shouldn't happen in steady-state but is allowed during
   * promotion), they round-robin by bucket modulo activesCount.
   */
  static routeRequest(req: RouteRequest): RouteDecision {
    ensureNonEmpty(req.cam_system, "req.cam_system");
    ensureNonEmpty(req.task, "req.task");
    ensureNonEmpty(req.request_key, "req.request_key");

    const policy = state.policies.get(policyKey(req.cam_system, req.task));
    const policyKind: RoutingPolicyKind | "default" = policy?.kind ?? "default";

    const actives = activeModelsFor(req.cam_system, req.task);
    const canaries = canaryModelsFor(req.cam_system, req.task);
    const shadows = shadowModelsFor(req.cam_system, req.task);
    const bucket = hashBucket(req.request_key);

    // Primary selection logic
    let primaryId: string | null = null;
    let rationale = "";

    if (policyKind === "shadow_only") {
      // No live traffic — shadow only. No primary.
      primaryId = null;
      rationale = `policy=shadow_only — no live traffic for cam=${req.cam_system} task=${req.task}`;
    } else if (canaries.length > 0 && policyKind !== "sticky_active") {
      // Canary split: cumulative-weight bucket assignment.
      const totalCanaryWeight = canaries.reduce((s, m) => s + m.weight, 0);
      const safeWeight = Math.max(0, Math.min(1, totalCanaryWeight));
      const canaryThreshold = Math.floor(safeWeight * MAX_BUCKETS);
      if (bucket < canaryThreshold) {
        // Choose which canary by sub-bucket weight ordering.
        let cumul = 0;
        for (const c of canaries) {
          const upper = cumul + Math.floor((c.weight / safeWeight) * canaryThreshold);
          if (bucket < upper) {
            primaryId = c.id;
            rationale = `canary ${c.id} (weight=${c.weight.toFixed(3)}, bucket=${bucket}/${MAX_BUCKETS})`;
            break;
          }
          cumul = upper;
        }
        if (!primaryId && canaries.length > 0) {
          // Numerical edge — fall back to first canary
          primaryId = canaries[0].id;
          rationale = `canary ${canaries[0].id} (edge bucket=${bucket})`;
        }
      } else if (actives.length > 0) {
        const idx = bucket % actives.length;
        primaryId = actives[idx].id;
        rationale = `active ${actives[idx].id} (bucket ≥ canary threshold ${canaryThreshold})`;
      } else {
        primaryId = null;
        rationale = `no active model AND bucket ${bucket} ≥ canary threshold ${canaryThreshold}`;
      }
    } else if (actives.length > 0) {
      const idx = bucket % actives.length;
      primaryId = actives[idx].id;
      rationale = `active ${actives[idx].id} (no canary)`;
    } else {
      primaryId = null;
      rationale = `no active model registered for cam=${req.cam_system} task=${req.task}`;
    }

    // Fallbacks: other actives (if multiple) then canaries (excluding primary)
    const fallbacks: string[] = [];
    for (const m of actives) if (m.id !== primaryId) fallbacks.push(m.id);
    for (const m of canaries) if (m.id !== primaryId) fallbacks.push(m.id);

    return {
      primary_model_id: primaryId,
      shadow_model_ids: shadows.map((m) => m.id),
      fallback_model_ids: fallbacks,
      bucket,
      policy_kind: policyKind,
      rationale,
    };
  }

  // ─── LIFECYCLE TRANSITIONS ─────────────────────────────────────────────

  static deployShadow(modelId: string): ConfirmationEnvelope {
    const m = modelOrThrow(modelId);
    if (m.status !== "pending") {
      throw new Error(`deployShadow requires status=pending; ${modelId} is ${m.status}`);
    }
    m.status = "shadow";
    m.status_changed_at = state.now();
    const env: ConfirmationEnvelope = {
      decision: "deploy_shadow",
      model_id: modelId,
      applied: true,
      requires_human_approval: false,
      evidence: { previous_status: "pending", new_status: "shadow" },
      rationale: `model ${modelId} promoted pending→shadow`,
      ts: m.status_changed_at,
    };
    pushConfirmation(env);
    return env;
  }

  static promoteToCanary(modelId: string, weight: number): ConfirmationEnvelope {
    ensureRange(weight, 0, 1, "weight");
    const m = modelOrThrow(modelId);
    if (m.status !== "shadow" && m.status !== "rollback_pending") {
      throw new Error(`promoteToCanary requires status in {shadow, rollback_pending}; ${modelId} is ${m.status}`);
    }
    const prev = m.status;
    m.status = "canary";
    m.weight = weight;
    m.status_changed_at = state.now();
    const env: ConfirmationEnvelope = {
      decision: "promote_to_canary",
      model_id: modelId,
      applied: true,
      requires_human_approval: false,
      evidence: { previous_status: prev, weight, new_status: "canary" },
      rationale: `model ${modelId} promoted ${prev}→canary @ weight=${weight.toFixed(3)}`,
      ts: m.status_changed_at,
    };
    pushConfirmation(env);
    return env;
  }

  /**
   * Promote canary → active. Applies the gate:
   *   N ≥ Hoeffding(ε)
   *   wilson_lower_95(canary_success) ≥ wilson_lower_95(active_success) − δ
   *   p95(canary_latency)            ≤ p95(active_latency) · (1 + tol)
   * Returns ConfirmationEnvelope. If gate fails, returns
   * applied=false / requires_human_approval=true with the failing metric.
   */
  static promoteToActive(modelId: string): ConfirmationEnvelope {
    const m = modelOrThrow(modelId);
    if (m.status !== "canary") {
      throw new Error(`promoteToActive requires status=canary; ${modelId} is ${m.status}`);
    }
    const policy = state.policies.get(policyKey(m.cam_systems[0], m.tasks[0])) ?? null;
    const eps = policy?.epsilon ?? DEFAULT_POLICY.epsilon;
    const minN = Math.max(policy?.min_samples_for_promotion ?? DEFAULT_POLICY.min_samples_for_promotion, hoeffdingMinSamples(eps));
    const tol = policy?.latency_tolerance ?? DEFAULT_POLICY.latency_tolerance;
    const delta = policy?.wilson_delta ?? DEFAULT_POLICY.wilson_delta;

    const canaryHealth = computeHealth(modelId);

    // Compare against the union of the active models for the same (cam,task).
    const actives = activeModelsFor(m.cam_systems[0], m.tasks[0]);
    let activeSamples = 0;
    let activeSuccesses = 0;
    let activeLatencies: number[] = [];
    for (const a of actives) {
      const ms = state.metrics.get(a.id) ?? [];
      activeSamples += ms.length;
      activeSuccesses += ms.reduce((s, x) => s + (x.success ? 1 : 0), 0);
      activeLatencies = activeLatencies.concat(ms.map((s) => s.latency_ms));
    }
    const activeWilson = wilsonLower95(activeSuccesses, activeSamples);
    const activeP95 = quantile(activeLatencies, 0.95);

    const failures: string[] = [];
    if (canaryHealth.samples < minN) {
      failures.push(`samples ${canaryHealth.samples} < min ${minN}`);
    }
    if (actives.length > 0 && canaryHealth.wilson_lower_95_success < activeWilson - delta) {
      failures.push(
        `wilson95(canary)=${canaryHealth.wilson_lower_95_success.toFixed(3)} < wilson95(active)=${activeWilson.toFixed(3)} − δ ${delta}`
      );
    }
    if (actives.length > 0 && activeP95 > 0 && canaryHealth.p95_latency_ms > activeP95 * (1 + tol)) {
      failures.push(
        `p95(canary)=${canaryHealth.p95_latency_ms.toFixed(1)}ms > p95(active)=${activeP95.toFixed(1)}ms · (1+${tol}) = ${(activeP95 * (1 + tol)).toFixed(1)}ms`
      );
    }

    if (failures.length > 0) {
      const env: ConfirmationEnvelope = {
        decision: "promote_to_active",
        model_id: modelId,
        applied: false,
        requires_human_approval: true,
        evidence: {
          samples: canaryHealth.samples,
          min_samples: minN,
          wilson95_canary: canaryHealth.wilson_lower_95_success,
          wilson95_active: activeWilson,
          wilson_delta: delta,
          p95_canary_ms: canaryHealth.p95_latency_ms,
          p95_active_ms: activeP95,
          latency_tolerance: tol,
          failures: failures.join("; "),
        },
        rationale: `gate FAIL: ${failures.join("; ")}`,
        ts: state.now(),
      };
      pushConfirmation(env);
      return env;
    }

    // Gate passed — demote any existing actives in this slice to canary
    // (preserving their weights at 0.0 so traffic flows fully to the new
    // active by default; operator can re-introduce them if desired).
    for (const a of actives) {
      a.status = "canary";
      a.weight = 0;
      a.status_changed_at = state.now();
    }
    m.status = "active";
    m.weight = 1;
    m.status_changed_at = state.now();

    const env: ConfirmationEnvelope = {
      decision: "promote_to_active",
      model_id: modelId,
      applied: true,
      requires_human_approval: false,
      evidence: {
        samples: canaryHealth.samples,
        wilson95_canary: canaryHealth.wilson_lower_95_success,
        wilson95_active: activeWilson,
        p95_canary_ms: canaryHealth.p95_latency_ms,
        p95_active_ms: activeP95,
        demoted_actives: actives.map((a) => a.id).join(",") || "(none)",
      },
      rationale: `gate PASS — canary ${modelId} promoted to active`,
      ts: state.now(),
    };
    pushConfirmation(env);
    return env;
  }

  static demoteFromActive(modelId: string, reason: string): ConfirmationEnvelope {
    ensureNonEmpty(reason, "reason");
    const m = modelOrThrow(modelId);
    if (m.status !== "active") {
      throw new Error(`demoteFromActive requires status=active; ${modelId} is ${m.status}`);
    }
    m.status = "canary";
    m.weight = 0;
    m.status_changed_at = state.now();
    const env: ConfirmationEnvelope = {
      decision: "demote_from_active",
      model_id: modelId,
      applied: true,
      requires_human_approval: false,
      evidence: { previous_status: "active", new_status: "canary", reason },
      rationale: `model ${modelId} demoted active→canary: ${reason}`,
      ts: m.status_changed_at,
    };
    pushConfirmation(env);
    return env;
  }

  static rollbackCanary(modelId: string, reason: string): ConfirmationEnvelope {
    ensureNonEmpty(reason, "reason");
    const m = modelOrThrow(modelId);
    if (m.status !== "canary" && m.status !== "rollback_pending") {
      throw new Error(`rollbackCanary requires status in {canary, rollback_pending}; ${modelId} is ${m.status}`);
    }
    m.status = "rollback_pending";
    m.weight = 0;
    m.status_changed_at = state.now();
    const env: ConfirmationEnvelope = {
      decision: "rollback_canary",
      model_id: modelId,
      applied: true,
      requires_human_approval: true,
      evidence: { previous_status: "canary", new_status: "rollback_pending", reason },
      rationale: `canary ${modelId} auto-quarantined: ${reason}`,
      ts: m.status_changed_at,
    };
    pushConfirmation(env);
    return env;
  }

  static retireModel(modelId: string): ConfirmationEnvelope {
    const m = modelOrThrow(modelId);
    const prev = m.status;
    m.status = "retired";
    m.weight = 0;
    m.status_changed_at = state.now();
    const env: ConfirmationEnvelope = {
      decision: "retire_model",
      model_id: modelId,
      applied: true,
      requires_human_approval: false,
      evidence: { previous_status: prev, new_status: "retired" },
      rationale: `model ${modelId} retired from ${prev}`,
      ts: m.status_changed_at,
    };
    pushConfirmation(env);
    return env;
  }

  // ─── METRICS ───────────────────────────────────────────────────────────

  /**
   * Append a metric sample. Triggers auto-rollback for canary models that
   * exceed policy.max_error_rate or policy.rollback_latency_mult relative
   * to active baseline.
   */
  static recordMetric(modelId: string, sample: Omit<MetricSample, "ts"> & { ts?: number }): void {
    const m = modelOrThrow(modelId);
    if (typeof sample.success !== "boolean") {
      throw new Error("sample.success must be a boolean");
    }
    ensureFinite(sample.latency_ms, "sample.latency_ms");
    if (sample.latency_ms < 0) throw new Error("sample.latency_ms must be ≥ 0");

    const buf = state.metrics.get(modelId);
    if (!buf) throw new Error(`metric buffer missing for ${modelId}`);
    buf.push({
      ts: sample.ts ?? state.now(),
      latency_ms: sample.latency_ms,
      success: sample.success,
      error_class: sample.error_class,
    });
    while (buf.length > state.metricBufferSize) buf.shift();

    if (m.status === "canary") {
      const policy = state.policies.get(policyKey(m.cam_systems[0], m.tasks[0])) ?? null;
      const minN = policy?.min_samples_for_rollback ?? DEFAULT_POLICY.min_samples_for_rollback;
      const maxErr = policy?.max_error_rate ?? DEFAULT_POLICY.max_error_rate;
      const rollMult = policy?.rollback_latency_mult ?? DEFAULT_POLICY.rollback_latency_mult;
      if (buf.length >= minN) {
        const health = computeHealth(modelId);
        if (health.error_rate > maxErr) {
          this.rollbackCanary(modelId, `error_rate ${health.error_rate.toFixed(3)} > ${maxErr.toFixed(3)}`);
          return;
        }
        const actives = activeModelsFor(m.cam_systems[0], m.tasks[0]);
        if (actives.length > 0) {
          const activeLat: number[] = [];
          for (const a of actives) activeLat.push(...(state.metrics.get(a.id) ?? []).map((s) => s.latency_ms));
          const activeP95 = quantile(activeLat, 0.95);
          if (activeP95 > 0 && health.p95_latency_ms > activeP95 * rollMult) {
            this.rollbackCanary(
              modelId,
              `p95 ${health.p95_latency_ms.toFixed(1)}ms > active p95 ${activeP95.toFixed(1)}ms · ${rollMult}`
            );
          }
        }
      }
    }
  }

  static getModelHealth(modelId: string): ModelHealth {
    return computeHealth(modelId);
  }

  static listAllHealth(): ModelHealth[] {
    return [...state.models.keys()].map(computeHealth);
  }

  // ─── BATCHING ──────────────────────────────────────────────────────────

  static enqueueBatchRequest(modelId: string, batchKey: string, requestId: string, payload: unknown): BatchEnqueueResult {
    ensureNonEmpty(batchKey, "batchKey");
    ensureNonEmpty(requestId, "requestId");
    const m = modelOrThrow(modelId);
    const queues = state.batchQueues.get(modelId)!;
    let queue = queues.get(batchKey);
    if (!queue) {
      state.batchSeq += 1;
      queue = {
        batch_id: `b${state.batchSeq}`,
        entries: [],
        opened_at: state.now(),
      };
      queues.set(batchKey, queue);
    }
    if (queue.entries.length >= MAX_BATCH_QUEUE_PER_MODEL) {
      throw new Error(
        `batch queue overflow for model=${modelId} key=${batchKey} (cap=${MAX_BATCH_QUEUE_PER_MODEL})`
      );
    }
    queue.entries.push({ request_id: requestId, payload, enqueued_at: state.now() });
    const remaining = Math.max(0, m.max_batch_size - queue.entries.length);
    const eta_ms = remaining === 0 ? 0 : m.max_batch_wait_ms - (state.now() - queue.opened_at);
    return {
      batch_id: queue.batch_id,
      model_id: modelId,
      position: queue.entries.length,
      eta_ms: Math.max(0, eta_ms),
    };
  }

  /**
   * Drain a batch if size threshold reached or wait window elapsed. Set
   * force=true to drain regardless. Returns null if nothing to drain.
   */
  static drainBatch(modelId: string, batchKey: string, force = false): BatchDrainResult | null {
    ensureNonEmpty(batchKey, "batchKey");
    const m = modelOrThrow(modelId);
    const queues = state.batchQueues.get(modelId);
    if (!queues) return null;
    const queue = queues.get(batchKey);
    if (!queue || queue.entries.length === 0) return null;

    const now = state.now();
    const span = now - queue.opened_at;
    const sizeReached = queue.entries.length >= m.max_batch_size;
    const timeoutReached = span >= m.max_batch_wait_ms;

    if (!force && !sizeReached && !timeoutReached) return null;
    const reason: BatchDrainResult["reason"] = force ? "force" : sizeReached ? "size" : "timeout";

    const drained: BatchDrainResult = {
      batch_id: queue.batch_id,
      model_id: modelId,
      payloads: queue.entries.map((e) => ({ request_id: e.request_id, payload: e.payload })),
      span_ms: span,
      reason,
    };
    queues.delete(batchKey);
    return drained;
  }

  static peekBatchSize(modelId: string, batchKey: string): number {
    modelOrThrow(modelId);
    return state.batchQueues.get(modelId)?.get(batchKey)?.entries.length ?? 0;
  }

  // ─── RATE LIMITING ─────────────────────────────────────────────────────

  static checkRateLimit(modelId: string): RateLimitDecision {
    modelOrThrow(modelId);
    const bucket = state.rateBuckets.get(modelId)!;
    const now = state.now();
    refillRate(bucket, now);
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return { allowed: true, tokens_remaining: bucket.tokens, retry_after_ms: 0 };
    }
    const need = 1 - bucket.tokens;
    const retry_after_ms = bucket.refill_per_sec > 0 ? Math.ceil((need / bucket.refill_per_sec) * 1000) : Number.POSITIVE_INFINITY;
    return { allowed: false, tokens_remaining: bucket.tokens, retry_after_ms };
  }

  static setRateLimit(modelId: string, capacity: number, refillPerSec: number): Model {
    ensurePositiveInt(capacity, "capacity");
    ensureFinite(refillPerSec, "refillPerSec");
    if (refillPerSec < 0) throw new Error("refillPerSec must be ≥ 0");
    const m = modelOrThrow(modelId);
    const b = state.rateBuckets.get(modelId)!;
    b.capacity = capacity;
    b.refill_per_sec = refillPerSec;
    b.tokens = Math.min(b.tokens, capacity);
    m.rate_capacity = capacity;
    m.rate_refill_per_sec = refillPerSec;
    return { ...m };
  }

  // ─── CONFIRMATIONS ─────────────────────────────────────────────────────

  /** Get pending confirmation envelopes (newest last). */
  static listPendingConfirmations(filter?: { model_id?: string; requires_human_approval?: boolean }): ConfirmationEnvelope[] {
    return state.pendingConfirmations.filter((e) => {
      if (filter?.model_id && e.model_id !== filter.model_id) return false;
      if (filter?.requires_human_approval !== undefined && e.requires_human_approval !== filter.requires_human_approval) {
        return false;
      }
      return true;
    });
  }

  static clearConfirmations(): number {
    const n = state.pendingConfirmations.length;
    state.pendingConfirmations.length = 0;
    return n;
  }

  // ─── INTROSPECTION ─────────────────────────────────────────────────────

  static getRegistrySize(): number {
    return state.models.size;
  }

  static getMetricCount(modelId: string): number {
    return (state.metrics.get(modelId) ?? []).length;
  }

  // ─── CONFIG / TEST HOOKS ───────────────────────────────────────────────

  static setMetricBufferSize(n: number): void {
    ensurePositiveInt(n, "metric buffer size");
    state.metricBufferSize = n;
    for (const buf of state.metrics.values()) {
      while (buf.length > n) buf.shift();
    }
  }

  /** Test hook — install a deterministic clock. Pass () => Date.now() to restore. */
  static setNowSource(now: () => number): void {
    if (typeof now !== "function") throw new Error("now must be a function");
    state.now = now;
  }

  /** Test hook — reset the engine to a fresh state. */
  static clearAll(): void {
    state.models.clear();
    state.policies.clear();
    state.metrics.clear();
    state.rateBuckets.clear();
    state.batchQueues.clear();
    state.pendingConfirmations.length = 0;
    state.metricBufferSize = MAX_METRICS_PER_MODEL;
    state.batchSeq = 0;
    state.now = () => Date.now();
  }
}

export default CAMModelServingEngine;

// Internal exports for unit testing of math primitives.
export const __testing = { fnv1a32, hashBucket, wilsonLower95, quantile, hoeffdingMinSamples };
