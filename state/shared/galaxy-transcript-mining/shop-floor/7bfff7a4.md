# shop-floor session 7bfff7a4 (2026-06-10, 42.6MB, spine 383KB, 5 slice(s), model gpt-oss:20b)

**SHIPPED**  
- MS0 Capability‑Probe test suite fixed – 124/124 cap‑probe + 242 GNN mjs tests green.  
- U‑OCTOPUS‑PANEL wired legacy octopus voice to `ollamaCapabilityProbeEngine.getBestReasoningModel()/getBestChatModel()`; tag‑filter, null‑fallback; 124/124 + 242 mjs tests green.  
- U‑OCTOPUS‑DIVERSE‑PANEL added optional `runnable?` param; back‑compat preserved; 106/106 unit + 1 MMCE integration test green.  
- U‑LOOP‑AUTO‑ADVANCE wired loop‑state.mjs next logic with rollsTotal cap & 4‑tier precedence; all tests green.  
- U‑OCTOPUS‑LIVE‑VALIDATE live‑validated octopus capability probe against host output.  
- API‑error fix – stopped `nim‑llama32‑3b` container, reclaimed ~88 GB Windows commit, removed ECONNREFUSED errors.  
- U‑GNN‑EDGE‑PREDICT‑CORE pure‑JS link‑prediction core; 21/21 tests green.  
- U‑GNN‑EDGE‑PREDICT‑CANDIDATES graph‑coupled candidate generator; 14/14 tests green.  
- U‑GNN‑EDGE‑PREDICT‑CLI writes persisted ranked report (`predict-missing-edges.mjs`).  
- U‑GNN‑EDGE‑PREDICT‑VIZ system‑viz generator (`generate-predicted-edges-features.mjs`) via FAST[] merge‑augmentations.  
- U‑GNN‑EMBEDDING‑DEGENERACY diagnostic shows 543 embeddings degenerate (meanCosine ≈ 0.86, centroidNorm ≈ 0.93).  
- U‑GNN‑HETEROPHILY‑MJS‑PORT pure‑JS H2GCN feature transform ported from TS.  
- U‑GNN‑HETEROPHILY‑CLI CLI flag `--heterophily-hops` for retrain lifecycle.  
- U‑MINE‑INDIA miner: max‑ed transcript miner with concurrency, 2‑tier models, cross‑session synthesis; 84/84 mined + Obsidian vault synthesis (coverage = 84 sessions).  
- e423995877 – reaper‑immune Windows scheduled‑task installer for mine.  
- U‑GNN‑HOP‑SWEEP hop‑sweep validation: hops = 3 gives +0.138 AUROC, ceiling ≈ 0.64 < 0.78 gate.  
- U‑GNN‑HETEROPHILY‑RETRAIN‑WIRE flag‑gated `--heterophily-hops` wired into production retrain (`graphsage-train-pipeline.mjs`).  
- e32615c8e5 – ask‑ollama routes via MCP local_generate (fail‑soft); added optional num_ctx support; 92/92 tests green.  
- d13604947f – fleet‑wide auto‑fix & Blackwell doctrine hook; 14/14 live‑firing across all slots.  
- ef39d5a6c7 – P3 scrutiny fixes (dead imports / named const); 106/106 + 198/198 bridge tests green.  
- b3022f3510 – doc‑reflect wiki lesson; 13/13 vitest, no new errors.  
- 47e38e4fb9 – optional num_ctx added to prism_local:local_generate schema → dispatcher → engine; 13/13 hermetic plumbing tests.  
- f5aa704075 – per‑file P1 hardening of fetch‑stub test (afterEach global‑fetch reset); stable 5×13/13 runs.  
- c2045b3f5a – propagated num_ctx through entire ask‑ollama path; 94/94 tests, mutation‑verified.  
- 3cf36669e0 – India transcript miner routed via opt‑in MCP overlay with fail‑soft and direct‑path preservation; 6/6 tests.

