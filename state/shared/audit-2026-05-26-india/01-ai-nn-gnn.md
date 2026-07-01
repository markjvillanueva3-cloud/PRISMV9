---
audit: india-2026-05-26 / wave-1 / AI + NN/GNN substrate
slot: india
date: 2026-05-26
inspector: claude (read-only)
karpathy: R12 (fail loud)
---

# India audit — AI + NN/GNN substrate

## AI routing — what's wired vs documented

`aiSystemRouterEngine` is built, 11 task-class classifier + 8-backend router with 60s health cache and routing-decision JSONL ledger (`knowledge/summaries/routing-decisions.jsonl`).

**Wired callsites (the dispatcher surface):**

| # | Callsite | Action(s) | Wiring path |
|---|----------|-----------|-------------|
| 1 | `mcp-server/src/tools/dispatchers/intelligenceDispatcher.ts:66` | `aiSystemRouter` lazy-load via `aiSystemRouterDispatch` | 5 actions registered at L2165: `ai_route_task`, `ai_classify_task`, `ai_backend_health`, `ai_backend_probe`, `ai_router_stats` |
| 2 | `mcp-server/src/__tests__/AISystemRouterEngine.test.ts` | test coverage | engine tests |
| 3 | `mcp-server/src/engines/PSNSelfImprovingLoopEngine.ts` | PSN loop consumes | self-improving loop reads router decisions |
| 4 | `mcp-server/src/engines/QuotingDeepReasoningBridgeEngine.ts` | Quoting bridge | reasoning leg |
| 5 | `mcp-server/src/engines/QuotingNeuralReasoningBridgeEngine.ts` | Quoting neural bridge | reasoning leg |
| 6 | `mcp-server/src/engines/PSNSynergyInspectorEngine.ts` | PSN synergy inspector | inspects routing decisions |

**`prism_ai` dispatcher** (= `aiReasoningDispatcher.ts`): **87 `ai_*` action declarations** — far above the 6-action stub the file's banner suggests. Contains `MillMasterOrchestratorFacadeEngine` routing + cross-wires to `outcome_*` (4) + `rag_rerank` (1) + capability/resource/training surface (AI-MAX-MS0/U-AIMAX10). PRISMCreativeReasoningEngine wired at L1669-1672 via `prism_ai:creative_solve` (`.explore(problem, mode)`).

**Ollama / local-LLM routing**: `aiSystemRouterEngine.probe()` shells `curl -s -m 2 http://localhost:11434/api/tags` for ollama-codellama / ollama-deepseek health; docker probes do daemon + image-inspect two-step (closes the silent "daemon up but image missing" hole). `ml_inference` task class auto-routes to `ollama-codellama` primary, `ollama-deepseek` + `claude-haiku` fallback (cost="free").

**`prismCreativeReasoningEngine`**: USED — single production callsite at `aiReasoningDispatcher.ts:1672` (action `creative_solve`); 9 test callsites in `PRISMCreativeReasoningEngine.test.ts`. Pre-grep graph injection reports `[L8/ghost] router · creative_solve` AND `[L4a/built] creative_solve` AND `[L8/stub] aiReasoning:creative_solve` — the engine is built and wired, the ghost row is /system-viz drift, not a real gap.

## NN/GNN status — AUROC/Brier/promotion-gate live values + open blockers

**Live `NN-EVAL.json` (last touched 2026-05-16T21:34Z) — STALE relative to retrain ledger:**
- AUROC raw = **0.0961** (heterophily anti-correlation; gate ≥ 0.78)
- Brier raw = 0.3253 · Brier(calibrated) = 0.2495 (gate ≤ 0.15)
- inputDim = **8** (still the projected hand-feature path)
- Status "DEFERRED — insufficient-reference-pool, poolSize=0"

**Live retrain-lifecycle ledger (`retrain-lifecycle.jsonl`, last tick 2026-05-26T06:06:12Z):**
- Most recent **trained-and-eval'd** run: 2026-05-25T20:56:00Z (forced)
  - AUROC = **0.6129** (lifted from 0.50 → 0.6129; still below 0.78 gate)
  - macroF1 = 0.1442 · Brier = 0.2537 · accuracy = 0.50
  - holdoutN = 62 · grade.pass = false · verdict `shipped-research-only`
  - Decision: NOT PROMOTED — "gate not cleared" (correct safety invariant)
- All 17 lifecycle runs since 2026-05-18 either SKIP (no drift) or NOT-PROMOTED (sub-gate). Zero false-promotes — `promoteDecision()` invariant holds.
- Fingerprint drift: nodes 243K→291K (+19.7%), edges 647K→1.08M (+66%), ghosts 0→636. Ghost reference-pool BREACHED ≥2 threshold sometime between 2026-05-22 and 2026-05-23 (`ghostCount:636` first appears 2026-05-22T04:45Z).

**RAG-UPGRADE-MS0 / U-GNN-NODE-EMBED-BRIDGE (2026-05-23)**: LIVE — `scripts/lib/graph-node-embedding-bridge.mjs` (25249 bytes, last write 2026-05-24T19:41) wired into `nn-graph-retrain-lifecycle.mjs` at L62 (`buildEmbeddingSource as buildNodeEmbeddingSource`). Live `node-embeddings-768d.jsonl` = **7.28 MB**, last refreshed 2026-05-25T15:56Z. Closed `embeddingHitCount=0` empirical gap referenced in CLAUDE.md.

