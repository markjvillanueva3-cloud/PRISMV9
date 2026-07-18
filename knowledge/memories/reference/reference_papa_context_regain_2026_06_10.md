---
name: papa-context-regain-2026-06-10
description: "Consolidated papa (backend-helper) open-threads, canonical NN-GRAPH index paths, and live bugs as of 2026-06-10 night"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.721Z
aliases: reference_papa_context_regain_2026_06_10
---


> **SUPERSEDED 2026-06-10 -- see [[reference_papa_context_regain_2026_06_11]].**

Full context regain for slot papa (backend-helper) — 4-agent workflow, 2026-06-10 night (claude-96df5187, branch slot/papa). Rule: [[papa-commit-to-slot-branch]].

## Slot/galaxy
- papa = **backend-helper** (canonical: state/shared/CHAT-SLOT-DOMAINS.md:26 + all galaxy-brain files + SOUL generator).
- LIVE BUG: `scripts/lib/slot-galaxy-map.mjs:43` maps papa→"frontend-app" (shared w/ quebec), explicit "OPEN CONFLICT (operator to reconcile)" comment (lines 9-21), unresolved since 2026-05-29. `slot-context-bundle-inject.mjs:76/92` imports it → every papa session gets the frontend-app brief, not backend-helper. FIX: flip :43 to "backend-helper". File is NOT on slot/papa (integration-branch infra) → route to golf integration.
- slot/papa worktree is BEHIND integration: lacks `scripts/lib/slot-galaxy-map.mjs` AND `mcp-server/src/engines/backend-helper/*` (galaxy brain). Has papa's own NN-GRAPH + OCR + CAD-fusion commits.

## NN-GRAPH-MS2 — canonical index paths (pinned)
- Trainer feature source: `knowledge/wiki/architecture/_embeddings.jsonl` (138MB, 53,930 entries, 768-d nomic-embed-text, regen 2026-06-11T01:54Z).
- Live eval (embeddingMode=direct) reads: `state/shared/nn-graph/ghost-node-embeddings.jsonl` (636 entries, 768-d, ghostsOnly).
- Bridge output: `state/shared/nn-graph/node-embeddings-768d.jsonl` (55,920 entries, fresh 2026-06-11T03:17, galaxyNodesCovered=34).
- `tribal-embed-index.json`: ONLY in worktree (492 entries, May 19, 0 engine-reference); main tree absent → lifecycle TRIBAL_INDEX_PATH finds nothing (embeddingBridge absent from all 121 ledger entries). Shard-writer (caf3bcbc30) emitted main-tree shard-000.json 480M + shard-001.json 106M (2026-06-10 20:18).

## Live NN eval (NN-EVAL.json, assessedAt 2026-06-06 — STALE, pre-engine-embed)
AUROC 0.8084 PASS (gate 0.78), macroF1 0.4389 FAIL (0.55), Brier 0.179 FAIL (0.15). The 0.808 is direct-cosine baseline, NOT a trained model. grade.pass=false, shipped-research-only.

## LIVE BUG (papa lane): inputDim 3072 != 768
`graphsage-checkpoint.candidate.json` (trained 2026-06-11T03:21 by retrain lifecycle, PRISM_NN_RETRAIN_HETEROPHILY_HOPS=3 → inputDim 3072) CANNOT be assessed: eval loads 768-d source vs 3072-d model → "inputDim 3072 does not match embedding-feature dim 768" → deferred, never promoted. FIX: propagate heterophilyHops into runAssessment's embedding loader (wiring), OR retrain hops=0. Blocks india's heterophily path.

## ROI queue (papa, on-branch first)
1. Fix inputDim-3072 eval-harness wiring (NN-GRAPH, on-branch).
2. Re-run engine-embed sweep (1701 engine pages on slot/papa) → worktree tribal-embed-index → commit slot/papa (Ollama up; nomic-embed-text present).
3. Wire backend infra engines (FeedbackCollectorEngine→prism_dev, TriLevelKillSwitchEngine→prism_safety, DisasterRecovery/BackupRestoreDrill→prism_dev) — verify dispatcher files on-branch first.
4. macroF1/Brier model gap = india's lane (heterophily/H2GCN).
5. Cross-branch (golf integration): slot-galaxy-map.mjs:43 flip; merge worktree NN-GRAPH work to integration.

## Other papa threads
- CAD-FUSION-LIVE phase18-v6 backfill (c303edfb2b, ETA ~5h) — no live process; completion unverified.
- BLUEPRINT-OCR-TRAINING-MS1 — shipped (literal-100% proof, dbbad109bf).
- psn_attribution dispatcher (TS wrapper over psn-attribution-report.mjs) — NOT built; deferred to TS build window (HANDOFF-claude-65a8dc52).
