# knowledge-conversion session 7bfff7a4 (2026-06-09, 39.1MB, spine 351KB, 4 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `U-CAP-PROBE-CATALOG-RETIRE-TESTFIX` – fixed MS0 keystone tests for retired model `qwen2.5-coder:7b`.  
- `U-OCTOPUS-PANEL` + wiki entry (galaxy MEMORY).  
- `U-OCTOPUS-DIVERSE-PROBE` + wiki entry (galaxy MEMORY).  
- `loop-state.mjs next` command + injector hook (`U‑LOOP‑AUTO‑ADVANCE`).  
- `U-OCTOPUS-LIVE-VALIDATE`.  
- GNN edge‑predict core suite:  
  - `U-GNN-EDGE-PREDICT-CORE` (21/21 tests)  
  - `U-GNN-EDGE-PREDICT-CANDIDATES` (14/14 tests)  
  - `U-GNN-EDGE-PREDICT-CLI` (17/17 tests + live E2E)  
  - `U-GNN-EDGE-PREDICT-VIZ`.  
- Heterophily pipeline:  
  - `U-GNN-HETEROPHILY-MJS-PORT` (21/21 tests, fuzz‑verified).  
  - `U-GNN-HETEROPHILY-CLI` (`--heterophily-hops`).  
  - `U-GNN-HETEROPHILY-RETRAIN-WIRE`.  
