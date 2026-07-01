# ai-training session 7bfff7a4 (2026-06-10, 42.6MB, spine 383KB, 5 slice(s), model gpt-oss:20b)

**SHIPPED**  
- U‑CAP‑PROBE catalog test fix – MS0 keystone tests green (removed stale `qwen2.5-coder:7b`).  
- U‑OCTOPUS‑PANEL wired to capability probe; added `getBestReasoningModel`, `getBestChatModel`.  
- U‑OCTOPUS‑DIVERSE‑PROBE – `resolveDiverseOllamaPanel` now accepts runnable set from probe (back‑compat).  
- Doc‑reflection updates: wiki entries, India MEMORY, regression memory.  
- U‑LOOP‑AUTO‑ADVANCE (`loop-state.mjs` + injector) – auto‑advance bounded by `PRISM_LOOP_MAX_ROLLS`.  
- U‑OCTOPUS‑LIVE‑VALIDATE – live‑validated octopus wiring; doc drift fixed.  
- U‑GNN‑EDGE-PREDICT‑CORE (pure‑JS link‑prediction scoring, 21/21 tests).  
- U‑GNN‑EDGE-PREDICT‑CANDIDATES (graph‑coupled candidate generator, 14/14 tests).  
- U‑GNN‑EDGE‑PREDICT‑CLI (`predict-missing-edges.mjs` CLI consumer).  
- U‑GNN‑EDGE‑PREDICT‑VIZ (system‑viz roost generator + FAST[] registration, 9/9 tests).  
- U‑GNN‑EMBEDDING‑DEGENERACY – diagnostic shows 543‑node embeddings meanCosine ≈ 0.86.  
- U‑GNN‑HETEROPHILY‑MJS‑PORT (pure‑JS H2GCN feature transform, 21/21 tests).  
- U‑GNN‑HETEROPHILY‑CLI (`--heterophily-hops` flag wires transform into training pipeline).  
- U‑MINE‑INDIA – hotel‑style transcript miner; 84/84 transcripts mined, Obsidian vault written.  
- #12 India transcript mine: 84/84 transcripts mined, `reference_india_transcript_synthesis.md`.  
- #10 Added `prism_local:local_generate`; fixed IPv6 localhost bug (use `127.0.0.1`).  
- #11 Updated `ask‑ollama.mjs` to route via MCP with fail‑soft fallback; live‑validated.  
- e32615c8e5 – ask‑ollama → MCP `local_generate` (92/92 tests).  
- d13604947f – fleet‑wide auto‑fix + Blackwell doctrine hook (14/14, live‑firing).  
- ef39d5a6c7 – scrutiny P3 fixes (106/106 + 198/198).  
- b3022f3510 – doc‑reflect wiki lesson.  
- 47e38e4fb9 – added `num_ctx` support to `prism_local:local_generate`.  
- f5aa704075 – per‑file P1 fetch‑stub hardening (`afterEach` reset).  
- c2045b3f5a – propagated `num_ctx` through entire ask‑ollama path.  
- 3cf36669e0 – India transcript miner routed via MCP overlay, fail‑soft.

**DECISIONS**  
- Skip speculative LoRA variant engines; follow P0‑6 aspirational plan.  
- Use capability probe oracle for all octopus branches; treat undefined runnable set as “no signal” (fail‑open).  
- Replace regex ID filter with tag‑based chat‑capability check (`tags?.includes('chat') && !tags?.includes('vision')`).  
- Auto‑advance logic: use `next` instead of `end`; 4‑tier precedence (`--resume`, handoff‑resume, own‑lane pick‑unit, fleet‑fallback).  
- Stop `nim‑llama32‑3b` container (~88 GB freed); set `restart:no`.  
- De‑risk GNN edge‑predict: pure‑JS inference (`sigmoid(dot)`), torch not required.  
- Adopt “Both — A now, B after regen” strategy for edge‑prediction; defer path‑B wiring until embeddings include eng/disp nodes.  
- Do not start GPU‑heavy re‑embed now; rely on RTX 6000 Blackwell availability.  
- Defer full GPU retrain (`#9`) until fresh context (reaper‑immune scheduled task).  
- Leave MCP server restart for `#11` pending operator authorization.  
- Use scheduled‑task installer for long jobs (`mine-india-transcripts.mjs`, future retrains).  
- Use MCP server as primary local LLM offload; keep fail‑soft direct path for backward compatibility.  
- Introduce optional `num_ctx` to avoid context truncation on large‑context miners.  
- Enforce fleet‑wide auto‑fix doctrine via session‑gated UserPromptSubmit hook.  
- Apply R6 (budget guard) and R13 (dependency order).  
- Keep non‑terminal `/goal` loop with 10/10 iteration target; schedule cron `6bee65be`.

**OPERATOR DIRECTIVES**  
- `/loop [5m] /goal "AI systems fully upgraded for each galaxy, wired, tested, validated and synergized to Obsidian app / PSN / Hermes / OLLAMA"`.  
- “Do everything in loops until wired, tested and validated.”  
- “Make loops automatically lead to the next unit or task.”  
- Investigate API error rate‑limit causes; optimize equipment/settings.  
- Review all prior AI training/RAG/CAG articles for coverage completeness.  
- Build on RTX PRO 6000 Blackwell 96 GB, Ryzen 9950X3D, 136 GB RAM, NVMe SSD.  
- Authorize GPU retrain now (`#9`).  
- Do not authorize MCP restart (`#11`).  
- Route all local LLMs through the MCP server.  
- Clone India miner overlay onto galaxy miner (`mine-galaxy-transcripts.mjs`).

