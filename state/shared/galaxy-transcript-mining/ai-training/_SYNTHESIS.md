# ai-training galaxy CROSS-SESSION SYNTHESIS (86 of 87 mineable, model gpt-oss:120b, 2026-06-27)

## What this galaxy is building
- **PRISM Manufacturing‑Intelligence Platform** – unified chat‑slot fleet (α…ω), PSN graph linking Obsidian vault, Wiki, tribal knowledge, engines, algorithms & formulas.  
- End‑to‑end closed‑loop pipeline: PDF/Video → CAD/CAM emitter (Fusion/HyperMill/Mastercam) → RAG‑enhanced knowledge base → GraphSAGE + LoRA models → Octopus consensus routing → AUROC/Brier/F1 gated deployment.  
- Autonomous “Hermes” orchestrator (Electron + Claude Opus 4.8) runs `/loop` goals, syncs memories to Obsidian, schedules crons, and monitors token‑budget/GPU health.  
- Slot‑based git worktrees (26 slots) isolate development lanes; each unit follows **claim → guard → test → atomic commit → scrutiny** pattern.  
- Supporting subsystems: Qdrant vector store, system‑viz roosts, speed‑feed/or adaptive control orchestrators, quoting & cost‑savings engines, curriculum/Playbook knowledge hub.

## Shipped capabilities (selected)
| Engine / Feature | Commit / ID | Key metric / artifact |
|------------------|------------|-----------------------|
| YouTube tribal tip harvest | `b8acbfcf5c` | 28 vid → 164 tips (`night‑queue.json`) |
| CAD trial‑error calibration loop | `U‑CAD‑LEARN‑CALIBRATE` (`1a910d6015`) | AUROC 0.808, Brier ≤ 0.15 |
| Text→CAD bridge (Ollama offload) | `U‑CAD‑TEXT‑LEARN‑LOOP` (`6732f5387e`) | ledger `cad-failure-ledger.jsonl` |
| LoRA pair builder & guard | `55cf3dd18d` | `prism_cad/loRA_pairs.json` |
| PSN RAG dispatcher (kNN) | `10735ad466` | 19/19 tests green |
| GNN label pool (+11 labels) | `U‑GNN‑VAULT‑WIRE‑LABELS` (`d5ff9fdf90`) | macro‑F1 0.439 → target ≥ 0.55 |
| Octopus utilization driver | `7acb5253a5` | 62→63 ledger entries |
| Ollama context override (16 K tokens) | `ask‑ollama.mjs` | 100 % success |
| LLM ladder (Ollama → Claude → offline) | `LLMEngine` (`38fde7cc48`) | cache key FNV‑1a, provenance field |
| VisionActionAnalyzer (OCR/Video) | migrated engine | 5 hermetic tests green |
| Weekly synthesis resolver | `U‑WEEKLY‑SYNTH‑RESOLVER` | 0 stale‑orphan count |
| GNN edge‑predict core (sigmoid dot) | `U‑GNN‑EDGE‑PREDICT‑CORE` | AUROC 0.808 selective, meanCosine ≈ 0.86 |
| Capability probes (`getBestChatModel`) | `U‑CAP‑PROBE`, `U‑OCTOPUS‑PANEL` | 29/29 tests green |
| Tribal QA LLM unblock | `U‑TRIBAL‑QA‑LLM‑UNBLOCK` | live‑fire verified |
| WikiIndex maintainer & tribal inject | `c593b096fb` | `SYSTEM-SYNERGY-GAPMAP-2026-06-08.md`, obsidian sync |
| Multi‑model Octopus consensus | `0a86b1cf7d` | gpt‑oss 120b, gemma4 31b, qwen2.5‑coder 32b |
| Slot‑worktree bootstrap | `slot-worktree-bootstrap.mjs` | 26 slots ready |
| Fleet‑reaper & health watch | `fleet-reaper-sweep.mjs` | GPU free MB, Ollama reachability |
| Qdrant / PSN snapshot refresh | `U-PSN-SNAPSHOT-REFRESH` | `prism_engines` collection |
| Speed‑Feed orchestration (9 units) | `a403dcf6…` | 100 % test pass, ΔΨ reward loop |
| CurriculumEngine (35 courses) | – | 46/46 vitest passes, mobile UI |
| Playbook conflict engine | – | 47/47 tests, Zod schemas |
| CAD pipeline (STEP emitter) | – | ~95 MB STEP, AUROC baseline 0.39 → target ≥ 0.78 |
| GraphSAGE + LoRA retrain script | – | AUROC gate pending ≥ 0.78 |
| Token‑savings optimizer | – | HP‑bar 34/34 tests, ≈12 % offload (target 30 %) |
| System‑Viz & Octopus voice integration | – | 3/5 voices live, roost JSONs `ghost.*` |
| Neural ledger / replay engine | `INFRA‑NEURAL‑LEDGER‑MS1` | 139 green tests |