**DECISIONS**  
- Do not build speculative LoRA‑variant engines; follow plan P0‑6 aspirational.  
- Use capability‑probe oracle for all octopus voice selection (legacy & diverse).  
- Keep legacy back‑compat in `resolveDiverseOllamaPanel`; fail‑open on empty runnable set.  
- Implement auto‑advance with rollsTotal cap and 4‑tier precedence; pending permanent removal or restart policy for `nim‑llama32‑3b`.  
- GNN edge‑predict pure JS, no torch; build in fresh context with full scrutiny gate.  
- Adopt “Path‑A now, Path‑B after regen”: finish all edge‑prediction wiring first.  
- Build H2GCN feature transform to eliminate embedding degeneracy; add CLI flag for retrain use.  
- Leverage RTX PRO 6000 Blackwell GPU + new CPU/SSD for heavy GPU work; confirm torch stack live.  
- Clone hotel transcript miner, extend with concurrency, 2‑tier models, synthesis, vault feed.  
- Do not create MCP local‑LLM routing action now—queue as separate task.  
- Use reaper‑immune scheduled task for long‑running jobs to avoid fleet‑reaper kills.  
- Route all local LLM calls through MCP server; keep direct Ollama as fail‑soft.  
- Validate hop‑sweep first; if gate not cleared, shift focus to embedding‑growth lever.  
- Keep session‑only cron for looped re‑invocation; handoff file carries remaining work across contexts.  
- Use `slot-bind-enforce.mjs` to deterministically bind india slot; skip manual bash if hook succeeded.  
- Defer new unit starts on degraded host; ship only idempotent, low‑build cost units.  
- Build num_ctx support first, propagate through ask‑ollama, then route miners.  
- Implement opt‑in MCP overlay for miner to preserve direct‑path semantics while enabling fail‑soft routing.  
- Keep `/goal` loop non‑terminal; schedule cron and handoff next unit via HANDOFF‑…  