**FINDINGS/BUGS**  
- MS0 keystone tests RED due to stale `qwen2.5-coder:7b`; removed.  
- Octopus legacy branch missing `getBestReasoningModel`.  
- Diverse panel had static defaults; added runnable‑set parameter.  
- Test naming mismatch (empty‑runnable test) fixed.  
- Mock cast improved with `satisfies CapabilitySnapshot`.  
- Unbounded loop runaway (`rollsTotal` never capped); fixed with `PRISM_LOOP_MAX_ROLLS`.  
- Cross‑session handoff contamination resolved; `handoffResume` now verifies terminal match.  
- `--resolve-only` mutating on exhaustion gated off.  
- Fleet‑fallback bypassing peer‑claim filter fixed (`--chatId`; fail‑closed).  
- API error root cause: WSL memory overcommit from `nim‑llama32‑3b`; stopping container resolves ECONNREFUSED.  
- GNN edge‑predict torch requirement removed; pure‑JS inference confirmed.  
- Embedding degeneracy meanCosine ≈ 0.86 → H2GCN lever needed; multi‑seed AUROC lift +0.067.  
- Miner coverage honesty bug: `--limit` masked true count – fixed to report 84/84.  
- Vault shrink‑guard bug resolved with machine‑readable guard.  
- Concurrency limiter tests uncovered stale diagnostics; resolved.  
- Node fetch(`http://localhost`) used IPv6 `::1`; fixed to `127.0.0.1`.  
- Heterophily hop‑sweep lift +0.138 at 3 hops; ceiling AUROC ≈ 0.64 < gate 0.78.  
- Embedding coverage only 563/301K nodes; growth needed for gate clearance.  
- Stale `qwen2.5-coder:3b` test caught by doctrine.  
- Fetch‑stub cross‑test flake resolved with `afterEach` reset.  
- Missing `num_ctx` caused potential truncation of 32k token slices in miners.  
- GNN full‑gate clearance data‑blocked (reference pool growth); tier‑5 deployed.

**DOMAIN SPECIFICS**  
- **Engines / Actions**: U‑CAP‑PROBE, U‑OCTOPUS‑PANEL, U‑OCTOPUS‑DIVERSE‑PROBE, MultiModelConsensusEngine, ConnectionFinderEngine, GNN edge‑prediction core/candidates/CLI/viz, H2GCN feature transform, U‑MINE‑INDIA, `prism_local:local_generate`, `ask-ollama`, `callViaMcp`, `callOllama`.  
- **Dispatchers**: `chat-slots.mjs`, `checkin.md`, `loop-state.mjs` (with `next`), `loop-iteration-inject.mjs`, devDispatcher execFileSync pattern, `prism_local` dispatcher, `OllamaTaskOffloaderEngine`, `graphsage-train-pipeline`.  
- **Metrics / Gates**: AUROC 0.808 selective deploy; AUROC ≥ 0.78 gate; macro‑F1 ≥ 0.55; Brier ≤ 0.15; meanCosine ≈ 0.86; heterophily lift +0.138 at 3 hops.  
- **Key Paths**: `H:/prism/.claude/helpers/chat‑slots.mjs`, `.claude/commands/checkin.md`, `mcp-server/src/engines/`, `knowledge/wiki/`, `scripts/lib/*`, `scripts/mine-india-transcripts.mjs`, `install-india-mine-task.ps1`.

**TOOLS USED**  
- PRISM helpers: chat‑slots, checkin pipeline, loop-state (with `next`), pick-unit.  
- RAG corpus ingestion, LoRA/QLoRA adapters, PSN, GraphSAGE.  
- Injector hook (`loop‑iteration‑inject.mjs`).  
- Testing harnesses: node-test, Jest/Node test, Vitest + TS type‑check, per‑file 2‑reviewer gate, 3‑of‑3 scrutiny.  
- Git tooling for diff capture and handoff generation.  
- Docker CLI for container stop/cleanup.  
- PRISM scheduled‑task installer (`install-india-mine-task.ps1`).  
- MCP dispatcher (`prism_local`), `mcp-streamable-client.mjs`.  
- GraphSAGE retrain pipeline (`graphsage-train-pipeline.mjs`, `nn-graph-retrain-lifecycle.mjs`).  
- Slot helpers (`slot-bind-enforce.mjs`, `chat-slots.mjs`).  
- `/startup` canonical pipeline.

**OPEN THREADS**  
1. Full implementation of U‑GNN‑EDGE‑PREDICT (engine, dispatcher, tests, wiring).  
2. Finalize WSL guard enforcement (`wsl --shutdown` + task re‑registration).  
3. Decide permanent status of `nim‑llama32‑3b` container.  
4. Validate loop auto‑advance after new commits.  
5. Path‑B engine → dispatcher wiring (requires regenerated embeddings with eng/disp nodes).  
6. Deploy‑gate clearance (AUROC ≥ 0.78) – need denser neighborhoods, larger feature set, GPU retrain.  
7. Complete gate clearance for `#9` (embedding growth + H2GCN integration).  
8. Finalize consumer path for `#11` after MCP server restart.  
9. Schedule future GPU retrains as reaper‑immune tasks.  
10. Clone India miner overlay onto galaxy miner (`mine-galaxy-transcripts.mjs`).  
11. Resolve GNN gate clearance data block (reference pool growth).
