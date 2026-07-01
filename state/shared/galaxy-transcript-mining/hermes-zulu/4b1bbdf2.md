# hermes-zulu session 4b1bbdf2 (2026-06-11, 28.2MB, spine 189KB, 3 slice(s), model gpt-oss:20b)

**SHIPPED (builds/commits)**  
- `46c7418df6` – Ollama auto‑route hook (`ollama-route-pretooluse.mjs`): timeout 9 s→30 s, keep_alive=30m, mode auto.  
- `401718a11c` – “Loop Engineering” article ingested into `state/shared/articles`.  
- `3f0c6cb145` – Hermes‑brain bridge (`knowledge/hermes-brain/`); orphan removed; ranked queue file committed.  
- `4af50eec64` – HMEMV envelope drift fix (R12‑verified).  
- `4c3fa42da1` – Hermes cron prewarm task installed (`PRISM Hermes Cron Prewarm`).  
- `bcbfc4f442` – Installer script for two Hermes tasks (`install-hermes-tasks.ps1`).  
- `a165f4166e` – HMEMV09 Qdrant producer: 17 032 vectors (768‑dim, cosine) seeded into `prism_memories`.  
- `4c6d8ed40c` – Consumer rewire dense recall to Qdrant ANN (hybrid mode); tests green.  
- `78f64fda97` – HMEMV09‑Nomic keep‑warm: keeps embed resident.  
- `8d2521afff` – HMEMV02‑RECALL explainable retrieval (`memory-index-search-lib.mjs`).  
- `722ee58a55` – HMEMV02‑MASTERINDEX explainable retrieval.  
- `6c149e17b4` – HMEMV09‑WIKI producer (`populate-qdrant-wiki.mjs`, streaming, OOM-proof); 53 930 vectors in `prism_wiki`.  
- `7f01daa8ec` – HMEMV09‑WIKI consumer (`wiki-precheck-inject.mjs`), Qdrant primary path.  
- `4446c05d0f` – Commit‑discipline rule written to `slot/zulu` branch.  
- HMEMV03 dispatcher (`recall_as_of`) – temporal recall lib wired, 40/40 tests green.  
- HMEMV08 Obsidian bases – all filters validated (8/8 tests).  
- Envelope‑sync + galaxy brain memory update (`MEMORY.md`).  
- Wiki entry for shipped capability.  
- Master ledger `ZULU-MASTER-CONTEXT-LEDGER-2026-06-11.md` (61 ROI items).  
- Fleet‑wide routing rule: Ollama → Sonnet agent → Opus stored in global CLAUDE.md and recallable memory.

**DECISIONS**  
- Adopt auto‑route offload gate for Ollama; deterministic routing, higher ROI.  
- Switch Hermes E2E loop to local models (`gpt‑oss:120b`, `qwen2.5-coder:32b`) after setting `OLLAMA_CONTEXT_LENGTH=65536`.  
- Implement 30 min keep‑alive for `nomic‑embed-text` to avoid GPU‑load eviction.  
- Add Hermes cron prewarm and GEPA weekly self‑optimisation tasks; eliminate startup latency.  
- Deploy Qdrant consumer rewire: hybrid ANN + BM25 fallback; ensures 26‑slot recall under GPU busy.  
- Commit discipline: all Zulu commits land in `slot/zulu`; `[BOOTSTRAP-SLOT-ENFORCE]` removed.  
- Free‑roam master orchestrator authority across all 34 galaxies, overriding route‑don’t‑build.  
- Prioritize high‑ROI units: HMEMV03 (temporal recall) → HMEMV08 (Obsidian bases).  
- Keep Qdrant ANN as primary dense arm; linear int8 scan fail‑soft fallback.  
- Use streaming populate (`streamPopulateQdrant`) for large corpora to avoid OOM.  
- Adopt three‑tier fallback: Ollama → Sonnet agent → Opus to reduce token burn.  
- Store routing rule in global CLAUDE.md and recallable memory; no orphan code seams.  
- Do not apply keep‑alive override until idle baseline confirms fix.

**OPERATOR DIRECTIVES**  
- Push through improvements without permission; focus on high‑ROI gaps.  
- Regain context, sync with Obsidian vault app, `/system‑viz`, Hermes capabilities.  
- Accelerate Obsidian and Hermes capabilities.  
- Continue fleet‑wide high ROI enhancements.  
- Use ultracode + Ollama LLMs + Octopus to mine previous sessions; update galaxy CLAUDE.md, memories, wikis, tribal knowledge, souls.md, prism awareness.  
- Assume master brain/master galaxy role; optimize domain context retention and task queue by ROI.  
- Re‑register stale OCR batch task (operator‑UAC).  
- Enable Hermes gateway boot‑persistence service.  
- Record cold‑embed starvation as fleet‑wide memory/rule.  
- Refresh galaxy memories/context with latest master ledger and session state.