**OPERATOR DIRECTIVES**  
- `/loop [5m] /goal …` – reorient, read 4 articles, enter autonomous loop.  
- “continue next phase” – proceed to next unit per handoff (MS2 RAG re‑embed or MS3 GNN edge predict).  
- “Make loops automatically lead to next unit” – satisfied.  
- “Investigate API error rate limits” – diagnosed and fixed.  
- “Audit X articles on AI training, systems, RAG, CAG” – coverage audit completed; gaps identified.  
- “Do everything in loops until wired, tested, validated” – loop iteration 1 finished; next unit queued.  
- Build with RTX Blackwell 600, new CPU/SSD, RAM in mind.  
- Route local LLMs through MCP server (fail‑soft).  
- Auto‑fix inline + build for Blackwell, fleet‑wide enforced.  
- Authorize GPU retrain now (#9); do not authorize MCP restart (#11).

**FINDINGS/BUGS**  
- Cap‑probe tests failed due to retired `qwen2.5-coder:7b`; fixed.  
- ConnectionFinderEngine test stale; updated similarly.  
- Test name “no phantom voice seated” renamed to reflect contract.  
- Mock cast issue resolved with `satisfies CapabilitySnapshot`.  
- Unbounded runaway → rollsTotal cap (`PRISM_LOOP_MAX_ROLLS`).  
- Cross‑session handoff contamination fixed via terminal match check.  
- Resolve‑only mutates on exhausted → gated off.  
- Fleet‑fallback bypasses peer‑claim filter → threaded `chatId` and fail‑closed.  
- Tautological exhaustion test replaced with deterministic seam.  
- API error root cause – WSL memory commit from NIM container; resolved by stopping it.  
- GNN edge‑predict mis‑described as needing torch; clarified pure JS.  
- Embedding set degenerate: meanCosine ≈ 0.86, centroidNorm ≈ 0.93.  
- H2GCN lifts AUROC ≈ +0.067 but not gate‑clear; single‑seed artifact noted.  
- Miner `--limit` flag hid true mineable count (“84 of 128”); fixed.  
- Vault write guard could overwrite larger synthesis; added shrink‑guard and metadata.  
- Node fetch(`http://localhost:11434`) fails on Windows IPv6 → ::1; switched to 127.0.0.1 in `OllamaTaskOffloaderEngine`.  
- Fleet‑reaper exits long foreground node runs with exit 255; mitigated by scheduled tasks or bounded passes.  
- ask‑ollama test stale expected 3b model; updated to 32b per Blackwell upgrade.  
- Stale test for `qwen2.5-coder:3b` caught by auto‑fix doctrine.  
- Fetch‑stub cross‑test leak caused intermittent P1; fixed with global‑fetch reset.  
- Missing `num_ctx` in `local_generate` would silently truncate large context slices – identified and remedied.  
- Transient leave‑a‑copy violation on `state/shared/cimco/fleet-drive-results.json`; resolved automatically by peer regen.

**DOMAIN SPECIFICS**  
- India galaxy uses `ollamaCapabilityProbeEngine` (probe, routableCatalog, getBestReasoningModel/Chat/Local).  
- Octopus legacy: `ask()` defaults to probe‑selected reasoning model.  
- Diverse panel: `resolveDiverseOllamaPanel(requested, installed, runnable?)`; empty runnable → install‑gate fallback.  
- Loop engine: `loop-state.mjs`, injector hook (`loop-iteration-inject.mjs`), scrutiny gate (`scrutiny-3way.mjs`).  
- 4‑tier precedence for `next`: resume flag → handoff‑resume → own‑lane pick‑unit → fleet‑fallback.  
- GNN edge‑predict uses GraphSAGE sigmoid(dot) primitive in `graphsage-model.mjs`; embeddings quantized vectors `{n,q}`.  
- CAG router, cold‑cache‑anchor hooks; PromptCachingEngine; RAG upgrade ms0.  
- Engines: GNN edge predictor core, candidate generator, CLI consumer, system‑viz augmentation, H2GCN feature transform, transcript miner.  
- Dispatchers: devDispatcher execFileSync for script execution; MCP dispatcher (`prism_local`) for local LLMs; `OllamaTaskOffloaderEngine` for direct Ollama calls.  
- Metrics: AUROC baseline vs H2GCN, meanCosine, centroidNorm, lift, coverage_sessions, macro‑F1 ≥ 0.55, Brier ≤ 0.15.  
- Paths: `/mine-india-transcripts.mjs`, `/graphsage-train-pipeline.mjs`, `state/shared/nn-graph/node-embeddings-768d.jsonl`, `scripts/lib/heterophily-features.mjs`.  
- Slot binding via `slot-bind-enforce.mjs`; chat‑slots helper for reclaim/claim.  
- Startup pipeline canonical at `H:/.claude/commands/startup.md`.  
- Ask‑ollama primitives (`local_generate`, `callViaMcp`, `callOllama`).  
- Miner overlay (`mine-india-transcripts.mjs`) to be cloned for galaxy miner.  
- num_ctx support added to dispatcher and engine layers.

**TOOLS USED**  
- PRISM skills: `/checkin-india`, `/startup`, `UserPromptSubmit` hook, `slot-bind-enforce.mjs`.  
- Node test harnesses: vitest, TypeScript compiler, 3‑of‑3 scrutiny agents.  
- Loop engine files: `loop-state.mjs`, `loop-iteration-inject.mjs`.  
- Scrutiny gate: `scrutiny-3way.mjs`.  
- WSL memory guard: `27-wsl-memory-guard.mjs`.  
- Docker CLI (`docker stop`, `update --restart=no`, `rm`).  
- Playwright & nitter CDN for article reading.  
- OllamaCapabilityProbeEngine, MultiModelConsensusEngine.  
- Octopus probes: `U-OCTOPUS-PANEL`, `U-OCTOPUS-DIVERSE-PROBE`.  
- PRISM scripts (*.mjs), system‑viz augmentation (`regen-viz.mjs`, `merge-augmentations.mjs`).  
- devDispatcher execFileSync for CLI execution.  
- ask‑ollama.mjs / ollama-prism-bridge.mjs for local LLM calls.  
- Node.js fetch via Undici, `mcp-streamable-client.mjs`.  
- PRISM scheduled‑task installer (`install-india-mine-task.ps1`).  
- MCP server JSON‑RPC endpoint `http://127.0.0.1:3100/mcp`.  
- Cron scheduling (`6bee65be`).  
- Auto‑fix‑inline hook for fleet‑wide doctrine enforcement.

**OPEN THREADS**  
- Decision on permanent removal or restart‑policy change for `nim‑llama32‑3b`.  
- Build of U‑GNN‑EDGE‑PREDICT (4‑file unit) in fresh context with full scrutiny gate.  
- Address remaining coverage gaps: multimodal adapters, CAG F1+F6 wiring, review‑gate/eval harness.  
- Path‑B engine→dispatcher wiring inference (requires regenerated embeddings with eng/disp nodes).  
- Gate‑clearance tasks (#9–#11): multi‑lever approach to reach AUROC ≥ 0.78; need embedding‑growth to increase 768‑d node coverage beyond current 563 nodes (full GPU retrain via reaper‑immune scheduled task).  
- MCP local‑LLM routing action (task #10) pending.  
- AI‑functionality in Obsidian + H‑drive sandbox (task #11); source:"mcp" success path awaiting operator‑declined `:3100` rebuild.  
- Clone India miner overlay to `mine-galaxy-transcripts.mjs`.  
- No lingering background tasks; loop continues autonomously via scheduled cron.
