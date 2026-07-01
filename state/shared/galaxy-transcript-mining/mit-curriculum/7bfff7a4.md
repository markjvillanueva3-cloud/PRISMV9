# mit-curriculum session 7bfff7a4 (2026-06-10, 75MB, spine 681KB, 8 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `U-CAP-PROBE-CATALOG-RETIRE-TESTFIX` – fixed stale MS0 catalog (`qwen2.5-coder:7b`).  
- `U-OCTOPUS-PANEL`, `U-OCTOPUS-DIVERSE-PROBE` (added `runnable?` param).  
- `loop-state.next` / `U‑LOOP‑AUTO‑ADVANCE` – auto‑advance loop, 6/6 unit tests green.  
- `U‑OCTOPUS‑LIVE‑VALIDATE` – 21/21 tests, live‑validated.  
- GNN edge‑predict core: `U-GNN-EDGE-PREDICT-CORE`, CANDIDATES, CLI, VIZ (all 100% test pass).  
- `U-GNN-EMBEDDING-DEGENERACY` – meanCosine 0.861, centroidNorm 0.928.  
- Heterophily port & CLI (`U-GNN-HETEROPHILY-MJS-PORT`, `CLI`) – 111/111 round‑trip tests.  
- `U-MINE-INDIA` – 12 unit tests, 2‑reviewer PASS.  
- India transcript mine (#12) – 84/84 transcripts mined, Obsidian vault `reference_india_transcript_synthesis.md`.  
- Local LLM MCP route (#10) – `prism_local:local_generate` with `num_ctx`, 13/13 vitest.  
- Consumer path (#11) – `ask‑ollama.mjs` routed via MCP, 74/74 tests.  
- Hop‑sweep & H2GCN wiring (#9) – hop‑3 lift +0.138, 6/6 tests.  
- Commit e32615c8e5: ask‑ollama → MCP local_generate (92/92).  
- Commit d13604947f: fleet‑wide auto‑fix + Blackwell doctrine hook (14/14).  
- Commits ef39d5a6c7 & b3022f3510: scrutiny P3 fixes, doc‑reflect wiki lesson.  
- Commit 47e38e4fb9: added `num_ctx` to local_generate.  
- Commit f5aa704075: hardening fetch‑stub test (afterEach global‑fetch reset).  
- Commit c2045b3f5a: propagated `num_ctx` through ask‑ollama path (94/94).  
- Commit 3cf36669e0: India miner routed via MCP with opt‑in overlay.  
- Commit 74ee070071: increased synth output cap 8192→16384.  
- Commit d99be7d62d: galaxy miner MCP overlay.  
- Commit 2ae59c6aa0: hotel miner main‑guard + route overlay.  
- Commit 1df8b79a07: wiki doc‑reflect updated.  
- Commit cfad5ae290: AI‑training wiki concept.  
- Commit f4a681e986: llama‑server orphan reaper tool (18/18).  
- Commit 3d5d506dcf: wired reaper into fleet‑wide Stop hook.  
- Commit eb262e5675: Galaxy‑synthesis brains → LoRA dataset (512 pairs, 31/31).  
- Commit ad120bdf8a: vault datasets wired to fleet‑training manifest.  
- Commit 4f4db8a7fb: canonical‑path clobber‑guard + test.  
- Commit 85614c3894: corpus assembler – 746 rows, deduped/weighted.  
- Commit 7d3879f21b: added advisory flag & statsPath fix.  
- Commit cd9f80faf8: per‑galaxy `track-field` → 34 adapters.  
- Commit 99439c85f6: removed stray NUL byte.  
- Commit 6c46ed332e: CLI exit‑code + `--dir` flag.  
- Commit a90f0979b1: persisted ultracode workflow output (`AI‑SYSTEMS‑IMPROVEMENTS‑2026_06_10.md`).  
- Commits 1d43fbcbc4, 0928c7f537, 95d86f5a6d: resolved Stop block, verified tribal shards (~534 MB), updated spec.  
- Commit 35acfb15b4: wiki‑tribal‑cross‑ref‑audit.mjs – coverage ↑ 69.2→77.1 %.  
- `graph-node-embedding-bridge.mjs` – streamTribalEntries, 61/61 tests.  
- `generate-knowledge-galaxy.mjs` – streamTribalEntries, default‑heap safe.  
- `hm-extraction-coverage.mjs` – honest 0 count.  
- Commit 19b55d6ef3: build‑psn‑training‑corpus + audit‑mill‑psn‑coverage merged.

**DECISIONS**  
- No speculative LoRA variants; only proven units built.  
- Two‑reviewer per‑file scrutiny gate, 3‑of‑3 Stop ledger for safety.  
- Capability‑probe selector added to octopus branches; all inference paths use same oracle.  
- `loop-state.next` auto‑advance enabled; no manual “continue next phase”.  
- Do not start GNN edge‑predict build now (budget risk); handoff verified.  
- Stop nim‑llama32‑3b container (~88 GB) and decide removal or keep stopped.  
- Use auto‑advance loop machinery for all future units.  
- Defer GPU‑dependent tasks (H2GCN retrain, wiki‑RAG embed) to operator/fleet; not in‑context build.  
- Adopt fail‑soft MCP routing for local LLM consumers; default OFF, env‑gated `PRISM_LOCAL_LLM_VIA_MCP`.  
- Add `num_ctx` param to local_generate before consumer routing to prevent silent truncation.  
- Implement fleet‑wide doctrine hook (`auto-fix-blackwell-doctrine-inject.mjs`).  
- Auto‑enforced slot binding (`slot-bind-enforce.mjs`) for deterministic India slot claim.  
- Use reaper‑immune Windows Scheduled Task for long jobs (India mine, GPU retrains).  
- Adopt shard‑aware loaders: `streamTribalEntries`, `loadTribalIndex`.  
- Commit all bug‑class fixes in single batch to avoid merge conflicts.

**OPERATOR DIRECTIVES**  
- Make loops automatically lead to next unit or task.  
- Investigate API error rate‑limit cause and fix (WSL memory overcommit).  
- Read all previous X articles on AI training, systems, RAG, CAG; determine coverage completeness.  
- Do everything in loops until wired, tested, validated.  
- Authorize GPU retrain now (#9) – executed.  
- Ensure local LLMs route through PRISM MCP server (via #10 & #11).  
- Use Ollama for better task efficiency when viable.  
- Push through backend development domain change to allow work in other galaxies and domains.  
- `/loop [10m] /goal [ improve ai systems, deep learning, deep reasoning, nn, gnn, lora, cag + rag + hybrids across all galaxies ... ]`.  
- Update fleet launcher on desktop to launch fleet with PowerShell 7 (`regenerate-launch-fleet.mjs`).

**FINDINGS/BUGS**  
- Stale tests encoded pre‑2026‑06‑04 catalog (`qwen2.5-coder:7b`).  
- Legacy octopus not wired; only hardcoded defaults used.  
- Diverse‑panel branch lacked probe‑aware filtering; empty runnable semantics could silently seat non‑runnable voice.  
- Test name “nothing runnable → empty panel” misrepresented body (R9 trap).  
- Header doc drift in MMCE (`deepseek-r1:14b`) – fixed.  
- Loop machinery lacked auto‑next; required `loop-state.next`.  
- P0 unbounded runaway: added `rollsTotal` cap (`PRISM_LOOP_MAX_ROLLS`).  
- P1 cross‑session handoff contamination: verified terminal match before RESUME.  
- P1 `--resolve-only` mutates on exhausted: gated out.  
- Fleet‑fallback bypasses peer‑claim filter; threaded `chatId`, fail‑closed when absent.  
- API error cause: WSL memory overcommit from GPU CUDA mapping of NIM container; fixed by stopping container and `wsl --shutdown`.  
- Embedding degeneracy: meanCosine 0.861, centroidNorm 0.928 → same‑feature re‑embed wasted.  
- H2GCN hop‑3 lift +0.138, AUROC ≈ 0.64 < 0.78 gate; embedding growth required.  
- Trivial dedup discipline caught 3 redundant builds (RAG hybrid, tribal rerank, CAG routing).  
- Wiki‑RAG coverage gap (~69 % embedded); fix blocked by active shard‑safety hazard.  
- False‑positive metric misinterpretation corrected; real metric measures embedding coverage.  
- IPv6 localhost bug: Node fetch('http://localhost') resolved to ::1; Ollama listens on IPv4 only → connection refused. Fixed using 127.0.0.1.  
- Fleet reaper kills long session‑attached node runs (exit 255); solved by moving jobs to reaper‑immune scheduled tasks or bounded foreground passes.  
- OOM risk in build‑psn‑training‑corpus resolved by dropping embeddings during streaming.

**DOMAIN SPECIFICS**  
- Engines/dispatchers: `OllamaCapabilityProbeEngine`, `MultiModelConsensusEngine.ask()`, `resolveDiverseOllamaPanel`, `loop-state.mjs`, `loop-iteration-inject.mjs`, `OllamaTaskOffloaderEngine.ts`, `prism_local` dispatcher (`local_generate`), `graphsage-train-pipeline.mjs`, `U-MINE-INDIA`, `vault-to-lora-dataset.mjs`, `assemble-fleet-lora-corpus.mjs`, `lora-dataset-builder.mjs`, `loadTribalIndex`, `streamTribalEntries`, `generate-knowledge-galaxy.mjs`, `hm-extraction-coverage.mjs`, `build-psn-training-corpus.mjs`.  
- Metrics/paths: capability snapshot (`runnableModelIds`), VRAM‑fit logic, qualityTier/codeTier ranking, PRISM_LOOP_MAX_ROLLS, rollTotal cap, AUROC/Macro‑F1/Brier gate thresholds, hop‑sweep lift metrics, embedding growth, 512 LoRA pairs, 746 corpus rows, 35k GNN keys/dim 768.  
- Galaxy-specific units: `U-CAP-PROBE`, `U-OCTOPUS-PANEL`, `U-OCTOPUS-DIVERSE-PROBE`, `U-GNN-EDGE-PREDICT-*`, `U-MINE-INDIA`.  
- Shard‑aware loaders: `streamTribalEntries`, `loadTribalIndex`; shard‑safe writer (`embed‑cited‑tips`, `embed‑knowledge‑store`).  
- Fleet launcher generator: `regenerate-launch-fleet.mjs`.

**TOOLS USED**  
- PRISM helpers: `chat-slots.mjs`, `slot-bind-enforce.mjs`, `audit-roadmap-drift.mjs`, `checkin.md`.  
- Testing: vitest (`node:test`), tsc type‑checking, unit test runner (61/61).  
- Review workflow: per‑file 2‑reviewer gate, 3‑of‑3 Stop ledger, scrutiny‑3way.mjs.  
- CronCreate / CronDelete for scheduling; job 296523b3 every 10 min.  
- Node scripts: `loadTribalIndex`, `streamTribalEntries`, `generate-knowledge-galaxy.mjs`, `hm-extraction-coverage.mjs`.  
- Docker commands (`docker stop`, `docker update`), WSL shutdown, reaper script (`f4a681e986`).  
- Ultracode workflow engine (8 parallel agents); PowerShell 7 upgrade via `regenerate-launch-fleet.mjs`.

**OPEN THREADS**  
- GPU H2GCN multi‑seed retrain (#9) – operator‑gated; requires external GPU run.  
- Wiki‑RAG embed (~9 965 entries) pending cron/fleet processing (GPU‑bound).  
- Re‑embed wiki after shard‑safe writer stabilizes.  
- Hybrid retrieval usage in live `tribal-rerank.mjs` (high‑blast‑radius, Qdrant/Ollama latency gating).  
- Verify and apply remaining ranked items from ultracode workflow; per‑item verification needed.  
- Fleet launcher update to PowerShell 7 in generator and regenerate `.bat`.  
- GNN tier‑5 cascade: seed‑ghost‑gnn‑classify.mjs (minConf 0.7 gate) pending operator action.  
- Embedding growth for gate clearance (AUROC 0.78).  
- Cross‑galaxy synergy tasks beyond those identified.
