# CAM AI — model serving

`CAMModelServingEngine` (`mcp-server/src/engines/CAMModelServingEngine.ts`)
owns the model registry, lifecycle FSM, routing policies, and the
Hoeffding-bounded canary promotion gate.

## Lifecycle FSM

```
pending → shadow → canary → active → (retired)
            ↓        ↓        ↓
         (retire) (rollback) (demote)
```

| State | Receives traffic? | How to enter |
|-------|------------------|--------------|
| `pending` | No | `registerModel(spec)` |
| `shadow` | Mirror only — no operator-facing response | `deployShadow(modelId)` |
| `canary` | Weighted slice (e.g. 10%) | `promoteToCanary(modelId, weight)` |
| `active` | Default route | `promoteToActive(modelId)` (gate-controlled) |
| `retired` | No | `retireModel(modelId)` |

Demotion paths:

| From | To | Trigger |
|------|-----|---------|
| `active` → `canary` | Demoted | `demoteFromActive(modelId, reason)` |
| `canary` → `pending` | Rolled back | `rollbackCanary(modelId, reason)` |

Every transition emits a `ConfirmationEnvelope`:

```ts
interface ConfirmationEnvelope {
  applied: boolean;                  // false when blocked by gate
  requires_human_approval: boolean;  // true → operator must surface this
  model_id: string;
  from_status?: ModelStatus;
  to_status?: ModelStatus;
  reason?: string;
  // ...
}
```

When `requires_human_approval: true`, the dispatcher returns the
envelope without applying the transition. Operators see this in the
dashboard's Confirmations tab and explicitly approve via a follow-up
dispatcher call.

## The Hoeffding promotion gate

`promoteToActive(modelId)` is the sharpest gate in the FSM. It
applies a two-sided Hoeffding bound on the canary error rate vs the
incumbent active model:

```
N ≥ ⌈ ln(2/α) / 2ε² ⌉
```

with production defaults `α = 0.05` and `ε = 0.05`, giving the gate
floor at **N ≈ 738 samples**. The actual minimum is
`max(policy.min_samples_for_promotion, hoeffdingMinSamples(ε))` so a
policy `min_samples_for_promotion = 200` does NOT lower the gate
below 738.

| Knob | Default | Effect |
|------|--------:|--------|
| `epsilon` | 0.05 | Lower → tighter gate, more samples required |
| `min_samples_for_promotion` | 200 | Floor; the Hoeffding bound usually dominates |
| `alpha` (Hoeffding) | 0.05 | Hardcoded constant `ALPHA_HOEFFDING` |

When the gate fails, the envelope reports `applied: false,
requires_human_approval: true` with the failing metric attached. The
operator either waits for more samples or explicitly overrides.

### Why tests use ε = 0.20

The integration tests in
`mcp-server/src/__tests__/cam-ai/transfer-to-serving.test.ts` and
`end-to-end.test.ts` set `epsilon: 0.20`, which lowers the Hoeffding
floor to `⌈ln(40)/(2·0.04)⌉ ≈ 46` samples (with
`min_samples_for_promotion: 100` as the binding floor). This keeps
the test wall-clock under a second while still exercising the gate
boundary; production should NEVER ship a model on this configuration.

## Routing — `routeRequest()`

```ts
const decision = CAMModelServingEngine.routeRequest({
  cam_system: "hypermill",
  task: "strategy_recommend",
  request_key: "job_42_op_3",  // arbitrary string — used as bucket key
});
// decision: {
//   primary_model_id: string | null,
//   shadow_model_ids: string[],
//   fallback_model_ids: string[],
//   bucket: number,             // [0, 1000) FNV-1a-derived bucket
//   policy_kind: RoutingPolicyKind | "default",
//   rationale: string,
// }
```

Routing is consistent on `request_key` via FNV-1a hash → bucket. Same
key always lands on the same model for the same policy state. This
matters for two reasons:

1. **Per-job stickiness.** A multi-step CAM job that sends multiple
   requests under the same `request_key` gets the same model for
   every step, so the operator sees a coherent recommendation.