*(All units passed their respective test suites; duplicate entries merged.)*

## Key decisions + rationale
- **Single source‑of‑truth installer & batch harvest ≤5 sources** – avoids duplicate cron steps and stays under the 10 min fleet‑reaper kill limit.  
- **Free‑LLM ladder (Ollama → Claude → offline)** – eliminates API‑key gating, guarantees availability, saves cost.  
- **Guard‑first streaming I/O (>512 MiB) & auto‑compact at YELLOW token budget** – prevents OOM on large graphs and frees GPU before heavy LoRA/GNN work.  
- **Model tiering:** floor = `qwen2.5‑coder 32b`, best = `gpt‑oss 120b`; retire < 14 B models to reduce memory pressure.  
- **Selective deployment (τ=0.7) for GNN** – 32 % coverage with acceptable Brier; avoids over‑confident low‑capacity predictions.  
- **Octopus consensus** used for all high‑impact routing decisions (model selection, capability probes).  
- **Chunked / buffered processing** for tribal embed index, PDF split, CAD emitter to keep RAM < 1 GB.  
- **Graduated memory‑pressure gate** replaces binary prune; keeps active chats alive under load.  
- **Slot‑worktree + atomic write (tmp → fsync → rename)** eliminates `.git/index.lock` contention.  
- **Token‑savings cheap path (≈136 token node offsets vs 186 K)** – drives ~12 % savings now, target 30 % after full rollout.  
- **PWA first for curriculum/academy** – service‑worker caching, shell‑first strategy.

## Standing operator directives
- Always claim a slot before any commit (`chat-slots.mjs claim <slot>`).  
- Keep the autonomous loop running: `/loop [5m] /goal` (or `[10m]` for slower tracks).  
- Run `/compact` automatically at YELLOW token usage or when a stop‑hook fires.  
- Maintain GPU health floor ≥ 4 GB heap & VRAM free > 30 % (`GpuStackHealthEngine`).  
- Keep Ollama models warm: `OLLAMA_KEEP_ALIVE=1800`, `MAX_LOADED_MODELS=4`.  
- Enable Hermes cron mode after verifying `cron_mode: enabled` in its config.  
- Run fleet‑reaper continuously; monitor JSON output for crashed slots or GPU pressure.  
- Sync memories to Obsidian every 15 min (`hermes-obsidian-memory-bridge.mjs`).  
- Enforce AUROC ≥ 0.78, macro‑F1 ≥ 0.55, Brier ≤ 0.15 before promoting any NN/GNN model.  
- Deploy slot‑worktree bootstrap after any new branch; clean orphan locks with `git-lock-sweeper.mjs`.  

