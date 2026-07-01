# hermes-zulu galaxy CROSS-SESSION SYNTHESIS (4 of 4 mineable, model gpt-oss:120b, 2026-06-13)

## What this galaxy is building
- Fully‑automated **Hermes/Zulu orchestration fleet**: per‑NATO slot Hermes profiles, cross‑substrate synergy edges, deterministic “goal gate”, synthetic domain node unit to close owned‑by‑slot gaps.  
- **2nd‑brain memory pipeline**: Qdrant vector stores for memories (≈17 k vectors) and wiki (≈53.9 k vectors), temporal recall dispatcher, hybrid ANN + BM25 retrieval, nightly “brain‑refresh” rebuild.  
- **Closed‑loop AI improvement loop**: offload telemetry to Ollama models, nightly batch of 11 verified jobs (CAD generation, LoRA refresh, tribal tip ingestion).  
- **Domain‑specific extensions**: CAD text→CadQuery generator (`prism_cad`), Obsidian ↔ Hermes bridge, synthetic domain node unit for the 9‑galaxy owned‑by‑slot gap.  

## Shipped capabilities
- `LAUNCH-HERMES-FLEET.bat` + PowerShell slot boot script – launches **21** Hermes profiles (stored under `%LOCALAPPDATA%\hermes\profiles\<slot>`).  
- Cross‑substrate edges: **+55 218 new edges** across all 34 galaxies.  
- GNN reference pool expanded by **8 confirmed wirings**; AUROC = 0.8084, CAG coverage = 100 %.  
- Deterministic gate `ai-systems-synergy-goal-gate.mjs` – PASS on all 4 legs (synergy, LoRA, GNN, CAG).  
- Miner `mine‑galaxy‑transcripts.mjs` runs for Bravo sessions (06‑12/13).  
- Ollama auto‑route hook (`olloma‑route‑pretooluse.mjs`) – timeout ↑9 s→30 s, keep_alive = 30 min.  
- Qdrant collections: `prism_memories` (17 032 × 768‑dim cosine vectors), `prism_wiki` (53 930 vectors).  
- HMEMV units shipped: V02 (temporal recall), V03 (recall_as_of dispatcher), V08 (Obsidian filters), V09 (wiki & memory producers/consumers, keep‑warm task).  
- Cron pre‑warm (`PRISM Hermes Cron Prewarm`) and GEPA weekly tasks installed.  
- Night batch scheduler (`PRISM Ollama Night Batch` at 22:23) with **11** verified jobs.  
- CAD dispatcher `prism_cad:cad_generate_from_text` + script `cad-text-to-cadquery.mjs`.  

## Key decisions + rationale
- **Hermes profile per slot** – isolates worktrees, seeds each with SOUL; simplifies slot‑binding and audit.  
- **Deterministic loss‑function gate** as authoritative completion signal → eliminates manual `/goal clear`.  
- Remove legacy `aiDispatcher.ts`; keep canonical 12‑action dispatcher to reduce tool duplication.  
- **Atomic graph writes** (`writeGraphStreamingAtomic`) for all GNN/edge mutations – prevents partial updates.  
- Offload safe‑category tasks to Ollama; telemetry records token savings → drives cost efficiency.  
- Hybrid retrieval (ANN + BM25 fallback) ensures recall even under GPU contention.  
- Enforce audit freshness ≤24 h; stale audits now cause gate failure.  
- Keep‑alive for `nomic‑embed-text` (30 min) to avoid eviction under load.  
- Disable context‑warning gates; enable self‑compaction after every 75 tool calls / 15 prompts.  
- Synthetic domain node unit required to fill **9‑galaxy owned‑by‑slot gap** (5 skips already resolved).  

## Standing operator directives
- Duplicate Claude fleet launcher → launch Hermes instances per slot (`/checkin-zulu`).  
- Resume reading all Bravo sessions (06‑12/13) via Ollama `qwen2.5vl:32b`; maximize Oscar knowledge.  
- Continuously improve AI systems across **all 34 galaxies**; run synergy gate every 10 min.  
- Implement synthetic domain node unit to close owned‑by‑slot gaps.  
- Auto‑clear when deterministic gate PASS (no manual `/goal clear`).  
- Push high‑ROI enhancements: HMEMV03, V08, night batch jobs, CAD generation.  
- Sync Obsidian vault with Hermes/Zulu orchestrator; run `/system‑viz` after each major mutation.  
- Accelerate 2nd‑brain memory refresh (`brain-refresh --force`) nightly.  