- Transcript mining: `U-MINE-INDIA-COMPLETE` (84/84 transcripts mined, Obsidian vault sync).  
- Embedding diagnostics: `U-GNN-EMBEDDING-DEGENERACY`.  
- Scheduled‑task installer for mine (`install-india-mine-task.ps1`, commit `e423995877`).  
- MCP dispatcher action `prism_local:local_generate` (task #10).

**DECISIONS**  
- Follow Blackwell‑AI plan; no speculative LoRA engines.  
- Replace hardcoded octopus defaults with capability‑probe selection (`OllamaCapabilityProbeEngine.getBestReasoningModel`).  
- `resolveDiverseOllamaPanel` now consumes probe’s `runnableModelIds`; fail‑open on empty array to avoid silencing local voice.  
- Two‑reviewer per‑file gate + 3‑of‑3 stop ledger for reproducible builds.  
- Loop auto‑advance (`loop-state.mjs next`) uses 4‑tier precedence: `--resume`, handoff‑resume, own‑lane pick‑unit, fleet fallback; capped by `PRISM_LOOP_MAX_ROLLS`.  
- GNN edge‑predict is pure‑JS (GraphSAGE inference in `graphsage-model.mjs`); no Torch required.  
- Nim‑llama32‑3b container stopped to reclaim ~88 GB GPU memory; decision pending on permanent removal vs restart policy.  
- Long‑running jobs run as reaper‑immune Windows scheduled tasks (`install-india-mine-task.ps1`).  
- Ollama calls use `127.0.0.1:11434` (IPv4) to avoid Node/undici IPv6 failure on Windows.  
- Heterophily lever wired into retrain via `--heterophily-hops=3`; hop‑tuning alone cannot clear AUROC ≥ 0.78 gate (max ~0.64).  
- Adopt “Path‑A now, Path‑B after regeneration” strategy for embedding regeneration and gate clearance.

**OPERATOR DIRECTIVES**  
- `/build` – trigger next build step.  
- `/continue next phase` / “do everything in loops until wired/tested/validated”.  
- “Make loops automatically lead to the next unit or task.”  
- “Authorize GPU retrain now (#9)”; “Do not restart server” (operator declined fleet‑wide MCP restart for #11).  
- Build with RTX Blackwell 600, new CPU/RAM/SSD in mind.

**FINDINGS / BUGS**  
- MS0 keystone tests RED due to retired model; code correct.  
- `ConnectionFinderEngine` test stale (same reason).  
- Octopus legacy branch never consulted capability‑probe oracle.  
- Diverse panel used static defaults; empty runnable array handled with fail‑open.  
- Test name misaligned with body (R9 trap) – renamed.  
- Mock cast in MMCE integration test unsafe → replaced with `satisfies CapabilitySnapshot`.  
- API‑rate‑limit errors from GPU container overcommit (~88 GB); stopping nim‑llama32‑3b fixed ECONNREFUSED.  
- Loop auto‑advance had P0 runaway & P1 cross‑session contamination; both fixed in `loop-state.mjs`.  
- Stale doc drift: `MEMORY.md` incorrectly claimed diverse‑panel unwired – corrected.  
- Embedding degeneracy: meanCosine 0.86, centroidNorm 0.93 → same‑feature re‑embed futile.  
- H2GCN lever validation +0.067 AUROC lift (insufficient for 0.78 gate).  
- P1 bugs fixed in CLI and miner: coverage honesty, vault shrink guard.  
- Concurrency limiter bug resolved; typed‑array row handling fixed.  
- IPv6 localhost bug in `OllamaTaskOffloaderEngine` → hardcoded `127.0.0.1`.  
- Fleet‑reaper kills long foreground node runs (exit 255) – scheduled tasks required.  
- Hop‑sweep: hops=3 gives +0.138 AUROC lift; ceiling ~0.64 < 0.78 gate.

**DOMAIN SPECIFICS**  
- **Engines / Actions**: `OllamaCapabilityProbeEngine`, `MultiModelConsensusEngine`, `ResolveDiverseOllamaPanel`, `loop-state.mjs next`, GNN edge‑predict core, Heterophily aggregator (`graph_heterophily_aggregate`), `prism_local:local_generate`, `ask-ollama.mjs`.  
- **Metrics / Gates**: VRAM‑fit check (`m.vramGB * 1024 <= gpu.freeMiB`); qualityTier ranking; tag‑based chat filtering; AUROC ≥ 0.78, macro‑F1 ≥ 0.55, Brier ≤ 0.15; hop‑sweep lift (+0.067 at hops=2, +0.138 at hops=3).  
- **Paths**: `H:/prism/.claude/helpers/chat-slots.mjs`, `loop-state.mjs`, `pick-unit.mjs`, `graphsage-model.mjs`, `U-GNN-HETEROPHILY-MJS-PORT`, `install-india-mine-task.ps1`, Obsidian vault sync (`H:/prism/knowledge/memories/...`), memory mirror hook `stop-obsidian-memory-feed.mjs`.

**TOOLS USED**  
- PRISM core: `checkin` pipeline, slot‑claim helpers, handoff reader.  
- Loop engine: `loop-state.mjs`, injector hook, `pick-unit.mjs`.  
- Testing harnesses: Node test (`node:test`) and Vitest.  
- Documentation tooling: wiki entry generator, galaxy MEMORY updater.  
- CronCreate for `/loop` scheduling; Skill tool for slash‑command invocation.  
- Script execution via `devDispatcher.execFileSync`.  
- Visualization tools: `regen-viz.mjs`, `merge-augmentations.mjs`.  
- LLM bridge: `ask-ollama.mjs`, `ollama-prism-bridge.mjs`.  
- Mining & validation scripts: `scripts/mine-india-transcripts.mjs`, `scripts/validate-heterophily-auroc.mjs`.  
- Docker commands to stop `nim‑llama32‑3b`; WSL memory inspection (`wsl --shutdown`, `vmmemWSL`).

**OPEN THREADS**  
- Build `U-GNN-EDGE-PREDICT` (4‑file unit) in next context.  
- Decision on permanent removal vs restart policy for `nim‑llama32‑3b`.  
- Address remaining coverage gaps: multimodal adapters, CAG F1/F6 wiring, review‑gate/eval harness.  
- Path‑B after embedding regeneration; gate clearance for AUROC ≥ 0.78 (embedding growth needed).  
- MCP routing action for local LLMs (`local_generate`) – pending server restart (#11) but operator declined.  
- Execute GPU retrain (#9) as reaper‑immune scheduled task.  
- Expand 768‑d embedding coverage beyond current 563 nodes to meet gate thresholds.
