# academy galaxy CROSS-SESSION SYNTHESIS (32 of 32 mineable, model gpt-oss:120b, 2026-06-27)

## What this galaxy is building
- End‑to‑end PRISM Academy: ingestion → semantic indexing → Obsidian vault sync → system‑viz graph → AI retrieval/augmentation; 60+ courses, quizzes, cert paths, PWA mobile UI.  
- Closed‑loop CNC pipelines: print → program for lathe, mill, WEDM, 5‑axis; two‑rung harnesses (ground‑truth + live diff), safety gates, cost‑efficiency bridges, PSN synergy.  
- AI/ML stack: neural engines (U‑AIW05/09), GNN classifier, LoRA fine‑tuning, RL CAM feedback, BM25 memory, Qdrant vector store for semantic search.  
- Fusion & CIMCO live bridges (`/sweep`, `/loft`, blind navigation) with dialect allowlists for Okuma/Prism/Hurco/Mastercam; UIA/MSAA node extraction.  
- Orchestrator MS0/MS1: 20‑unit master‑machinist planner, quote‑dry‑run, outcome capture bus.  
- Knowledge‑graph tooling: code‑path resolver, navigation‑savings ledger, exact‑match hooks, system‑viz regeneration.

## Shipped capabilities
- Array‑membership dispatch detector – zero false positives.  
- CurriculumEngine & TrainingSchedulerEngine – 44‑47 courses, 18 wiki pages.  
- Video extraction (Whisper + Ollama vision) – local inference only.  
- Two‑rung lathe harness – SFM agreement ↑≈22 %.  
- Fusion bridge routes `/sweep`, `/loft` – 17 live routes.  
- CIMCO blind navigation & dialect allowlists – 511 surfaces indexed, Jaccard drift = 0.4.  
- PWA shell for Academy – offline fallback, cache‑first assets.  
- Brain‑recall memory action (BM25 index on repo files).  
- Token‑awareness sidecar – precompact guard at 887 k tokens.  
- Cost‑efficiency bridge with 13 advisory hooks.  
- Orchestrator pipeline shell & quote‑dry‑run – 20‑unit envelope completed.  
- WEDM job outcome engine + outcomeCaptureBus wiring.  
- Code‑path resolver & nav‑savings ledger – O(1) resolution, ≤5 MB JSONL ledger.  
- GNN classifier – AUROC ≥ 0.78, Brier ≤ 0.15.  
- U‑OBF-F4‑ARCHIVE-CROSSREF – 380 hooks, full test coverage.  
- U‑TDP06 CNC ground‑truth parser – presence‑only G‑code parsing.  
- U‑TDP07 OCR cascade – PyMuPDF + Qwen2.5‑VL 7B raster VLM.  
- Dashboard offload‑rate recalculation (10.9 % → 42.1 %).  
- Wiki recall expansion to 22,734 leaf entries.  
- U‑OBSIDIAN‑LOOKUP & U‑SEMANTIC‑LOOKUP – BM25 + int8 vectors (14.7k).  
- HTML‑COMPANION‑MS0 ghost milestone – 130 spec‑html twins, drift guard green.  
- RTK prefix reminder – rate‑limited hook.  
- Feedback forcing & bug‑finding wiki hooks.  
- Regeneration viz merge‑fail‑loud guard.

