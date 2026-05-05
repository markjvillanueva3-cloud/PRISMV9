---
schema_version: 1.0.0
source: project
section: XPROC NEURAL LEARNING LAYER (cross-process learning across mill / lathe / WEDM — added 2026-05)
slug: xproc-neural-learning-layer-cross-process-learning-across-mill-lathe-wedm-added-
start_line: 184
end_line: 204
indexed_at: 2026-05-05T13:49:55.476Z
content_hash: bc6088d30866b732d487e7609188fae8fe0ba946b14768f4775d988d8bfc5ca6
mirror_engine: ClaudeMdChunkerEngine
---
## XPROC NEURAL LEARNING LAYER (cross-process learning across mill / lathe / WEDM — added 2026-05)
Five cross-process bridges + five Tier-1 neural engines that share signal across the three production processes.

**Bridges (in `mcp-server/src/engines/`):**
- `CrossProcessSFBridge` — speed/feed transfer mill ↔ lathe ↔ WEDM
- `CrossProcessPostBridge` — post-processor pattern reuse
- `CrossProcessFeatureBridge` — 12 features × 3 processes feasibility matrix
- `CrossProcessAIBridge` — keyword classifier + `orchestrate(intent)`
- `ProcessIntelligenceRouterEngine` — 5-stage pipeline (classify → route → blend → confidence → return)

**Neural Tier 1 (`H:/prism-xproc-neural/mcp-server/src/engines/`):**
- `CrossProcessOutcomeStore` — event ledger with `NUMERIC_FEATURE_KEYS` validation
- `CrossProcessNeuralLearningEngine` — pure-JS MLP 32→16→3, Xavier init + SGD-momentum
- `CrossProcessTransferLearningEngine` — 9 material clusters, 6 directional transfer pairs
- `CrossProcessAttentionExplainEngine` — LIME perturbation + ECE calibration + L1 anomaly detection
- `CrossProcessAGIBridge` — composer with 50/50 blend (keyword + neural distribution)

**Federated weighting:** local 1.0×, shared 0.5× per Shared Learning Bus rule (`SLBRulesEngine`). Tiers 2–12 (46 remaining engines) tracked in `H:/prism-xproc-neural/state/shared/XPROC-NEURAL-ROADMAP.md`.

Dispatcher: `prism_intelligence` actions `xproc_agi_orchestrate` / `xproc_agi_episodic` / `xproc_agi_aggregate_patterns`.
