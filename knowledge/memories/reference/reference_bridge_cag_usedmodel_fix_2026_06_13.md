---
name: bridge-cag-usedmodel-fix-2026-06-13
description: 2026-06-13 (slot:bravo) — shipped the deferred P2 from the wedge/fallback work: the galaxy-reasoning-bridge CAG cache HIT now reports the model that ACTUALLY produced the answer (usedModel), not the requested model. R12 transparency, fleet-wide (PSN leg #10). Commit 30b7765743, 3-of-3 PASS.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.488Z
aliases: reference_bridge_cag_usedmodel_fix_2026_06_13
---


2026-06-13 (slot:bravo, session 17b9f42e) — closed the P2 follow-up flagged in [[reference_ollama_wedged_orphan_runner_recovery_2026_06_13]] + [[reference_bridge_keepalive_fix_2026_06_13]]: **the CAG cache reported the wrong producer model on a hit.**

## The bug (R12 transparency)
`scripts/lib/galaxy-reasoning-bridge.mjs` (shared by all 34 galaxies, PSN leg #10) has a model fallback ladder (`buildFallbackLadder`): a requested model can descend to a smaller installed one. The LIVE (cache-miss) path already reported `model: usedModel` (the actual producer, line ~609). But the CAG cache HIT path (line ~530) returned `model` = the **requested** model, and the write path never persisted which model produced the cached answer. So a cached fallback answer **lied about its producer** on every subsequent hit (e.g. requested `gpt-oss:120b`, actually produced by `qwen2.5-coder:1.5b`, but a hit reported `gpt-oss:120b`).

## The fix (2 lines + comments, surgical)
1. **Write** (line ~581): persist `usedModel` in the cache entry: `putCached(..., { answer, sources, corpusHash, ts, usedModel }, {})`.
2. **Hit** (line ~530): report `model: hit.usedModel || model` — legacy entries (no usedModel) fall back to the requested model (backward-compat). Now consistent with the live path.

`galaxy-cag-cache.mjs` needed NO change — `putCached` stores the entry verbatim; `isFresh`/`getCached`/`pruneEntries` gate only on `corpusHash`/`ts`, so the extra field is inert to every cache-side reader (confirmed by reviewer C).

## Verification (R9 + R15)
- 43/43 tests; new R9 test `CAG hit reports usedModel (actual producer)` seeds an entry with `usedModel`≠requested and asserts `r.model===usedModel` + a legacy-entry backward-compat case. **Empirically fails on revert** (reverting `hit.usedModel || model`→`model` → `not ok 43`, expected 1.5b got 120b) — verified by me AND independently re-run by 3-of-3 reviewers A+B.
- **Live round-trip** (R15 VALIDATE): requested `bogus-top:999b` (via `PRISM_GALAXY_BRIDGE_FALLBACK`) → descended to `qwen2.5-coder:1.5b` → cache entry persisted `usedModel:"qwen2.5-coder:1.5b"` → 2nd call (hit) reported `model:qwen2.5-coder:1.5b` (the producer, not the bogus requested).
- 3-of-3 scrutiny PASS (A holistic / B test-integrity / C silent-breakage — C confirmed no consumer keys off `result.model` breakingly: `build-galaxy-ai-bridge-registry.mjs` reads only answer/ok/degraded/sources; `build-galaxy-node-embeddings.mjs` imports only `gatherGalaxyDocs`).

Commit `30b7765743` ([MAIN-FORCE], cad-fusion-live-ms0). Remaining deferred (lower value): wedge-guard reap-heuristic reuse (`reap-llama-server-orphans.mjs`) — the dead-parent gate is inert for the real wedge; golf still owns wiring `ollama-wedge-guard.mjs --recover` as a scheduled task.
