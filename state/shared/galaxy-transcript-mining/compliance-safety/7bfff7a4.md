# compliance-safety session 7bfff7a4 (2026-06-10, 42.7MB, spine 385KB, 5 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `U-CAP-PROBE-CATALOG-RETIRE-TESTFIX` – removed stale MS0 keystone tests for retired `qwen2.5-coder:7b`.  
- `U-OCTOPUS-PANEL` – wired octopus voice to live `OllamaCapabilityProbeEngine`; added `getBestReasoningModel`, `getBestChatModel`, tag‑based chat filter; 124/124 tests green (242 mjs).  
- `U-OCTOPUS-DIVERSE-PROBE` – optional `runnable?` param, wired probe’s `runnableModelIds`; 6 selector + MMCE integration test (106/106 green).  
- `loop-state.mjs next` command – auto‑advances to next unit from resume directives or roadmap slice; fully tested (6/6 pass).  
- `U-LOOP-AUTO-ADVANCE` – loop auto‑advance with 4‑tier precedence chain and roll cap.  
- `U-OCTOPUS-LIVE-VALIDATE` – live‑validated octopus capability‑probe wiring; doc drift fixed.  
- `U-GNN-EDGE-PREDICT-CORE` – pure‑JS link‑prediction core (21/21 tests, 3‑of‑3 scrutiny).  
- `U-GNN-EDGE-PREDICT-CANDIDATES` – graph‑coupled candidate generation (14/14 tests, P2 locks).  
- `U-GNN-EDGE-PREDICT-CLI` – CLI consumer producing persisted ranked report (`predict-missing-edges.mjs`).  
- `U-GNN-EDGE-PREDICT-VIZ` – system‑viz augmentation generator and FAST[] registration.  
- `U-GNN-HETEROPHILY-MJS-PORT` – pure‑JS H2GCN feature transform (21/21 tests, fuzz‑verified); wired into GraphSAGE trainer via `heterophilyHops`; CLI flags `--heterophily-hops`, `--heterophily-normalize`.  
- `scripts/validate-heterophily-auroc.mjs` – live AUROC lift +0.067 across 3 seeds.  
- `U-MINE-INDIA` – India transcript miner (hotel‑clone, concurrency limiter, 2‑tier GPT models, cross‑session synthesis, Obsidian vault feed).  
- `#12` – 84/84 India transcript mine completed; Obsidian vault synthesis `reference_india_transcript_synthesis.md`.  
- `#10` – `prism_local:local_generate` action added to MCP dispatcher; IPv6 bug fixed (use 127.0.0.1).  
- `#11` – fail‑soft MCP routing for `ask-ollama.mjs`; live‑validated (commit e32615c8e5, 92/92 tests).  
- `#9` – H2GCN hop‑sweep (`U-GNN-HOP-SWEEP`) and production retrain wiring (`U-GNN-HETEROPHILY-RETRAIN-WIRE`).  
- `d13604947f` – fleet‑wide auto‑fix + Blackwell doctrine hook (14/14, live‑firing).  
- `ef39d5a6c7` – P3 scrutiny fixes (106/106 + 198/198 bridge).  
- `b3022f3510` – doc‑reflect wiki lesson.  
- `47e38e4fb9` – added `num_ctx` support to `prism_local:local_generate`.  
- `f5aa704075` – hardening fetch‑stub test (`afterEach` reset) for `num_ctx` unit (P1 fix).  
- `c2045b3f5a` – propagated `num_ctx` through entire `ask‑ollama` path (MCP route & fail‑soft fallback).  
- `3cf36669e0` – transcript miner routed via MCP overlay, fail‑soft, direct path preserved.  

**DECISIONS**  
- Do not build speculative LoRA variants; focus on authoritative plan.  
- Wire octopus to capability oracle before diverse‑panel logic.  
- Use reusable `next` helper for loop auto‑advancement.  
- Add roll cap to loop-state; 4‑tier precedence chain.  
- Skip GNN edge‑predict unit now; foundation confirmed pure‑JS, will build later.  
- Stop `nim‑llama32‑3b` container (~88 GB) pending permanent removal decision.  
- Use reaper‑immune Windows Scheduled Task for long transcript mining to avoid fleet‑reaper exits.  
- Route all local LLM calls through MCP dispatcher with fail‑soft fallback; extract `mcpCallStreamable` into cycle‑free lib.  
- Keep hop‑sweep lever bounded (hops = 3) and flag‑gate it in production retrain; defer embedding‑growth to scheduled GPU task.  
- Auto‑enforced slot binding (`slot-bind-enforce.mjs`) to avoid handoff ID collisions.  
- Budget‑aware loop control: defer heavy builds on degraded host.

