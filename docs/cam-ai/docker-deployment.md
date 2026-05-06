# CAM AI — Docker / Kubernetes deployment

The CAM model-serving layer ships as a 3-replica Kubernetes
Deployment fronted by Argo Rollouts. Manifests live in
`k8s/model-serving/`. The full operator runbook is in
`k8s/model-serving/README.md` — this doc summarizes the surface and
explains the cross-cutting decisions that the canonical README does
not repeat.

## Manifest set

| File | Purpose |
|------|---------|
| `k8s/model-serving/deployment.yaml` | 3-replica Deployment, anti-affinity, probes, resource limits, non-root, read-only rootfs |
| `k8s/model-serving/service.yaml` | ClusterIP Service (port 80) + headless companion (Argo Rollouts) + ServiceAccount |
| `k8s/model-serving/hpa.yaml` | HPA 3..12 replicas on CPU + memory + p95 latency · PodDisruptionBudget `minAvailable=2` |
| `k8s/model-serving/configmap.yaml` | Registry seed (3 models) + 2 default routing policies. Edit + restart pod to reload. |
| `k8s/model-serving/canary-rollout.yaml` | Argo Rollouts canary spec (10 → 25 → 50 → 100 % with metric-gated pauses) + AnalysisTemplate |

## Apply order

```bash
kubectl apply -f k8s/model-serving/service.yaml         # ServiceAccount + Services first
kubectl apply -f k8s/model-serving/configmap.yaml       # Registry seed before pods boot
kubectl apply -f k8s/model-serving/deployment.yaml      # Pods come up reading ConfigMap
kubectl apply -f k8s/model-serving/hpa.yaml             # Autoscaler attaches to Deployment
kubectl apply -f k8s/model-serving/canary-rollout.yaml  # Rollout takes over from Deployment
```

## Two-layer canary — engine + Argo

The engine (`CAMModelServingEngine`) runs canary logic in-process —
zero-RTT routing decisions, sub-millisecond
`recordMetric → rollback`. The cluster-level Argo Rollout is a
safety net for the cases the engine cannot detect:

1. The engine itself is unreachable (process crash, OOM, deadlock).
2. Metric ingestion lags the rollout cadence by enough that the
   engine's recent-window error_rate hasn't caught up.
3. Pod-level signals (probe failures, image pull errors) regress.

Both layers must agree before traffic shifts. Either layer's "no" wins.

## Why three replicas

The 99.9% uptime SLA permits 8h 45m downtime/year. With pod MTTR ≈ 30s
and per-pod availability ≈ 99.5%, three replicas gives
`1 - (1-0.995)³ ≈ 99.99988%` availability — well inside the SLA. A
2-replica deployment sits at 99.9975% and leaves no margin for
voluntary disruption (HPA scale-down, node drain). PDB
`minAvailable: 2` preserves quorum during voluntary disruptions; the
HPA `minReplicas: 3` preserves it during quiet periods.

## ConfigMap reload semantics

The registry seed in `configmap.yaml` is read once at pod boot. To
reload, edit the ConfigMap and `kubectl rollout restart deployment
cam-model-serving`. The Argo canary stays in place across restarts
because the Rollout owns the ReplicaSet hierarchy.

For runtime changes that should NOT require a pod restart, use the
dispatcher actions instead — `cam_serve_register_model`,
`cam_serve_set_routing_policy`, `cam_serve_promote_to_canary`, etc.
The ConfigMap is the cold-start seed; the dispatcher is the hot path.

## Observability — required Prometheus series

The Deployment exposes Prometheus on `:9090/metrics`. The
AnalysisTemplate in `canary-rollout.yaml` consumes:

| Series | Purpose |
|--------|---------|
| `cam_serve_request_total{model_id, success}` | Canary error-rate gate |
| `cam_serve_request_duration_ms_bucket{model_id, le}` | p95 latency calculation |
| `cam_serve_p95_latency_ms{model_id}` | Adapter-computed latency (HPA + canary gate) |
| `cam_serve_error_rate{model_id}` | Adapter-computed error rate |
| `cam_serve_pending_confirmations{requires_human_approval}` | Surfaces blocked promotions for the on-call dashboard |

The companion Grafana board is `cam-model-serving-overview`
(provisioned out-of-band).

## Rolling update strategy

`deployment.yaml` uses the default `RollingUpdate` strategy with
`maxUnavailable: 1, maxSurge: 1`. This works in concert with the
PDB and the engine's stateless routing — a pod going down loses
its in-memory routing decisions for ≤ 30s of pending requests but
the next pod reconstructs them from the ConfigMap seed and the
metric stream.

The engine's calibration state (per-pod outcome buffers) is
intentionally NOT replicated across pods — convergence happens via
the metric pipeline, not via gossip. This is what lets the deployment
be horizontally scalable without distributed consensus.

## Operator runbook reference

For routine canary promotion and rollback procedures, see
`k8s/model-serving/README.md` § "Operator runbook — promotion /
rollback". The 27 `cam_serve_*` dispatcher actions on `prism_cam`
are the canonical surface for those flows.

## Local Docker development

There is no canonical `Dockerfile` for the model-serving layer in
`mcp-server/` — production images are built from the top-level
PRISM monorepo Dockerfile and parameterized by environment. For
local dev, run `npm run build:fast` and `npm start` directly; the
HTTP routes in `mcp-server/src/routes/cam.ts` are wired the same
way they are in production.
