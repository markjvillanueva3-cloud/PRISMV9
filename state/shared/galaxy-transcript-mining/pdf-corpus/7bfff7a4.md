# pdf-corpus session 7bfff7a4 (2026-06-10, 75MB, spine 681KB, 8 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `U-CAP-PROBE-CATALOG-RETIRE-TESTFIX` – updated MS0 keystone tests, removed stale `qwen2.5-coder:7b`.  
- `U-OCTOPUS-PANEL` – wired legacy octopus branch to capability‑probe oracle; added `getBestReasoningModel`, `getBestChatModel`; updated tests.  
- `U-OCTOPUS-DIVERSE-PROBE` – optional `runnable?` param, back‑compat handling, unit & integration tests.  
- `U-LOOP-AUTO-ADVANCE` – loop engine auto‑advances via 4‑tier precedence (`--resume`, handoff‑resume, pick‑unit, fleet‑fallback); capped with `PRISM_LOOP_MAX_ROLLS`.  
- `U-OCTOPUS-LIVE-VALIDATE` – live validation of octopus capability‑probe wiring; all tests passed.  
- `U-GNN-EDGE-PREDICT-CORE`, `CANDIDATES`, `CLI`, `VIZ` – pure‑JS link‑prediction scoring, candidate generation, CLI report, system‑viz roost (21/21, 14/14, 17/17, 9/9 tests).  
- `U-GNN-HETEROPHILY-MJS-PORT`, `CLI` – H2GCN feature transform port and CLI flag (`--heterophily-hops`).  
- `U-MINE-INDIA` – hotel‑style transcript miner (12 unit tests, 2‑reviewer PASS).  
- `U-GNN-EMBEDDING-DEGENERACY` – diagnostic for collapsed GraphSAGE embeddings (16/16 pass).  
- `#12 India transcript miner` – 84/84 sessions mined; Obsidian vault synthesis committed (`reference_india_transcript_synthesis.md`).  
- `#10 prism_local local_generate` – added to dispatcher; IPv6 bug fixed, tests passed.  
- `#11 ask‑ollama.mjs` – routed via MCP with fail‑soft fallback; all tests and live validation succeeded.  
- Commit `e32615c8e5` – ask‑ollama → MCP `local_generate` (92/92 tests).  
- Commit `d13604947f` – fleet‑wide auto‑fix‑inline + Blackwell doctrine hook (14/14 tests).  
- Commits `ef39d5a6c7`, `b3022f3510` – P3 fixes, doc‑reflect wiki lesson.  
- Commit `47e38e4fb9` – optional `num_ctx` added to `prism_local:local_generate`.  
- Commit `f5aa704075` – hardening fetch‑stub test (`afterEach` global‑fetch reset).  
- Commit `c2045b3f5a` – propagated `num_ctx` through ask‑ollama path.  
- Commit `3cf36669e0` – India transcript miner routed via MCP, fail‑soft overlay.  
- Commits `d99be7d62d`, `74ee070071`, `2ae59c6aa0`, `1df8b79a07` – fleet‑wide apply‑to‑all for all live miners (India, Galaxy, Hotel) with `num_ctx=32768`, `numPredict=16384`.  
- Commit `f4a681e986` – llama‑server orphan reaper tool.  
- Commit `3d5d506dcf` – wired reaper into Stop‑hook (`aggressive-killer-stop.mjs`).  
- Commits `eb262e5675`, `ad120bdf8a`, `4f4db8a7fb`, `85614c3894`, `7d3879f21b`, `cd9f80faf8`, `99439c85f6`, `6c46ed332e`, `a90f0979b1` – galaxy‑synthesis → LoRA dataset support, manifest consumer, clobber guard, advisory flag, per‑galaxy LoRA adapters, NUL byte removal, CLI exit‑code gap fix, ultracode research spec.  
- Commit `35acfb15b4` – `wiki‑tribal‑cross‑ref‑audit.mjs` reads shards (coverage ↑ 69.2 %→77.1 %).  
- Commit `U‑GNN‑BRIDGE‑SHARD‑AWARE` – `graph-node-embedding-bridge.mjs` uses `loadTribalIndex`; GNN lookup 0 → 35 000 entries, ref‑pool restored (61/61 test).  
- Commit `573bb8d5aa` – `generate-knowledge-galaxy.mjs` switched to `streamTribalEntries`.  
- Commit `9dc88c59d6` – `hm-extraction-coverage.mjs` processes entries one‑by‑one, honest 0 HM matches.  
- Commit `19b55d6ef3` – fixes to `build-psn-training-corpus.mjs`, `audit-mill-psn-coverage.mjs`; stream entries, no OOM.

