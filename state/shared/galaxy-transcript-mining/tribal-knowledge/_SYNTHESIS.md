# tribal-knowledge galaxy CROSS-SESSION SYNTHESIS (6 of 202 mineable, model gpt-oss:120b, 2026-06-09)

## What this galaxy is building
- Unified AI‑augmented manufacturing knowledge hub: **Hermes gateway** ↔ **Obsidian vault** ↔ **Qdrant vector store** ↔ **Ollama local LLMs** (gpt‑oss 20b/120b, qwen2.5‑coder 32b, qwen3‑vl).  
- End‑to‑end tooling for **speed‑feed physics**, **tool catalog lookup (62 727 entries)**, **GNN edge‑prediction**, and **octopus capability probes**.  
- Automated **offload engine** that routes heavy compute to GPU‑LLM judges; **loop auto‑advance** for continuous self‑testing.  
- Cross‑session “galaxy memory” sections (`MEMORY.md`) kept in sync with the repo tree.  

## Shipped capabilities
- **Hermes config v28**: primary `gpt‑oss:20b` (tool‑capable), fallback `Claude Code`; CLI headless mode, `/api/status` shows `gateway_running=true`, `config_version=28`. *(commit 28b72e4dee)*  
- **Qdrant container** @ `localhost:6333` with all collections alive. *(session 001bd6c3)*  
- Deterministic script `scripts/fill-galaxy-memory-sections.mjs` populating the four canonical memory sections. *(commit 28b72e4dee)*  
- **Offload / OllamaTaskOffloaderEngine** wired with `ollama‑route-config.json`; auto‑enforce via `ollama-offload-enforce.mjs`. *(U5c, U9)*  
- **Speed‑Feed physics suite**: 41 engines + 9‑axis model; CPU calibration (`SpeedFeedCalibrationPersistEngine`), GPU LLM judge (`SpeedFeedGpuJudgeEngine`). *(multiple commits in session 8b4b9149)*  
- **Tool catalog loader** `CatalogCorpusLoaderEngine.ts` exposing full 62 727‑tool corpus via `mill_tool_catalog_query` & `turning_tool_catalog_query`. *(commit aca389cc97, 3131f8ccae)*  
- **GNN edge‑predict core** (`U‑GNN‑EDGE‑PREDICT‑CORE/CLI/VIZ`) – pure‑JS inference, AUROC ≈ 0.808 live. *(session 7bfff7a4)*  
- **Octopus panels** (legacy & diverse) wired to `OllamaCapabilityProbeEngine`; runnable filter added. *(U‑OCTOPUS‑PANEL/DIVERSE‑PROBE)*  
- **Loop auto‑advance** (`loop-state.mjs`) with 9/9 tests green. *(U‑LOOP‑AUTO‑ADVANCE)*  
- **WSL memory guard** `27-wsl-memory-guard.mjs` + PowerShell installer; caps at 16 GB, reports over‑run. *(session 14c8b81e)*  
- **Call‑engine harness** (`scripts/call-engine.mjs`) with Windows/Bash wrappers and test suite. *(session 14c8b81e)*  

## Key decisions + rationale
- **Primary model = gpt‑oss:20b** – tool‑calling, lower VRAM (≤4 loaded) vs 120b; fallback to Claude Code for extra‑usage billing.  
- **Qdrant optional until service up** – Hermes can run headless; keep vector store as “nice‑to‑have” for semantic search.  
- **Vision model = local Ollama qwen3‑vl** when image processing needed (avoid external API latency/cost).  
- **Deterministic memory script** excludes `node_*` dumps to prevent inflated counts.  
- **VRAM budget**: NP 4→2, MAX_LOADED ≤ 4; un‑strand 120b from floor tiers; enforce keep_alive via U9.  
- **Offload routing** uses existing `OllamaTaskOffloaderEngine`; no new router required.  
- **Consensus logic** excludes non‑aligned external data unless it is the sole source (R7).  
- **Calibration persist engine** advisory only; auto‑apply disabled for safety (`INCVC` flag).  
- **EPERM leak fix** in `OutcomeCaptureBusEngine` – atomic append + retry prevents spine corruption.  
- **WSL memory guard enforcement** requires manual `wsl --shutdown`; otherwise 96 GB commit persists.  

## Standing operator directives
- Start Qdrant Docker container, verify collections via `curl localhost:6333/collections`.  
- Enable extra‑usage billing for Claude Code (`~/.claude/.credentials.json`).  
- Restart Hermes after any config change; confirm `/api/status` shows updated `model.provider`.  
- If Hermes returns HTTP 400 on Claude, switch to local vision model or enable billing.  
- Run `galaxy-synthesis-refresh.mjs` after fixing `ai-training_synthesis.md`.  
- Re‑enable the **Hermes‑Obsidian Bridge** scheduled task.  
- Install and run WSL memory guard: `powershell -File install-wsl-memory-guard-task.ps1 -RunNow`.  
- Monitor VRAM; kill idle Ollama containers (`nim‑llama32‑3b`) if usage > 70 %.  
- Execute `/checkin-sierra`, `/checkin-india`, `/checkin‑slot` wrappers to bind slots.  
- Approve or defer live `config.toml` edit (U5).  
- Decide auxiliary vision provider (Claude vs local) and Kimi free‑voice wiring.  

