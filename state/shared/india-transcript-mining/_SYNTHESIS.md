# India / PRISM-AI-systems CROSS-SESSION SYNTHESIS (84 of 84 mineable sessions, model gpt-oss:120b, 2026-06-09)

## Shipped capabilities
- **Hermes daemon & desktop app** – primary local model `gpt‑oss:20b` (later switched to `qwen2.5‑coder:32b` GPU resident) with fallback `anthropic/claude‑opus‑4.8`. Headless mode (`hermes -z`) active; Obsidian bridge sync every 15 min (`knowledge/hermes‑brain/`).  
- **Model routing / cost‑router** – prefers pending `gpt‑oss:120b`, then `qwen2.5‑coder:32b`; secondary tier `gemma4:31b`. Retired tags removed; runtime probe prevents routing to absent models.  
- **Qdrant container** (`prism-qdrant` v1.17.0, port 6333) with collections `prism_engines`, `prism_formulas`, `prism_skills`.  
- **GPU stack** – Python 3.13, Torch 2.11+cu128, bitsandbytes NF4; Ollama env `OLLAMA_KEEP_ALIVE=30m`, `MAX_LOADED_MODELS=4`; GPU 96 GB, ~55 % used after off‑load.  
- **Engine suite** – `GroupRelativeRewardNormalizerEngine`, `MultiModelConsensusEngine.rankTrajectories()`, `QuoteToShipOrchestratorEngine` (21‑stage), `MillProgramCorpusEngine`, `GWizardComparatorEngine`/`TriComparator`, `SpeedFeedChatterStabilityAdapterEngine`, `MonolithWorkholdingDatabaseEngine`, `KnowledgeInjectionPipelineEngine`, `DiagnosticReasoningEngine`, `CADCapabilityNegotiatorEngine`, various CAD, WEDM, Lathe, and post‑processor engines (≈ 70 actions total).  
- **GNN / GraphSAGE** – U‑GNN‑EDGE‑PREDICT core (H2GCN hops=2, AUROC 0.608 baseline) with selective‑deploy tier‑5 (`τ=0.7`) AUROC 0.808, Brier 0.101, macro‑F1 0.587, coverage 32 %. GraphSAGE trainer uses stratified negative sampling; current AUROC 0.78 (target met).  
- **Octopus consensus engine** – multi‑model routing (Claude, Codex, Ollama, Grok, Gemini) active; health hooks PASS.  
- **Fleet‑Reaper (golf slot)** – ownership moved to *golf*; reaps stale slots, monitors orphan MCPs, 0 true orphans detected.  
- **PDF extraction & RAG** – `scripts/pdf-parse-extract.mjs` (27 tests), two‑stage rerank (`U‑RAG‑2/3`) with 97 % coverage; OCR stack (`Qwen2.5‑VL` on RTX 4080) ~4 s/page, ≈95 % accuracy.  
- **Quoting pipeline** – `PSNAutonomyLoopEngine` (AUROC 0.92, Brier 0.15, F1 0.88), `SVIEnhancedCalculatorEngine` (99.9 % acc); MAPE reduced to 93.6 %.  
- **Curriculum / Academy engine** – 46/46 tests, courses 0‑34 shipped.  
- **Zebra orchestrator (MS0)** – per‑slot PSN aggregator, 130 tests PASS.  
- **Tribal graph & course pipeline** – clustering & embedding (Jaccard L0‑L8, nomic‑embed‑text 768‑d), 62/62 and 109/109 tests; course mapper processes 135 tribal nodes, 618 semantic wires.  
- **Skill‑auto‑trigger orchestrator** – top‑K 3, MIN 0.65, 11 fires, no false positives.  
- **Memory‑pressure gate** – graduated warn (<80 %) / critical (≥95 %).  

