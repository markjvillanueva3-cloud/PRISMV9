# discovery galaxy CROSS-SESSION SYNTHESIS (6 of 75 mineable, model gpt-oss:120b, 2026-06-09)

## What this galaxy is building
- Unified **PRISM** platform: streaming data‑ingestion → semantic graph → multi‑model inference (GNN edge‑predict, embeddings, LoRA) + domain‑specific pipelines (CAD, CNC, transcript mining).  
- End‑to‑end **dispatch‑engine** framework wiring engines to actions, auto‑loop advancement, and live validation via MCP.  
- Integrated **Obsidian ↔︎ PRISM memory** bidirectional sync for knowledge recall and token‑saving RAG.  

## Shipped capabilities
- `JMDiePartLibraryEngine.ts` + dispatcher action `jm_die_part_lookup` (30 k orphaned `part.json` sidecars → `jm-part-library.jsonl`).  
- Large inventory JSONL files added to `database-expansion/PATHS.md` (3 files, 554 k/301 k/1.27 M).  
- Archived dead indexes (`.archive.2026‑06‑08.json`).  
- Octopus capability probe engine (`OllamaCapabilityProbeEngine`) with `getBestReasoningModel`, `getBestChatModel`.  
- Loop auto‑advance (`U‑LOOP‑AUTO‑ADVANCE`) bounded by `PRISM_LOOP_MAX_ROLLS`.  
- GNN edge‑predict core, candidate generator, CLI writer, viz generator (21/21, 14/14, 17/17, 9/9 tests).  
- H2GCN heterophily transform port (`U‑GNN‑HETEROPHILY‑MJS‑PORT`) + CLI flag.  
- Transcript miner `U‑MINE‑INDIA` (84 sessions → Obsidian vault).  
- Memory‑recall hooks (`memory-relevance-inject.mjs`, `stop-goal-clear-advance.mjs`).  
- Ultra‑code discovery spec (`HIGHVALUE-DISCOVERY-2026‑06‑08.md`).  
- CAD pipeline drafts: `cad‑ollama‑archetype‑label.mjs` (dead tag fix pending), `CADFeatureRecognitionEngine` stub.  
- CNC catalog loader (`_loadGlobalCNCTools`) now yields 1 134 tools, filters bad geometry.  
- Launcher scripts: `Launch‑PRISM‑Fleet‑3win.ps1` (3‑window per account) + fallback 4‑window.  
- Ollama backend switch (`LOCAL_LLM_BACKEND=ollama`), NIM containers disabled.  
- Streaming graph I/O (`writeGraphStreamingAtomic`).  
- LoRA dataset generator (`vault-to-lora-dataset.mjs`) – 245 Alpaca‑style pairs.  

## Key decisions + rationale
- **Fail‑loud / zero‑drop ingestion** for data expansion → guarantees invariant compliance (session 05e8d131).  
- **Single‑command git add+commit** to avoid shared‑tree race where peer commits absorb staged files.  
- **Defer speculative LoRA engines** (P0‑6) until core pipelines stable.  
- **Adopt Ollama as sole LLM backend**, remove Docker `ollama` service & NIM containers to eliminate port collisions and RAM overcommit.  
- **Streaming I/O for graph reads/writes** to prevent OOM on 642 MB graphs.  
- **Ultracode discovery workflow** for high‑value unit identification (82–159 K token savings).  
- **Content‑based transcript mining** with caps (≤3 concurrent, ≤14 slices per transcript) to respect rate limits.  
- **Auto‑loop state `next` command** for hands‑free progression; loops must auto‑advance only after successful wiring/tests.  
- **Single‑source resolver** for all Obsidian memory paths → eliminates split‑brain catalog and duplicate token waste.  

## Standing operator directives
- `/continue next phase` – proceed after each unit passes scrutiny.  
- Enable **auto‑loop advancement** (`U‑LOOP‑AUTO‑ADVANCE`).  
- Commit `delta‑...` briefing & Ollama plan files; then execute A1 (replace dead tag in `cad‑ollama‑archetype‑label.mjs`).  
- Run elevated PowerShell block to register all scheduled tasks (six cron installers).  
- Verify native Ollama daemon starts on boot, no compose service on port 11434.  
- After agent‑orchestration, launch final backend batch (`bv3pb1fts`).  