## What is still to build (open threads)
1. **Full 4‑file GNN edge‑predict pipeline** (candidate generation → scoring → wiring → tests).  
2. **Embedding regeneration** including engineering/dispatch nodes; gate AUROC > 0.78.  
3. **Consensus exclusion fix** for non‑aligned externals; validate with G‑Wizard proven SFM data.  
4. **HSMAdvisor integration** – ensure alignment flag usage, correct median computation.  
5. **Physics axes expansion**: tool material, coolant, holder/machine/spindle rigidity, insert geometry, controller/workholding.  
6. **Auth provider selection & webhook signature deployment** (Clerk / Supabase / Auth0).  
7. **GPU judge throughput optimization** (batching, caching vendor PDFs).  
8. **Non‑carbide richer baseline catalog OCR** – multi‑hour GPU job.  
9. **Safety gate logic** for aggressive modes on hardened materials; verify `S(x)≥0.98`.  
10. **Full speed‑feed sweep** across all ISO groups, including N/H coverage and aluminum fix.  
11. **Slot‑opt‑in for Zulu orchestrator** (populate `zuluOptIn`).  
12. **Finalize RTK `config.toml` edit** (U5) and Kimi voice wiring.  

## How to build it (patterns/sequence)
- **Initialize infra**: start Qdrant, run `wsl --shutdown`, install memory guard, launch Ollama server.  
- **Configure Hermes**: apply config v28, set primary/fallback models, restart service.  
- **Sync vault & memory**: run `fill-galaxy-memory-sections.mjs` → verify `MEMORY.md` sections count.  
- **Load tool catalog**: execute `CatalogCorpusLoaderEngine` → regenerate `CATALOG_INDEX.json`.  
- **Wire dispatchers**: ensure `ensureLoaded()` guards in `camDispatcher`, expose `*_tool_catalog_query`.  
- **Run calibration loop**: CPU calibrate (`SpeedFeedCalibrationPersistEngine`) → GPU judge (`SpeedFeedGpuJudgeEngine`).  
- **Execute full sweep**: invoke `UltimateSpeedFeedEngine` with all axis constants; capture ledger.  
- **Generate embeddings** (including eng/disp nodes), run `GNN‑EDGE‑PREDICT‑CORE`.  
- **Integrate GNN output** into `tool_catalog_query` results and octopus capability probes.  
- **Enable offload engine** (`ollama-offload-enforce.mjs`) → monitor VRAM, adjust keep_alive.  
- **Loop auto‑advance**: start `/loop` with 10 m interval; ensure tasks auto‑progress to next unit.  
- **Validate & test**: run full Vitest suite; confirm all green (≥124/124).  

## Tools to use
- **Dispatchers / Engines**: `HermesGateway`, `QdrantVectorStoreEngine`, `OllamaCapabilityProbeEngine`, `SpeedFeedCalibrationPersistEngine`, `SpeedFeedGpuJudgeEngine`, `UltimateSpeedFeedEngine`, `GNNEdgePredictCore`, `ExpandingMandrelEngine`, `CatalogCorpusLoaderEngine`.  
- **Scripts / Hooks**: `fill-galaxy-memory-sections.mjs`, `galaxy-synthesis-refresh.mjs`, `call-engine.mjs`, `27-wsl-memory-guard.mjs`, `offload-enforce.mjs`, `ollama-offload-enforce.mjs`, `loop-state.mjs`, `regenerate-catalog-index.mjs`.  
- **System‑viz**: `system-viz/MEMORY.md`, `generate-predicted-edges-features.mjs`, `regen-viz.mjs`.  
- **AI systems**: Ollama local models (`gpt‑oss:20b/120b`, `qwen2.5-coder:32b`, `qwen3-vl`), Claude Code (fallback).  
- **Vector store**: Qdrant at `localhost:6333`.  
- **Knowledge base**: Obsidian vault REST API `:27123`; bridge via `hermes/memories`.  
- **Testing / CI**: Vitest, node:test, `vitest` config, Git hooks (`git-add-lane-guard`).  

## Recurring findings + bugs
- **Qdrant down → semantic_search empty**; fixed by container start.  
- **Hermes 400 “extra usage”** when Claude billing disabled – requires enable or local fallback.  
- **EPERM leak in OutcomeCaptureBusEngine** caused spine corruption; fixed with atomic append+retry.  
- **VRAM over‑commit** (96 GB) from idle Ollama containers; kill `nim‑llama32‑3b` and enforce keep_alive.  
- **Consensus includes non‑aligned externals** (HSMAdvisor constant 634.6 m/min); now excluded unless sole source.  
- **Missing N/H material coverage** in speed‑feed sweep – added to material map.  
- **WSL memory guard not enforced** until manual `wsl --shutdown`.  
- **Search caps (`max_results=20`)** truncated tool exports; uncapped via `ensureLoaded()`.  
- **Calibration factors unsafe for auto‑apply** → flagged `INCVC`, advisory only.  
- **GNN embedding degeneracy (meanCosine ≈ 0.86)** – required H2GCN feature transform.  
- **Idle Ollama models consume ~65 GB**, causing API limit errors; resolved by stopping them.  
- **Stale catalog tests (`qwen2.5-coder:7b`)** caused RED failures – updated to current versions.  
- **IPv6 localhost bug in OffloadEngine** → fixed to `127.0.0.1`.  

---
