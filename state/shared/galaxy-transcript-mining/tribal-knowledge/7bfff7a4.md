# tribal-knowledge session 7bfff7a4 (2026-06-09, 37.8MB, spine 346KB, 4 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `U-CAP-PROBE-CATALOG-RETIRE-TESTFIX` – MS0 keystone tests now GREEN (3+1 RED → 124/124).  
- `U-OCTOPUS-PANEL` – wired legacy octopus to probe (`getBestReasoningModel`, etc.), 124/124 + 242 mjs.  
- `U-OCTOPUS-DIVERSE-PROBE` – added optional `runnable?`; 106/106 green, 6 new unit tests.  
- `U‑LOOP‑AUTO‑ADVANCE` – loop auto‑advance in `loop-state.mjs`, 9/9 tests green.  
- `U‑OCTOPUS‑LIVE‑VALIDATE` (alias `U-OCTOPUS-LIVE-VALIDATE`) – live probe validation, full coverage.  
- `U-GNN-EDGE-PREDICT-CORE` – pure‑JS link‑prediction core, 21/21 tests.  
- `U-GNN-EDGE-PREDICT-CANDIDATES` – graph‑coupled candidate module, 14/14 tests.  
- `U-GNN-EDGE-PREDICT-CLI` – CLI consumer, 17/17 tests.  
- `U-GNN-EDGE-PREDICT-VIZ` – system‑viz generator (`generate-predicted-edges-features.mjs`), 9/9 tests.  
- `U-GNN-HETEROPHILY-MJS-PORT` – H2GCN feature transform, 21/21 tests.  
- `U-GNN-HETEROPHILY-CLI` – CLI flag (`--heterophily-hops`) wiring, 111/111 round‑trip tests.  
- `U-MINE-INDIA` – transcript miner (resumable, concurrency, Obsidian vault), 12 tests.  
- `U-GNN-EMBEDDING-DEGENERACY` – diagnostic; meanCosine ≈ 0.86.  
- `#12 India transcript miner` – 84/84 sessions mined, vault synthesis committed.  
- `#10 prism_local local_generate` action to MCP dispatcher (IPv6 bug fixed).  
- `#11 ask-ollama.mjs` fail‑soft MCP routing (env‑gated).  
- `install-india-mine-task.ps1` – scheduled task installer for miner.

**DECISIONS**  
- Adopt `/checkin-india` slot‑binding wrapper to force “india” slot.  
- LoRA‑variant engines remain aspirational; defer until foundation proven.  
- Wire legacy & diverse octopus panels to same capability probe oracle.  
- Optional `runnable?` param in diverse panel resolver for capability‑aware gating.  
- Implement `next` command in `loop-state.mjs`; 4‑tier precedence (`--resume`, handoff‑resume, own‑lane pick‑unit, fleet‑fallback).  
- Do not start full 4‑file GNN edge‑predict build now; hand off to next loop iteration.  
- Stop `nim‑llama32‑3b` container permanently (≈88 GB Windows commit freed).  
- Keep loop parked at iteration 1/10 until fresh context.  
- Path‑A: focus on missing knowledge edges first; defer engine wiring until embeddings include eng/disp nodes.  
- Replace legacy GPU re‑embed with H2GCN feature transform (AUROC lift +0.067).  
- Wire H2GCN via CLI flag for deploy‑gate retrain lifecycle.  
- Use system‑viz augmentation pattern (`regen-viz.mjs` FAST[] + `merge-augmentations.mjs`).  
- Clone transcript miner to India slot; add concurrency limiter, two‑tier models, cross‑session synthesis, Obsidian vault feed.  
- R14 cleanup: stop background task; no lingering tasks.  
- Do not restart MCP server now; defer consumer path until fresh context.