**DECISIONS**  
- Do not build speculative LoRA‑variant engines; follow authoritative P0‑6 plan.  
- Wire both octopus branches to a single capability‑probe oracle; expose tier‑ranked selectors (`getBestReasoningModel`, `getBestChatModel`).  
- Preserve back‑compat for diverse panel: undefined `runnable` → old 2‑arg behavior; when provided, intersect with probe’s runnable set.  
- Implement `loop-state.mjs` `next` command (4‑tier precedence) to auto‑advance loops.  
- Defer full U‑GNN‑EDGE‑PREDICT build until embeddings include `eng.*/disp.*`; ship core only now.  
- Stop `nim‑llama32‑3b` container; decide permanent removal or restart policy later.  
- Enable WSL memory guard auto‑enforce to reclaim over‑commit events automatically.  
- Adopt fail‑soft MCP routing for all local LLM consumers (ask‑ollama, miners).  
- Add optional `num_ctx` support before consumer routing; gate via `PRISM_LOCAL_LLM_VIA_MCP`.  
- Use explicit shard transition for tribal‑embed index; retire monolith writer.  
- Grant India slot cross‑galaxy authority per operator instruction; remove galaxy‑ownership gate.  
- Schedule recurring `/goal` loop every 10 min (cron `296523b3`).  
- GPU‑gated H2GCN multi‑seed retrain pending operator action (#9).  

**OPERATOR DIRECTIVES**  
- `/checkin-india /loop [5m] /goal …` – reorient, read 4 articles.  
- `/build` – trigger build of next unit.  
- “continue next phase” – choose between MS2 RAG re‑embed or MS3 GNN edge predict.  
- “make it so loops automatically lead to next unit or task.” – change loop behavior.  
- Make `/loop` auto‑advance without human prompt.  
- Resolve API rate‑limit errors by optimizing local equipment/settings.  
- Continue building all units in loops until wired, tested, validated.  
- Authorize GPU retrain now (#9); do not restart MCP server (#11).  
- Ensure local LLMs route through MCP and sandboxed within H: drive.  
- Enforce auto‑fix inline + Blackwell doctrine fleet‑wide (implemented hook).  
- “Route local LLMs through the MCP server” – completed for all live consumers.  
- “Auto‑enforce fleet wide” – implemented via `auto-fix-blackwell-doctrine-inject.mjs`.  
- “push through, since you're back end development domain change your memory and rules to allow you to work in other galaxies and domains” (twice).  
- Latest explicit request: `/loop [10m] /goal [ improve ai systems… ] /yolo-mode utilize new loop knowledge and hermes agentic coding capabilities`.  

**FINDINGS/BUGS**  
- MS0 keystone tests RED due to retired `qwen2.5-coder:7b`; fixed by test suite update.  
- Octopus legacy branch not wired; wiring added.  
- Diverse panel default strings static; optional runnable param added, call site updated.  
- Empty `runnable` array treated as “no signal” (fail‑open).  
- Test name mismatch in diverse panel test; renamed.  
- Doc drift on MMCE header (“deepseek‑r1:14b”) fixed.  
- API errors from Windows commit starvation; WSL memory cap not enforced.  
- Loop auto‑advance had P0/P1 bugs (unbounded runaway, cross‑session contamination); all fixed.  
- `U-GNN-EDGE-PREDICT` does not require Torch; pure‑JS inference (`sigmoid(dot(...))`).  
- Current graph lacks `eng.*/disp.*`; candidate generation cannot run.  
- Embedding degeneracy: mean cosine 0.86 → re‑embed wasteful.  
- H2GCN lever lift +0.067 AUROC, below 0.78 gate; GPU retrain pending.  
- Concurrency limiter bug: stale `MODEL` reference fixed.  
- Coverage honesty bug: miner logged “2 of 2” instead of full count; corrected.  
- Vault shrink‑guard bug: potential overwrite; added guard and frontmatter.  
- Memory‑pressure spike from orphan `llama-server`; resolved by reaper tool.  
- OCR batch task flagged stale; clarified watchdog logic, added diagnostic memory.  
- NUL byte in assembler caused git binary classification; removed.  
- Duplicate hybrid reranker (`hybrid-retrieval.mjs` + `reciprocalRankFusion.ts`) deduped.  
- Monolith‑reader bugs: 6 scripts read `tribal-embed-index.json` directly → stale data, crash; fixed to manifest‑first loader.  

**DOMAIN SPECIFICS**  
- Engines/Actions: `U-CAP-PROBE`, `MultiModelConsensusEngine.ask`, `resolveDiverseOllamaPanel`, `getBestReasoningModel`, `getBestChatModel`, `loop-state.mjs` (`next`), `pick-unit.mjs`, `OLLamaCapabilityProbeEngine.ts`, `PromptCachingEngine.ts`, `GNNEdgePredictCore`, `GNNEdgePredictCandidates`, `GNNEdgePredictCLI`, `GNNEdgePredictViz`, `H2GCNFeatureTransform`, `ask-ollama`, `prism_local:local_generate` (optional `num_ctx`).  
- Dispatchers/skills: `loop-state.mjs`, `pick-unit.mjs`, `mcp-streamable-client.mjs`, `ollama-prism-bridge.mjs`, `slot-bind-enforce.mjs`, `chat-slots.mjs`.  
- Metrics & gates: AUROC ≥ 0.78, macro‑F1 ≥ 0.55, Brier ≤ 0.15; GNN #9 retrain pending GPU; embed degeneracy mean cosine 0.86; loop rolls capped by `PRISM_LOOP_MAX_ROLLS`.  
- Key paths: `H:/prism/.claude/helpers/chat-slots.mjs`, `H:/prism/.claude/commands/checkin.md`, `scripts/mine-india-transcripts.mjs`, `graphsage-train-pipeline.mjs`, `ollama-prism-bridge.mjs`, `loadTribalIndex`, `streamTribalEntries`.  
- Tribal index: 2 shards, `totalEntries` = 33 501, `wikiEmbeddedCount` = 4 001; manifest‑first loader.  

**TOOLS USED**  
- PRISM helpers: `chat-slots.mjs`, `slot-bind-enforce.mjs`, `auto-fix-blackwell-doctrine-inject.mjs`.  
- Node scripts: `.mjs` for slot claim, loop-state, pick-unit, reaper (`aggressive-killer-stop.mjs`).  
- Testing: Vitest (`node:test`), TypeScript compiler (`tsc`), 3‑of‑3 scrutiny agents.  
- Docker CLI for container stop/start; WSL memory guard script (`27-wsl-memory-guard.mjs`).  
- CronCreate/cron for recurring `/loop` prompts.  
- Ultracode workflow orchestration, parallel agents, web research.  
- MCP streamable client (`mcp-streamable-client.mjs`) and bridge (`ollama-prism-bridge.mjs`).  

**OPEN THREADS**  
- GNN tier‑5 gate clearance (#9) pending GPU retrain (operator action).  
- Wiki‑RAG embed: ~9 965 entries left; handled by fleet cron `296523b3` (GPU‑bound).  
- Sierra’s shard‑safe writer stabilization for tribal index; once complete, wiki re‑embed can close recall gap.  
- Recurring `/goal` loop (10 min cadence) will re‑evaluate surfaces and trigger re‑embed when safe.  
- Monitor for new gaps after index recovery or GPU training.  
- No remaining actionable units in this galaxy; loop will pick up next scheduled task via cron and handoff.