**`U-NN-TRAINER-EXPORT-RESTORE` P0 — CLOSED.** CLAUDE.md still flags this as "blocks end-to-end retrain", but both exports are present:
- `graphsage-trainer.mjs:141` `export function positiveTypeMarginal()`
- `graphsage-trainer.mjs:204` `export function sampleStratifiedNegativeEdges()`
- `graphsage-train-pipeline.mjs:42-43` imports both successfully
- Empirically validated: 4 successful `trained:true, trainExitCode:0` runs in ledger since 2026-05-22 (including 2026-05-25T20:56 which produced the 0.6129 AUROC checkpoint).

**`nn-graph-retrain-lifecycle.mjs` cron — FIRING.** S4U scheduled task on 6-hour cadence is active. Last 8 ticks span 2026-05-25T06:06 → 2026-05-26T06:06 (6h spacing, 4 ticks). 16 captured rounds in `feedback-captured.json` updated 2026-05-25T20:58Z. Cron is healthy; the bottleneck is the model-side AUROC gate, not the scheduler.

**Open blockers (post-correction):**
1. **CLAUDE.md drift** — claims `U-NN-TRAINER-EXPORT-RESTORE` is open + `embeddingHitCount=0`; both empirically false post-2026-05-25. CLAUDE.md NN-GRAPH paragraph needs back-edit.
2. **NN-EVAL.json stale 10 days** — still shows the 2026-05-16 AUROC=0.096 dummy run; the live 0.6129 figure lives only in `retrain-lifecycle.jsonl`. The U7 harness writes NN-EVAL.{json,md} from the LIVE checkpoint, which is still the 2026-05-16 one because no candidate has passed the gate. Behaviour is correct; surface is misleading.
3. **AUROC 0.6129 < 0.78** — 768d retrain lifted the score +0.52 vs heterophily anti-correlation baseline, but gate still 0.17 short. Next lever per memory is heterophily-aware aggregator (H2GCN ego/neighbor separation) — model architecture change, not a feature swap.
4. **Calibrator unreliable on small holdout** — `holdoutN=62` is the same across all 4 trained runs; Brier 0.25 nearly unmoved despite AUROC lift. Suggests reference-pool size still too small for reliable calibration even though it cleared the ≥2 threshold for grading.

## Article incorporation candidates

The 4-layer memory + RAG/CAG doctrine connects to AI/NN substrate gaps cleanly. Four concrete units:

1. **U-AI-NN-EVAL-REFRESH** — wire `nn-graph-retrain-lifecycle.mjs` to write a `latest-candidate.json` sidecar after every grade pass-or-fail run. Today the candidate metrics evaporate into the ledger; NN-EVAL.json stays frozen at the LIVE-checkpoint figures. The 4-layer-memory doctrine says: candidate state is **working memory** (mutable, latest-overwrite); the live checkpoint is **persistent memory** (write-only on gate pass). One file separating the two closes the "is the GNN getting better" question. **Leverage: high** — closes the audit-confusion class for every future inspector.

2. **U-GNN-RAG-RERANK-FEEDBACK** — the `prism_ai:rag_rerank` cross-wire to `ReRankerEngine` is wired but has no outcome capture. The 4-layer doctrine's **episodic-memory** layer is the natural store for "this rerank ranked X first, the operator picked Y" pairs. Pipe rerank outcomes to `outcome_log` (already cross-wired into `prism_ai`); add a nightly RAG-rerank quality metric so 768d embeddings get a *task-aligned* training signal beyond the link-prediction pretext (the AUROC=0.0961 → 0.6129 lift is from pretext, not real task). **Leverage: high** — addresses Karpathy R9 "tests verify intent, not behavior" at the model-evaluation layer.

3. **U-CREATIVE-SOLVE-CAG** — `prismCreativeReasoningEngine.explore()` re-derives knowledge sources on every call (cost: high per the router's reasoning class = "Opus-level synthesis"). A CAG-style cache keyed on `(domain, objective, flexibility)` with semantic-similarity invalidation against the `tribal-embed-index.json` (already loaded in retrain lifecycle at L69) cuts repeat-question cost. The 4-layer doctrine's **semantic-memory** layer is exactly this pattern. **Leverage: medium** — depends on actual hit rate.

4. **U-NN-GHOST-REFERENCE-RAG** — the GNN tier-5 cascade fires only when `poolSize ≥ 2` high-confidence ghosts exist. Today the live graph has 636 ghosts but most don't clear `PRISM_NNG_REF_MIN_CONF=0.8` from the 4-tier cascade. RAG retrieval over wiki/tribal corpora could pre-populate the reference pool with operator-confirmed wirings (4-layer doctrine: **procedural memory** = "how to wire X to Y"). **Leverage: medium-high** — directly addresses the deferred-deploy gate dormancy.

## Verification routes used (Karpathy R12)
- `Read` of NN-EVAL.json, retrain-baseline.json, feedback-captured.json, AISystemRouterEngine.ts (full), retrain-lifecycle.jsonl (tail 8 + head 15)
- `Grep` (not Bash find) for `prismCreativeReasoningEngine\.` + `"ai_` + trainer exports
- `Read` of nn-graph-ms0.md + reference_nn_graph_ms2_u2 + ms2_nn1_768d_features (300+ lines)
- `PowerShell stat` (not Read) of node-embeddings-768d.jsonl per directive

No bash `find`/`grep` used; no edits made; engine source not modified. Findings are factual: ledger timestamps, file sizes, byte counts, line numbers are all reproducible by re-running the inspections above.
