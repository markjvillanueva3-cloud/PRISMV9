# CAM AI — monitoring & operator dashboard

The CAM AI operator surface is a read-only dashboard at
`/cam-ai-dashboard` backed by six HTTP routes that bridge to
`CAMModelServingEngine`. Lifecycle-mutating actions are intentionally
excluded — promotion, rollback, retire stay in the dispatcher
(`prism_cam:cam_serve_*`) and the operator runbook in
`k8s/model-serving/README.md`.

## Dashboard

`mcp-server/web/src/pages/cam-ai-dashboard.tsx` — five tabs:

| Tab | Surface |
|-----|---------|
| Overview | Fleet summary, alert counts (critical / warning), sample-size sufficiency |
| Models | Registry with status (`pending` / `shadow` / `canary` / `active` / `retired`) and rate-limit state |
| Routing | Active routing policies per `cam_system × task` pair |
| Confirmations | Pending `ConfirmationEnvelope` items, especially `requires_human_approval: true` |
| Alerts | Per-model threshold crossings with severity (info / warning / critical) |

The page is mounted via `web/src/App.tsx`:
- Lazy import of `cam-ai-dashboard.tsx`
- Route guarded by `secure('lead')` — dashboard is operator-tier
- URL: `/cam-ai-dashboard`

## HTTP routes (read-only)

All routes are POST + JSON bodies (filter objects), to keep parity
with the rest of the cam router.

| Route | Dispatcher action | Body |
|-------|-------------------|------|
| `POST /api/v1/cam/serve/list-models` | `cam_serve_list_models` | `{ status?, cam_system?, task? }` |
| `POST /api/v1/cam/serve/get-model` | `cam_serve_get_model` | `{ id }` |
| `POST /api/v1/cam/serve/list-health` | `cam_serve_list_health` | `{}` |
| `POST /api/v1/cam/serve/get-health` | `cam_serve_get_health` | `{ id }` |
| `POST /api/v1/cam/serve/list-routing-policies` | `cam_serve_list_routing_policies` | `{}` |
| `POST /api/v1/cam/serve/list-pending-confirmations` | `cam_serve_list_pending_confirmations` | `{ model_id?, requires_human_approval? }` |

The typed client lives at `mcp-server/web/src/api/camServe.ts`.

## Why read-only

Lifecycle transitions (promote, rollback, demote, retire) gate on
the Hoeffding promotion bound and on policy
`requires_human_approval`. Operators surface and review pending
confirmations in the dashboard, but the actual approval call goes
through the dispatcher, where it can be audit-logged and traced
back to the originating chain.

This split prevents the obvious failure mode of "operator clicks
Approve in dashboard during a metric outage" — the dispatcher path
forces the operator to acknowledge the failing metric explicitly.

## Alert thresholds

Encoded in `mcp-server/web/src/data/camAiAlerts.ts` as
`CAM_AI_ALERT_THRESHOLDS`. Five thresholds, derived from the
U-CAM122 k8s SLOs:

| Metric | Unit | Direction | Warn | Crit | Notes |
|--------|------|-----------|-----:|-----:|-------|
| p95 Latency | ms | high | 200 | 500 | SLO from `canary-rollout.yaml` AnalysisTemplate ≤ 200 ms |
| Error Rate | % | high | 0.05 | 0.10 | SLO success_rate ≥ 0.90 ⇒ crit at 10% |
| Drift Score | (none) | high | 0.30 | 0.60 | Distributional drift vs canary baseline |
| Queue Depth | req | high | 50 | 200 | Sustained crit ⇒ HPA scale-up or rate-limit cut |
| Sample Size | req | low | 100 | 30 | Below crit ⇒ Hoeffding gate not yet armed |

`classifyHealth(health, thresholds?)` returns one alert per crossed
threshold. `classifyFleet(healthRows, thresholds?)` runs the
classifier across the fleet and sorts critical → warning → info.
The Overview tab aggregates the result; the Alerts tab lists every
firing alert.

## Drift

The drift score in the alert thresholds is conceptually distinct
from the Mann-Kendall accuracy drift in `CAMFeedbackLoopEngine`:

- `CAMFeedbackLoopEngine.accuracyDrift()` — trend over outcome
  correctness, drives "should we retrain"
- `CAM_AI_ALERT_THRESHOLDS.drift_score` — distributional shift
  between live request features and the canary's training-time
  distribution, drives "is this model still serving the right
  inputs"

Both can fire independently. A model that is serving novel inputs
but still getting them right will trip the distributional drift
alert without triggering an accuracy retrain; the operator decides
whether to expand the training distribution (retrain) or steer
traffic away (route-policy change).

## Health snapshot — what's in `getModelHealth()`

```ts
{
  model_id: string,
  status: ModelStatus,
  error_rate: number,        // Wilson 95% lower bound under the hood
  p50_ms: number,
  p95_ms: number,
  p99_ms: number,
  sample_count: number,
  last_sample_ts: number | null,
}
```

p50/p95/p99 use the standard linear-interpolation quantile (the
correctness is asserted in
`mcp-server/src/__tests__/cam-ai/transfer-to-serving.test.ts`).

## Auth tier

`secure('lead')` gates the dashboard route — the lead-operator tier.
Read-only routes do not need a higher tier; the dispatcher path for
mutations is gated separately by the dispatcher's own auth chain.

## Observability beyond the dashboard

- **Prometheus**: the deployment exposes the `cam_serve_*` series
  listed in [docker-deployment.md](docker-deployment.md#observability--required-prometheus-series)
- **Grafana**: companion board `cam-model-serving-overview` is
  provisioned out-of-band
- **Argo Rollouts**: the canary-rollout AnalysisTemplate consumes
  the same Prometheus series and gates traffic shifts independently
  of the engine

When a serving regression fires:
1. Dashboard Alerts tab surfaces the offending model + threshold
2. Argo Rollout pauses or auto-rolls-back if the AnalysisTemplate
   gate fails
3. Engine emits `ConfirmationEnvelope { requires_human_approval:
   true }` for any in-flight promotion
4. Operator approves / rolls back via the dispatcher

This is the layered defense pattern from
[docker-deployment.md](docker-deployment.md#two-layer-canary--engine--argo)
restated from the operator side.
