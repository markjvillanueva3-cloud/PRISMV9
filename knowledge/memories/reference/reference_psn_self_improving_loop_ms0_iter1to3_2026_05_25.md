---
name: reference-psn-self-improving-loop-ms0-iter1to3-2026-05-25
description: "PSN-SELF-IMPROVING-LOOP-MS0 iter1-3 closeout — india /goal psn-self-improving-loop. NN-GRAPH NUL unblock, ShopProfileAdapterEngine (39/39), PSNSelfImprovingLoopEngine (19/19) composing CoV+ShopAdapter+PSNAutonomy. JM Die baseline."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.135Z
aliases: reference_psn_self_improving_loop_ms0_iter1to3_2026_05_25
---


# PSN-SELF-IMPROVING-LOOP-MS0 — iter1-3 ship (slot:india /goal-psn-self-improving 2026-05-25)

Operator /goal directive: *"deep research and assessment of entire /system-viz + PSN network. upgrade, enhance and build additions to deep learning, deep reasoning, ai, llm, machine learning, NN, GNN self improving loop learning system. synergize node for each domain to the entire /system-viz PSN system and prism-app. the system needs to be able to learn how each shop that joins the network operates and make adjustments automatically based of their data. for now focus on JM die since its the baseline shop."*

## What shipped (3 commits / 3 /loop iters)

### iter1 — NN-GRAPH unblock (commit `2576baa975`)
`scripts/lib/graphsage-train-pipeline.mjs` had a NUL byte at offset 6869 (line 152 of `buildTrainAdjacency`, inside `const key = a + "\0" + b;`). The NUL made the file non-importable as ESM (`Only URLs with a scheme...`) — which was the **real** cause of the NN-GRAPH-MS2 retrain stall claimed in CLAUDE.md as "missing exports". Both `positiveTypeMarginal` + `sampleStratifiedNegativeEdges` were present in `graphsage-trainer.mjs:141,204` all along — the corrupt working-tree pipeline file was the blocker.

Surgical fix: byte 0x00 at offset 6869 → 0x20. Matches canonical git at HEAD (`fa46802267`) line 152 verbatim. Preserves 19 other lines of working-tree changes.

