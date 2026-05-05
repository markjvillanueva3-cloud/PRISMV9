# PRISM CAM Model Serving — k8s manifests

CAM-EXHAUST-MS0 / U-CAM122 — production deploy surface for
`CAMModelServingEngine` (`mcp-server/src/engines/CAMModelServingEngine.ts`).

## Files

| File | Purpose |
|------|---------|
| `deployment.yaml` | 3-replica Deployment with rolling update, anti-affinity, probes, resource limits, non-root, read-only rootfs. |
| `service.yaml` | ClusterIP Service (port 80) + headless companion (used by Argo Rollouts) + ServiceAccount. |
| `hpa.yaml` | HPA 3..12 replicas on CPU + memory + p95 latency · PodDisruptionBudget minAvailable=2. |
| `configmap.yaml` | Registry seed (3 models) + 2 default routing policies. Edit + restart pod to reload. |
| `canary-rollout.yaml` | Argo Rollouts canary spec (10→25→50→100% with metric-gated pauses) + AnalysisTemplate. |

## Why three replicas

The 99.9% uptime SLA permits 8h 45m downtime/year. With pod MTTR ≈ 30s
and per-pod availability ≈ 99.5%, three replicas gives `1 - (1-0.995)³ ≈
99.99988%` availability — well inside the SLA. A 2-replica deployment
sits at 99.9975% and leaves no margin for voluntary disruption (HPA
scale-down, node drain). PDB `minAvailable: 2` preserves quorum during
voluntary disruptions; the HPA `minReplicas: 3` preserves it during
quiet periods.

## Why Argo Rollouts AND engine-level canary

The engine's `CAMModelServingEngine` runs canary logic in-process — fast
(zero-RTT routing decisions, sub-ms recordMetric→rollback), but it
trusts that the underlying pods are healthy. The cluster-level Rollout
is the safety net that fires when:

1. The engine itself is unreachable (process crash, OOM, deadlock).
2. Metric ingestion lags the rollout cadence by enough that the
   engine's recent-window error_rate hasn't caught up.
3. Pod-level signals (probe failures, image pull errors) regress.

Both layers must agree before traffic shifts. Either layer's "no" wins.

## Apply order

```bash
kubectl apply -f service.yaml         # ServiceAccount + Services first
kubectl apply -f configmap.yaml       # Registry seed before pods boot
kubectl apply -f deployment.yaml      # Pods come up reading ConfigMap
kubectl apply -f hpa.yaml             # Autoscaler attaches to Deployment
kubectl apply -f canary-rollout.yaml  # Rollout takes over from Deployment
```

## Operator runbook — promotion / rollback

The PRISM dispatcher exposes 27 `cam_serve_*` actions on `prism_cam`.
For routine canary promotion the operator flow is:

1. Register the new model →
   `prism_cam:cam_serve_register_model { spec: ... }`
2. Deploy as shadow → `cam_serve_deploy_shadow { id: ... }`
3. Confirm shadow healthy (no operator-facing traffic) →
   `cam_serve_get_health { id: ... }`
4. Promote to canary at low weight →
   `cam_serve_promote_to_canary { id: ..., weight: 0.10 }`
5. Wait for ≥ `min_samples_for_promotion` samples; the engine auto-
   rollbacks on regression. If the operator wants to escalate weight,
   call `cam_serve_promote_to_canary` again with the new weight.
6. Promote to active when the gate passes →
   `cam_serve_promote_to_active { id: ... }`. Operator must surface
   the returned `ConfirmationEnvelope` if `requires_human_approval`
   is true.

For an emergency manual rollback at any time:
`cam_serve_rollback_canary { id: ..., reason: "operator override" }`.

## Observability

The Deployment exposes Prometheus on `:9090/metrics`. Required series
for the AnalysisTemplate to function:

- `cam_serve_request_total{model_id, success}`
- `cam_serve_request_duration_ms_bucket{model_id, le}`
- `cam_serve_p95_latency_ms{model_id}` (computed-by-adapter)
- `cam_serve_error_rate{model_id}` (computed-by-adapter)
- `cam_serve_pending_confirmations{requires_human_approval}`

The companion Grafana board is `cam-model-serving-overview` (provisioned
out-of-band).