**OPERATOR DIRECTIVES**  
- “Continue next phase” – move to next MS frontier after octopus wiring.  
- “Make loops automatically lead to next unit or task.” – implement auto‑advance.  
- “Do everything in loops until wired/tested/validated.” – loop‑centric validation.  
- Investigate API error rate limit requests; mitigate via equipment/settings.  
- Review all prior X articles on AI training, systems, RAG, CAG to confirm coverage.  
- Authorize GPU retrain (#9) now; do not authorize MCP restart (#11).  
- Use RTX PRO 6000 Blackwell 96 GB + Ryzen 9950X3D + 136 GB RAM.  
- Ensure local LLMs route through Prism MCP server (Ollama/DeepSeek).  
- Path‑A now, Path‑B after regen.

**FINDINGS/BUGS**  
- Stale catalog tests (`qwen2.5-coder:7b`) caused 3+1 RED → fixed.  
- Octopus legacy branch never consulted probe; wired now.  
- Diverse panel default list static → added runnable filter.  
- Empty `runnableModelIds` treated as “no signal” (fail‑open).  
- Test name mislabel (“nothing runnable → empty panel”) renamed.  
- Mock cast replaced with `satisfies CapabilitySnapshot`.  
- Header doc‑drift (`deepseek-r1:14b`) fixed.  
- API errors from Windows commit starvation; resolved by stopping nim‑llama32‑3b container.  
- Loop‑state roll‑cap added to prevent runaway.  
- Cross‑session handoff contamination fixed (P1).  
- Resolve‑only flag no longer mutates on exhaustion (P1).  
- Fleet‑fallback respects peer‑claim filter, includes `--chatId` (P1).  
- GNN edge‑predict unit does not require torch; pure‑JS inference over embeddings.  
- Embedding set lacks eng/disp nodes → candidate‑generation target must adjust.  
- Embedding degeneracy meanCosine ≈ 0.86 → H2GCN needed.  
- CLI flag parsing bug fixed; coverage honesty bug fixed.  
- Vault shrink‑guard bug fixed to prevent overwriting larger synthesis.  
- Concurrency limiter misdiagnosed unused references resolved.  
- IPv6 localhost bug in `OllamaTaskOffloaderEngine` caused ECONNREFUSED → fixed to `127.0.0.1`.  
- Fleet‑reaper kills long session‑attached Node runs (exit 255).  
- Hop‑sweep AUROC ceiling ≈ 0.64 < required 0.78 gate.

**DOMAIN SPECIFICS**  
- Engines: `OllamaCapabilityProbeEngine`, `MultiModelConsensusEngine`, `resolveDiverseOllamaPanel`, GNN selective‑deploy units, H2GCN feature transform (`heterophily-features.mjs`).  
- Actions/Dispatchers: `/checkin-india` wrapper, slot‑claim helpers (`chat-slots.mjs`), autonomous loop dispatcher (`loop-state.mjs`), MCP dispatcher `localDispatcher.ts`.  
- Metrics: probe `runnableModelIds`, GNN AUROC 0.808 live, embedding meanCosine ≈ 0.86, hop‑sweep lift +0.138 (hops=3).  
- Paths: handoff files `per-agent-handoff/india`, roadmap slices `roadmap.md`, test suites `src/__tests__/`, graph‑SAGE scripts `scripts/lib/graphsage-*.mjs`.  

**TOOLS USED**  
- PRISM CLI skills: `/checkin-india`, `/loop`, `/goal`.  
- Node helpers: `chat-slots.mjs`, `audit-roadmap-drift.mjs`, `loop-iteration-inject.mjs` hook.  
- Test harnesses: `node:test`, Vitest, TypeScript (`tsc`).  
- Docker CLI for container management (nim‑llama32‑3b).  
- WSL memory guard script `27-wsl-memory-guard.mjs`.  
- Engine TS files: `OllamaCapabilityProbeEngine.ts`, `MultiModelConsensusEngine.ts`.  
- Scheduler: Windows Scheduled Task (`install-india-mine-task.ps1`).  
- Reviewer agents: `scrutiny‑3way.mjs`, self‑review tooling.  

**OPEN THREADS**  
- Build full 4‑file `U-GNN-EDGE-PREDICT` (quantized‑vector decode → prefix split → missing‑edge scoring → wiring → tests).  
- Decide permanent removal or restart policy for `nim‑llama32‑3b`.  
- Integrate GNN edge‑predict with graph data once candidate‑generation target corrected.  
- Path‑B engine→dispatcher wiring inference – regenerate embeddings with eng/disp nodes (gate‑clearance task #9).  
- Gate‑clearance lift AUROC > 0.78 via multi‑lever approach (task #9 continuation).  
- AI‑functionality in Obsidian + H‑drive sandbox: MCP local‑LLM routing action, Obsidian integration (#10, #11).  
- Verify completion of full 84‑session transcript mine (`b82qr6i9k`).  
- Gate clearance for #9 embedding‑growth and H2GCN integration into production retrain.  
- MCP restart for consumer path (#11) pending.  
- Further GPU retrain to expand 768‑d embeddings (currently 563/301K nodes).