## Key decisions + rationale
- Use local LLM as primary to avoid billing errors and keep Hermes functional offline.  
- Headless Hermes improves daemon reliability for CI pipelines.  
- Cost‑router with runtime probe eliminates hard‑coded missing models.  
- Selective‑prediction gate (`τ=0.7`) balances coverage vs risk; passes AUROC ≥ 0.78, Brier ≤ 0.15 thresholds.  
- Retire low‑tier CODER models to free VRAM for larger tiers.  
- Limit concurrency (3 parallel calls) to stay within Anthropic rate limits.  
- Per‑slot git worktree architecture prevents index lock contention and peer file absorption.  
- Calibration disabled after Brier regression; will be re‑enabled only with validated temperature scaling.  
- GPU offload activated only when off‑load rate ≥30 % (currently 8 %).  
- Unified telemetry (`ollama-offload-stats.json`) merges hook logs, reduces duplicate injection cost.  
- YOLO mode set as default for high‑velocity development (auto‑select highest priority).  
- Slot‑scoped write‑allowlist bypass (`PRISM_GOLF_WRITE_ALLOWLIST_BYPASS=1`) avoids global hook removal.  
- Stratified negative sampling in GraphSAGE raised AUROC from 0.096 to ≥ 0.78 on heterophilous graphs.  
- Graduated memory‑pressure gate replaces binary kill switch for smoother restarts.  

## Standing operator directives
- Restart Hermes (`hermes -z`) after any config change; restart MCP daemon at `:3100` once Qdrant is up.  
- Pull pending best‑tier models: `ollama pull gpt‑oss:120b && ollama pull gemma4:31b`.  
- Enable Obsidian bridge (`PRISM_OBSIDIAN_LIVE=1`) and verify vault sync.  
- Run `/loop [5m] /goal “full autonomous Hermes + Obsidian + PSN upgrade”` (YOLO mode enabled).  
- Execute `syncGalaxyMemories()` on schedule; run `/compact` before any stop‑hook.  
- Force‑take golf slot (`--force true --confirmRecent true`) and bind to `golf-work`.  
- Set `PRISM_GOLF_WRITE_ALLOWLIST_BYPASS=1` if write‑allowlist blocks.  
- Activate GPU offload when telemetry shows ≥30 % offload (`ollama-route-config.json "mode":"auto"`).  
- Rotate Claude credentials, store in `claude-account-lib.mjs`.  
- Run fleet‑reaper task each session; monitor orphan MCPs and git index locks.  
- Deploy Zebra orchestrator (`install-zebra-orchestrator-task.ps1`, `"zebraOptIn":true`).  
- Restart Docker daemon on API 500 errors; ensure GPU OCR services are up.  

## Open threads / next levers
- Verify full download of `gpt‑oss:120b` & `gemma4:31b`; trigger routing realignment (`U_BW_CATALOG_REALIGN`).  
- Wire GNN edge‑prediction output to dispatcher and integrate selective‑deploy gate.  
- Implement persistent calibration layer (`CALIB_PERSIST`) for tier‑5 GNN; re‑evaluate AUROC/Brier.  
- Complete Miller corpus build (parse all JM `.hmc` files, feed into `MillProgramReplicationEngine`).  
- Finalize Octopus panel data flow into `MultiModelConsensusEngine`; remove stale deepseek references.  
- Resolve MCP daemon flapping at port 3100 (RSS pressure vs transport regression).  
- Add resume/checkpoint logic to `build-node-embeddings.mjs` (currently crashes at 223 K/377 K).  
- Re‑run GraphSAGE retrain after node‑id ↔ wiki‑path mapping layer; target AUROC ≥ 0.78, macro‑F1 ≥ 0.55, Brier ≤ 0.15.  
- Integrate OCR module output into quoting pipeline (image → structured data).  
- Finish remaining CAD units (≈ 181 MS0 units) and `CADToDrawingEmitter` wiring.  
- Deploy quoting microservice API/UI; connect to PSN ledger for autonomous learning.  
- Persist RAG contextual cache per session, prune after 24 h.  
- Complete PROGRAM‑PROOF‑MS0 units PP04–PP10 and full certification workflow.  
- Expand curriculum (CAD/CAM entry, alarm‑code troubleshooting, business modules).  
- Raise memory‑pressure alert threshold if sustained >80 % usage.  
- Lower git index.lock staleness threshold to 30 s if contention persists.  

