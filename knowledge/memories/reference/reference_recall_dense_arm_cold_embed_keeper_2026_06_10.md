---
name: reference_recall_dense_arm_cold_embed_keeper_2026_06_10
description: "Memory recall's dense arm silently degrades to BM25-only whenever nomic-embed-text is cold-evicted; the recall path's 2.5s embed cap CANNOT self-recover a cold 5s model -- a background keeper task is required."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.144Z
aliases: reference_recall_dense_arm_cold_embed_keeper_2026_06_10
---


**HMEMV09 ship + a reusable systems lesson (slot:zulu, 2026-06-10).**

Two commits landed the Qdrant memory-recall acceleration end-to-end:
- `4c6d8ed40c` U-HMEMV09-CONSUMER: `scripts/lib/memory-index-search-lib.mjs` `tryHybridFuse` is now **Qdrant-primary** -- dense candidates come from `denseRankViaQdrant` (ANN over the 17,032-vector `prism_memories` HNSW collection, dim 768 Cosine) instead of re-loading+re-decoding the 21.9MB `memory-embeddings-sidecar.json` on every prompt. `payload.node_id == recordKey()` (namespace/name) so Qdrant hits drop straight into the existing RRF + `byKey` hydrate with zero remap. The int8 linear scan is preserved as a **lazy fail-soft fallback** (loaded ONLY on Qdrant-miss). Revert knob `PRISM_MEMORY_QDRANT_DISABLE=1`. Producer was `a165f4166e` (`scripts/populate-qdrant-memories.mjs`).
- `78f64fda97` U-HMEMV09-EMBED-KEEPWARM: `scripts/ollama-embed-keepalive.mjs` + user-level scheduled task `PRISM Ollama Embed Keepalive` (every 4 min, installer `.claude/helpers/install-ollama-embed-keepalive-task.ps1`).

**THE LESSON (non-obvious, reusable):** the recall embed runs inside the 5s UserPromptSubmit budget with a hard **2.5s cap** (`DEFAULT_EMBED_TIMEOUT_MS`). A **cold** nomic-embed-text load is **~5s** on the Blackwell box when the fleet cycles big models through VRAM (`/api/ps` returns `models:[]`). So once nomic is LRU-evicted, the latency-capped recall embed **times out forever** -> the dense arm is silently dark (BM25-only, `source:"sidecar"`) and the embed circuit trips for 2min. **The recall path CANNOT recover a cold model itself** -- it needs a separate, latency-unconstrained warmer. The keeper task (20s timeout absorbs the cold load, pins with `keep_alive=30m`) is that warmer; the recall embed also now sends `keep_alive=30m` so warm traffic keeps nomic recently-used (not the LRU victim under `OLLAMA_MAX_LOADED_MODELS=4`).

**Policy constraint that shaped it** -- conform to [[reference_ollama_keepalive_commit_pressure]] / commit `cebde4fd9`: `keep_alive` must be **30m, NEVER -1** (pin-forever pinned ~70GB of LARGE models -> host COMMIT pressure tripped the memory gate every turn; pinned models cost RAM+pagefile, not just VRAM). The keeper targets ONLY nomic (~274MB, an *intended* resident model per `ollama-coresidency.mjs RECOMMENDED_ENV`), so it is safe. It does NOT touch the gated Ollama service env.

**Validation:** 81 tests (12 keepalive + 69 lib, both arms incl. fail-soft + scrutiny-fix coverage). Live: raw Qdrant ANN 68ms / 5 hits; keeper refreshed nomic 193ms; recall flipped `source:sidecar` -> `source:hybrid` once warm. 2-of-3 (HMEMV09 consumer) per-file scrutiny PASS; the keepwarm per-file agents rate-limited (transient).

**Diagnostic recipe** for "recall is BM25-only / dense dark": `curl :11434/api/ps` (is nomic resident?) + `cat state/shared/.memory-embed-circuit.json` (tripped?) + time `curl :11434/api/embeddings` (cold = ~5s > 2.5s cap). Reset the breaker by deleting the circuit file (a successful embed does the same).

REMAINING for full HMEMV09 close (envelope `in_progress`): tribal-embed-index.json -> Qdrant + wiki vector index -> Qdrant (the other 2 corpora in the unit title). See `mcp-server/src/engines/agent-orchestration/OBSIDIAN-HERMES-ACCELERATION-QUEUE.md`. Related: [[reference_hermes_memory_vault_ms0_2026_05_23]].
