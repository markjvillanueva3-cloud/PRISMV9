# wiring session 7bfff7a4 (2026-06-09, 35MB, spine 326KB, 4 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `U-OCTOPUS-PANEL`: wired octopus voice selection to `OllamaCapabilityProbeEngine`.  
- `U‑OCTOPUS-DIVERSE-PROBE`: added optional runnable‑set arg to `resolveDiverseOllamaPanel`; probe‑driven fallback.  
- `U‑OCTOPUS-LIVE-VALIDATE` / `U‑OCTOPUS-RECORD`: live‑validation of octopus capability‑probe wiring; selects `qwen2.5-coder:32b`, outputs `"READY"`.  
- `U‑LOOP-AUTO-ADVANCE`: loop auto‑advance wired into `loop-state.mjs` & `loop-iteration-inject.mjs`; 6/6 tests green, live‑validated.  
- `U-GNN-EDGE-PREDICT-CORE`: pure‑JS scoring core; 21/21 tests.  
- `U-GNN-EDGE-PREDICT-CANDIDATES`: graph‑coupled candidate generator; 14/14 tests.  
- `U-GNN-EDGE-PREDICT-CLI`: CLI consumer producing persisted ranked report; 17/17 tests.  
- `U-GNN-EDGE-PREDICT-VIZ`: system‑viz roost generator (`generate-predicted-edges-features.mjs`); 9/9 tests.  
- `U-GNN-HETEROPHILY-MJS-PORT`: pure‑JS H2GCN feature transform port; 21/21 tests, fuzz‑verified vs TS source.  
- `U-GNN-HETEROPHILY-CLI`: CLI flag (`--heterophily-hops`) wired into retrain pipeline; 4 files, 108/108 tests.  
- `U-MINE-INDIA`: maxed transcript miner; concurrent slice mapping, 2‑tier models, cross‑session synthesis, Obsidian vault feed; 12 tests, 2‑reviewer PASS.  
- `#12` – 84/84 India‑transcript mine completed; Obsidian vault synthesis written (`_SYNTHESIS.md`).  
- `#10` – `prism_local:local_generate` action added to MCP dispatcher; IPv6 localhost bug fixed; unit tests (10/10) and live‑validation passed.  

**DECISIONS**  
- Do not build speculative LoRA variants; follow P0‑6 plan.  
- Wire legacy & diverse octopus branches to capability probe oracle; preserve back‑compat via optional runnable set.  
- Treat empty runnable array as “no signal” (fail‑open).  
- Implement `next` command for auto‑advance loops, eliminating manual “continue next phase”.  
- Stop `nim‑llama32‑3b` Docker container to free ~88 GB Windows commit; decision pending on permanent removal/restart policy.  
- Next priority: build GNN edge‑predict unit once MCP/agents healthy; focus on top‑3 audit gaps (multimodal adapters, CAG F1+F6 wiring, review‑gate/eval harness).  
- Adopt “Path‑A now, Path‑B after regen” strategy for H2GCN lever; gate‑clearance remains multi‑lever.  
- Do not start long GPU retrain or fleet‑wide MCP restart in this context; defer to fresh session with reaper‑immune scheduled tasks.  
- Ship `local_generate` first, then perform hop‑sweep for H2GCN (hops = 3) and wire into production retrain pipeline as flag‑gated option.  