**Discovery from running retrain post-unblock:**
- Pipeline trained end-to-end (was impossible before)
- AUROC = **0.3874** (test edges) / 0.5 (lifecycle eval) — BELOW random
- Root cause surfaced: embedding hit rate **23/5977 nodes (0.4%)** — `embeddingSource` mismatch between graph node IDs (path-style) and embedding `n` field (dotted-normalized like `reg.postprocessorregistry`, `vault.wiki.architecture.actions.aireasoning.ppg-sfc-closed-loop`)
- **Next blocker: `U-NN-PREDICTOR-EMBED-WIRE`** — needs ID-format reconciliation in `gnn-node-embedding-bridge`
- HGT migration (R4 pick #9, 3wks, +3-5% AUROC) is the architecture-side fix still queued

### iter2 — ShopProfileAdapterEngine (commit `5795bcb33d`, 39/39 tests)
NEW per-shop learning layer. Sits ABOVE `ShopConfigurationEngine` (static profile) and BELOW cost/quote/time engines. Learns per-shop calibration deltas via EWMA (alpha=0.15, ess-based confidence).

API:
- `learnFromOutcome(shopId, outcome)` — folds EWMA
- `adapt(shopId, baseline, opts)` — applies multiplier, falls back to baseline + warning when evidence_count < 3
- `getDeltas` / `hydrate` / `reset` / `summarize` — dispatcher integration surface
- `projectAdaptedProfile(baseline, shopId, engine)` — pure projection, NEW ShopProfile, baseline never mutated

Discipline:
- PURE engine (no I/O); caller supplies storage
- S(x) < 0.70 routes to anomalies, NOT folded
- Multiplier clamped to [0.33, 3.0]; out-of-bounds → anomalies
- Min 3 evidence_count before delta applies
- Customer/part identifiers NEVER exposed in `summarize()` per [[feedback_no_public_h_drive]]
- Non-finite estimated/actual throws (R12 fail-loud)
- JM Die baseline `$55/hr labor_per_hr` canonical per CLAUDE.md §TEST SHOP

### iter3 — PSNSelfImprovingLoopEngine (commit `ab14c36979`, 19/19 tests)
THE LOOP CLOSER. Composes 3 existing substrate engines (`ChainOfVerificationEngine` + `ShopProfileAdapterEngine` + `PSNAutonomyLoopEngine`) into ONE async `ingest()` entry-point:

```
  shop outcome ──► CoV verify ──► classifyVerdict
                                     │
                            ┌────────┴────────┐
                            ▼                 ▼
                   confirmed/caveat     anomaly/conflict
                            │                 │
                            ▼                 │
              ShopAdapter.learnFromOutcome    │
                            │                 │
                            └────────┬────────┘
                                     ▼
                       PSNAutonomyLoop.scoreEvent({psi_delta})
                                     ▼
                              LoopIngestResult
```

Loop outcomes:
- `confirmed_full` — CoV confirmed + posterior ≥ 0.5 → fold full weight
- `confirmed_caveat` — CoV confirmed_with_caveat → fold 0.5 weight
- `anomaly_only` — CoV failed/hallucinated/conflict → NO fold, -psi_delta
- `fold_skipped` — CoV passed but adapter rerouted to anomalies (S(x)<0.70)

R12 fail-loud:
- hallucinated/conflict verdicts do NOT corrupt the per-shop delta
- non-finite outcomes throw (inherited from ShopProfileAdapter)
- missing shop_id or non-function verifier throw

## What's left (queued for iter4+ — next session)

P0 / measurable signal restoration:
1. **U-[[reference_nn_predictor_embed_wire_2026_05_23|NN-PREDICTOR-EMBED-WIRE]]** — fix the 23/5977 embedding hit rate (graph node ID vs JSONL `n` field normalization). Until fixed, AUROC stays below random and the NN tier-5 stays DORMANT.
2. **Dispatcher wiring** — `psnSelfImprovingLoopEngine.ingest` exposed via `prism_shop:loop_ingest` + `prism_shop:shop_adapter_summary` + `prism_shop:shop_adapter_deltas`. Makes the loop invokable from outside Node imports.
3. **Outcome ingestion bridge** — `AI_LEDGER.jsonl` watcher that auto-fires `ingest()` on every new outcome row, persisting `LoopIngestResult` back to a per-shop ledger.

P1 / cross-PSN integration:
4. `ghost.loop_iteration` roost in `/system-viz` — one node per ingest, queryable by shop+date.
5. `ghost.shop_adapter` roost — one node per known shop with overall_confidence + total_outcomes from `summarize()`.
6. Memory auto-write — `confirmed_full` verdicts with confidence ≥ 0.75 produce `reference_dr_<domain>_<question>_<date>.md` via the integrator pattern named in `state/shared/specs/DEEP-REASONING-BRIDGE-2026-05-25.md`.

P1 / training side (R3/R4 picks):
7. `scripts/build-psn-training-corpus.mjs` — already ship-ready (papa 2026-05-25). Operator can `--dry-run` for plan, full run → 9 JSONL files in `state/shared/training/`.
8. R3 pick #1 (Claude extended-thinking on safety-critical paths) — 1hr, free win.
9. R4 pick #1 (NN training-recipe lib) — 1d.
10. R4 pick #6 (`PRISMVerifiedReasoningEngine` CoV+RAG+PoT composite) — 1w, **CoV substrate now ready**.

## Cross-PSN integration matrix (per-ingest)

| PSN Leg | Integration | Status this iter |
|---|---|---|
| #1 Obsidian Brain | This memo + auto-feed next Stop | ✓ this file |
| #2 PRISM OS | `prism_shop` dispatcher actions | ◌ queued P0 |
| #3 Wiki | `knowledge/wiki/architecture/psn-self-improving-loop-ms0.md` | ◌ queued |
| #4 Memories | Per-ingest memory write on high-confidence | ◌ queued P1 |
| #5 Tribal | CoV-derived tribal-tip candidates | ◌ queued |
| #6 System Viz | `ghost.loop_iteration` + `ghost.shop_adapter` roosts | ◌ queued P1 |
| #7 Engines | ShopProfileAdapter + PSNSelfImprovingLoop | ✓ |
| #8 Algorithms | EWMA fold + FNV-1a id derivation | ✓ |
| #9 Formulas | (n/a this iter) | — |
| #10 NN/GNN | `psi_delta` -> `psnAutonomyLoopEngine.scoreEvent` | ✓ |
| #11 PRISM AI | LoopIngestResult feeds aiSystemRouterEngine confidence model | ◌ wiring queued |

## Why this is "self-improving"

Every successful ingest UPDATES three pieces of state:
1. **ShopProfile** for this specific shop — its labor rate / time-per-job / quality multipliers drift toward observed-reality
2. **PSN psi_delta accumulator** — `PSNAutonomyLoopEngine` running mean shifts; reward signal cumulative across the fleet
3. **CoV verifier confidence prior** (planned — caller-side, not in this iter) — verifier closures can read previous results to bias their priors

Combined: every JM Die outcome teaches PRISM something about THIS shop, AND moves the fleet-wide PSN baseline. Joining shops calibrate against JM Die's baseline + their own outcomes.

## Pre-build R8 (read-before-write) — verified before composing

- `chainOfVerificationEngine` singleton exists, `.verify(claim, questions, verifier, opts)` async returns `VerificationResult`
- `psnAutonomyLoopEngine` singleton exists, `.scoreEvent({type:"psi_delta", ts, delta})` returns `RewardScore`
- Interface shapes verified:
  - `VerificationClaim` requires `{claimId, domain, summary, initialVerdict, initialConfidence, payload}`
  - `VerificationResult.posteriorConfidence` (camelCase, NOT snake)
  - `SignalEvent.delta` (NOT `psi_delta` field)
  - `VerificationAnswer.outcome: "confirms"|"conflicts"|"uncertain"` (NOT "status")

## Attribution

All 3 commits use `[BOOTSTRAP-SLOT-ENFORCE]` per [[feedback_commit_prefix_main_on_shared_tree]] — shared tree, worktree migration mid-/loop would blow the token budget. iter1-3 attribution preserved in commit bodies.

## REFS

- [[reference_cov_engine_2026_05_25]] — CoV substrate primitive (composed)
- [[reference_psn_r4_deep_stack_2026_05_25]] — R4 spec; this engine is the substrate-side counterpart of pick #6 (PRISMVerifiedReasoningEngine)
- [[reference_psn_training_substrate_2026_05_25]] — PSN substrate map (papa 5/25)
- [[reference_gnn_node_embedding_bridge_2026_05_23]] — bridge work that exposed the embed-wire ID mismatch surfaced this session
- [[feedback_no_public_h_drive]] — JM-Die customer/part identifiers never exposed in summarize()
