# blueprint-vision session 7bfff7a4 (2026-06-10, 51.7MB, spine 464KB, 6 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `U-CAP-PROBE-CATALOG-RETIRE-TESTFIX` – removed stale MS0 keystone tests for retired `qwen2.5-coder:7b`.  
- `U-OCTOPUS-PANEL` – wired legacy octopus to capability‑probe oracle; added `getBestReasoningModel`, `getBestChatModel`; updated `MultiModelConsensusEngine.ask()`.  
- `U-OCTOPUS-DIVERSE-PROBE` – optional `runnable?` arg to `resolveDiverseOllamaPanel`; passed probe’s `runnableModelIds`.  
- `loop-state.mjs next` – auto‑advance via handoff resume → explicit flag → pick‑unit.  
- `U-LOOP-AUTO-ADVANCE` – wired auto‑advance logic into `/loop` (3 files).  
- `U-OCTOPUS-LIVE-VALIDATE` – live‑validation of octopus capability probe wiring; 21/21 tests.  
- `U-GNN-EDGE-PREDICT-CORE` – pure‑JS link‑prediction scoring core; 21/21 tests, 3‑of‑3 scrutiny.  
- `U-GNN-EDGE-PREDICT-CANDIDATES` – graph‑coupled candidate generation; 14/14 tests, P2 locks.  
- `U-GNN-EDGE-PREDICT-CLI` – CLI consumer writing ranked missing‑edge report (`predict-missing-edges.mjs`); 17/17 tests, 3‑of‑3 scrutiny.  
- `U-GNN-EDGE-PREDICT-VIZ` – system‑viz generator + FAST[] registration; 9/9 tests, 3‑of‑3 scrutiny.  
- `U-GNN-HETEROPHILY-MJS-PORT` – pure‑JS H2GCN feature transform ported from TS; 21/21 tests, fuzz‑verified.  
- `U-GNN-HETEROPHILY-CLI` – CLI flag `--heterophily-hops` wired into GraphSAGE trainer; 108/108 tests, 3‑of‑3 scrutiny.  
- `U-MINE-INDIA` – hotel‑style transcript miner (concurrency, two‑tier Ollama models, cross‑session synthesis, Obsidian vault feed); 12 tests, 2‑reviewer PASS, P1 fixes applied.  
- `U-GNN-EMBEDDING-DEGENERACY` – diagnostic: meanCosine ≈ 0.86, centroidNorm ≈ 0.93 → shift to H2GCN.  
- `#10 prism_local:local_generate` – MCP route for local LLMs; 10/10 tests, live‑validated; IPv6 bug fixed.  
- `#12 India transcript miner completion` – 84/84 sessions mined; Obsidian vault synthesized (`reference_india_transcript_synthesis.md`).  
- `e32615c8e5 ask‑ollama → MCP local_generate` – fail‑soft routing; 92/92 tests, live‑validated.  
- `d13604947f fleet‑wide auto‑fix doctrine hook` – catches stale `qwen2.5-coder` test.  
- `ef39d5a6c7 & b3022f3510` – scrutiny P3 fixes + doc‑reflect wiki lesson.  
- `47e38e4fb9` – optional `num_ctx` added to `prism_local:local_generate`.  
- `f5aa704075` – per‑file P1 hardening of fetch‑stub test.  
- `c2045b3f5a` – propagated `num_ctx` through ask‑ollama path (MCP route & fail‑soft fallback).  
- `3cf36669e0` – transcript miner overlay routing via MCP (opt‑in, fail‑soft).  
- `d99be7d62d` – galaxy miner MCP overlay; 6/6 tests, 2‑arm PASS.  
- `74ee070071` – lockstep synth‑cap bump (8192 → 16384) for both miners.  
- `2ae59c6aa0` – hotel miner route + `__isMain` guard; 6/6 PASS.  
- `1df8b79a07` – wiki doc‑reflect of apply‑to‑all rollout & bug findings.  
- `cfad5ae290` – AI‑training wiki concept from tetsuo cheat sheet.  
- `f4a681e986` – llama‑server orphan reaper tool; 18/18 tests, 2‑arm PASS.  
- `3d5d506dcf` – wired reaper into fleet‑wide Stop hook (`aggressive-killer-stop.mjs`).  