**OPERATOR DIRECTIVES**  
- `/continue next phase` – move to next MS unit after current work.  
- `/build` – trigger deferred R15 follow‑up (`U-OCTOPUS-DIVERSE-PROBE`).  
- `/make it so loops automatically lead to next unit or task.` – change loop behavior; completed.  
- “look into API error rate limit requests” – diagnosed memory overcommit, stopped `nim‑llama32‑3b`.  
- “read all previous X articles regarding AI training…” – partial audit (~85–90 % coverage).  
- “Route local LLMs through the MCP server” – completed for India (`ask‑ollama` + transcript miner).  
- “Auto‑fix inline + build‑for‑Blackwell, fleet‑wide enforced” – implemented via session‑gated `UserPromptSubmit` hook.  
- Authorize GPU retrain now (#9); do not restart fleet‑shared :3100 MCP server.  
- Enforce auto‑fixes inline and Blackwell doctrine hook (`d13604947f`).  

**FINDINGS/BUGS**  
- MS0 keystone tests RED due to retired model; code correct, tests stale.  
- ConnectionFinderEngine test stale (catalog issue).  
- Octopus voice lacked capability‑probe wiring; added.  
- Diverse panel used static defaults and lacked probe gating; added runnable filter.  
- Empty `runnable` array ambiguous – decided fail‑open to preserve legacy behavior.  
- Test name misaligned with body (R9 trap) – renamed.  
- Mock cast improved from `as unknown as …` to `satisfies CapabilitySnapshot`.  
- P0 unbounded runaway in loop-state → roll cap added.  
- P1 cross‑session handoff contamination fixed by verifying terminal match.  
- P1 resolve‑only mutation on exhausted gated off.  
- P1 fleet‑fallback peer‑claim filter bypass fixed.  
- Test tautological exhaustion replaced with deterministic seam.  
- API errors due to WSL overcommit; `nim‑llama32‑3b` stopped (~88 GB freed).  
- Node fetch('http://localhost') resolved to IPv6 ::1 on Windows; Ollama binds only to 127.0.0.1 → ECONNREFUSED fixed.  
- Fleet‑reaper kills long session‑attached node runs (exit 255); moved mine to scheduled task.  
- Stale test for Qwen2.5‑coder:3b updated to 32b after Blackwell upgrade.  
- P1 flake in fetch‑stub test; fixed with global `afterEach`.  
- Missing `num_ctx` would truncate large context slices; resolved by adding support.

**DOMAIN SPECIFICS**  
- India AI systems: Blackwell‑AI‑MS0, U‑CAP‑PROBE, GNN selective deploy, MultiModelConsensusEngine, resolveDiverseOllamaPanel, loop-state automation.  
- GPU stack provisioning torch 2.11+cu128; LoRA engine coverage ~133 engines; GNN AUROC 0.808; heterophily lift +0.067.  
- GraphSAGE embeddings: 768‑d node types ghost/wiki/memory/tribal/etc.; no eng/disp nodes.  
- Edge‑prediction pipeline: core scoring → candidate generation → CLI consumer → system‑viz augmentation (FAST[] + merge‑augmentations).  
- Heterophily transform integrated via `heterophilyHops` flag; validated on real graph.  
- Miner script processes India transcripts, uses concurrency limiter, 2‑tier GPT models, synthesizes cross‑session digest, writes Obsidian vault file.  
- Cron job `bc86a2e9` fires every ~10 min to continue loop iterations; scheduler cron `6bee65be`.  
- MCP dispatcher (`prism_local`) with local_generate action; `num_ctx` parameter.  
- Fleet‑reaper monitoring and exit‑255 handling.

**TOOLS USED**  
- Node.js (.mjs scripts), Git, tsc, Vitest, CLAUDE.md, loop-state.mjs, pick-unit.mjs, OllamaCapabilityProbeEngine, MultiModelConsensusEngine, MMCE engine, test harnesses, handoff reader.  
- `loop-iteration-inject.mjs` hook; `27-wsl-memory-guard.mjs`; Docker commands (`docker stop`, `wsl --shutdown`).  
- PRISM tooling: `scrutiny‑3way`, `CronCreate`, skill tool for slash commands.  
- Scripts/Modules: edge-predict.mjs, edge-predict-candidates.mjs, predict-missing-edges.mjs, generate-predicted-edges-features.mjs, heterophily-features.mjs, scripts/validate-heterophily-auroc.mjs, mine-india-transcripts.mjs.  
- Dispatcher pattern: `devDispatcher.execFileSync` for .mjs scripts; `chat-slots.mjs`, `slot-bind-enforce.mjs`.  
- PRISM scheduled‑task installer (`install-india-mine-task.ps1`); MCP dispatcher (`prism_local`) with local_generate action; `mcp-streamable-client.mjs`; Node fetch (undici) with IPv6 handling.  
- Obsidian vault sync via `stop-obsidian-memory-feed.mjs`.

**OPEN THREADS**  
- Next MS unit: either MS2 RAG re‑embed or MS3 GNN edge‑predict pending roadmap selection.  
- Build U‑GNN‑EDGE‑PREDICT (4‑file unit) pending; foundation confirmed pure‑JS and embeddings available.  
- Decision on permanent removal of `nim‑llama32‑3b` container (`docker update --restart=no` / `docker rm`).  
- Complete coverage audit of all X articles (rate limits resolved).  
- Path‑B engine→dispatcher wiring inference (requires regenerated embeddings with eng/disp nodes).  
- Gate‑clearance follow‑ups (#9) – embedding‑growth lever; run GPU retrain with `PRISM_NN_RETRAIN_HETEROPHILY_HOPS=3` after growth.  
- MCP server :3100 restart required to expose `local_generate` in bundle (operator pending).  
- Production retrain: run with heterophily hops = 3 after embedding growth to evaluate gate clearance.  
- Clone India miner overlay to `mine-galaxy-transcripts.mjs` (apply‑to‑all).  
- Host stability degraded; further heavy builds deferred until fresh window.