2. **Reproducibility under canary.** A request that hit the canary
   on attempt 1 will hit the canary on retry, so retry traffic
   isn't accidentally biased toward the active model.

Routing policy kinds:

| Kind | Behavior |
|------|----------|
| `weighted` | Bucket by weight — e.g. 90% active, 10% canary |
| `canary_split` | Same as weighted but with explicit canary identification in the decision |
| `shadow_only` | Always returns active for the operator response, but mirrors the request to shadow |
| `sticky_active` | Always active, ignore canary — emergency fallback |

## Model spec

`registerModel(spec)` accepts a `ModelSpec`:

```ts
interface ModelSpec {
  id: string;                              // unique within registry
  cam_system: string;                      // "hypermill" | "mastercam" | ...
  task: AGIDecisionTask;                   // "strategy_recommend" | ...
  backend: ModelBackend;                   // "ollama" | "triton" | "vllm" | "nim" | "openai" | "anthropic" | "custom"
  endpoint: string;                        // URL the inference adapter calls
  metadata?: { derived_from_chain?: string; ... };  // identity propagation
  // ...
}
```

The `metadata.derived_from_chain` field is what propagates the
training lineage forward — a model trained on training pairs from
chains starting at `chain_xyz` should record that here, so the
end-to-end identity trace works.

## Metrics — feeding the gate

`recordMetric(modelId, sample)` is what the inference adapter calls
after every request. The engine maintains a sliding window per model
(`setMetricBufferSize(n)` controls capacity, default ~1000 samples).

```ts
CAMModelServingEngine.recordMetric("model_42_canary_v3", {
  success: true,
  latency_ms: 142,
  // ts: optional, defaults to now
  // error_class: optional taxonomy tag for failures
});
```

`getModelHealth(modelId)` projects the buffer into a health snapshot:

```ts
const h = CAMModelServingEngine.getModelHealth("model_42_canary_v3");
// h: { error_rate, p50_ms, p95_ms, p99_ms, sample_count, last_sample_ts, status }
```

Wilson 95% lower bound on error rate is asserted in the integration
tests; p50/p95/p99 quantile correctness is asserted alongside.

## Rate limiting

Each model has a token bucket. Defaults are inherited from the
ModelSpec; override with `setRateLimit(modelId, capacity,
refillPerSec)`.

```ts
const decision = CAMModelServingEngine.checkRateLimit("model_42");
// decision: { allowed: boolean, retry_after_ms?: number }
```

The dispatcher exposes this via `cam_serve_check_rate_limit`. The
inference adapter calls it before forwarding to the backend; the
engine returns `allowed: false, retry_after_ms` when the bucket is
empty.

## Batching

For backends that support batched inference (Triton, vLLM), use the
batch enqueue path:

```ts
const enq = CAMModelServingEngine.enqueueBatchRequest(
  "model_42", "batch_a", "req_xyz", payload);
// enq: { queue_size, will_drain_at_size }
const drained = CAMModelServingEngine.drainBatch("model_42", "batch_a");
// drained: { requests, drained_size } | null  (null if queue empty / not yet at drain threshold)
```

Drain triggers fire automatically at the configured batch size;
`force = true` drains regardless. The engine does NOT execute the
batch — it owns queuing only; the adapter forwards the drained
batch to the backend.

## Confirmation envelope handling

Lifecycle transitions that fail the gate, or that require explicit
operator approval per policy, return:

```ts
{ applied: false, requires_human_approval: true, ... }
```

Operators see these in the dashboard's Confirmations tab. To list
pending confirmations programmatically:

```ts
const pending = CAMModelServingEngine.listPendingConfirmations({
  requires_human_approval: true,
});
```

This is the same call that backs the
`POST /api/v1/cam/serve/list-pending-confirmations` route.

## Reset

`clearAll()` wipes models, policies, metrics, batch queues, rate
buckets, and pending confirmations. Tests use this in `beforeEach`;
production should never call it (it is not exposed via the
dispatcher).