## Key decisions + rationale
- Slot‑binding wrappers (`/checkin‑<slot>`) isolate worktrees, avoid git contention.  
- Pathspec atomic commits & dedicated worktrees prevent shared‑tree race and `.git/index.lock` stalls.  
- PWA‑first delivery removes native packaging overhead.  
- Local Whisper + Ollama vision replace paid APIs → zero cost, deterministic pipelines.  
- Two‑rung harness (ground truth + live diff) for measurable CNC accuracy before full rollout.  
- Bounded fix for dispatch detector preferred over large rework.  
- Async factory → sync closure pattern for adapters to satisfy planner contracts.  
- Precompact token guard keeps context under limits; auto‑compact before next loop tick.  
- Cron `/goal` loops every 5 min drive high‑value wiki production; cloud schedule only if ≥60 min.  
- Fail‑loud R12 validator enforces strict domain schemas, emits JSON errors.  
- Qwen2.5‑VL 7B for OCR raster stage (≥88 % benchmark) with pre‑warm to cut latency.  
- Replace noisy RTK auto‑suggest with rate‑limited prefix reminder.  
- Blind navigation + MSAA over UIA for CIMCO due to actionable node availability.

## Standing operator directives
- Claim designated slot before any work; run `/loop [5m] /yolo-mode` after check‑in, never pause.  
- Unblock Stop hooks immediately; treat “improve ai systems…/yolo‑mode” as mandatory.  
- Prioritize closed‑loop CNC pipelines and Academy PWA updates.  
- Deploy Academy changes via PWA; keep `/goal` cron active.  
- No merge until 3‑of‑3 scrutiny passes and all tests green.  
- Run `/compact` after handoff files; Stop hook blocks until completion.  
- Verify all backend‑dev wikis appear in `_leaf-index.jsonl`; run recall test post‑watchdog.  
- Prompt for cloud vs session schedule when creating new cron jobs.

## What is still to build (open threads)
- Implement /forge-triple upgrade if needed.  
- Pattern 6 detection for unconditional forward dispatches.  
- Complete JM Die corpus ingestion (~3,970 Mastercam projects) and held‑out test set.  
- Full CIMCO UIA reader or improve MSAA coverage for all controls.  
- Define concrete loss function for AI systems handoff to India; integrate into `/yolo-mode`.  
- Finish remaining bridge units: cost‑bridge hooks, PSN‑SYNERGY‑COLLECT‑MS1, HURCO‑VM30I adaptive leads.  
- Complete LMS certification path (auto‑grade quizzes, issue certificates, ERP auth).  
- Finalize 5‑axis program generation pipeline (UPSET phases 0‑2, live Fusion drive on port :18361).  
- Resolve shared‑tree race & `.git/index.lock` stalls – lock‑wait queue or per‑slot worktrees.  
- Add missing tests/wiring for `WEDMJobOutcomeEngine`, `MachineConnectivityEngine`.  
- Implement UIA fallback detection and expand dialect allowlist coverage (Okuma OSP mask).  
- Refresh `_embeddings.jsonl` (stale) via Ollama offload directive.  
- Dedup pre‑flight validation for new wiki entries.  
- Persist cron jobs across sessions (cloud schedule >60 min).  
- Rebuild master‑index / stale recall index; ensure leaf index includes missing docs.  
- Wire remaining high‑ROI Lathe engines (~82 unwired) after validator separation.  
- Complete HTML/RTK coverage gaps and root‑doc guard patches.  
- Resolve OOM on `regen-viz.mjs` merge step (`--max-old-space-size=8192`).  
- Add telemetry to memory‑relevance injection hook (hit‑rate measurement).  
- Deploy Playwright MCP server for online source audits.