## What is still to build (open threads)
- **Harvest remaining ~17 web sources** and wire into “PRISM Web Source Drain” cron.  
- Finalise LoRA pair builder integration post‑context reset.  
- Full GraphSAGE retrain (AUROC ≥ 0.78, macro‑F1 ≥ 0.55) with correct label mapping & heterophily boost.  
- Wire RAG warm‑start (`sfc_rag_warmstart`) to downstream engines.  
- Complete Vision engine migration: `PartMediaToCAD`, `BlueprintVisionOCR` → `llmEngine.queryVision`.  
- Bring Qdrant container up; verify semantic search returns results.  
- Fix Hermes/Anthropic billing 429 errors; ensure fallback to Ollama works.  
- Resolve `/checkin‑sierra` stale lock and enable auto‑fix hooks fleet‑wide.  
- Deploy weekly synthesis resolver production version with `coverageComplete` flag.  
- Expand Octopus utilization to all 34 galaxies, add missing substrate drivers.  
- Implement Playwright fetch for JS‑rendered web sources.  
- Fix RL‑CAM step signature (arity mismatch).  
- Finish slot‑queue generator/consumer coordination.  
- Finalise system‑viz drift‑gate (heap‑safe detection & auto‑repair).  
- Complete CAD feature recognition, UPSET recipe compile → 5‑axis program (>0.75 fidelity).  
- Finish speed‑feed full calibration (CALIB‑PERSIST/APPLY) and safety‑physics gate for all material/tool combos.  
- Build remaining parts‑library tuples, merge JM Die corpus coverage to > 80 %.  
- Finish physics & material audit workflow; integrate Oscar’s Johnson‑Cook constants.  
- Enable full cron‑mode for Hermes, populate account‑switch data source, schedule nightly dream‑cycle task.  
- Wire all PSN legs (algorithms, formulas, nn_gnn, prism_os) into health graph.  
- Deploy `U‑NN‑PREDICTOR‑EMBED‑WIRE` and GPU RAG‑6 embedder.  
- Load full program corpus (`data/programs/...`) into replication engine.  
- Bridge feature‑candidate extraction to Quote‑to‑Ship pipeline.  
- Complete vendor catalog adapters (emuge, global‑cnc) & JM fleet handbooks.  
- Add collision envelope generation & holder geometry integration.  
- Implement Docustrata extractor and expose drift alerts to PSN.  
- Expose HTTP `/api/v1/business/dispatch` for Hotel dispatcher.  
- Resolve recurring git `index.lock` contentions, peer‑absorption attribution losses.  
- Finish OCR for image‑only PDFs, promote high‑confidence wiki stubs.  
- Complete model routing ladder (`U‑ROUTE‑LADDER`) and purge default models.  
- Finish SpeedFeed orchestration iterations 9‑20; integrate HSMAdvisor API.  
- Regenerate system‑viz after each major commit.

## How to build it (patterns / sequence)
1. **Claim slot → `/checkin`** (`chat-slots.mjs`).  
2. **Guard‑first unit:** add streaming graph guard, run Vitest shard, ensure `{success:true}` envelopes.  
3. **Batch small builds** (≤5 sources, ≤30 min) to stay under reaper limits.  
4. **Auto‑compact** (`self‑compact.mjs`) at YELLOW before any GPU/LoRA heavy task.  
5. **Octopus consensus decision** (`prism_ai:consensus_decide`) for model routing & capability probes.  
6. **Deploy via gates:** run `measure‑deploy.mjs`; if AUROC/Brier/F1 meet thresholds, commit with `[slot:<name>]`.  
7. **Schedule crons** (PowerShell installers) for long jobs: web drain, GNN retrain, weekly synthesis.  
8. **Write to canonical ledger** (`blueprint-accuracy-event-writer.mjs`) after each engine passes tests.  
9. **Refresh vault & system‑viz** (`system-viz-query.mjs`, `vault-backlinks.json`) post‑commit.  
10. **Loop / Goal:** `/loop [5m] /goal` keeps pipeline alive; invoke `/precompact` when token usage > 60 %.  

