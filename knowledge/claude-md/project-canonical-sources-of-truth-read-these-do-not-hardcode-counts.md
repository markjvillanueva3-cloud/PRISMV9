---
source: project
section: CANONICAL SOURCES OF TRUTH (READ THESE, DO NOT HARDCODE COUNTS)
slug: canonical-sources-of-truth-read-these-do-not-hardcode-counts
indexed_at: 2026-06-24T18:23:53.316Z
---

## CANONICAL SOURCES OF TRUTH (READ THESE, DO NOT HARDCODE COUNTS)

| Source | Purpose |
|--------|---------|
| `PRISM-INVENTORY-LATEST.md` | Live auto-updated counts (engines, dispatchers, actions, hooks, scripts). Regenerated on every SessionStart. |
| `mcp-server/data/state/BASELINE_INVENTORY.json` | Schema-versioned baseline snapshot for anti-regression. |
| `mcp-server/data/docs/gsd/GSD_QUICK.md` | Session lifecycle — which hooks auto-fire on SessionStart / UserPromptSubmit / Stop. |
| `mcp-server/data/docs/gsd/DEV_PROTOCOL.md` | Full dev protocol with command-bridge and shared-directive links. |
| `mcp-server/data/docs/ENGINE_DIGEST.md` | 1-line descriptions for every engine — check BEFORE creating. |
| `mcp-server/data/docs/DISPATCHER_DIGEST.md` | Dispatcher index with action counts. |
| `mcp-server/data/docs/DIRECTORY_DIGEST.md` | File-system digest (215 directories with purposes). |
| `state/shared/PRISM-SELF-AWARENESS-DIRECTIVE.md` | JM Die paths, AI capability inventory, multi-agent patterns. |
| `state/shared/PRISM_SHARED_INDEX_SURFACES.md` | Shared indexes for cross-agent search-first discipline. |
| `state/shared/MILESTONE_PROGRESS.md` / `.json` | **Generated** delta of milestone-envelope `status` vs git-log reality. Shows shipped/pending per unit, flags drift (envelope says `not_started` but units already shipped). Audit chats: subtract `shipped` here from your gap lists before flagging missing. Regenerate via `node scripts/build-milestone-progress.mjs`. |
| `state/shared/BUILD_STATE.md` / `.json` | **Auto-injected** snapshot of BUILT vs NEEDS_WIRING vs NEEDS_BUILDING vs NEEDS_FRONTEND. Cross-references engines/dispatchers/wiki/frontends. The `build-state-inject` hook fires this onto every SessionStart and on keyword-gated UserPromptSubmits. Regenerate via `node scripts/build-state-snapshot.mjs`. Disable inject with `PRISM_BUILD_STATE_INJECT=0`. |
| `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` (+ `.md` atlas) | The 3 most-important resource roots (`H:/PRISM/resources`, `H:/PRISM/JM DIE`, `H:/PRISM/Docustrata`) - every galaxy PATHS.md carries a marked pointer (operator directive 2026-05-30). Pathway = root + its own index; never re-OCR Docustrata (search `manifest.json` + `.index/`). Re-wire all galaxies: `node scripts/wire-galaxies-to-resource-roots.mjs`. Wiki [[critical-resource-roots]]; memory reference_critical_resource_roots_2026_05_30. |
| `mcp-server/data/vendor-catalog-db/` (manifest + tables) | Persisted vendor catalog corpus (Charlie's VENDOR-NETWORK-MS0): 425 vendors + 77 catalog-vendors + 131 SFC-maker pointers + JM procurement ($4.91M). Consolidated from gitignored `state/shared/quoting/` via `node scripts/build-vendor-catalog-db.mjs` (re-run after Charlie regenerates). Metadata only — oscar owns SFC cutting-data `.ts`. Wiki [[vendor-catalog-db]]; memory reference_vendor_catalog_db_2026_05_31. |
| `state/shared/RECENT-SHIPMENTS-<date>.md` | **Inbox** of milestones shipped recently that do NOT yet have a CLAUDE.md summary section. Sister pattern to `## Recent regressions`. A golf-slot chat batches them into full sections on a weekly drain cadence. Current file: `state/shared/RECENT-SHIPMENTS-2026-05-18-19.md`. |
- 2026-06-24 | **[MAIN-FORCE] [SFC-FRONTEND]/U-SFC-MILL-SURFACE-FINISH (slot:oscar): implement MillSurfaceFinishPanel helpers (28 red->green) + fix whole-...** | observed-in: ea24d9cee | fix: see commit | verify: `git -C H:/prism show ea24d9cee`
- 2026-06-24 | **[MAIN-FORCE] [CAD-LEARNING-AI]/U-TRIBAL-DRAIN-TASK-FIX (slot:india): rename $args->$taskArgs (PS automatic-var shadow) + fix MaxPdfs doc ...** | observed-in: 454cf4127 | fix: see commit | verify: `git -C H:/prism show 454cf4127`
- 2026-06-24 | **[MAIN-FORCE] [BACKEND-INTEGRITY]/U-FLEET-DISPATCHER-DRIFT-REMEDIATION (slot:xray): fix 25 dispatcher->engine method-drift actions + patch...** | observed-in: d8b102291 | fix: see commit | verify: `git -C H:/prism show d8b102291`
- 2026-06-24 | **[MAIN-FORCE] [CAD-LEARNING-AI]/U-BPA-WRITER-CONSOLIDATE-ALL-FIX (slot:india): drop now-unused mkdirSync import in print-to-cam** | observed-in: 23ce35bd4 | fix: see commit | verify: `git -C H:/prism show 23ce35bd4`
- 2026-06-24 | **[MAIN-FORCE] [POST-PROCESSOR]/U-PP-BACKPLOT-G0NORM (slot:echo): fix dead backplot gouge + rapid-into-material detection (G0-normalization...** | observed-in: 8f4787223 | fix: see commit | verify: `git -C H:/prism show 8f4787223`
- 2026-06-24 | **[MAIN-FORCE] [HERMES-UTIL]/U-HERMES-VERIFIED-TIER-WIRE (slot:alpha): wire tiered verified-offload into the canonical ollama-offload.mjs C...** | observed-in: a6a6243a2 | fix: see commit | verify: `git -C H:/prism show a6a6243a2`
- 2026-06-24 | **[MAIN-FORCE] [QUOTING]/U-COSTPAGE-SHAPE (slot:charlie): fix CostEstimatorPage dead-panel -- route shape adapter + {result} envelope unwrap** | observed-in: 940599eeb | fix: see commit | verify: `git -C H:/prism show 940599eeb`
- 2026-06-24 | **[MAIN-FORCE] [TEST-INTEGRITY]/U-RIGOR-JUDGE-CLI-R9 (slot:alpha): R9 coverage for the AI judge fallback ladder -- make callJudge callers-i...** | observed-in: 1a0177736 | fix: see commit | verify: `git -C H:/prism show 1a0177736`
- 2026-06-24 | **[MAIN-FORCE] [TEST-INTEGRITY]/U-STOPGATE-R9 (slot:alpha): land stop_on_failing_tests stale-green freshness block (net-new vs HEAD) + extr...** | observed-in: ab2b3bc84 | fix: see commit | verify: `git -C H:/prism show ab2b3bc84`
- 2026-06-24 | **[MAIN-FORCE] [TEST-INTEGRITY]/U-RIGOR-JUDGE-HERMES-MODEL-FIX (slot:alpha): fix ollama --model forwarded to hermes fallback (HTTP 400) + o...** | observed-in: 02641a95c | fix: see commit | verify: `git -C H:/prism show 02641a95c`
- 2026-06-23 | **[MAIN-FORCE] [PDF-TRIBAL-HERMES]/U-TRIBAL-DRAIN-LOCK-PIDLIVE (slot:zulu): fix dead-lock that froze the overnight drain -- PID-liveness + ...** | observed-in: 5dc91d9cb | fix: see commit | verify: `git -C H:/prism show 5dc91d9cb`
- 2026-06-23 | **[MAIN-FORCE] [CAM-PARITY-AGI]/U-XRAY-POWERMILL-RECOMMEND-WIRE-ENGINE (slot:xray): land the PowerMill engine fix DROPPED by 134b0e74bd's l...** | observed-in: 9e755f940 | fix: see commit | verify: `git -C H:/prism show 9e755f940`
- 2026-06-23 | **[MAIN-FORCE] [CAD-LEARNING-AI]/U-CAD-LEARN-STATS-RATE-FIX (slot:india): cad_learning_stats byCategory credited 0 successes on pass -> inf...** | observed-in: fd78507a7 | fix: see commit | verify: `git -C H:/prism show fd78507a7`
- 2026-06-23 | **[MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-DEADPIXEL-CAPSAFE (slot:sierra): fix dead-pixel-guard raw 875MB-graph utf8 parse (string-cap crash class)** | observed-in: 42bf1c598 | fix: see commit | verify: `git -C H:/prism show 42bf1c598`
- 2026-06-23 | **[MAIN-FORCE] [SFC-FRONTEND]/U-SFC-FE-LATHE-G71-ASYNC (slot:oscar): fix manual-lathe G71 test async-timing** | observed-in: 06c187cc9 | fix: see commit | verify: `git -C H:/prism show 06c187cc9`
- 2026-06-23 | **[MAIN-FORCE] [CAD-DRAW-MAX]/U-XRAY-CORPUS-TOLERANCE-SHAPE-FIX (slot:xray): fix 16 tsc errors -- cad-validation-corpus callouts to real To...** | observed-in: 91c5d7c98 | fix: see commit | verify: `git -C H:/prism show 91c5d7c98`
- 2026-06-23 | **[MAIN-FORCE] [SFC-FRONTEND]/U-SFC-FE-UNIT-TOGGLE-TEST (slot:oscar): fix over-strict tool-diameter query in inch/metric test** | observed-in: 4cc78761a | fix: see commit | verify: `git -C H:/prism show 4cc78761a`
- 2026-06-23 | **[MAIN-FORCE] [SFC-FRONTEND]/U-SFC-FE-TEST-OVERSTRICT (slot:oscar): fix 2 over-strict getByText->getAllByText in CalculatorPage tests** | observed-in: e1a5c5723 | fix: see commit | verify: `git -C H:/prism show e1a5c5723`
- 2026-06-23 | **[MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-RAW-GRAPH-PARSE-GUARD (slot:sierra): regression-lock the 875MB-graph string-cap crash class** | observed-in: 1ffd8c229 | fix: see commit | verify: `git -C H:/prism show 1ffd8c229`
- 2026-06-23 | **[MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-ROLLBACK-PLAN-WIRE (slot:india): fix dark rollback_plan_build -> real positional planRollback/planAndV...** | observed-in: bb5605b55 | fix: see commit | verify: `git -C H:/prism show bb5605b55`
- 2026-06-23 | **[MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-MIT-KNOWLEDGE-QUERY-WIRE (slot:india): fix dark mit_course_knowledge_query -> searchAlgorithms/searchC...** | observed-in: 9c4e94ff9 | fix: see commit | verify: `git -C H:/prism show 9c4e94ff9`
- 2026-06-23 | **[MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-SAMPLING-PLAN-WIRE (slot:india): fix dark sampling_plan_generate -> mil1916/aoqlPlan standard router (...** | observed-in: d1a97a3a4 | fix: see commit | verify: `git -C H:/prism show d1a97a3a4`
- 2026-06-23 | **[MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-SMARTTOOL-ORCH-WIRE (slot:india): fix dark smart_tool_select -> real selectToolOrchestrated (was mis-f...** | observed-in: 29af45fc1 | fix: see commit | verify: `git -C H:/prism show 29af45fc1`
- 2026-06-23 | **[MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-UNCERTAINTY-PIPELINE-WIRE (slot:india): fix dark uncertainty_pipeline_run -> real propagate (4th/last ...** | observed-in: 82aa392d6 | fix: see commit | verify: `git -C H:/prism show 82aa392d6`
- 2026-06-23 | **[MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-WETRUN-PILOT-WIRE (slot:india): fix dark wet_run_pilot_orchestrate -> real pilotPromotionReadiness (3r...** | observed-in: 62661e33f | fix: see commit | verify: `git -C H:/prism show 62661e33f`
> _Recent-commits log moved to [`state/shared/CLAUDE-MD-COMMIT-LOG-ARCHIVE.md`](state/shared/CLAUDE-MD-COMMIT-LOG-ARCHIVE.md) (token-injection slim, U-ALPHA-CLAUDEMD-SLIM 2026-06-11) -- it was a raw `git log` with no doctrine value. Full history: `git log`._
| `knowledge/memories/feedback/feedback_psn_definition.md` | **PSN canonical 11-leg taxonomy** (Obsidian brain · PRISM OS · Wiki · Memories · Tribal · System Viz · Engines · Algorithms · Formulas · NN/GNN · PRISM AI). Every PSN-aware tool refers here for the leg list + invocation paths + health signals. Created 2026-05-24 (slot:golf) to fix broken `[[feedback_psn_definition]]` pointer in MEMORY.md. |
| `knowledge/memories/feedback/feedback_commit_to_slot_worktree.md` | **Slot-worktree commit discipline** — every chat commits in `H:/prism-slot-<nato>` on `slot/<nato>` branch, NOT shared `H:/prism`. Shared-tree commits get absorbed into peer commits (attribution lost — 3 absorbed in a single golf session 2026-05-24). Enforcement hooks `PRISM_WORKTREE_ROUTE_ENABLE` / `_GIT_ADD_LANE_ENABLE` / `_MAINTREE_WRITE_BLOCK_ENABLE` arm once `chat-slots.json[slot].branch` starts with `slot/`. |

If you need a number, **read the file**. Do not rely on counts baked into this document — they rot within days.
