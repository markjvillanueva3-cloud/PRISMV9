# knowledge-conversion galaxy CROSS-SESSION SYNTHESIS (6 of 40 mineable, model gpt-oss:120b, 2026-06-09)

## What this galaxy is building
- PRISM 3‑lane router (course‑forge) that unifies MIT‑OCW monolith → PRISM pipelines.  
- Unified capability‑probe layer (`OllamaCapabilityProbeEngine`) for dynamic model selection.  
- GNN edge‑prediction & heterophily inference suite (pure‑JS GraphSAGE, hop‑tuned).  
- Knowledge‑conversion loops with auto‑advance (`loop-state.mjs next`) and lane‑aware pickers (A/B/C).  
- End‑to‑end transcript mining & embedding regeneration pipeline for India domain.  
- Blackwell‑AI upgrade plan (P0 fixes, verifier verdicts) governing all subsequent builds.  

## Shipped capabilities
- **Capability / Model routing**: `U-CAP-PROBE-CATALOG-RETIRE-TESTFIX`, `U-OCTOPUS-PANEL/DIVERSE-PROBE`, `OllamaCapabilityProbeEngine` wired to `prism_ai:capability_probe`.  
- **Loop engine**: `loop-state.mjs next` command, injector hook `U‑LOOP‑AUTO‑ADVANCE`, pick‑unit cascade, `PRISM_LOOP_MAX_ROLLS`.  
- **GNN edge‑predict core** (`U-GNN-EDGE-PREDICT-CORE/CANDIDATES/CLI/VIZ`) – 21/21, 14/14, 17/17 tests; pure JS GraphSAGE (`graphsage-model.mjs`).  
- **Heterophily pipeline**: `U-GNN-HETEROPHILY-MJS-PORT`, CLI (`--heterophily-hops`), retrain wire.  
- **Embedding & mining**: `U‑MINE‑INDIA‑COMPLETE` (84 transcripts, Obsidian sync), `U‑GNN‑EMBEDDING‑DEGENERACY`, batch embed (`embedTextBatch()` 3× faster).  
- **Scheduler / Reaper‑immune tasks**: `install-india-mine-task.ps1` (task #10), long‑running jobs as Windows scheduled tasks.  
- **Testing & concurrency**: Vitest config → 16 threads, `PRISM_EMBED_CONCURRENCY=16`, batch extractor engine concurrency 16, GPU health fix (`gpu_health.py` cu128).  
- **Documentation / Wiki**: wiki entries for Octopus panel/diverse probe, synthesis report `GOAL‑DISCOVERY‑SYNTHESIS‑2026‑06‑09.md`.  
- **Utility units**: slot‑domain dedup (91 % token saving), PSN‑leg‑state dedup (82 %), semantic memory recall hook (`memory-relevance-inject.mjs`), self‑refreshing cache, dark‑wiki rank (32 630 files → 71 high‑value).  
- **MCP dispatcher**: `prism_local:local_generate` (task #10).  

## Key decisions + rationale
- **Blackwell‑AI plan adopted** – provides concrete P0 fixes; avoids speculative LoRA engines.  
- **Capability‑probe over hardcoded defaults** – ensures model availability across hardware, prevents silent failures (`resolveDiverseOllamaPanel` fail‑open on empty array).  
- **Two‑reviewer per file + 3‑of‑3 stop ledger** – guarantees reproducible builds and gate integrity.  
- **Pure‑JS GNN inference** – eliminates Torch dependency; fits RTX 6000 memory budget.  
- **Stop `nim‑llama32‑3b` container** – reclaimed ~88 GB GPU; pending permanent removal vs restart policy.  
- **Long‑running jobs as scheduled tasks** – avoids MCP reaper termination (`install-india-mine-task.ps1`).  
- **IPv4 localhost for Ollama** – fixes Node/undici IPv6 failure on Windows.  
- **Heterophily hop tuning limited** – hops = 3 gives +0.138 AUROC (max ≈ 0.64 < 0.78 gate); triggers Path‑B embedding regeneration path.  
- **Direct‑embed inference** – bypass broken edgeless‑SAGE, improve majority‑class bias via base‑rate normalization.  
- **Calibration disabled by default** – isotonic calibration regressed AUROC/Brier in early tests.  
- **Vitest thread config moved to top‑level `test.maxThreads`** – ensures 16‑thread concurrency works on CI.  
- **Session‑scoped stop hook must satisfy token‑savings, context retention, vault value, H‑drive wiring** – prevents runaway loops.  

## Standing operator directives
- `/build` → trigger next build step; `/continue next phase` → run loops until wired/validated.  
- Authorize GPU retrain now (task #9); **do not restart server** (MCP restart #11 declined).  
- Build targeting RTX Blackwell 6000, upgraded CPU/RAM/SSD.  
- Max out local LLM utilization (Ollama gpt‑oss:20b, qwen2.5‑coder:32b).  
- Wire Obsidian vault and PSN to H‑drive; verify high‑value token savings.  
- Run `/system-viz` regularly; exploit India domain & Sierra system‑viz for data pipelines.  
- Register Zombie Reaper v2 & Blueprint OCR Batch via elevated PowerShell.  
- Schedule YOLO mode every 5 min (`CronCreate` → job 35847521).  

## What is still to build (open threads)
- **U‑GNN‑EDGE‑PREDICT** full 4‑file unit (integration with CLI/Viz).  
- Decide permanent removal vs restart policy for `nim‑llama32‑3b`.  
- Close coverage gaps: multimodal adapters, CAG F1/F6 wiring, review‑gate/eval harness.  
- **Path‑B**: embedding regeneration to push AUROC ≥ 0.78 (current 0.64).  
- MCP routing action `local_generate` pending server restart (operator declined – revisit).  
- Execute GPU retrain (#9) as reaper‑immune scheduled task.  
- Expand 768‑d embedding coverage beyond current 563 nodes.  
- Complete model pulls for `gpt‑oss` and `gemma4`.  
- Wire `memory-rag-inject` to semantic recall hook.  
- Finish ultracode queue items #3–#6.  
- Implement `PRISM_OLLAMA_OFFLOAD_AUTOEXEC` flag & vision‑model cleanup (alpha scope).  
- Resolve system‑viz OOM on `find` & `node-card`.  
- Refresh `BRAINSTORM_MERGE_PLAN.md` against current engine inventory; integrate dormant concepts.  
- Restore missing exports in `graphsage-trainer`; verify `embeddingSource` wiring for NN predictor.  
- Raise Wiki↔Tribal coverage to ≥ 90 %.  
- Build U2 switch‑claude‑account script & seed rotation roster (Hermes‑Acc.md).  
- Clear stale `index.lock` preventing shared‑tree commits.  
- Finalize advisory‑decay consensus (3‑of‑3 reviewer).  

## How to build it (patterns/sequence)
1. **Blackwell upgrade** – apply capability‑probe, purge hardcoded defaults, wire `ask()` → `resolveOllamaModels`.  
2. **Loop cascade** – deploy `loop-state.mjs` with pick‑unit precedence (`--resume`, handoff‑resume, own‑lane, fleet fallback) and enforce `PRISM_LOOP_MAX_ROLLS`.  
3. **GNN suite** – compile pure‑JS GraphSAGE core, run edge‑predict CLI tests, integrate heterophily hops; evaluate AUROC gate.  
4. If AUROC < 0.78 → trigger **Path‑B**: run embedding regeneration (`embedTextBatch()`, `U‑GNN‑EMBEDDING‑DEGENERACY`), re‑train with increased hops.  
5. Schedule long‑running jobs via PowerShell (`install‑*.ps1`) and Windows Task Scheduler (reaper‑immune).  
6. Apply **stop hooks**: `stop-goal-clear-advance.mjs`, session‑scoped token‑savings hook; ensure 2‑reviewer + 3‑of‑3 stop ledger passes before merge.  
7. Enable high concurrency: Vitest `maxThreads=16`, `PRISM_EMBED_CONCURRENCY=16`, batch extractor engine concurrency 16.  
8. Wire **semantic memory**: `memory-relevance-inject.mjs` → Obsidian vault sync; dedup helpers (`dedupedContext()`) across 8 injectors.  
9. Activate **YOLO mode** cron (5 min) for autonomous loop progression and low‑confidence prompt handling.  
10. Run full integration suite, verify all gates (AUROC ≥ 0.78, macro‑F1 ≥ 0.55, Brier ≤ 0.15).  

## Tools to use
- **Dispatchers / Skills**: `devDispatcher.execFileSync`, slash commands `/build`, `/continue`, `/loop`, `/system-viz`.  
- **Scripts & Hooks**: `loop-state.mjs`, `pick-unit.mjs`, `stop-goal-clear-advance.mjs`, `memory-relevance-inject.mjs`, `audit-roadmap-drift.mjs`, `ollama-nav-enforce-inject.mjs`, `install‑india-mine-task.ps1`, `cronCreate/cronDelete` for YOLO mode.  
- **System‑Viz utilities**: `find`, `node-card`, OOM mitigation (`graph-stream-degree`).  
- **AI Systems**: Ollama (gpt‑oss 20b, qwen2.5‑coder 32b) via `127.0.0.1:11434`; nomic‑embed‑text for 768‑d vectors; GPU health engine (`gpu_health.py`).  
- **Vector store / Retrieval**: Qdrant (planned for semantic memory), Obsidian vault (`H:/prism/knowledge/memories/...`).  
- **Testing & Build**: Vitest (16 threads), Node test harness, `esbuild`, `tsc`, `npm run build`.  

## Recurring findings + bugs
- **Keystone tests RED** due to retired model `qwen2.5-coder:7b`; fixed by `U‑CAP‑PROBE‑CATALOG‑RETIRE‑TESTFIX`.  
- Octopus legacy code ignored capability probe → static defaults caused empty runnable array; now fail‑open.  
- API rate‑limit / ECONNREFUSED from overcommitted GPU (nim‑llama32‑3b); stopped container reclaimed ~88 GB.  
- Loop auto‑advance had runaway P0 & cross‑session contamination; fixed with 4‑tier precedence and max rolls guard.  
- IPv6 localhost bug in `OllamaTaskOffloaderEngine`; forced IPv4 (`127.0.0.1`).  
- Embedding degeneracy metrics: meanCosine 0.86, centroidNorm 0.93 → re‑embed ineffective without feature change.  
- Heterophily hop sweep max lift +0.138 AUROC (hops=3) still below 0.78 gate.  
- Constant‑vote collapse in GNN (AUROC ≈ 0.5); text embeddings non‑separable for dispatcher classes.  
- Dead code in `summarize()` produced malformed output; fixed.  
- Index.lock contention blocked shared‑tree commits; requires manual lock removal.  
- System‑viz OOM on `find` & `node-card`; mitigated by streaming degree pass (`U‑GRAPH‑STREAM‑DEGREE`).  
- Vitest thread config bug (ignored `poolOptions.threads`) resolved by moving to top‑level `test.maxThreads`.  
- RTK guard false positives suppressed via `isAlreadyRtk` guard.  
- Orphan detector restored (`U‑LINT‑ORPHAN‑OOM`): 13 055 orphans cleared <3 s.  
- Dark wiki rank identified 71 high‑value files out of 32 630.  
- GPU health script updated from cu129 → cu128; passes sanity checks (39 GB used / 96 GB total).