## Tools to use
- **Dispatchers / Engines:** CADTrialErrorLearningEngine, BlueprintExtractionRAGEngine, LoRApairBuilderEngine, GNNEmbeddingEngine, VisionActionAnalyzerEngine, OctopusUtilizationDriver, SystemVizQueryEngine, QuoteEstimatorEngine, CostSavingsTrackerEngine, SpeedFeedCalibrationEngine, CurriculumEngine, PlaybookEngine, NeuralLedgerEngine, ReplayEngine.  
- **Scripts / Skills:** `chat-slots.mjs`, `slot-worktree-bootstrap.mjs`, `drain-resources-tribal.mjs`, `mine-india-transcripts.mjs`, `octopus-utilization-driver.mjs`, `ask-ollama.mjs` (+ `num_ctx`), `self‑compact.mjs`, `fleet-reaper-sweep.mjs`, `audit-roadmap-drift.mjs`, `psn-synergy-collect.mjs`, `tribal-graph-build.mjs`, `phase21-split-containers.py`.  
- **Hooks:** pre‑commit guard (streaming IO, heap caps), octopus‑consensus hook, wedge‑guard for Ollama concurrency, windowsHide fix, stop‑hooks (`silent‑suggestion‑surfacer-stop`), watchdog/restart hooks.  
- **System‑Viz / Graph:** `vault-backlinks.json`, `system-viz-graph.json`, roost JSONs `ghost.*`, `regen-viz.mjs`.  
- **Vector store:** Qdrant container (`prism-qdrant:6333`) – collections `prism_engines`, `prism_skills`, `prism_formulas`.  
- **Knowledge bases:** Obsidian vault (`H:/prism/knowledge/`), Wiki markdown, MEMOry.md index.  
- **AI models / routing:** Ollama (qwen2.5‑coder 32b floor, gpt‑oss 120b best, gemma4 31b secondary), Claude Opus 4.8 for Hermes, vision models (`llama3.2‑vision`, `qwen3‑vl`).  
- **CI / testing:** Vitest/Jest, TypeScript `tsc --noEmit`, Git hooks (`git-add-lane-guard`, `main-tree-write-block`), per‑file scrutiny agents.  

## Recurring findings + bugs (deduped)
- **Git lock contention** – stale `.git/index.lock`; solved with slot‑worktree isolation, retry guard, and `git-lock-sweeper.mjs`.  
- **Streaming I/O OOM** on >512 MiB graph reads/writes; fixed by `readGraphStreaming` / `writeGraphStreamingAtomic` guards.  
- **Threshold parseInt bug** (`'0.9' → 0`) corrected to proper scaling (90).  
- **Duplicate/ghost actions** across dispatchers – deduped via capability probes and Octopus consensus.  
- **RL‑CAM step signature mismatch** (TS2554) still pending owner fix.  
- **GNN AUROC low** due to label inversion; retrain with correct loss weighting required.  
- **Calibration overfit (LOO isotonic)** – Brier worsened, AUROC dropped; calibration disabled until temperature‑scaling implemented.  
- **Token‑budget overflow** on long loops – mitigated by `/precompact` guard and cheap node‑offset paths (≈12 % offload).  
- **Hermes/Anthropic billing 429 errors** – fallback to Ollama now wired.  
- **Vision engine still pointing at Claude** – migration to `qwen3‑vl` pending.  
- **Qdrant container down** → semantic search empty; restart and health‑check added.  
- **Playwright fetch path** placeholder – not yet implemented.  
- **Rate‑limit on Ollama concurrency (8 slots)** – wedge guard added, monitoring ongoing.  
- **Regex / NaN bugs** in various parsers fixed; NUL byte artifacts removed.  
- **Heap caps too low** for MCP cold start – raised to ≥ 4 GB via `U-MCP-BOOT-HEAP-FLOOR`.  
- **Precompact deadlock** – forced `/compact` before loop continuation.  
- **Duplicate ledger paths** caused split learning data; unified under `CADTrialErrorLearningEngine`.  
- **System‑viz OOM during large merges** – increased Node max‑old‑space to 8192 MB and switched to incremental regeneration.  

*All items are actively tracked in the open‑thread backlog.*
