# dormant-data galaxy CROSS-SESSION SYNTHESIS (6 of 70 mineable, model gpt-oss:120b, 2026-06-09)

## What this galaxy is building
- End‑to‑end PRISM fleet that **orchestrates LLMs, tool‑catalog, quoting & cost engines, tribal knowledge index, and system‑viz** across 34 named slots (Alpha…Zulu).  
- Unified **Hermes ↔ Obsidian bridge** for memory sync, `/system‑viz` graph UI, and JSON‑RPC MCP at `:3100`.  
- **Dynamic model matrix** (`gpt‑oss:120b`, `gpt‑oss:20b`, `qwen2.5-coder:32b`, `anthropic/claude‑opus‑4‑8`) with fallback/offload enforcement.  
- Persistent **Qdrant vector store** (`prism_engines`, `prism_formulas`, `prism_skills`) for embeddings & tribal index.  
- **Tool‑catalog engine** loading 62 727 CNC tools, exposed via `CatalogCorpusLoaderEngine` singleton.  
- **Quoting/Cost‑Savings engines**, margin‑floor guard, closed‑loop provenance gate.  
- **Brain‑refresh / synthesis refresh** pipelines that mine vault transcripts, GNN/LoRA feeders, and auto‑populate `MEMORY.md` per galaxy.  

---

## Shipped capabilities
| Commit | Feature | Path / Engine | Notes |
|--------|---------|----------------|-------|
| ab2ccf42a4/e6713584e2 | Hermes‑Obsidian integration & `/system‑viz` roost | `hermes/obsidian/*`, `system-viz/` | UI + sync |
| c988a21ec4 | PRISM MCP restart logic | `mcp-server/src/restart.ts` | |
| 56aa423427 | Claude Code OAuth config (primary) & Qwen fallback | `hermes/config.yaml` | primary=`claude-opus-4‑8`, fallback=`qwen2.5-coder:32b` |
| 28b72e4dee | MEMORY.md sections + fill script | `scripts/fill-galaxy-memory-sections.mjs` | test suite added |
| 3904b5e7b0 | Fleet‑wide default coding model = `gpt‑oss:120b` | `settings.json` | |
| aca389cc97 | CatalogCorpusLoaderEngine (62 727 tools) | `src/engines/CatalogCorpusLoaderEngine.ts` | singleton export |
| 7c182b38b2 | `ensureLoaded()` guard wired to all CAM exporters | `src/exporters/*` | idempotent load |
| 0fe3b9de3a / 7c182b38b2 | Search cap raised to 100 000 | `src/search.ts` | silent truncation fixed |
| d839da375b | Mill & turning catalog query APIs | `api/mill_tool_catalog_query.ts`, `api/turning_tool_catalog_query.ts` | |
| c593b096fb | DEFAULT_NUM_PREDICT=1024, callOllama() diagnostics | `scripts/callOllama.mjs` | |
| 13017de764 | Front‑matter hook parsing fix | `hooks/frontMatterHook.ts` | |
| fb314a6fd1 | Docker‑service‑health CLI guard (auto‑start) | `scripts/docker-service-health-check.mjs` | |
| 35e01ca5f3 / d3ed737c23 | Singleton‑service‑guard (reap‑all + start) | `scripts/singleton-service-guard.mjs` | wired to Stop hook |
| e2081e0780 / d22681f5d2 | MCP heap floor ≥4096 MB for all spawns | `mcp-server/src/heap.ts` | |
| 4c12a75a8d | Closed‑loop provenance gate (block synthetic calibration writes) | `engines/QuotingClosedLoopEngine.ts` | 40/40 tests |
| 0b7fea59 | SYNERGY matrix spec & HTML twin | `docs/GALAXY-SYNERGY-MATRIX-2026-06-09.md` | |
| 8a52eeb0f5 | Soul realignments for golf, romeo, oscar, papa | `scripts/realign-soul.mjs` | |
| b5de5424 (multiple) | Tribal‑shard writer, opportunistic sidecar freshness, RAM‑gate hardening | `scripts/writeTribalIndex.mjs`, `scripts/sidecarFreshnessHook.mjs` | 24/24 tests |
| db273e77 | Embed concurrency =16, dedupedContext() helper, batch embed speed ↑3× | `src/embeddings/*` | 0.576 s for 78 vectors |
| 86373eb3 | Launch‑PRISM‑Fleet‑3win.ps1, GNN & LoRA feeders, streaming graph I/O, slice cap =14 | `scripts/Launch-PRISM-Fleet-3win.ps1`, `vault-to-gnn-refpool.mjs`, `graph-io.mjs` | 22/22 mining passes |

---

