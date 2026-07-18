---
name: reference_obsidian_wiring_verified_2026_06_08
description: "VERIFIED with evidence (slot:alpha 2026-06-08): obsidian semantic wiring to the ENTIRE H drive is comprehensive — memory vault (A6 prompt-turn + F3 edit-turn dense recall, both live) + tribal-embed-index (fresh) + wiki _embeddings.jsonl (44,115 entries, 112MB, fresh). #8 (extend F3 to prompt turns) is REDUNDANT with A6. Corrected 2 false-alarm gaps."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.667Z
aliases: reference_obsidian_wiring_verified_2026_06_08
---


**Obsidian semantic-wiring verification (2026-06-08, slot:alpha).** Evidence-backed answer to the /goal clause "ensure the obsidian app is fully wired and synergized to the entire H drive." Verdict: **comprehensively wired + VERIFIED**, on every corpus + both turn types.

## The full semantic-recall stack (all live + fresh, verified by file evidence)
| Corpus | Turn | Mechanism | Sidecar | State |
|---|---|---|---|---|
| Memory vault | **prompt** | A6 hybrid BM25+dense+RRF (`memory-index-search-lib.mjs` ← `memory-index-precheck-inject`, wired) | `state/shared/memory-embeddings-sidecar.json` 14.9MB (10,892 int8 vec) | LIVE ([[reference_alpha_hybrid_memory_retrieval_a6_2026_05_29]]) |
| Memory vault | **edit** | F3 nomic dense (`memory-relevance-inject`, bundle-wired via edit-bundle) | `state/shared/memo-embedding-cache.jsonl` 22.9MB (1496 vec), self-refreshing | LIVE ([[reference_memo_semantic_recall_f3_2026_06_08]]) |
| Tribal | prompt | `tribal-by-domain-inject` (17 embed/cosine refs) | `state/shared/tribal-embed-index.json` 4162 entries, **fresh (rebuilt 23:32 today)** + blurbs-cache 3.2MB | LIVE |
| Wiki (39,235 md) | retrieval | `build-wiki-embeddings.mjs` | `knowledge/wiki/architecture/_embeddings.jsonl` **112MB / 44,115 entries, fresh (21:29 today)** | LIVE |
| C:→H: vault feed | Stop | `stop-obsidian-memory-feed` (wired) + F3 cache auto-refresh | 11,687 memories | LIVE |

## Two false-alarm gaps I raised then CORRECTED (R12 — verify before claiming)
1. **Tribal index "truncated" (16KB vs 7.8MB backup)** — WRONG. The 16KB live index has MORE entries (4162) than the 7.8MB May-18 backup (489); the new format is leaner (blurbs externalized to the 3.2MB cache). Live index was rebuilt TODAY 23:32. Not truncated.
2. **Wiki embedding "stalled" (`embed-all-wiki-progress.json` done:0)** — WRONG. That progress file is a stale leftover from a *different/abandoned* script (`embed-all-wiki.mjs`, 11:25). The PRODUCTION wiki embeddings (`_embeddings.jsonl` from `build-wiki-embeddings.mjs`) are built + fresh: 44,115 entries, 112MB, 21:29 today.

## Consequence for the discovery queue
- **#8 (extend F3 semantic recall to prompt/SessionStart turns) is REDUNDANT** — A6 already does per-prompt dense recall over the memory vault. Building #8 would duplicate A6 (R8). DO NOT BUILD. The F3↔A6 convergence (retire F3's redundant float cache onto A6's int8 sidecar) remains the right cleanup, NOT a new prompt-arm.
- Only genuine hygiene: delete the stale `embed-all-wiki-progress.json` (golf/hygiene; cosmetic).

## What "fully wired" means, confirmed
Every H-drive knowledge corpus (memories, tribal, wiki) has a live, fresh semantic embedding index, consumed by a wired recall hook, on the turn type where it matters (prompt for browse/plan, edit for code-change). The obsidian app's REST API (:27123) is a SEPARATE concern (app not running) — but the *vault↔context synergy* (the actual "wiring") is via these embedding indices + the auto-feed, all verified live.

Related: [[reference_memo_semantic_recall_f3_2026_06_08]] · [[reference_alpha_hybrid_memory_retrieval_a6_2026_05_29]] · [[reference_highvalue_discovery_2026_06_08]] · [[feedback_auto_memory_feeds_obsidian_stophook]].