**FINDINGS/BUGS**  
- Ollama `/v1` ignored `options.num_ctx`; fixed via `OLLAMA_CONTEXT_LENGTH=65536`.  
- Cold-model fail‑open due to 9 s timeout; extended to 30 s.  
- MCP :3100 down but auto‑recovered by watchdog and manual restart.  
- Qdrant collection missing → HMEMV09 gap resolved by producer commit.  
- `nomic‑embed-text` evicted under GPU load; fallback to BM25; solved with keep‑alive task.  
- Hermes prewarm & GEPA tasks not installed until now.  
- HMEMV03 P1: missing time budget caused wiki‑corpus query >280 s; fixed with BM25 prefilter + 15 s wall clock limit.  
- Keystone 5h‑quota build over‑counts `cacheRead`; kept inert pending calibration.  
- OOM on wiki populate resolved by streaming loader (`streamPopulateQdrant`).  
- Qdrant ANN store healthy; embed timed out at 8 s (and 45 s) due to GPU resident models.  
- Ledger partial: two of three miners failed (articles & milestones); stale claim A‑14 caught.  
- Keep‑alive wedge fix not yet validated against current compute contention.

**DOMAIN SPECIFICS**  
- **Hermes**: gateway daemon, cron jobs (`install-hermes-tasks.ps1`), context_from chaining, GEPA-lite, memory tiers (`memories/`, SQLite `state.db`).  
- **Obsidian**: REST bridge (`ObsidianRestBridgeEngine`), bidirectional mirror (`h-to-c-obsidian-mirror.mjs`), BM25/dense recall engine.  
- **Qdrant**: vector store at :6333; collections `prism_memories` (17 032 vectors, 768‑dim cosine) and `prism_wiki` (53 930 vectors).  
- **Ollama**: local models (`gpt‑oss:120b`, `qwen2.5-coder:32b`, `nomic‑embed-text`), hook bridge engine (`ollama-route-pretooluse.mjs`).  
- **PRISM orchestrator**: slot‑binding (`/checkin-zulu`), hook system, ultracode workflows, task installers.  
- **Temporal recall**: dispatcher `recall_as_of`, library `temporal-memory-recall-lib.mjs`.  
- **Memory recall path**: `memory-index-search-lib.mjs` → BM25 + Qdrant ANN (cosine HNSW); fallback linear int8 scan.  
- **Wiki consumer**: `wiki-precheck-inject.mjs` queries `prism_wiki`; fallback to linear scan.

**TOOLS USED**  
- PRISM hooks (`slot-bind-enforce.mjs`, `ollama-route-pretooluse.mjs`).  
- Ultracode workflow engine (fan‑out agents, background orchestration).  
- Hermes cron task installers (`install-hermes-tasks.ps1`).  
- Git lock handling, test harnesses (`runMemoryIndexSearch` tests).  
- `/system-viz` graph regeneration.  
- Sonnet & Haiku agents for offloading reads/searches.  
- Octopus for session/article mining.  
- Docker‑compose for Ollama preload; node.js runtime.  
- CLAUDE.md editing (global & project).

**OPEN THREADS**  
- Complete full HMEMV09 migration (tribal+wiki corpora) into Qdrant.  
- Verify nomic‑embed keep‑alive under sustained GPU load; monitor eviction spikes.  
- Deploy GEPA weekly task in production (final review pending).  
- Finalize remaining Obsidian optimisations (cache warm‑ups, BM25 tuning).  
- Monitor MCP :3100 stability and address recurring OOM restarts.  
- Activate calibrated 5h‑quota keystone after excluding `cacheRead`.  
- Re‑register OCR batch task; enable Hermes gateway persistence service.  
- Finish HMEMV04, V05, V07, V10, V11 units.  
- Wire Obsidian vault integration with Hermes/Zulu orchestrator for full recall pipeline.  
- Update galaxy CLAUDE.md, memories, wikis, tribal knowledge, souls.md, prism awareness per new context.  
- Complete mining workflow; re‑mine thrashed strata (articles, milestones).  
- Validate idle‑Ollama baseline to confirm keep‑alive wedge.  
- Monitor GPU resident model usage; adjust preload/keep‑alive as needed.