## What is still to build (open threads)
- **C5 / C6**: archival of superseded `.index/` version chains (per‑chain liveness check).  
- **B4 phase16 migration**: full consumer‑path verification before wiring/archiving.  
- **GPU classify slot** (cross‑slot coordination).  
- **Full GNN edge‑predict build** (engine, dispatcher, tests, wiring) and reach AUROC ≥ 0.78 (current lift +0.138).  
- **MCP restart** to expose `local_generate` action; then rewire `ask‑ollama`.  
- **Memory‑RAG inject** wiring to semantic recall.  
- **Ultracode queue items**: git‑stash guard‑hole, embed‑stub filter, isLargeRead gate.  
- **CAD pipeline**: merge `slot/delta` arc, build/validate `CAD-FEATURE-RECOGNITION-MS0`, run revolute‑assembly proof (`Fusion bridge :18365`).  
- **CNC catalog consolidation**: finish units U‑MTOOL02, U‑HOLD01, U‑COLL02, etc.; coordinate with Romeo’s loader.  
- **LoRA training data pipeline** finalization (weights storage, integration with GNN feeder).  
- **Finalize Ollama default config** (model limits, concurrency) across all task classes.  

## How to build it (patterns/sequence)
1. **Ingestion pattern** – use `build‑<engine>.mjs` generators → zero‑drop streaming ingest; run round‑trip tests (≥19).  
2. **Engine wiring** – follow `JMDieDocIndexEngine` template: create engine TS file, add schema to `dataActionSchemas.ts`, register dispatcher action.  
3. **Commit safety** – `git add && git commit --only <paths>`; avoid shared‑tree absorption.  
4. **Auto‑loop integration** – insert `loop-state.next` after each successful test suite; guard with `PRISM_LOOP_MAX_ROLLS`.  
5. **Content‑based mining** – run `mine-galaxy-transcripts.mjs --content --galaxy <name> --limit 6 --max-slices 14 --timeout 900`.  
6. **Streaming graph I/O** – replace bulk reads with `readGraphStreaming` / `writeGraphStreamingAtomic`.  
7. **Ultracode high‑value selection** – run discovery workflow, prioritize units with >10 K token savings.  
8. **Obsidian ↔︎ PRISM sync** – route all high‑run consumers through `resolveObsidianMemDir()`, lock recall counter (`U‑OBS‑RECALL‑COUNTER‑SERIALIZE`).  
9. **Model backend switch** – set env `LOCAL_LLM_BACKEND=ollama`; disable NIM autostart scripts; ensure Docker compose excludes `ollama`.  

## Tools to use
- **Dispatchers/Engines**: `dataDispatcher.ts`, `prism_local` dispatcher (`local_generate`), `OllamaCapabilityProbeEngine`, `GNN edge‑predict` engine, `JMDiePartLibraryEngine`.  
- **Scripts/Hooks**: `build-jm-part-library.mjs`, `seed-ghost-from-unwired.mjs`, `vault-to-lora-dataset.mjs`, `launch‑PRISM‑Fleet‑3win.ps1`, `stop-goal-clear-advance.mjs`, `memory-relevance-inject.mjs`.  
- **System‑viz**: `U‑GNN‑EDGE‑PREDICT‑VIZ`, `system-viz` queries (`find`, `node-card`).  
- **AI systems**: Ollama (gpt‑oss:120b, qwen2.5‑coder:32b), Claude/Blackwell for geometry/CAD safety, gpt‑oss:20b for core reasoning.  
- **Vector store**: Qdrant (768‑dim nomic‑embed vectors).  
- **Knowledge base**: Obsidian vault (`C:/Users/wompu/.claude/projects/H--prism/memory`), `resolveObsidianMemDir()`.  

## Recurring findings + bugs
- Malformed `part.json` sidecars (24) → now reported, not dropped.  
- Shared‑tree commit absorption regression (peer `git add` swept 3 files).  
- OOM in master index & graph reads fixed with heap guard & streaming I/O.  
- NIM containers crash‑loop (exit 137) → disabled, restart policy `no`.  
- IPv6 localhost ECONNREFUSED on Windows → forced 127.0.0.1 for Ollama calls.  
- Dead tag in `cad‑ollama‑archetype‑label.mjs` caused silent no‑op.  
- Split‑brain catalog: `src/data/*.json` vs `.ts` sources → 8–15 vs ~85 k records; fixed by loader filter.  
- Dangling links (~15 k) removed via phantom‑link filter (15.5 % reduction).  
- Recall counter lost updates under concurrency → exclusive lock added.  
- GPU contention with `gpt‑oss:120b` embeddings → timeout increased to 900 s.  
- Duplicate MCP daemons warning resolved by cleanup script.  
- Token waste from backend audit injection eliminated via session‑once gate (≈159 K saved).  

---