## Key decisions + rationale
- **Model routing:** Primary = Claude Code OAuth; fallback = local Ollama `qwen2.5-coder:32b`. Keep `gpt‑oss:20b` as secondary local for reasoning; `gpt‑oss:120b` reserved for high‑throughput tool‑generation. Rationale – balance cost (Claude billing) vs latency.
- **Offload enforcement:** `PRISM_OLLAMA_OFFLOAD_ENFORCE=1`; auto‑offload of non‑tool‑calling models to Ollama; prevents GPU OOM on MCP.
- **Catalog loading:** Singletons with `ensureLoaded()` guard; load once per session → eliminates 99 % redundant I/O.  
- **Qdrant usage:** Optional – only start when Docker present and billing enabled; avoids unnecessary vector store startup in dev environments.
- **Commit discipline:** Reset‑first + pathspec‑less commits for targeted files; kill‑switch env vars (`PRISM_GIT_ADD_LANE_DISABLE`, `PRISM_MAINTREE_WRITE_BLOCK_DISABLE`) to bypass routing hooks during slot work. Prevents churn and orphan lockfiles.
- **Brain/ synthesis refresh:** Inline processing (no fan‑out) after Anthropic rate‑limit issues; use `galaxy-synthesis-refresh.mjs` per galaxy, driven by scheduled tasks.
- **Singleton guard & heap floor:** Reap all MCP daemons before start; enforce ≥4096 MB heap to avoid OOM on large models (`gpt‑oss:120b`).  
- **Streaming graph I/O:** Replace full JSON load of `system-graph.json` (642 MB) with `readGraphStreaming`/`writeGraphStreamingAtomic` to stay under V8 string cap.  
- **Slice & timeout caps:** `MAX_SLICES_PER_TX=14`; synthesis timeout 900 s for 120b model – prevents runaway jobs.

---

## Standing operator directives
- Verify Docker Desktop is running; `curl http://localhost:6333/collections` must succeed.  
- Restart Hermes after any config change: `hermes -z "Check in as zulu"` or `hermes.exe --restart`.  
- Ensure Qdrant container `prism-qdrant` is up (`docker ps | grep qdrant`).  
- Run `/compact` before ending a session to free memory.  
- Register missing scheduled tasks (weekly‑memory‑synthesis, daily‑context, tribal‑consolidate) via elevated PowerShell (`install-synthesis-crons.ps1`).  
- Capture Claude accounts per `capture‑accounts‑runbook.md` into `H:/.claude-accounts/`.  
- After each launch of **PRISM Fleet (3‑window)** confirm all 19 slots resume and no NIM containers start.  
- Monitor MCP health (`http://localhost:3100/health`) and VRAM usage (e.g., `nvidia-smi` shows ≤37 GB for 32b model).  

---

## What is still to build (open threads)
- **Docker/Qdrant:** Spin up Qdrant, migrate tribal index shards, verify vector dimensions =768.  
- **Claude billing / fallback:** Enable extra‑usage billing on Claude Code or switch Hermes to pure local mode.  
- **Brain‑refresh task registration:** Run `install-brain-refresh-task.ps1` with admin rights.  
- **Complete catalog wiring:** Wire remaining engines (e.g., `SFCCompareEngine → surface_finish_compare`).  
- **QuotingActualOutcomeLoaderEngine:** Implement once ERP credentials are provisioned.  
- **GPU contention for embeddings:** Load `nomic‑embed-text` before large synthesis runs; adjust model load order.  
- **Full galaxy coverage:** Run `galaxy-synthesis-refresh.mjs` on remaining 1/34 galaxies (dormant‑data) and verify MEMORIES populated.  
- **Sidecar freshness & RAM‑gate:** Finish opportunistic sidecar hook for all slots, validate free‑RAM probe.  
- **LoRA feeder integration:** Connect LoRA dataset output to quoting pipelines.  
- **System‑viz streaming degree:** Deploy `graph-stream-degree.mjs` into production queries (owner Sierra).  
- **Finalize ultra‑code discoveries #2–#6** (dedup for remaining injectors, embed‑stub filter, large‑read gate).  

---