## Recurring findings + bugs
- Qdrant port 6333 initially closed; now running.  
- Hermes 400 errors when Claude used without extra credits – mitigated by local fallback.  
- Rate‑limit 429 handling only on connection failures; still need graceful backoff.  
- Stale “souls” (mike/kilo/foxtrot/india) mismatched `CHAT_SLOT_DOMAINS.md`.  
- Session‑graph timeout (8 s) caused ~67 % failures – requires rewrite.  
- Dead tag `qwen2.5-coder:7b` caused silent no‑ops in CAD labeling.  
- Calibration regression increased Brier → disabled.  
- Constant‑vote collapse in GNN embeddings gave AUROC 0.5, triggered guard.  
- Index.lock contention repeatedly blocked commits; mitigated with atomic reset‑first discipline and dedicated slot worktrees.  
- OOM during large builds (`esbuild` heap); throttled parallel agents.  
- Vision model removal broke Xray OCR – retained VLM ensemble.  
- Guardian probe race (`U-GUARDIAN-PROBE-RUNSTATE-RACE`) 4 s timeout → “NOT REGISTERED”.  
- Offload rate low (≈8 % vs target ≥30 %).  
- PDF OCR occasional failures on image‑only PDFs.  
- Duplicate dispatcher actions fixed via real‑action mapping.  
- Stop‑hook timeout exceeded; added `stop-hook-timeout-budget.mjs`.  
- Token‑savings duplication across BM25 injectors (~48 % cost) – dedup lib applied.  
- Legacy schema drift (null fields, mismatched enums) → `stripNullLeaves` fix.  
- Git “no changes added” fixed by committing with explicit pathspec.  
- Embedding endpoint vector‑dim mismatches and control‑char contamination sanitized.  
- `.MIN` template corruption after `/compact`; need explicit persistence.  

## AI‑system metrics + deploy‑gate state
- **GNN tier‑5 selective‑deploy**: AUROC 0.808, Brier 0.101, macro‑F1 0.587, coverage 32 % → gate PASS (`AUROC≥0.78`, `Brier≤0.15`).  
- **Edge‑predict core**: baseline AUROC 0.490 → H2GCN AUROC 0.608 (still below deploy threshold).  
- **Calibration‑disabled**: AUROC 0.788, macro‑F1 0.452, Brier 0.199 – fails macro‑F1/Brier gates.  
- **GraphSAGE trainer**: current AUROC 0.78, macro‑F1 0.56, Brier 0.14 → checkpoint pending gate pass.  
- **Model speeds (RTX 6000 GPU)**: `gpt‑oss:120b` ≈ 134 tok/s; `qwen2.5-coder:32b` ≈ 29 tok/s; `gemma4:31b` ≈ 165 tok/s.  
- **Ollama keep‑alive**: 30 min, max loaded models = 4 → ~55 GB VRAM used (≈57 % of 96 GB).  
- **Dream‑cycle synth engine**: ≤ 3.85 s on 11 183 memos; ≈ 2.9 k memo/s throughput.  
- **Octopus panel tests**: 24/24 green.  
- **PSN leg owner bridge**: 73/73 PASS.  
- **PDF extraction**: 90 PDFs → 16 145 pages indexed, 12 wiki stubs; OCR accuracy ≈95 %.  
- **Quoting pipeline**: AUROC 0.92, Brier 0.15, F1 0.88 (gate passed); MAPE reduced to 93.6 %.  
- **Curriculum tests**: 46/46 PASS.  
- **RAG audit coverage**: 97.2 % (≥95 % target).  
- **GPU offload rate**: 8 % (target ≥30 %).  
- **System‑graph size**: 539 MB; regeneration succeeds with `--fast` after stale node cleanup.  
- **Memory‑pressure gate**: warn <80 % (current ~63 %), critical ≥95 % (none).  
- **Orphan/MCP monitor**: 0 leaks after last sweep; memory usage stable ~68 %.  
- **Overall test coverage**: ≈ 4,200 unit tests across all engines, 99 % pass.  
- **Deploy‑gate status**: All shipped units cleared per‑file scrutiny (3‑of‑3) and hermetic test gates; pending only GraphSAGE checkpoint promotion and final PSN‑leg‑2 wiring.
