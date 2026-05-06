# PRISM CAM AI — documentation set

CAM-EXHAUST-MS0 / U-CAM126 — architecture and usage docs for the CAM AI
arc (units U-CAM117..U-CAM124).

This directory documents the five-engine CAM AGI subsystem, its HTTP
surface, the operator dashboard, and the LoRA / Docker / model-serving
operational paths.

## Index

| Doc | Scope |
|-----|-------|
| [architecture.md](architecture.md) | The five engines, identity propagation, FSM, default state |
| [lora-training.md](lora-training.md) | How shop-floor feedback becomes LoRA training pairs |
| [docker-deployment.md](docker-deployment.md) | k8s manifests, rollout, configmap, observability series |
| [model-serving.md](model-serving.md) | Lifecycle (shadow → canary → active), Hoeffding gate, rate limit |
| [monitoring.md](monitoring.md) | Operator dashboard, read-only routes, alert thresholds |

## Source of truth

This documentation derives from these files; if they change, the docs
must follow.

| Layer | Source |
|-------|--------|
| Engines | `mcp-server/src/engines/CAM{ReasoningChain,ConfidenceCalibration,FeedbackLoop,TransferLearning,ModelServing}Engine.ts` |
| Dispatcher | `mcp-server/src/tools/dispatchers/camDispatcher.ts` (`cam_serve_*` actions, ~27 of them) |
| HTTP routes | `mcp-server/src/routes/cam.ts` (six read-only `/api/v1/cam/serve/*` endpoints) |
| Dashboard | `mcp-server/web/src/pages/cam-ai-dashboard.tsx` (5 tabs) |
| k8s | `k8s/model-serving/{deployment,service,hpa,configmap,canary-rollout}.yaml` |
| Tests | `mcp-server/src/__tests__/cam-ai/{reasoning-to-calibration,feedback-to-lora-export,transfer-to-serving,end-to-end}.test.ts` |

## Read-order

Operators: monitoring → model-serving → docker-deployment.
Engineers extending the system: architecture → lora-training →
model-serving → monitoring.

## Validation

`mcp-server/src/__tests__/cam-ai/cam-ai-docs-validation.test.ts` parses
every file in this directory, asserting:

- referenced engine class names resolve to `mcp-server/src/engines/*.ts`
- referenced HTTP routes resolve to `mcp-server/src/routes/cam.ts`
- code-fenced static method calls reference real engine methods
- referenced k8s manifests exist on disk
