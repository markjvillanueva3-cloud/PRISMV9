# agent-orchestration session 7bfff7a4 (2026-06-09, 38.5MB, spine 348KB, 4 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `U-CAP‑PROBE‑CATALOG‑RETIRE‑TESTFIX` – fixed 4/19 stale catalog tests for MS0 keystone.  
- `U-OCTOPUS-PANEL` – wired legacy octopus to capability oracle (`getBestReasoningModel`, `getBestChatModel`), added tag‑based chat filter, null‑fallback logic; 124/124 unit & integration tests green.  
- `U-OCTOPUS-DIVERSE-PROBE` – optional `runnable?` param to `resolveDiverseOllamaPanel`; wired probe’s `runnableModelIds`; 106/106 tests green, tsc clean.  
- `loop-state.mjs next` – added 4‑tier precedence (`--resume`, handoff‑resume, own‑lane pick‑unit, fleet‑fallback), `rollsTotal` cap (`PRISM_LOOP_MAX_ROLLS`); supports roll & resolve‑only modes; tested 6/6.  
- `loop-iteration-inject.mjs` – injector now emits `next` instead of `end`; slot persistence added to `cmdStart/cmdNext`; 9/9 tests pass.  
- `U‑OCTOPUS‑LIVE‑VALIDATE` – live‑validated octopus capability probe against real host (no cloud voices).  
- `U-GNN-EDGE-PREDICT-CORE` – pure‑JS scoring core; 21/21 tests, 3‑of‑3 scrutiny.  
- `U-GNN-EDGE-PREDICT-CANDIDATES` – graph‑coupled candidate generator; 14/14 tests, 3‑of‑3 scrutiny.  
- `U-GNN-EDGE-PREDICT-CLI` – CLI consumer producing persisted JSON report; 17/17 tests, 3‑of‑3 scrutiny.  
- `U-GNN-EDGE-PREDICT-VIZ` – system‑viz roost generator + FAST[] registration + merge splice; 9/9 tests, 3‑of‑3 scrutiny.  
- `U-GNN-HETEROPHILY-MJS-PORT` – pure‑JS H2GCN feature transform port; 21/21 tests, fuzz‑verified vs TS source.  
- `U-GNN-HETEROPHILY-CLI` – CLI flag (`--heterophily-hops`) wiring into retrain pipeline; 111/111 round‑trip tests, 3‑of‑3 scrutiny.  
- `U-MINE-INDIA` – maxed transcript miner (concurrent slice mapping, two‑tier Ollama models, cross‑session synthesis, Obsidian vault feed); 12 tests, 2‑reviewer PASS, P1 fixes applied.  
- **#12 India transcript mine** – 84/84 sessions mined via `node scripts/mine-india-transcripts.mjs`; final synthesis written to `knowledge/memories/reference/reference_india_transcript_synthesis.md`.  
- **#10 Local‑LLM MCP route** – added `prism_local:local_generate` action (wrapping `OllamaTaskOffloaderEngine.executeOffloaded`), fixed IPv6 bug (`127.0.0.1:11434`); 10/10 tests, live‑validated; commit `e32615c8e5`.  
- **#11 Ask‑ollama MCP integration** – fail‑soft routing to `prism_local local_generate` via new `mcp-streamable-client`; updated `ask-ollama.mjs`; hermetic tests 92/92; commit `e32615c8e5`.  
- **#9 H2GCN lever** – hop‑sweep (`U-GNN-HOP-SWEEP`) validated hops = 3 (+0.138 lift, ceiling ~0.64 AUROC); added flag‑gated retrain wire (`U-GNN-HETEROPHILY-RETRAIN-WIRE`); 6/6 unit tests, live‑validated.

**DECISIONS**  
- Do **not** build speculative LoRA‑variant engines (P0‑6 aspirational).  
- Use capability oracle for all octopus branches; unify logic under `getBestReasoningModel`.  
- Adopt tag‑based chat filter (`tags.includes("chat") && !tags.includes("vision")`).  
- Implement auto‑advance loop via single‑step `next` with bounded roll count (`PRISM_LOOP_MAX_ROLLS`) and 4‑tier precedence.  
- Slot persistence added to injector for real slot IDs; deterministic exhaustion seam (`PRISM_LOOP_NEXT_NO_PICKUNIT`) introduced.  
- WSL memory overcommit resolved by stopping Docker containers + `wsl --shutdown`.  
- Adopt “A now, B after regen” path: Path‑A fully wired/validated; Path‑B deferred until embeddings include `eng.*`/`disp.*`.  
- Use CLI + system‑viz roost for edge‑prediction (no TS engine import).  
- Accept hardware directive: RTX PRO 6000 Blackwell 96 GB GPU, Ryzen 9 9950X3D CPU, 136 GB RAM, NVMe SSD.  
- Adopt hop‑sweep as primary H2GCN lever; gate clearance requires embedding growth, not just hop tuning.  
- Route all local Ollama calls through `prism_local` MCP dispatcher; keep direct fallback for safety.  
- Defer fleet‑wide `:3100` server restart until fresh context.