## How to build it (patterns/sequence)
1. **Slot claim → bind wrapper** (`/checkin‑<slot>`), enforce `slot-bind-enforce.mjs`.  
2. **Prepare atomic pathspec commit**; use dedicated worktree per slot.  
3. **Wire adapters** (RIE, calibration, transfer‑priors) into planner via env switches (`PRISM_RGS_*`).  
4. **Add unit/regression tests** (Vitest/Jest); achieve 100 % pass.  
5. **Run pre‑compact guard**; if token budget > 887 k invoke `/compact`.  
6. **Commit & trigger 3‑of‑3 scrutiny**; on success push to shared tree.  
7. **Cron `/goal` loops** (every 5 min) automatically pick next high‑leverage unit from roadmap.  
8. **Deploy PWA assets**, register service worker, verify offline fallback.  
9. **Integrate AI engines**: train LoRA/NN models, evaluate GNN classifier (AUROC ≥ 0.78).  
10. **Close‑loop validation**: run harnesses for lathe, mill, WEDM; compare round‑trip metrics (SFM ≥ 88 %, safety 100 %).  
11. **Watchdog regeneration**: Stop hook triggers `build-wiki-leaf-index.mjs` if index age > 12 h or lock contention.  
12. **Dedup pre‑flight** before adding new wiki entries (`dedup-preflight.mjs`).  
13. **Fail‑loud R12 pattern** wrap critical steps to throw JSON errors on silent failures.  
14. **Telemetry emission** after each engine run (duration, token count, success) to `metrics.log`.

## Tools to use
- **PRISM CLI**: `/checkin`, `/loop`, `/goal`, `/compact`, `/startup`, slot wrappers.  
- **Dispatchers / Engines**: `machineLiveDispatcher.ts`, `Fusion360LiveBridgeEngine`, `CAMDriveRecipeEngine`, `MillProgramCorpusEngine`, `RoadmapIntelligenceEngine`, `CAMConfidenceCalibrationEngine`, GNN classifier, `brain_recall` action, `U‑DISPATCHER‑MAP`.  
- **Scripts & Hooks**: `chat-slots.mjs`, `audit-roadmap-drift.mjs`, `slot-bind-enforce.mjs`, `code-path-resolver.mjs`, `nav-savings-ledger.mjs`, `exact-match.mjs`, `precompact-pending-guard.mjs`, `system-viz-query.mjs`, `retag‑tribal-backend-dev.mjs`, `loop-state.mjs`, `build-wiki-leaf-index.mjs`, `html-companion-guard.mjs`, `watchdog_stop_hook.mjs`.  
- **AI/ML**: Ollama (Qwen2.5‑VL 7B, other models), local Whisper, Qdrant vector store, PyMuPDF for PDF vectors.  
- **Version control & CI**: Git pathspec commits, atomic lock handling, Vitest/Jest runners, `esbuild`/`tsc`, cron creation (`CronCreate`), scheduled tasks.  
- **Observability**: system‑viz graph, token‑awareness sidecar, fleet‑reaper monitoring, GPU/utilization metrics, PSN synergy scores, telemetry logs.

## Recurring findings + bugs
- Dispatch detector false positives eliminated by comment stripping and whitespace rule.  
- Shared‑tree race & `.git/index.lock` stalls mitigated with slot worktrees and lock‑wait queue.  
- Token budget overflow triggers precompact guard; loops stop automatically if >64 % limit.  
- Service worker registration errors fixed by moving tests to correct directory.  
- UIA returns zero actionable nodes for CIMCO; switched to MSAA (11 accessibility nodes).  
- Pattern 6 missing detection noted for future regex improvement.  
- Encrypted PDFs skipped and logged.  
- Duplicate assets & line‑ending inconsistencies caused build failures; normalized CRLF/LF.  
- Orchestrator bridge wiring gaps: added tests for `WEDMJobOutcomeEngine`/`MachineConnectivityEngine`.  
- Hybrid summarizer fallback produced empty strings; added sanity check.  
- OOM on `regen-viz.mjs` resolved by increasing Node max old space size.  
- Duplicate cron triggers (~30) cancelled to prevent drift.  
- Embeddings stale due to Ollama cold start; watchdog will regen next Stop cycle.  
- Recall test returned empty set; leaf index missing entries, fixed via watchdog rebuild.  
- Rate‑limit spikes in OCR VLM calls addressed with timeout and pre‑warm.  
- Legacy RTK auto‑suggest noisy; replaced with rate‑limited prefix reminder.  
- HTML generation non‑idempotent; added `<meta prism-source-hash>` injection.  
- Memory docs exceed size limits; compression pending.
