# cad session 4b1bbdf2 (2026-06-11, 25.8MB, spine 165KB, 2 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `46c7418df6`: 30 s timeout & 30‑min keep‑alive to auto‑route Ollama offload gate (`ollama-route-pretooluse.mjs`).  
- `401718a11c`: Full “Loop Engineering” article ingested into `state/shared/articles`.  
- `3f0c6cb145`: Hermes‑brain bridge; 21.7 MB orphan reaped, high‑ROI queue committed.  
- `4af50eec64`: HMEMV09 envelope drift fix (R12‑verified).  
- `4c3fa42da1`: Hermes cron prewarm task wired & tested (11/11).  
- `bcbfc4f442`: Installer for two Hermes tasks (user‑level, no UAC).  
- `a165f4166e`: Qdrant producer shipped – 17 032 Obsidian memory vectors upserted into `prism_memories`.  
- `4c6d8ed40c` (HMEMV09‑CONSUMER): Qdrant ANN consumer rewire (dense arm + int8 fallback), 69/69 tests live‑validated.  
- `78f64fda97` (HMEMV09‑EMBED‑KEEPWARM): nomic‑embed‑text keep‑warm to prevent dense arm darkening (`OLLAMA_KEEP_ALIVE=30m`).  
- `8d2521afff` (HMEMV02‑RECALL): explainable retrieval on memory‑recall surface.  
- `722ee58a55` (HMEMV02‑MASTERINDEX): explainable retrieval on master‑index surface.  
- `6c149e17b4`, `7f01daa8ec`, `8184d744cb`: HMEMV09 wiki producer/consumer/docreflect (populate‑qdrant‑wiki + wiki‑precheck‑inject).  
- `4446c05d0f`: Commit‑discipline rule written to slot/zulu branch.  

**DECISIONS**  
- Enable existing auto‑route gate (`mode:auto`) and extend cold‑start timeout instead of new hooks.  
- Split Qdrant migration into producer (shipped) + consumer rewire (shipped).  
- Adopt keep‑alive for nomic‑embed‑text from fleet‑reaper policy; set `OLLAMA_KEEP_ALIVE=30m`, `OLLAMA_MAX_LOADED_MODELS=4`.  
- Replace linear int8 scan with Qdrant HNSW ANN for dense recall; retain int8 fallback.  
- Add OLLAMA keep‑warm task (`ollama-embed-keepalive.mjs`) to keep nomic resident, avoiding “dense arm dark”.  
- Implement explainable retrieval on both recall and master‑index surfaces.  
- Use streaming populate (`streamPopulateQdrant`) with `meta.count` guard for large corpora (wiki 53 k vectors).  
- Keep 5h‑quota keystone inactive until calibrated to exclude `cacheRead`.  

**OPERATOR DIRECTIVES**  
- “Always push through; you don’t need my permission for improvements and enhancements.”  
- Accelerate Obsidian & Hermes capabilities by closing high‑ROI gaps (Qdrant recall, Hermes cron prewarm, keep‑alive).  
- Continue high‑ROI work; utilize Ollama for searches, reads, data gathering, offload easier tasks.  

**FINDINGS/BUGS**  
- Ollama `/v1` ignored `options.num_ctx`; fixed via `OLLAMA_CONTEXT_LENGTH=65536`.  
- Cold‑start of qwen2.5‑coder caused 9 s timeout; extended to 30 s and added keep‑alive.  
- Hermes E2E loop blocked by Ollama context bug – resolved.  
- Qdrant consumer rewire initially missed due to missing dim guard & dedup check; fixed.  
- Nomic‑embed‑text evicted under GPU contention → dense recall fell back to BM25; solved with keep‑alive task.  
- OOM on 137 MB wiki JSONL load – solved by streaming populate.  
- HMEMV03 temporal recall: missing time‑budget cap caused hangs on large wiki corpus (P1); fixed via BM25 prefilter + wall‑clock budget.  
- 5h‑quota keystone over‑counts `cacheRead`, producing `pct=1.0`; kept inactive until calibrated.  
- OCR batch task stale – operator‑only re‑registration needed.  
- Hermes gateway boot‑persistence missing – operator‑only fix required.  

**DOMAIN SPECIFICS**  
- **Hermes**: local Nous‑Research agent, cron jobs, GEPA-lite self‑optimization, `context_from` job chaining.  
- **Obsidian**: 2nd brain vault (`:27123`), REST bridge, bidirectional mirror, BM25 + dense recall via Qdrant.  
- **Qdrant**: vector store for Obsidian memories; collection `prism_memories`, 17 032 points, dim 768, Cosine similarity.  
- **Ollama**: local models (gpt‑oss:120b, qwen2.5‑coder:32b, nomic‑embed‑text).  
- **PRISM**: 26‑slot chat fleet orchestrator (`zulu`), ultracode workflows, slot‑binding hooks.  

**TOOLS USED**  
- `ultracode` workflow engine (fan‑out agents).  
- Slot‑binding scripts (`chat-slots.mjs`, `slot-bind-enforce.mjs`).  
- Hook files (`ollama-route-pretooluse.mjs`, `ollama-task-offloader.mjs`, `ollama-embed-keepalive.mjs`).  
- Test harnesses (`jest`/`node` tests, hermetic tests).  
- Git hooks for lock handling.  
- Windows scheduled tasks (user‑level installers).  
- PRISM utilities: `memory-index-search-lib.mjs`, `master-index-search-lib.mjs`, `populate-qdrant.mjs`, `streamPopulateQdrant`.  
- Qdrant CLI (`curl` POST to `/collections/.../points/search`).  
- Ollama CLI for embed and keep‑warm.  

**OPEN THREADS**  
1. **HMEMV03 temporal recall** – P1 fixed; final commit pending after fresh context.  
2. **HMEMV08 Obsidian bases** – built; adversarial verify verdict pending.  
3. **5h‑quota keystone** – calibration required before activation; currently inert.  
4. **Stale OCR batch task** – operator‑only re‑registration needed.  
5. **Hermes gateway boot‑persistence** – operator‑only fix required.  
6. Maintain nomic‑embed‑text residency under heavy load (keep‑alive task shipped, monitoring needed).  
7. Further optimization of BM25‑ANN fusion and additional Hermes self‑optimization pipelines queued for future iterations.
