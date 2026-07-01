---
name: cold-embed-recall-starvation-2026-06-11
description: "REPRODUCED: query-time nomic-embed starves under big-model GPU load -> Obsidian/Hermes semantic recall silently fails to lexical. ANN store (71K vectors) is healthy; bottleneck is embed-availability. The #1 ROI fix for 'accelerate obsidian/hermes recall'."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.524Z
aliases: reference_cold_embed_recall_starvation_2026_06_11
---


**Reproduced 2026-06-11 (slot:zulu) while probing whether HMEMV09 Qdrant ANN recall actually SERVES end-to-end.**

## The finding (hard numbers)
- Qdrant is HEALTHY: 5 collections all status=green -- prism_wiki (53,930 pts), prism_memories (17,032), prism_skills, prism_engines, prism_formulas. The ANN INDEX is fine.
- Query-time embed FAILED: `POST :11434/api/embeddings nomic-embed-text` timed out at 8s, then again at 45s (ok=false) on a warm-load attempt with keep_alive=30m.
- GPU residency at the time: `qwen2.5-coder:32b` 54.2GB + `gpt-oss:20b` 13.4GB = **67.6GB of 96GB** resident. nomic-embed-text could not get a load/compute slot.
- Net: the recall pipeline's semantic arm is bottlenecked at the EMBED step, not the index. Recall_at_time/semantic_search/wiki-precheck-inject all embed-then-search; when the embed starves they fail-soft to slow lexical/linear fallback (the documented `ollama_down` path).

## CONFOUND (R12 -- do not over-claim)
At probe time my OWN mining workflow (wf_95459e70-ac6) had 3 sonnet agents hammering `ask-ollama` (qwen2.5-coder:32b is the ask-ollama default + was the 54GB resident model) -- so the embed contention was partly SELF-INFLICTED concurrent load. This is NOT proven to be a permanent hard starvation. **Re-test embed latency when Ollama is IDLE** to separate the transient-load confound from a structural starvation before sizing the fix.

## RESOLVED 2026-06-11 -- TRANSIENT, not structural (idle baseline measured)
With qwen2.5-coder:32b (54GB) EVICTED (only nomic-embed + gpt-oss:20b 13GB resident), the embed returned in **16ms** (dim 768) -- well under the 1500ms recall budget. So the cold-embed is TRANSIENT GPU-contention (the 54GB qwen32b saturating compute when it is resident + serving), NOT a structural starvation. Recall SERVES whenever qwen32b is not saturating.
**The ledger's flagged fix is WRONG (verify-before-build catch):** applying `24c14de4b1` OLLAMA_KEEP_ALIVE 24h override would PIN qwen32b resident 24h -> KEEP the embed starved. The correct posture is the OPPOSITE: let qwen32b evict between bursts (the fleet-reaper's existing `DEFAULT_OLLAMA_KEEP_ALIVE=30m` in fleet-reaper-sweep.mjs already does this), keep nomic-embed warm, and rely on the Ollama->Sonnet fallback rule [[ollama-fallback-sonnet-agents]] for the transient windows when qwen32b IS saturating. NO structural fix needed -- the wrong build was avoided.

## Candidate fixes (ROI-rank in the ledger)
1. **CPU-offload the embed** -- nomic-embed-text is tiny (~0.5GB); pin it CPU-only (`OLLAMA_*`/dedicated instance) so embeds NEVER compete with GPU inference. Cleanest decoupling; embed latency becomes load-independent.
2. **Dedicated embed Ollama instance** on a separate port + its own queue, kept warm (keep_alive=-1), so fleet big-model loads can't evict/starve it.
3. **Keep-warm daemon** for nomic-embed (periodic ping) -- helps cold-load but NOT compute-contention if the issue is compute not VRAM (the 45s warm-load failure suggests compute/scheduler contention, so #1 or #2 > #3).
4. Raise the recall embed timeout (1500ms -> e.g. 5s) as a band-aid -- but a 45s failure means timeout-raising alone won't fix it.

## Why this is top-ROI for the operator goal
Operator goal = "accelerate obsidian and hermes learning, context, memories... recall." The ANN vectors are all there; the recall is dead at the embed. Fix the embed-availability and ALL semantic recall (memory + wiki + tribal + Hermes vault-query) gets fast fleet-wide. Pairs with [[reference_hmemv09_wiki_qdrant_streaming_2026_06_11]] (the vectors) + [[reference_zulu_domain_status_2026_06_11]] (domain ROI queue).