**DECISIONS**  
- Followed authoritative plan: no speculative LoRA engines.  
- Exposed capability‑oracle on probe (`getBestReasoningModel`, `getBestChatModel`) instead of hard‑coding defaults.  
- Empty `runnableModelIds` treated as fail‑open to preserve legacy behavior.  
- Implemented `next` command for self‑advancing loops; eliminated manual prompts.  
- Adopted 4‑tier precedence for loop continuation (resume → handoff‑resume → pick‑unit → fleet‑fallback) with bounded roll cap (`PRISM_LOOP_MAX_ROLLS`).  
- Stopped `nim‑llama32‑3b` container to free ~88 GB and eliminate ECONNREFUSED API limit errors; permanence pending.  
- Deferred full GNN edge‑predict build until fresh context; built core locally only.  
- Adopted “Both — A now, B after regen” strategy for missing knowledge edges vs engine→dispatcher inference.  
- Rejected TS engine import for edge‑predict libs; used system‑viz generator + FAST[] registration instead.  
- Wire H2GCN via CLI flag `--heterophily-hops` rather than new dispatcher action.  
- Route local Ollama calls through `ask-ollama.mjs` (direct HTTP) due to lack of MCP dispatcher; plan separate routing task later.  
- Maximize miner concurrency (`OLLAMA_NUM_PARALLEL=4`) and two‑tier model pipeline.  
- Added coverage honesty logging and vault shrink‑guard to miner.  
- Adopt fail‑soft MCP routing layer for all local‑LLM consumers; extended dispatcher to support `num_ctx`.  
- Implemented fleet‑wide apply‑to‑all for miners and ask‑ollama consumer.  
- Use session‑scoped Stop hook with condition “[do everything in loops until its all wired, tested and validated]”; auto‑clear once satisfied; no manual `/goal clear`.  