## How to build it (patterns / sequence)
1. **Bootstrap environment** – start Docker, ensure Qdrant reachable, launch native Ollama service (`ollama serve`).  
2. **Singleton guard** – run `scripts/singleton-service-guard.mjs` → reap all MCP daemons → start fresh daemon with `TRANSPORT=http node dist/index.js`.  
3. **Load catalog** – invoke `CatalogCorpusLoaderEngine.load()` once; subsequent engines call `ensureLoaded()`.  
4. **Configure Hermes** – edit `hermes/config.yaml`; set primary/ fallback models; restart Hermes.  
5. **Offload enforcement** – set env `PRISM_OLLAMA_OFFLOAD_ENFORCE=1` before any batch job.  
6. **Run brain‑refresh** – schedule `brain-refresh.mjs` (hourly) → triggers per‑galaxy `galaxy-synthesis-refresh.mjs`.  
7. **Populate tribal index** – execute `scripts/writeTribalIndex.mjs`; then `scripts/sidecarFreshnessHook.mjs`.  
8. **Embedding batch** – call `embedTextBatch()` with concurrency 16; store vectors in Qdrant collections.  
9. **Quote engine wiring** – ensure margin‑floor guard present (`QuoteEstimatorEngine`), provenance gate active, and cost‑router uses `gpt‑oss:120b`.  
10. **Finalize sync** – run `syncGalaxyMemories()` (Obsidian ↔ PRISM) nightly; verify `MEMORY.md` count matches expected sections (4).  

---

## Tools to use
- **Dispatchers / Engines:** `prism_mill`, `prism_turning`, `CatalogCorpusLoaderEngine`, `ToolCatalogEngine`, `QuoteEstimatorEngine`, `CostSavingsTrackerEngine`, `DigitalTwinEstimator`, `QuotingClosedLoopEngine`, `graph-stream-degree.mjs`.  
- **Scripts / Hooks:** `hermes-obsidian-app-map.mjs`, `fill-galaxy-memory-sections.mjs`, `syncGalaxyMemories()`, `ollama-resilient-pull.ps1`, `docker-service-health-check.mjs`, `singleton-service-guard.mjs`, `brain-refresh.mjs`, `galaxy-synthesis-refresh.mjs`, `mine-galaxy-transcripts.mjs`, `discoverByContent`, `writeTribalIndex.mjs`, `sidecarFreshnessHook.mjs`.  
- **System‑Viz:** `/system-viz` UI, `graph-stream-degree.mjs`, `findInGraph` scripts.  
- **AI Systems:** Ollama (local) – models `gpt‑oss:120b`, `gpt‑oss:20b`, `qwen2.5-coder:32b`; Claude Code OAuth (`claude-opus-4‑8`).  
- **Vector Store:** Qdrant (`prism_engines`, `prism_formulas`, `prism_skills`) on port 6333.  
- **Knowledge Base:** Obsidian REST API (`http://127.0.0.1:27123`), vault at `knowledge/memories/**`.  
- **Orchestration / CI:** Ultracode workflows, Vitest (maxThreads 16), Git hooks (`slot‑commit‑enforce`, `git-add-lane-guard`).  

---

## Recurring findings + bugs
- **Qdrant offline** when Docker not started → blocks embeddings.  
- **Claude HTTP 400** errors until extra‑usage billing enabled; prevents primary model use.  
- **Provider typo (`openai`)** caused fallback to default; fixed by explicit `custom/qwen2.5-coder`.  
- **GUI launcher deadlock** on dirty `package-lock.json`; cleared manually.  
- **gpt‑oss 20b reasoning field** drops final response → required wrapper to extract `thinking` token stream.  
- **Vault mirror missing dirs** (12/34 absent) – resolved by `syncGalaxyMemories()` with full path scan.  
- **Memory count inflation** due to auto‑generated `node_*` files; guard added in `MEMORY_SEED reader`.  
- **Corrupt markdown (`ai-training_synthesis.md`)** all NUL → regenerated via local Ollama.  
- **qwen2.5-coder lacks tool_calls** – limited to codegen tasks only.  
- **VRAM/KV‑cache overestimation** corrected: 32b at CTX 16K uses ~37 GB, not 64 GB.  
- **Regex parsing bugs** (`git grep -E` needed; `RESUME_LOOP` anchor fixed).  
- **Probe script entry guard** failed on relative paths – switched to absolute resolution.  
- **Nomic‑embed‑text tag suffix** caused mismatched dimensions – stripped version suffix.  
- **Docker compose port collision** (native Ollama 11434 vs compose) → removed compose entry.  
- **MCP duplicate daemons** caused OOM; fixed by singleton guard and heap floor ≥4096 MB.  
- **System‑viz full graph load OOM** – replaced with streaming degree pass.  
- **Batch embed speed** improved 3× after `embedTextBatch()` refactor (78 vectors in 0.576 s).  
- **Slice cap & timeout** (`MAX_SLICES_PER_TX=14`, synthesis timeout 900 s) prevented runaway jobs.  
- **Lockfile contention** resolved with retry logic and `git add lane` guards.  

*All metrics, paths, and commit hashes are current as of 2026‑06‑09.*