**OPERATOR DIRECTIVES**  
- “continue next phase.” – implemented via `next` command.  
- Confirm whether to make `nim‑llama32‑3b` permanent (`docker update --restart=no` or `docker rm`).  
- Provide fresh build context for GNN edge‑predict unit when MCP/agents available.  
- Prioritize wiring CAG F1+F6 and implementing review‑gate/eval harness next.  
- Authorize GPU retrain now (#9); decline MCP restart (#11) per operator choice.  
- “Both — A now, B after regen.” – hardware directive: use RTX Blackwell 600, new CPU, new RAM, new NVMe SSD.  

**FINDINGS/BUGS**  
- MS0 cap‑probe tests stale; updated expectations.  
- Octopus default voice not wired to probe; added wiring & selector methods.  
- Diverse panel lacked runnable gating; added optional arg & probe integration.  
- Empty runnable array treated as no signal, preventing phantom voices on GPU‑less hosts.  
- Test name mis‑described behavior; renamed/documented.  
- API errors from WSL memory overcommit by NIM container; resolved by stopping it and `wsl --shutdown`.  
- GNN edge‑predict unit misinterpreted: pure‑JS inference (`sigmoid(dot)`); embeddings lack `eng.*`/`disp.*` nodes currently.  
- Embedding degeneracy detected (meanCosine 0.86, centroidNorm 0.93).  
- P1 fixes applied in CLI & candidate generation modules.  
- Miner coverage honesty bug – true mineable count not reported; vault shrink‑guard required to prevent overwriting larger synthesis.  
- Node‑fetch on Windows resolves `localhost` to IPv6 (`::1`) → ECONNREFUSED; fixed by using `127.0.0.1`.  
- Hop‑sweep: hops = 3 gives +0.138 AUROC lift (multi‑seed), ceiling ≈ 0.64 < 0.78 gate.  
- H2GCN lever exists only in harness pipeline; wired into production retrain via `--heterophily-hops`.  

**DOMAIN SPECIFICS**  
- Engines: `OllamaCapabilityProbeEngine`, `MultiModelConsensusEngine`, `GnnEdgePredictionEngine.ts`, `HeterophilyFeatureTransform` (H2GCN), `OllamaTaskOffloaderEngine`, `graphsage-train-pipeline.mjs`.  
- Dispatchers: checkin, slot‑binding wrapper, `localDispatcher.ts` (prism_local), MCP dispatcher.  
- Paths: embeddings at `state/shared/nn‑graph/node‑embeddings‑768d.jsonl`; system‑viz augmentation files (`ghost.predicted_edges` roost); `/api/chat` (Ollama), `/mcp` JSON‑RPC bridge (`127.0.0.1:3100`).  
- Metrics: baseline AUROC 0.490, H2GCN lift +0.067 (robust across 3 seeds), hop‑sweep +0.138, current ceiling ≈ 0.64; Brier, coverage_sessions.  
- Hardware: RTX PRO 6000 Blackwell 96 GB GPU, Ryzen 9 9950X3D CPU, 136 GB RAM, NVMe SSD.  

**TOOLS USED**  
- Node scripts: `pick-unit.mjs`, `loop-state.mjs`, `loop-iteration-inject.mjs`, `edge-predict.mjs`, `edge-predict-candidates.mjs`, `predict-missing-edges.mjs`, `generate-predicted-edges-features.mjs`, `heterophily-features.mjs`, `mine-india-transcripts.mjs`.  
- PRISM tools: `scrutiny‑3way.mjs`, `CronCreate`, dispatcher framework, scheduled tasks.  
- Vitest for unit tests; TypeScript compiler.  
- Docker Desktop, `docker stop/start`; WSL config (`.wslconfig`), `wsl --shutdown`.  
- Ollama local server; `ask‑ollama.mjs`, `ollama-prism-bridge.mjs`.  

**OPEN THREADS**  
1. Decision on permanent removal/restart policy for `nim‑llama32‑3b`.  
2. Execution of GNN edge‑predict unit once MCP/agents healthy.  
3. Wiring CAG F1+F6 and implementing review‑gate/eval harness.  
4. Address remaining audit gaps (multimodal adapters).  
5. Path‑B engine→dispatcher wiring after embeddings regenerated with eng/disp nodes.  
6. Gate‑clearance for 0.78 AUROC (requires additional levers beyond H2GCN).  
7. MCP local‑LLM routing action build.  
8. Completion of full mine over all 84 transcripts (resumable job `b82qr6i9k`).  
9. #9 gate clearance: embedding‑growth & full GPU retrain via reaper‑immune scheduled task.  
10. #11 consumer path: fleet‑wide MCP restart to expose `local_generate` in running bundle; add JSON‑RPC client in `ask-ollama`.