**OPERATOR DIRECTIVES**  
- Continue to next phase (MS2 RAG re‑embed or MS3 GNN edge predict).  
- Make loops automatically lead to the next unit/task.  
- Do everything in loops until all wired, tested and validated.  
- Build with RTX PRO 6000 Blackwell 96 GB GPU, new CPU, RAM, NVMe SSD.  
- Mine all India‑slot AI/NN/GNN/LoRA/PSN/system‑viz transcripts into Obsidian vault.  
- Authorize GPU retrain now (#9); decline MCP server restart (#11).  
- Route local LLMs through MCP server; fail‑soft fallback to direct Ollama.  
- Use reaper‑immune Windows Scheduled Task for long‑running jobs (miner, future GPU retrains).  
- Verify no `/goal clear` after hook success.  

**FINDINGS / BUGS**  
- Stale tests for MS0 keystone and ConnectionFinderEngine due to retired model.  
- Misnamed test in diverse panel; fixed.  
- Ambiguity around empty `runnableModelIds`; chose fail‑open semantics.  
- Test mock cast tightened; replaced with `satisfies CapabilitySnapshot`.  
- P0 missing roll cap → potential runaway.  
- Cross‑session handoff contamination (resumed peer RESUME).  
- `--resolve-only` mutates on exhausted.  
- Fleet‑fallback bypasses peer‑claim filter.  
- API rate limit errors caused by WSL memory overrun from nim container; stopped container.  
- GNN edge‑predict does not require torch; pure‑JS inference via `sigmoid(dot)` on pre‑computed embeddings.  
- Embedding degeneracy: meanCosine ≈ 0.86, centroidNorm ≈ 0.93 → shift to H2GCN.  
- H2GCN saturates at sigmoid(1); AUROC lift ≈ +0.067 across 3 seeds; single‑seed +0.118 noise.  
- CLI flag parsing bug: `--heterophily-hops` not reaching trainer; fixed.  
- Miner coverage logging hid true mineable count; fixed.  
- Vault write guard could overwrite larger synthesis; added shrink‑guard.  
- Node fetch(`http://localhost:11434`) fails on Windows (IPv6 → ::1); fixed by hard‑coding 127.0.0.1.  
- Fleet reaper kills long session‑attached node runs (exit 255); mitigated by scheduled tasks.  
- OCR Batch stale warning – operator must reinstall via `install-blueprint-ocr-batch-task.ps1`.  
- GNN full‑gate clearance (#9) data‑blocked; no code work pending.  
- Source:"mcp" success path awaiting :3100 rebuild.  

**DOMAIN SPECIFICS**  
Engines/Actions:  
- `OllamaCapabilityProbeEngine` (probe, `getBestReasoningModel`, `getBestChatModel`)  
- `MultiModelConsensusEngine.ask()`  
- `resolveDiverseOllamaPanel`  
- `loop-state.mjs next` command  
- GNN edge‑predict core (`edge-predict.mjs`)  
- Candidate generator (`U-GNN-EDGE-PREDICT-CANDIDATES`)  
- CLI consumer (`U-GNN-EDGE-PREDICT-CLI`)  
- System‑viz generator + FAST[] registration (`U-GNN-EDGE-PREDICT-VIZ`)  
- H2GCN feature extractor (`heterophily-features.mjs`)  
- GraphSAGE trainer with `--heterophily-hops` flag  
- Transcript miner (`mine-india-transcripts.mjs`)  
- `prism_local:local_generate` dispatcher (MCP route, optional `num_ctx`)  
- `ask‑ollama` consumer (direct HTTP or MCP via `PRISM_LOCAL_LLM_VIA_MCP`)  
- Reaper hook (`aggressive-killer-stop.mjs`)  
- Fleet‑wide auto‑fix doctrine hook  

Metrics/Paths:  
- Capability‑probe snapshot; runnable model list; probe‑driven default selection.  
- Roll‑cap (`rollsTotal`); handoff‑resume; GPU health (`gpu_health.py`).  
- GNN edge‑prediction primitive (`graphsage-model.mjs`); AUROC baseline vs H2GCN lift; meanCosine/centroidNorm for embeddings.  
- `state/shared/nn‑graph/node‑embeddings‑768d.jsonl`.  
- Scripts: `mine-india-transcripts.mjs`, `predict-missing-edges.mjs`.  
- Obsidian vault: `reference_india_transcript_synthesis.md`.  

**TOOLS USED**  
Node.js (.mjs), TypeScript (`tsc`), Vitest, per‑file 2‑arm & 3‑of‑3 scrutiny gates.  
PRISM loop engine & injector hook; `/checkin`, `/loop`, `/pick-unit`, `next`.  
Ollama capability probe & multi‑model consensus.  
Prompt caching & CAG cold cache anchor.  
GNN edge‑predict core (`edge-predict.mjs`).  
WSL memory guard script (`27-wsl-memory-guard.mjs`).  
Docker container `nim‑llama32‑3b` (stopped).  
Windows Scheduled Task installer (`install-india-mine-task.ps1`).  
MCP dispatcher (`http://127.0.0.1:3100/mcp`); `mcp-streamable-client.mjs`.  
Bridge: `ollama-prism-bridge.mjs`; consumer: `ask‑ollama.mjs`.  
Slot helpers: `slot-bind-enforce.mjs`, `chat-slots.mjs`.  
Stop hook wiring: `aggressive-killer-stop.mjs`.  

**OPEN THREADS**  
- Build and commit full `U-GNN-EDGE-PREDICT` unit (4 files) in fresh context; wire engine & tests.  
- Decide permanence of stopped `nim‑llama32‑3b` container (`docker update --restart=no` or `docker rm`).  
- Address remaining coverage gaps: multimodal adapters, CAG F1/F6 wiring, HELM eval, sparse autoencoder interpretability, layer‑4 memory review gate.  
- Run per‑file scrutiny for GNN edge‑predict core once unit ready.  
- GNN full‑gate clearance (#9) data‑blocked; awaiting data.  
- Source:"mcp" success path awaiting :3100 rebuild (operator‑coordinated).  
- OCR Batch stale warning – operator reinstall via `install-blueprint-ocr-batch-task.ps1`.  
- Next loop iteration will pick up queued unit in `HANDOFF-claude-d8aee904-local-llm-ms1.md`.  
- Resolve JSON formatting bug causing repeated 400 responses for Stop hook API.