**OPERATOR DIRECTIVES**  
- `/continue next phase` – proceed to MS2/3 frontier after current units.  
- `/build` – trigger deferred R15 follow‑up (`U-OCTOPUS-DIVERSE-PROBE`).  
- “Do everything in loops until it’s all wired, tested and validated.”  
- Decide whether to make `nim‑llama32‑3b` container permanent (`docker update --restart=no` / `docker rm`).  
- Authorize GPU retrain now (#9).  
- Decline MCP restart for #11.

**FINDINGS / BUGS**  
- 4/19 cap‑probe tests RED due to retired `qwen2.5-coder:7b`; tests stale → migrated to live catalog.  
- Legacy octopus never wired to capability oracle – fixed by adding selector methods and wiring in MMCE.  
- Ranking logic test failure (`phi3:14b` vs `qwen3-vl:8b`) corrected (tier, not size).  
- Empty runnable list treated as fail‑open to avoid silencing local voice on VRAM‑starved hosts.  
- P0 unbounded runaway fixed by `rollsTotal` cap.  
- P1a cross‑session handoff contamination fixed; verifies terminal match before using a handoff.  
- P1b `--resolve-only` mutating on exhaustion guarded out.  
- P1c fleet‑fallback bypassing peer‑claim filter added `--chatId`; fail‑closed fallback when missing.  
- Deterministic seam (`PRISM_LOOP_NEXT_NO_PICKUNIT`) replaces test tautology.  
- WSL memory overcommit → ECONNREFUSED API errors fixed by stopping Docker containers + `wsl --shutdown`.  
- Embedding degeneracy: meanCosine ≈ 0.86, centroidNorm ≈ 0.93 collapse; H2GCN lever saturates at sigmoid(1). Single‑seed lift noise; multi‑seed (+0.067 AUROC) still below 0.78 gate.  
- P1 bugs in miner: coverage masking (`--limit`) and vault clobber guard fixed.  
- Node `fetch('http://localhost')` resolved to IPv6 `::1`; Ollama listens on IPv4 → ECONNREFUSED; fixed by using `127.0.0.1`.  
- Fleet‑reaper kills long foreground node runs (exit 255); scheduled tasks required for durable jobs.  
- Hop‑sweep ceiling ~0.64 AUROC; embedding coverage limited to 563/301K nodes → gate unmet.  
- Existing `:3100` bundle missing `local_generate`; MCP route fails with “Tool prism_local not found” until rebuild.

**DOMAIN SPECIFICS**  
- **Engines / Actions**: `OllamaCapabilityProbeEngine`, `MultiModelConsensusEngine`, `resolveDiverseOllamaPanel`, `PromptCachingEngine`, `GnnEdgePredictionEngine`, `OllamaTaskOffloaderEngine`, `prism_local` dispatcher, `ask-ollama.mjs`, `mcp-streamable-client`.  
- **Dispatchers**: `localDispatcher.ts` (LOCAL‑LLM-MS0), `mcp-http` JSON‑RPC at `127.0.0.1:3100/mcp`.  
- **Scripts / Paths**: `/checkin-india`, `scripts/mine-india-transcripts.mjs`, `knowledge/memories/reference/reference_india_transcript_synthesis.md`, `mcp-server/src/engines/OllamaTaskOffloaderEngine.ts`.  
- **Metrics / Gates**: capability probe snapshot (`runnableModelIds`), VRAM fit logic, AUROC (baseline vs H2GCN), meanCosine, centroidNorm, heterophily lift (+0.067 AUROC), macro‑F1 ≥ 0.55, Brier ≤ 0.15.  
- **Unique namespaces**: `ghost.`, `wiki.`, `memory_reference.`, `memory_feedback.`, `tribal-tip.`, `reg.`.

**TOOLS USED**  
- PRISM helpers: `chat-slots.mjs`, `audit-roadmap-drift.mjs`, `loop-state.mjs`, `loop-iteration-inject.mjs`.  
- Scrutiny tools: `scrutiny‑3way.mjs`, 3‑of‑3 reviewer workflow.  
- Memory guard: `27‑wsl‑memory‑guard.mjs`.  
- Cron job: `bc86a2e9` (every ~10 min).  
- Skill tool for slash commands, `ask-ollama.mjs`.  
- Merge & viz utilities: `merge-augmentations.mjs`, `regen-viz.mjs`.  
- DevDispatcher execFileSync pattern.  
- Docker for NIM container management; GPU health probe (`gpu_health.py`).  
- PRISM Scheduled‑Task installer (`install-india-mine-task.ps1`).  
- Miner script `mine-india-transcripts.mjs`.  
- Local‑LLM MCP action `prism_local:local_generate`.  
- MCP bridge `ollama-prism-bridge.mjs` and extracted client lib.

**OPEN THREADS**  
- Path‑B engine→dispatcher wiring inference (requires regenerated embeddings with `eng.*`/`disp.*`).  
- Deploy‑gate clearance research for H2GCN lever (embedding growth, GPU retrain).  
- MCP local‑LLM routing action (#10) – dispatcher already added; ensure full Ollama call coverage.  
- AI‑functionality in Obsidian + H‑drive sandbox (task #11).  
- Completion of full 84‑session transcript mine (`b82qr6i9k` job).  
- Gate clearance for #9 (H2GCN lever) – schedule GPU retrain via Windows Scheduled Task.  
- Fleet‑wide `:3100` server restart to expose `local_generate` (operator declined now, pending fresh context).  
- Auto‑fix inline + Blackwell‑awareness hook under development; session‑gated UserPromptSubmit injector still in progress.