## What is still to build (open threads)
- **GNN full‑coverage training** on India GPU – target AUROC ≥ 0.78, complete reference‑pool growth.  
- **Synthetic domain node unit** implementation for the remaining owned‑by‑slot gaps.  
- **LoRA adapters pipeline**: convert 1 366 rows (plus new CAD datasets) into trainable adapters.  
- Continuous **memory pressure monitoring** & automated reaper to keep usage <90 %.  
- Final SDK pin to a fixed minor version; resolve remaining API drift and duplicate registration bugs.  
- Max out Oscar knowledge miner runs (pending scheduler validation).  
- Complete HMEMV09 migration of tribal + wiki corpora into Qdrant (full streaming ingest).  
- Verify `nomic‑embed-text` keep‑alive under sustained GPU load.  
- Deploy GEPA weekly task to production after final review.  
- Finish remaining HMEMV units: V04, V05, V07, V10, V11.  
- Wire Obsidian vault integration fully into Hermes/Zulu recall pipeline.  
- Session‑limit handling hook so fleet launch directive can execute without block.  

## How to build it (patterns/sequence)
1. **Seed profiles**: `hermes -p <slot>` → create 21 slots, seed with SOUL & cwd.  
2. **Generate edges**: run `generate-cross-substrate-edges.mjs` after each ref‑pool update.  
3. **Commit graph mutations** via `writeGraphStreamingAtomic`.  
4. **Run deterministic gate** (`ai-systems-synergy-goal-gate.mjs`) → auto‑clear on PASS.  
5. **Nightly batch** (22:23–06:00): execute offload telemetry, tribal tip ingest, LoRA refresh, CAD extraction, wiki populate (streaming).  
6. **Populate Qdrant**: `vault-to-gnn-refpool.mjs`, `vault-to-lora-dataset.mjs`, `populate-qdrant-wiki.mjs` – use streaming to avoid OOM.  
7. **Hybrid retrieval**: ANN primary, BM25 fallback; enforce 15 s wall‑clock limit on queries.  
8. **Synthetic domain node unit**: inject after audit identifies owned‑by‑slot gap.  
9. **GNN training**: schedule on India GPU, monitor AUROC, update reference pool.  
10. **Cron prewarm & GEPA tasks**: install via `install-hermes-tasks.ps1`, verify at 16:03/16:12.  
11. **Offload telemetry**: log each Ollama‑executed task, compute token savings, promote to `SAFE_AUTOEXEC`.  
12. **System‑viz regeneration** after any graph change (`/system-viz`).  

## Tools to use
- **Dispatchers / Skills**: `prism_ai`, `prism_auth`, `prism_claude_account`, `prism_cad:cad_generate_from_text`, `recall_as_of`.  
- **Scripts**: `generate-cross-substrate-edges.mjs`, `vault-to‑gnn-refpool.mjs`, `vault-to‑lora-dataset.mjs`, `ai-systems-synergy-goal-gate.mjs`, `mine‑galaxy‑transcripts.mjs`, `ollama-route-pretooluse.mjs`, `ask‑ollama.mjs`, `cad-text-to-cadquery.mjs`, `night‑batch‑registry.json`.  
- **Hooks**: `slot-bind-enforce.mjs`, `subagent-start-context.mjs`, `audit-ai-synergy.mjs`, `session-reorient-inject.mjs`, `crywolf-probe.mjs`.  
- **System‑viz**: `/system-viz` for graph regeneration.  
- **AI‑systems / Models**: Ollama `qwen2.5vl:32b`, `gpt‑oss:120b`, `deepseek-r1-32b`; local LoRA adapters; GNN on India GPU.  
- **Vector stores**: Qdrant (`prism_memories`, `prism_wiki`) – use `streamPopulateQdrant` for large loads.  
- **Obsidian bridge**: `ObsidianRestBridgeEngine`, `h-to-c-obsidian-mirror.mjs`.  
- **Cron / Scheduler**: `PRISM Hermes Cron Prewarm`, GEPA weekly, night batch task runner.  

## Recurring findings + bugs
- **Bash.exe runaway** (R14) when heavy background tasks run – mitigated by stopping workflow/miner nodes.  
- **LoRA dataset bound** at 1 366 rows; regeneration would drop below floor → left unchanged pending adapter pipeline.  
- **9‑galaxy owned‑by‑slot gap**: 5 skips resolved, 4 require synthetic domain node unit.  
- **MCP duplicate registration** (`prism_ai`, `prism_auth`) caused silent crashes – source identified, fix planned.  
- **SDK caret drift** → hard throws on duplicate tool names; guard added in `proxiedTool()`.  
- **Stale git lock** (5 h) cleared safely via `git-lock-sweep`.  
- **Memory pressure spikes** (~97 % commit) during transient Ollama model loads – self‑recovered after reaper sweep.  
- **OOM on wiki populate** resolved by streaming loader (`streamPopulateQdrant`).  
- **Crywolf liveness false warnings** fixed by probe reorder.  
- **Session‑limit hook** blocked fleet launch requests – needs bypass/implementation.  
- **Offload autoexec dead** → re‑enabled with safe‑category guard.  
- **Stale audit (40 h)** allowed gate PASS; freshness enforcement now blocks >24 h audits.  
- **Cold‑model timeout** increased from 9 s to 30 s; keep‑alive for embed model set to 30 min.  
- **Qdrant ANN latency spikes** (8–45 s) under GPU contention – fallback to BM25 works.  
- **Inventory builder clobber near‑miss** fixed with guard against zero‑row overwrite.
