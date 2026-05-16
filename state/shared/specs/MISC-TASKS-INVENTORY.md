# MISC-TASKS INVENTORY — Orphaned Incomplete Work

> Generated 2026-05-16T13:20:54.632Z · schemaVersion 1.0.0
> Orphaned incomplete work — identified across PRISM chats, never finished, never
> formalized into a roadmap unit or milestone envelope. **Advisory — human-verify**
> each item before promoting it into the roadmap.

## Stats

- Raw scanned items: **522** (10-agent parallel scan)
- After dedupe: **417**
- Excluded (looks completed): **20**
- Excluded (already in roadmap/envelope): **79**
- **Final misc tasks: 318**

By domain: infra=140 · cam=54 · hooks=34 · lathe=24 · cad=21 · wedm=15 · docs=12 · other=12 · mill=6

By source type: transcript=147 · handoff=89 · plan=38 · spec=19 · loop-state=11 · unknown=8 · resume-post=3 · chat-bus=3

## Misc tasks

| ID | Conf | Domain | Title | Unit/MS | Source | Seen |
|----|------|--------|-------|---------|--------|------|
| MISC-001 | 0.85 | cam | Complete U-CAM-HM-SKILLS-WIRE-01: camDispatcher.ts in INCONSISTENT/BROKEN state | CAM-EXHAUST-MS0/U-CAM-HM-SKILLS-WIRE-01 | handoff | 1x |
| MISC-002 | 0.85 | cam | Continue MS-PRINT-PROGRAM-LOOP Track D U-PPL-B2: wire program_optimize for mill+lathe | MS-PRINT-PROGRAM-LOOP/U-PPL-B2 | handoff | 1x |
| MISC-003 | 0.85 | hooks | Wire action-triple-sync.mjs PreToolUse hook into settings.json | W2-A | transcript | 1x |
| MISC-004 | 0.85 | infra | U-DOCKER-HOOK-BROKER (Tier 1) — persistent prism-hooks container holding 50+ hooks warm; n | U-DOCKER-HOOK-BROKER | spec | 1x |
| MISC-005 | 0.85 | infra | U-XPROC-T10-PRISM-AI-WIRE: backfill prism_ai dual-wiring for all 4 Tier-10 fusion engines  | U-XPROC-T10-PRISM-AI-WIRE | transcript | 1x |
| MISC-006 | 0.85 | infra | Wire StripeBillingEngine into businessDispatcher (completely orphaned engine) | U-BILL1 | transcript | 1x |
| MISC-007 | 0.85 | lathe | Finish Task #4 turning_cost_estimate: write LatheCostPanel.test.tsx web test | CALC-RESTORE-MS0 | handoff | 2x |
| MISC-008 | 0.82 | infra | Fix getStore() data-loss bug — cache store instances so flush does not create empty InMemo | — | transcript | 1x |
| MISC-009 | 0.82 | infra | Fold meta.exhaustiveAudit into merge-augmentations.mjs — data on disk, code not yet wired  | — | transcript | 1x |
| MISC-010 | 0.80 | cam | Build CAM-EXHAUST-MS3-04 hyperMILL setup module (9 ops, ~110 params) | CAM-EXHAUST-MS3-04 | handoff | 1x |
| MISC-011 | 0.80 | cam | Continue Multus PRISM-flag verifier sweep: U-PPGMU14 ToolBreakDetect + U-PPGMU15 Stability | CAM-EXHAUST-MS0/U-PPGMU14 | handoff | 1x |
| MISC-012 | 0.80 | cam | PPG-HARDEN U-PPGH01..U-PPGH05 — 28 pre-existing HurcoV11MillMasterPostEngine sync-path tes | PPG-HARDEN | resume-post | 2x |
| MISC-013 | 0.80 | cam | verify_tier wiring for master_post_* cases in camDispatcher (DEFERRED to U-PPGM17d) | U-PPGM17d | transcript | 2x |
| MISC-014 | 0.80 | docs | F2 U-HIGHLIGHTS-ONLY — SKIPPED: PDFKnowledgeIngestEngine.ts does not exist; spec says 'mod | U-HIGHLIGHTS-ONLY | chat-bus | 1x |
| MISC-015 | 0.80 | infra | Activate machine resolver calls in 7 remaining pipelines (U-ARCH3) + wire resolveMachine i | U-ARCH3 | transcript | 1x |
| MISC-016 | 0.80 | infra | Complete persistence migration — U-PERS3 5/6 engines (InvoicingEngine, TimeClockEngine, Ge | U-PERS3 | transcript | 1x |
| MISC-017 | 0.80 | infra | fix all tsc errors + bugs + conflicts in PRISM (fork tsc-fix worktree) | — | loop-state | 1x |
| MISC-018 | 0.80 | infra | GIT-TREE-REMEDIATION-MS0 — 23-unit git-tree cleanup roadmap (U-GC-00..22); 43GB .git, cad- | GIT-TREE-REMEDIATION-MS0 | spec | 3x |
| MISC-019 | 0.80 | infra | orphan-rescue: wire unwired engines from ORPHAN-INVENTORY punch list | — | loop-state | 1x |
| MISC-020 | 0.80 | infra | Resolve open follow-ups U-PTR02 (auto_wiring_scan __filename esbuild clash) + U-PTR03 (ope | U-PTR02 | transcript | 1x |
| MISC-021 | 0.80 | infra | U-FORGE-AUDIT-OMNISCIENT — upgrade /forge-audit to conductor emitting audit-overlay.json ( | U-FORGE-AUDIT-OMNISCIENT | spec | 1x |
| MISC-022 | 0.78 | cad | Commit and complete remaining cost panels — Panel 2 (WireEdmCostBreakdownPanel) + Panel 3  | — | transcript | 1x |
| MISC-023 | 0.78 | cam | NX post-processor: sketch_fillet / sketch_chamfer emit 'TODO: implement NXOpen equivalent' | — | transcript | 1x |
| MISC-024 | 0.78 | cam | Roku-Roku HSM post-processor engine never built (no RokuRoku*PostEngine.ts) | — | unknown | 1x |
| MISC-025 | 0.78 | infra | Runtime-validate filter.order to fix SQL injection (P0-3, 1-line fix) + make query() throw | — | transcript | 1x |
| MISC-026 | 0.78 | mill | Finish MILL-BATCH3 dispatcher wiring (6 physics/RL/pattern engines) — ACTIONS enum added b | MILL-BATCH3 | transcript | 1x |
| MISC-027 | 0.75 | cad | Auto-Redaction / Blueprint redaction engine for print sharing (not yet built) | — | transcript | 1x |
| MISC-028 | 0.75 | cad | Fusion360 / hyperCAD CAD function-index: 7-8 future modules deferred to U-CAD-FIDX-INV-02. | U-CAD-FIDX-INV-02 | transcript | 1x |
| MISC-029 | 0.75 | cam | PPG-WIRE-MS5/U-PPGW-OkumaMill-Tribal — Okuma mill tribal knowledge (only ~6 inline OSP-mil | U-PPGW-OkumaMill-Tribal | resume-post | 1x |
| MISC-030 | 0.75 | cam | Structured-tool API for stickout_mm population in MillOperation path (deferred to U-PPGH11 | U-PPGH11 | transcript | 1x |
| MISC-031 | 0.75 | hooks | hook-error fix closeout + system-viz master-index codification | — | loop-state | 1x |
| MISC-032 | 0.75 | hooks | P1-A stop-regression-bundle — BUILT + 6/6 tested but NOT wired into settings.json (folds 1 | — | chat-bus | 1x |
| MISC-033 | 0.75 | hooks | P1-A: atomically wire stop-regression-bundle.mjs (10 Stop gates folded, built+tested NOT w | — | handoff | 1x |
| MISC-034 | 0.75 | infra | Apply 3 stable-session-id.mjs patches (GAP1/2/3) + write HANDOFF-PIPELINE-AUDIT-2026-05-09 | — | handoff | 1x |
| MISC-035 | 0.75 | infra | Build TRIBAL-GRAPH-MS0 pipeline: clusters/embedding libs + tribal-graph-build.mjs orchestr | TRIBAL-GRAPH-MS0 | handoff | 4x |
| MISC-036 | 0.75 | infra | Continue tsc-fix Phase B: verify 4 build-doctor agent edits in H:/prism-tsc-fix, commit +  | — | handoff | 1x |
| MISC-037 | 0.75 | infra | Continue XPROC-NEURAL-OPTIMIZE-MS0 NN-B: LR warmup + cosine decay (then NN-C/NN-D) | XPROC-NEURAL-OPTIMIZE-MS0/U-NN-OPT-B | handoff | 1x |
| MISC-038 | 0.75 | infra | Continue XPROC-NEURAL-OPTIMIZE-MS0 Phase 3 U-NN-LOOP01: finish FeedbackBusEngine test + di | XPROC-NEURAL-OPTIMIZE-MS0/U-NN-LOOP01 | handoff | 1x |
| MISC-039 | 0.75 | infra | Finish PRISM-STAB-MS0 U-B1: schemas+dispatcher edited but no test, no commit | PRISM-STAB-MS0/U-B1 | handoff | 1x |
| MISC-040 | 0.75 | infra | INFRA-NEURAL-LEDGER-MS1 P0-U04 FeedbackBusEngine never shipped | INFRA-NEURAL-LEDGER-MS1/P0-U04 | transcript | 1x |
| MISC-041 | 0.75 | infra | PRISM-STAB-MS0 — 15-unit stabilization roadmap (A1-A5/B1-B6/C1-C4: git-sync, orphan reaper | PRISM-STAB-MS0 | spec | 1x |
| MISC-042 | 0.75 | infra | U-INTENT-WIRE: wire prism_session:classify_intent dispatcher action with Zod schema + E2E  | U-INTENT-WIRE | handoff | 1x |
| MISC-043 | 0.75 | lathe | Continue MACRO-PROGRAM-PIPELINE-MS0: U5 per-machine post, U6 bulk fan-out + Stop hook, U7  | MACRO-PROGRAM-PIPELINE-MS0/U5 | handoff | 1x |
| MISC-044 | 0.75 | lathe | LatheAGIEngine processFeedback() has 3 TODO stubs (neural weights, knowledge graph, confid | — | transcript | 1x |
| MISC-045 | 0.74 | lathe | Complete lathe calculator panels M1 Session 2 (U-CALC10-15: Grooving, Hard Turning, Tool L | U-CALC10-15 | transcript | 1x |
| MISC-046 | 0.74 | lathe | Verify MS5 hard-turning capstone on disk (HardTurningCapstoneEngine, SurfaceIntegrityGateH | MS5 | transcript | 1x |
| MISC-047 | 0.72 | cam | ~60 lathe master-post tribal tips identified but never wired into post generator | — | unknown | 1x |
| MISC-048 | 0.72 | cam | Pick up U-LPR-ADOPT-CAM-MILLTURN — live-tool legs need a mill-side bridge that does not ye | U-LPR-ADOPT-CAM-MILLTURN | transcript | 1x |
| MISC-049 | 0.72 | cam | print_to_inventor_hsm dispatcher action not yet wired + deleted dispatcher-wiring tests ne | — | transcript | 1x |
| MISC-050 | 0.72 | hooks | action-triple-sync.mjs PreTool Edit guard built but NOT yet wired into settings.json | — | transcript | 1x |
| MISC-051 | 0.72 | infra | Complete system-viz audit slice 1 (PRISM main, 586,903 files / 262.6GB) — still pending af | — | transcript | 1x |
| MISC-052 | 0.72 | infra | M1 MaterialDatabaseEngine -> constants.ts canonical refactor deferred to U-AWR16 | U-AWR16 | transcript | 1x |
| MISC-053 | 0.72 | infra | SkillTierRegistryEngine built but NOT YET WIRED to a dispatcher | — | transcript | 1x |
| MISC-054 | 0.72 | lathe | Appendix B Taylor C value 300->350 correction deferred (lathe physics constant fix) | — | transcript | 1x |
| MISC-055 | 0.72 | wedm | Complete FORGE Phase 6C — WEDM post-router (plan documented in handoff, commit blocked by  | — | transcript | 1x |
| MISC-056 | 0.70 | cad | Complete BLUEPRINT-OCR-TRAINING-MS1 MS1-U2 prism-ocr-engine monolith rescue | BLUEPRINT-OCR-TRAINING-MS1/MS1-U2 | handoff | 1x |
| MISC-057 | 0.70 | cad | Docustrata print extraction — clean up duplicate-similar customer categories, file CNC/CAD | — | transcript | 1x |
| MISC-058 | 0.70 | cad | Fusion360 add-in HTTP server (Architecture B, 14-endpoint) deferred to next milestone | U-FUS-API01 | transcript | 1x |
| MISC-059 | 0.70 | cad | Ship Esprit 6th tier-1 CAM bridge (CAD-FIDX-ESP-01..08, 8 commits) | CAD-FIDX-ESP-01 | handoff | 1x |
| MISC-060 | 0.70 | cad | SOLIDWORKS-FIDX: CAD Function Index Engine (8 modules, ~1010 params) | SOLIDWORKS-FIDX | plan | 1x |
| MISC-061 | 0.70 | cam | Adopt CAMKernelOrchestratorEngine (cam_turn + cam_simulate) — 4th cam-side NEEDS_BRIDGE en | U-LPR-ADOPT-CAM | transcript | 1x |
| MISC-062 | 0.70 | cam | CALC-OPS-MS0: full Phases 0-5 (calculator + Mill/Lathe/WEDM Studios + PPG) | CALC-OPS-MS0 | loop-state | 1x |
| MISC-063 | 0.70 | cam | Commit U-PPGW-HSMDwell-Wiring (shipped uncommitted) + NURBSFit/RTCP/AdvancedReposition fol | PPG-WIRE-MS5/U-PPGW-HSMDwell-Wiring | handoff | 1x |
| MISC-064 | 0.70 | cam | Continue Multus B250II HurcoV11/Okuma post sync work — U-PPGMU07 Taylor cross-check + U-PP | CAM-EXHAUST-MS0/U-PPGMU07 | handoff | 1x |
| MISC-065 | 0.70 | cam | Esprit (6th tier-1 CAM bridge) deferred per user Path-1 election | — | transcript | 1x |
| MISC-066 | 0.70 | cam | PostProcessorMetaLearningEngine not yet wired to dispatcher | — | transcript | 1x |
| MISC-067 | 0.70 | docs | docustrata extract + customer dedup + CNC/CAD/CAM org + orig/enhanced programs | — | loop-state | 1x |
| MISC-068 | 0.70 | docs | docustrata-pipeline: delta-detector + orchestrator | — | loop-state | 1x |
| MISC-069 | 0.70 | docs | Scrutiny-gate doc-sync: memory.db/tribal-embed-index still says Codex+Gemini+Opus | INFRA-SCRUTINY-FIX | unknown | 1x |
| MISC-070 | 0.70 | hooks | audit ladder continuation: ship queued #4 loop-iter-start.mjs + #7 goal evidence ship-repo | — | loop-state | 1x |
| MISC-071 | 0.70 | hooks | HC-5 drift-guard --check-drift wired as per-commit hook (left for alpha's lane) | — | transcript | 1x |
| MISC-072 | 0.70 | hooks | Investigate why PRISM_GIT_ADD_LANE_DISABLE=1 kill switch is ignored by git-add-lane-guard | — | handoff | 1x |
| MISC-073 | 0.70 | hooks | Migrate 4 ad-hoc settings-restore scripts to route through safeSettingsEdit + add guard fo | — | handoff | 1x |
| MISC-074 | 0.70 | hooks | Stop hook asserting MERGE-CANDIDATES.json rank order matches actual merge sequence (defens | — | transcript | 1x |
| MISC-075 | 0.70 | infra | Commit ready-but-blocked indexes EXTRACTION_INVERSE_INDEX (13 extractions, 719 tips) + 3 A | Phase 0.7 | transcript | 1x |
| MISC-076 | 0.70 | infra | Continue INTEL-OLLAMA-OBSIDIAN-MS0 U-CONSENSUS-DRIFT-DASHBOARD-SECTION (3 files ready, nee | INTEL-OLLAMA-OBSIDIAN-MS0/U-CONSENSUS-DRIFT-DASHBOARD-SECTION | handoff | 1x |
| MISC-077 | 0.70 | infra | Continue OBSIDIAN-COMPOUND-MS0: U-WIKILINK-OLLAMA, U-RECALL-COUNTER, U-SKILL-TELEMETRY, U- | OBSIDIAN-COMPOUND-MS0 | handoff | 1x |
| MISC-078 | 0.70 | infra | Continue TSC-CLEANUP-MS0 — camUIElementSchema + 18 3-error files + architect-class WireEDM | TSC-CLEANUP-MS0 | handoff | 3x |
| MISC-079 | 0.70 | infra | Finish Track A (XML/cutout/history) of stateless-weaving-beacon plan + Track C scripts + T | — | handoff | 1x |
| MISC-080 | 0.70 | infra | Finish U-VIZ-PERF simple.html fix — wrap top-level await in async IIFE | CAD-FUSION-LIVE-MS0/U-VIZ-PERF | handoff | 1x |
| MISC-081 | 0.70 | infra | KnowledgeIngestEngine tests + ingest-pdfs.mjs driver + knowledgeDispatcher ingest_pdf wiri | — | transcript | 1x |
| MISC-082 | 0.70 | infra | OCR enhancement: install eDOCr+PaddleOCR, benchmark vs Tesseract on 3893-miss subset | — | handoff | 1x |
| MISC-083 | 0.70 | infra | Ollama Anthropic<->OpenAI translation proxy not yet built (punted to NIM path on 4080 PC) | — | transcript | 1x |
| MISC-084 | 0.70 | infra | orphan-rescue: wire unwired engines from BUILD_STATE.NEEDS_WIRING into dispatchers | OBSIDIAN-PRISM-OS-MS0 | loop-state | 3x |
| MISC-085 | 0.70 | infra | P17-U03: surface PRISMLoRAAdapterEngine + IncrementalLearningEngine through prism_ai (left | INTEL-OLLAMA-OBSIDIAN-MS0/P17-U03 | transcript | 1x |
| MISC-086 | 0.70 | infra | PDF classifier Tier 5 OCR pass deferred to a separate run (needs_ocr=true residual) | — | transcript | 1x |
| MISC-087 | 0.70 | infra | SYSTEM-SYNERGY-AUDIT Track I — 4 forge5 phantom-tool scripts (viz-completeness-check, viz- | — | spec | 1x |
| MISC-088 | 0.70 | infra | Tribal node-binder sub-project C — keystone schema + binder + tribal-context-inject PreToo | — | spec | 1x |
| MISC-089 | 0.70 | infra | Wire LLMEngine.ts live API call into LocalModelOrchestrator (single-line drop-in deferred  | U-LLM5 | transcript | 1x |
| MISC-090 | 0.70 | infra | Wire WiringPotentialEngine — C5 Watchdog-Wiring integration (CLEANUP-MS0) | CLEANUP-MS0/U-CLEANUP-C5 | handoff | 1x |
| MISC-091 | 0.70 | infra | XPROC-NEURAL-CONNECT-MS0: pick CN11 (EWC consolidation), CN12 (RL bridge), or CN13 (wire 1 | XPROC-NEURAL-CONNECT-MS0/CN11 | handoff | 1x |
| MISC-092 | 0.70 | lathe | Continue LATHE wiring sweep: LATHE-BATCH7 — wire 6 unwired LoRA engines in turningDispatch | — | handoff | 1x |
| MISC-093 | 0.70 | lathe | LATHE-PROD-READY-MS0/U-LPR-WETRUN-WIRE: expose WetRunStateMachineEngine via MCP (14 action | LATHE-PROD-READY-MS0/U-LPR-WETRUN-WIRE | plan | 1x |
| MISC-094 | 0.70 | lathe | LatheOrchestrationEngine has 25 stubs; CodingCopilotEngine:399 emits '// TODO: implement'  | — | transcript | 1x |
| MISC-095 | 0.70 | lathe | LathePostProcessForcesEngine: no dispatcher wiring yet — deferred to U-LSR22 consumer | U-LSR22 | transcript | 1x |
| MISC-096 | 0.70 | lathe | TRAINING-LEARNING-MS0 remaining: U-TL-U5 DOMAIN-MATCHERS, U-TL-U6 CONTINUOUS-LEARNING, U-T | TRAINING-LEARNING-MS0/U-TL-U5 | handoff | 1x |
| MISC-097 | 0.70 | mill | Backfill 6 BATCH1 missing schemas (mill_helical_calc etc.) | — | transcript | 1x |
| MISC-098 | 0.70 | wedm | 14 failing WEDM test files requiring engine feature builds — deferred to fresh-context ses | — | transcript | 1x |
| MISC-099 | 0.70 | wedm | Wire 5 WEDM dispatcher actions (wedm_drift_detect, wedm_failsafe_from_clearance, wedm_faul | — | transcript | 1x |
| MISC-100 | 0.68 | hooks | Harness hardening M3: bundle 30 *-Stop hooks + 32 SessionStart hooks deferred to a focused | — | transcript | 1x |
| MISC-101 | 0.65 | cad | CAD feature-tree component still pending implementation (only CAD->STEP pipeline functiona | — | transcript | 1x |
| MISC-102 | 0.65 | cad | MS1-U1 deferred follow-ups: dispatcher round-trip E2E test, POSITION_DIM_3D_FACTOR central | BLUEPRINT-OCR-TRAINING-MS1/MS1-U1 | handoff | 1x |
| MISC-103 | 0.65 | cam | 7 hyperMILL engines not yet wired to dispatchers (HyperMillMultiAxisEngine, HyperMillCycle | — | transcript | 1x |
| MISC-104 | 0.65 | cam | CloudCAMIndexerEngine not yet wired (cloud CAM history not indexed — learning pipeline gap | — | transcript | 1x |
| MISC-105 | 0.65 | cam | Continue PPG-HARDEN: U-PPGH02 HurcoV11 aggressiveness levels (5 stale tests) | PPG-HARDEN/U-PPGH02 | handoff | 1x |
| MISC-106 | 0.65 | cam | Continue PPG-MS0 Sprint 1: U-PPGM05 round-trip integration test + U-PPGM06 docs + U-PPGM11 | PPG-MS0/U-PPGM05 | handoff | 1x |
| MISC-107 | 0.65 | cam | HM-REV: hyperMILL Full Integration Roadmap (12 milestones, 58 units) | HM-REV | plan | 1x |
| MISC-108 | 0.65 | cam | hyperMILL track follow-up modules MS3-05 process_planning, MS3-06 2d_operations, MS3-07 MA | CAM-EXHAUST-MS3-05 | handoff | 1x |
| MISC-109 | 0.65 | cam | Material DB integration + E2E regression matrix DEFERRED (invasive toolpath planner change | — | transcript | 1x |
| MISC-110 | 0.65 | docs | doc-sync auto-fix mode: '// TODO: Actually run generators' — auto-fix never actually regen | — | transcript | 1x |
| MISC-111 | 0.65 | hooks | handoff-staleness-check.mjs — SessionStart hook diffing RESUME-named milestones against on | — | spec | 1x |
| MISC-112 | 0.65 | hooks | Restore Gap3 auto-resume /checkin injection (peer-overwrote) + commit precompact-release-s | AUTOCOMPACT-AUTONOMOUS-MS0/U-AAM02 | handoff | 1x |
| MISC-113 | 0.65 | hooks | Start P16-U03: merge top-5 hooks from prism-intel-p8 into canonical .claude/hooks | INTEL-OLLAMA-OBSIDIAN-MS0/P16-U03 | handoff | 1x |
| MISC-114 | 0.65 | hooks | Triage 14 dangling hook refs in settings.json (AUTOCOMPACT-AUTONOMOUS-MS0 wiring audit) | AUTOCOMPACT-AUTONOMOUS-MS0 | handoff | 1x |
| MISC-115 | 0.65 | hooks | Wire slot-fleet hooks: session-start-claim-slot.mjs + stop-release-slot.mjs need settings. | — | handoff | 1x |
| MISC-116 | 0.65 | infra | 6 Measurement & QC engines not created — CMMImportEngine/CMMHistoryEngine/SurfaceMeasureEn | — | transcript | 1x |
| MISC-117 | 0.65 | infra | Docker Tiers 2-4 — MCP server consolidation + agent isolation containers + TSserver pen, d | — | spec | 1x |
| MISC-118 | 0.65 | infra | Fix generate-system-viz.mjs coverage discrepancy (hardcoded domainsBuiltIn vs derivation) | — | handoff | 1x |
| MISC-119 | 0.65 | infra | Fix VariabilityEnvelopeEngine.createDefaultEnvelope non-monotone default (divide-by-zero b | — | handoff | 1x |
| MISC-120 | 0.65 | infra | INFRA Phase 1 Completion: Data Foundation (5 units, registry seeding to Postgres) | INFRA-P1 | plan | 1x |
| MISC-121 | 0.65 | infra | Land Batch 5 unwired-engine wiring (EmbeddingGuard/Filter/SemanticAssetIndex) — input shap | — | transcript | 1x |
| MISC-122 | 0.65 | infra | Phase15-huge OCR pass + re-run join pipeline + ingest via blueprint_ingest_phase15 | — | handoff | 1x |
| MISC-123 | 0.65 | infra | Post system-viz slice results via agent-coordination.mjs — skipped due to memory pressure  | — | transcript | 1x |
| MISC-124 | 0.65 | infra | scrutiny-ledger.test.mjs not in vitest include glob (never runs in CI) | — | unknown | 1x |
| MISC-125 | 0.65 | infra | SYSTEM-SYNERGY-AUDIT Track H — 8 synergy-edge units (tribal->wiki promote, viz tribal/agen | — | spec | 1x |
| MISC-126 | 0.65 | infra | U-KAR19 KnowledgeGraph integration deferred (Karpathy-discipline milestone) | U-KAR19 | transcript | 1x |
| MISC-127 | 0.65 | infra | U-S0-04 incomplete — add case handlers for 8 tribal-activation actions + wire TribalKnowle | U-S0-04 | transcript | 1x |
| MISC-128 | 0.65 | lathe | LATHE-COMPLETE-MS0: Lathe Complete sim-ready + Codex Build B integration (15 units) | LATHE-COMPLETE-MS0 | plan | 1x |
| MISC-129 | 0.65 | mill | FORGE: Mill Roadmap Comprehensive Audit & Gap Remediation | — | plan | 1x |
| MISC-130 | 0.65 | mill | TS error grind: MachiningIntelligenceOrchestrator/HyperMillDeepLearning/MachineConsumerBin | — | handoff | 1x |
| MISC-131 | 0.65 | other | 67 React page files exist but only ~20 routed in App.tsx (Diagnosis, EDM, Grinding, Turnin | — | transcript | 1x |
| MISC-132 | 0.65 | other | LegalComplianceOperatingEngine boundary tests deferred (5 NCs, cumulative NCs, osha_report | SQ4-2-LEGAL | transcript | 1x |
| MISC-133 | 0.65 | wedm | Electrode Pipeline Feature: Print to Roku-Roku to EA12S/EA12D via System 3R robot | — | plan | 1x |
| MISC-134 | 0.65 | wedm | WEDM electrode-part scan of JM Die archive (24,545 files + Excel parsing) — own unit, defe | — | transcript | 1x |
| MISC-135 | 0.65 | wedm | WEDM studio: SpeedFeedOrchestratorEngine workholding params + ThreadingHTTPServer + 95K ex | — | transcript | 1x |
| MISC-136 | 0.62 | cad | Fix 3 broken web pages and start Tier 0 of web-wiring-roadmap.md (audit of 50 pages done,  | — | transcript | 1x |
| MISC-137 | 0.62 | hooks | Hook built + verified but settings.json registration deferred (peer holds write claim) | — | transcript | 1x |
| MISC-138 | 0.62 | infra | Build downstream LEARN units that consume the override-lineage ledger — not yet built | — | transcript | 1x |
| MISC-139 | 0.62 | infra | Docustrata phase15: 673 oversized PDFs deferred to huge-chunked rescan pass | — | transcript | 1x |
| MISC-140 | 0.62 | infra | Kienzle delegation refactor deferred as 'should be its own unit' | — | unknown | 1x |
| MISC-141 | 0.62 | infra | start_batch({corpus:'all'}) corpus auto-resolution deferred to follow-on unit | — | transcript | 1x |
| MISC-142 | 0.62 | infra | Wire 10 oldest unwired engines for prism_calc using the generated worklist JSON — deferred | — | transcript | 1x |
| MISC-143 | 0.62 | lathe | UnifiedProgramParserEngine wiring deferred (peer held file at edit-time) — fuzz-ready but  | — | transcript | 1x |
| MISC-144 | 0.62 | other | ControlPlanEngine + SPC engines listed as WORK but NOT YET BUILT (Session 3-EXT-PPAP U-PPA | U-PPAP1 | transcript | 1x |
| MISC-145 | 0.60 | cad | Add OEE-trend / job-completion charts to DashboardPage (task #13 still pending) | — | transcript | 1x |
| MISC-146 | 0.60 | cad | FilletAgent / CoolingHoleAgent / BalanceAgent + Assembly file (.IAM/.SLDASM) handling defe | — | transcript | 1x |
| MISC-147 | 0.60 | cam | CAM-EXHAUST-MS1-04: Fusion 360 Inspection Module (10 ops, ~175 params) | CAM-EXHAUST-MS1-04 | plan | 1x |
| MISC-148 | 0.60 | cam | Create RESUME_POSTS_TOMORROW.md startup brief for continuing post-processor work | — | transcript | 1x |
| MISC-149 | 0.60 | cam | F360 Fixture Integration — add /cam/setups, /cam/setup/stock, /cam/setup/bodies endpoints  | — | transcript | 1x |
| MISC-150 | 0.60 | cam | Forge-Triple: hyperMILL CAM Kernel Enhancements (7 enhancements) | — | plan | 1x |
| MISC-151 | 0.60 | cam | MS1-10 turning-deep CAM-EXHAUST-MS1-10 built but UNCOMMITTED (turning-deep.json + engine + | CAM-EXHAUST-MS1-10 | handoff | 1x |
| MISC-152 | 0.60 | cam | Operationalize SFC Calculator + 3 Studios + PPG (5 surfaces, priority-ordered) | — | plan | 1x |
| MISC-153 | 0.60 | cam | PPG Backend-Frontend Integration: wire 3 isolated Master Post Engines | — | plan | 1x |
| MISC-154 | 0.60 | cam | PPG-WIRE-MS5/U-PPGW-OkumaMill: OkumaOSPMillMasterPostEngine | PPG-WIRE-MS5/U-PPGW-OkumaMill | plan | 1x |
| MISC-155 | 0.60 | cam | PPG-WIRE-MS5/U-PPGW-RapidReposition-Wiring: wire rapid optimizer into master posts | PPG-WIRE-MS5/U-PPGW-RapidReposition-Wiring | plan | 1x |
| MISC-156 | 0.60 | cam | PRISM Post Processor Maximization Roadmap (user-driven machine-specific post gen) | — | plan | 1x |
| MISC-157 | 0.60 | cam | Remove redundant SF-reasoning engines flagged by audit (separate unit) — pointed at U-LPR- | U-LPR-ADOPT-CAM-SFREASON | transcript | 1x |
| MISC-158 | 0.60 | docs | 673 oversized PDFs still deferred (drawing-likely PDF extraction) | — | transcript | 1x |
| MISC-159 | 0.60 | hooks | 5 error-learn hooks still need header-read to confirm matchers before wiring (1/6 wired) | — | transcript | 1x |
| MISC-160 | 0.60 | hooks | Continue tribal-knowledge harness audit: posttool-bundle.mjs for 44 PostToolUse hooks; com | — | handoff | 1x |
| MISC-161 | 0.60 | hooks | Dead hasRecentScrutiny() keying on selfReviewed/agentReviewed never set by 3-of-3 flow | — | unknown | 1x |
| MISC-162 | 0.60 | hooks | Fix error-learn-store.mjs fileSuffix() command-pollution (P0.3-B-followup) | — | handoff | 1x |
| MISC-163 | 0.60 | hooks | Fix invalid HookPhase 'pre-wiring' on KnowledgeHooks.ts line 332 (KAR-MS1 U-KAR07) | U-KAR07 | transcript | 1x |
| MISC-164 | 0.60 | hooks | GOLF-WATCHDOG-MS0 — 7th-slot cleanup + WatchdogEngine + WiringPotentialEngine + CLAUDE.md  | GOLF-WATCHDOG-MS0 | spec | 3x |
| MISC-165 | 0.60 | hooks | precompact-pending-guard --mark and agent-coordination post deferred (blocked) | — | transcript | 1x |
| MISC-166 | 0.60 | hooks | PRISM compaction settings.json patches — CLAUDE_AUTOCOMPACT_PCT_OVERRIDE + MAX_OUTPUT_TOKE | — | spec | 1x |
| MISC-167 | 0.60 | hooks | settings.json hook-count compaction (review 26 hard-blocks for over-enforcement) deferred  | T2.1 | transcript | 1x |
| MISC-168 | 0.60 | hooks | Tier-2 triggered context + Tier-3 precompact context hooks deferred (Opus 4.5 couldn't aff | — | transcript | 1x |
| MISC-169 | 0.60 | hooks | wire all hooks high-ROI combos slot delta | — | loop-state | 1x |
| MISC-170 | 0.60 | infra | 10-chat slot expansion (alpha..india + juliett) designed but never wired in chat-slots.mjs | — | transcript | 1x |
| MISC-171 | 0.60 | infra | AI-MAX-MS0/U-AIMAX07 Hierarchical Context Compression (5:1, <5% loss, <100ms) | AI-MAX-MS0/U-AIMAX07 | handoff | 1x |
| MISC-172 | 0.60 | infra | autoResearchOrchestratorEngine production DispatchFn wiring deferred to operator config | — | transcript | 1x |
| MISC-173 | 0.60 | infra | Build 17 missing safety engine files flagged by pre-build gate (safety engines not yet bui | — | transcript | 1x |
| MISC-174 | 0.60 | infra | Build K2-CLOUD Track K (12 units) — pending 5 user scoping decisions | K2-CLOUD-INTEGRATION | handoff | 1x |
| MISC-175 | 0.60 | infra | C2 Action-surface overlay (system-viz) — blocked: graph has 0 actEng edges, needs regen-vi | — | spec | 1x |
| MISC-176 | 0.60 | infra | Dispatcher action registered but not yet wired to an engine (not_implemented stub) | L1-B6 | transcript | 1x |
| MISC-177 | 0.60 | infra | Finish HS-06 Phase 3: aggressive archive of skill buckets F/G/H (commands 141→~50-75) | HS-06 | handoff | 1x |
| MISC-178 | 0.60 | infra | fix all hook errors + tsc errors + wire unwired engines + update system-viz | — | loop-state | 1x |
| MISC-179 | 0.60 | infra | FORGE-TRIPLE blocked — VideoLearningEngine/ApprovalWorkflowEngine/RecordTimelineEngine nee | — | transcript | 1x |
| MISC-180 | 0.60 | infra | Multiple dispatchers referenced but incomplete (nlHookDispatcher, maintenanceDispatcher, m | — | transcript | 1x |
| MISC-181 | 0.60 | infra | openai backend not yet wired in LocalModelOrchestratorEngine routing | PP-0.19-U-LLM1 | transcript | 1x |
| MISC-182 | 0.60 | infra | Phase 0-D-FUSION-2: PhysicsFusionConvergenceEngine (~1000 LOC) | U-FUS-CONV | plan | 1x |
| MISC-183 | 0.60 | infra | PRISM Infra Modernization Roadmap (10 phases, 55 units) — 40-agent scrutinized | INFRA | plan | 1x |
| MISC-184 | 0.60 | infra | PRISM Tree Reorganization v2: track-based worktree hierarchy | — | plan | 1x |
| MISC-185 | 0.60 | infra | Qdrant autostart (P0/P13 scope) — neither phase shipped | — | transcript | 1x |
| MISC-186 | 0.60 | infra | Restore missing PRISMContextInjectorEngine.js import in MultiModelConsensusEngine.ts:37 (b | — | handoff | 1x |
| MISC-187 | 0.60 | infra | ROADMAP-VIZ-BINDING-MS0 — RoadmapVizBindingEngine + roadmap-viz-overlay.mjs flipping ghost | ROADMAP-VIZ-BINDING-MS0 | spec | 1x |
| MISC-188 | 0.60 | infra | scripts/__tests__/*.test.mjs files do NOT run under either vitest config — orphaned tests  | — | handoff | 1x |
| MISC-189 | 0.60 | infra | Semantic RAG + vector embeddings + consensus protocols (~11,000 LOC) deferred, absent from | — | transcript | 1x |
| MISC-190 | 0.60 | infra | Spawn 6 parallel deep-research agents (Obsidian/Ollama/Docker/Octopus consensus/AI-hierarc | BACKEND-DEVTOOLS-RGS-MS0 | handoff | 1x |
| MISC-191 | 0.60 | infra | System-viz Phase 3c: un-truncate giant tool catalogs (Emuge/OSG/Sandvik/Indexable, ~80k L9 | CAD-FUSION-LIVE-MS0/U-VIZ-LAYER-PHASE3C | handoff | 1x |
| MISC-192 | 0.60 | infra | System-viz Tier A: blast-radius overlay + generate-wiki-debt-worklist.mjs + stagnant/rot o | — | handoff | 1x |
| MISC-193 | 0.60 | infra | Tender Hatching Mitten: PRISM App Full-Stack Wiring Roadmap (nav + API + dashboards) | — | plan | 1x |
| MISC-194 | 0.60 | infra | TK-3 through TK-7 Tribal Knowledge Propagation Roadmap (feedback loops, frontend propagati | — | transcript | 1x |
| MISC-195 | 0.60 | infra | Tribal auto-wiring sub-projects A/B/D/E — mine extracted/ for tips, ingest 3400-tip *-cam- | — | spec | 1x |
| MISC-196 | 0.60 | infra | U-FORGE-OMNISCIENT — omniscient version of /forge analogous to forge-audit upgrade, separa | U-FORGE-OMNISCIENT | spec | 1x |
| MISC-197 | 0.60 | infra | U-VIZ-OVERLAY-RENDER — consume audit-overlay.json to tint the system-viz 3D graph (claude- | U-VIZ-OVERLAY-RENDER | spec | 1x |
| MISC-198 | 0.60 | infra | Verify-then-wire orphan engines: TribalEnrichmentCoordinator, MultiSessionHandoffCoordinat | — | handoff | 1x |
| MISC-199 | 0.60 | infra | Wire 42 disconnected CrossProcess* Tier 2-12 engines to a dispatcher | — | transcript | 1x |
| MISC-200 | 0.60 | lathe | Build Macro programs fan-out + 3 domain mega-commands (/lathe /mill /wedm) — enumerated no | — | handoff | 1x |
| MISC-201 | 0.60 | lathe | JM DIE 19,783 .MIN programs NOT YET WIRED into tribal-tip extraction pipeline | — | transcript | 1x |
| MISC-202 | 0.60 | lathe | LatencyBudgetDecompositionEngine (U-LPR-PERF-SLO) — source+tests written but not run, not  | U-LPR-PERF-SLO | transcript | 1x |
| MISC-203 | 0.60 | lathe | Lathe production: MOU wet-run unit U-LPR-WETRUN deferred (dry-run-only gate) | U-LPR-WETRUN | transcript | 1x |
| MISC-204 | 0.60 | lathe | TRAINING-LEARNING-MS0/U1 P2 follow-ups: strip 9 (params as any) casts, stale comment, JSDo | TRAINING-LEARNING-MS0/U1 | handoff | 1x |
| MISC-205 | 0.60 | lathe | U-LPI07 Tests (25+) — incomplete lathe-print-import unit | U-LPI07 | transcript | 1x |
| MISC-206 | 0.60 | other | QuoteRevisionEngine computeQtyBreaks bugs deferred — Wright's method not normalized to qty | — | transcript | 1x |
| MISC-207 | 0.60 | wedm | Close Wire EDM + Lathe Gap to Sim-Before-Live Readiness (25 units, 5 phases) | — | plan | 1x |
| MISC-208 | 0.60 | wedm | Electrode XLSM live-Excel COM integration deferred to v2 (MS0 uses parsed-snapshot path on | — | transcript | 1x |
| MISC-209 | 0.60 | wedm | WEDM Full Launch Roadmap — 100/100 chargeable product | — | plan | 1x |
| MISC-210 | 0.60 | wedm | WEDM studio UI: multiple wizard steps render 'Step not yet implemented' | — | transcript | 1x |
| MISC-211 | 0.60 | wedm | Wire WEDM backend capability to Codex-built frontend + update app to utilize what was buil | — | transcript | 1x |
| MISC-212 | 0.55 | cad | BlueprintProgramJoinEngine reader/server refactor (Task 8) — blocked on user spec approval | — | handoff | 1x |
| MISC-213 | 0.55 | cad | CADC34 Remediation: git corruption purge + envelope cleanup | U-CADC34 | plan | 1x |
| MISC-214 | 0.55 | cad | PHASE28 CAD orphan wiring UNCOMMITTED in worktree + PHASE29 pick 7 more orphans (BSpline/B | CAD-FUSION-LIVE-MS0 | handoff | 2x |
| MISC-215 | 0.55 | cad | SFC calculator panels Phase 1A-1D — wire WireEdmFeasibility/CostBreakdown/LatheCost panels | — | handoff | 1x |
| MISC-216 | 0.55 | cad | SolidWorks code generator default branch 'not yet implemented' TODO per kind | — | transcript | 1x |
| MISC-217 | 0.55 | cam | CAM_Manual 1632-page hyperMILL extraction deferred (user runs overnight separately) | — | transcript | 1x |
| MISC-218 | 0.55 | cam | CAM-AUTOPOP-CORE-MS0 Phase 2 — cam-mapping-rules.json + CAMAutopopSchemaEngine + 4 dispatc | CAM-AUTOPOP-CORE-MS0 | handoff | 1x |
| MISC-219 | 0.55 | cam | CAM-EXHAUST-MS0 U-CAMTEST03/04: dispatcher wiring for cam_inhost_inventor_hsm_* (5 actions | CAM-EXHAUST-MS0/U-CAMTEST03 | transcript | 1x |
| MISC-220 | 0.55 | cam | camxMs22U01ActionSchemas.ts missing — flagged as cross-chat coordination signal, not fixed | camxMs22U01 | transcript | 1x |
| MISC-221 | 0.55 | cam | Fusion 360 CAM API Exploration (BLOCKED — source files not located) | — | plan | 1x |
| MISC-222 | 0.55 | cam | Fusion CAD/CAM/Post Test Loop: add /api/cam route + port 18361 binding | — | plan | 1x |
| MISC-223 | 0.55 | cam | G-code annotation engine not yet wired to optimize feed rates in real-time | — | transcript | 1x |
| MISC-224 | 0.55 | cam | Multi-job magazine reservation (T6) deferred to PRISM-MES roadmap, never formalized | — | unknown | 1x |
| MISC-225 | 0.55 | cam | Parallel verifier coverage sweep — apply verifyWEDMBlockAnnotations per-tier physics gate  | — | resume-post | 1x |
| MISC-226 | 0.55 | cam | PRISM AutoProgram Roadmap (F360-AP): one-button Fusion 360 AutoProgram | F360-AP | plan | 1x |
| MISC-227 | 0.55 | cam | SolidCAM post-processor deferred from PHASE-9 (4 priority CAMs done, SolidCAM not) | — | transcript | 1x |
| MISC-228 | 0.55 | cam | U-WIRE50 — wire remaining LoRA dataset builders (MillTurnLoRADatasetBuilder, FiveAxisLoRAD | U-WIRE50 | handoff | 1x |
| MISC-229 | 0.55 | docs | 10-Agent /rgs Protocol Scrutiny of All 14 PRISM Roadmaps + ECC/PCCA activation | — | plan | 1x |
| MISC-230 | 0.55 | docs | CAD/CAM image-heavy manuals deferred (CAD_Manual, CAM_Manual) | — | transcript | 1x |
| MISC-231 | 0.55 | docs | Resolve scripts README home-PC path drift + document undocumented H:\PRISM-MCP-SERVER runt | — | transcript | 1x |
| MISC-232 | 0.55 | hooks | anti-regression-auto-sweep.mjs hook stubbed out (no real validation) | — | transcript | 1x |
| MISC-233 | 0.55 | hooks | DuplicationGuard/command-suggestion hook written but not wired into settings.json and not  | — | transcript | 1x |
| MISC-234 | 0.55 | hooks | ECC-to-PRISM Integration Roadmap: incorporate 9 capabilities from everything-claude-code | — | plan | 1x |
| MISC-235 | 0.55 | hooks | Revert broken parent-PID gating in 3 files + lower PRESENCE_TTL_MS to 5min (Windows parent | — | transcript | 1x |
| MISC-236 | 0.55 | infra | AI router openai backend not yet wired (returns structured error, caller falls back) | — | transcript | 1x |
| MISC-237 | 0.55 | infra | Build scripts/revenue-day1-checklist.mjs + reconcile-roadmap-vs-viz.mjs (compounding-gains | — | handoff | 1x |
| MISC-238 | 0.55 | infra | Build tribal-ai stack L2-L5: tribal-rerank.mjs, tribal-obsidian-mirror.mjs, tribal-inject- | — | handoff | 1x |
| MISC-239 | 0.55 | infra | CAMX Phase 6: Backend Business Platform (E2/QB/Xometry/Fictiv parity, 28 units) | — | plan | 1x |
| MISC-240 | 0.55 | infra | ChatBusEngine dispatcher wiring (hooks + prism_context) deferred to next session per HANDO | — | transcript | 1x |
| MISC-241 | 0.55 | infra | COGNITIVE-BRIDGE-MS0 batches 5-10 (Deep Reasoning, Ollama, Learning, Neural, Knowledge, cr | COGNITIVE-BRIDGE-MS0 | handoff | 1x |
| MISC-242 | 0.55 | infra | Continue Sprint C1 — operating-system backend (next-session auto-pickup) | Sprint-C1 | transcript | 1x |
| MISC-243 | 0.55 | infra | Continue YOLO unwired-engine wiring sweep — 909 engines unwired by domain | — | handoff | 1x |
| MISC-244 | 0.55 | infra | CrossProcessSymbolicConstraintEnforcerEngine (XPROC-NEURAL T8-01) dispatcher wiring deferr | XPROC-NEURAL/T8-01 | transcript | 1x |
| MISC-245 | 0.55 | infra | Execute pending AppData junction (requires user to quit Desktop app) — still pending manua | — | transcript | 1x |
| MISC-246 | 0.55 | infra | EXECUTION of REVENUE-ROADMAP v7.6: Week-0 CI-gate cluster (U-REV-CI-00 + audit-doc-backflo | U-REV-CI-00 | handoff | 1x |
| MISC-247 | 0.55 | infra | Finish stateless-weaving-beacon plan: build apply-update-points.mjs + wire forge-audit pos | — | handoff | 1x |
| MISC-248 | 0.55 | infra | Fix pre-existing tsc errors in shopPracticeDispatcher / telemetryDispatcher / tenantDispat | — | handoff | 1x |
| MISC-249 | 0.55 | infra | Forge/Audit/RGS Final-Roadmap Pipeline Upgrade (4 dormant data sources + subagent fan-out) | — | plan | 1x |
| MISC-250 | 0.55 | infra | MASTER_INDEX not yet wired into /rgs 7-stage pipeline | — | transcript | 1x |
| MISC-251 | 0.55 | infra | Multi-Model Local LLM Integration: Docker Model Runner + Ollama to PRISM | — | plan | 1x |
| MISC-252 | 0.55 | infra | OBSIDIAN-VIZ-MS0 6 units (U-VIZ-VAULT L10 layer, U-MIRROR-CATEGORIES, U-WIKILINK-OLLAMA, U | OBSIDIAN-VIZ-MS0 | handoff | 1x |
| MISC-253 | 0.55 | infra | Opus 4.7 / 4.5 Profile A/B Harness (profile-overlay swap system) | — | plan | 1x |
| MISC-254 | 0.55 | infra | Replace WIRE-EXEMPT stubs PRISMContextInjectorEngine + ConsensusModelPerformanceEngine wit | — | handoff | 1x |
| MISC-255 | 0.55 | infra | Roadmap audit findings A1 perf / A9 dep-map / A2 security still deferred (Loop 4) | — | transcript | 1x |
| MISC-256 | 0.55 | infra | Slash Commands Orphan Audit: dedup 80 dups + 15 stubs + Category-C grep | — | plan | 1x |
| MISC-257 | 0.55 | infra | Slot-Binding Truth Enforcement: kill the two-chats-in-echo class of bug | — | plan | 1x |
| MISC-258 | 0.55 | infra | SYSTEM-VIZ-FS-COVERAGE Phase 2+3 — remaining H: domains DEFERRED as operational follow-ups | — | chat-bus | 1x |
| MISC-259 | 0.55 | infra | Tesseract + Docker portability follow-ups for OCR pipeline | — | transcript | 1x |
| MISC-260 | 0.55 | infra | U-FORGE-AUDIT-RIGOR — ts-morph/madge/knip/semgrep integration into forge-audit (Tier 2 fol | U-FORGE-AUDIT-RIGOR | spec | 1x |
| MISC-261 | 0.55 | infra | Wire NISTAIRMFComplianceEngine into complianceDispatcher.ts and commit (engine + 19 tests  | U-LPR-OPS-NIST | transcript | 1x |
| MISC-262 | 0.55 | lathe | Build /lathe-lora skill file (missing .md command, surfaced by lathe audit) | — | handoff | 1x |
| MISC-263 | 0.55 | lathe | DOMAIN-STUDIO program-generation MS0 unit execution — safety-critical per-machine program  | — | spec | 1x |
| MISC-264 | 0.55 | lathe | LATHE-PRO-V3-MS2 U-LPT02..U-LPT10 (machine warmup, probing cycle gen, GD&T mapper, SPC wir | LATHE-PRO-V3-MS2 | handoff | 1x |
| MISC-265 | 0.55 | other | ValueStreamPage falls back to hardcoded data — getValueStreamData not fully wired, needs s | — | transcript | 1x |
| MISC-266 | 0.55 | wedm | ENGINE-WIRE-MS0 — commit staged SFC batch + Phase 6C WEDM post-router wiring (wedm_post_ro | ENGINE-WIRE-MS0 | handoff | 1x |
| MISC-267 | 0.55 | wedm | Laser / waterjet / sinker EDM modules are scaffolding-only, never fully built | — | transcript | 1x |
| MISC-268 | 0.55 | wedm | Live-Excel COM bridge for electrode templates deferred to v2 (parsed-snapshot only for MS0 | — | transcript | 1x |
| MISC-269 | 0.55 | wedm | WEDM JM Die customer-traceable jobId convention deferred to P3 | — | transcript | 1x |
| MISC-270 | 0.52 | hooks | Build the desktop-app instance prompt task — real tests, wire to settings.json, verify hoo | — | transcript | 1x |
| MISC-271 | 0.50 | cad | Extract unwrapMcpResult() to a shared utility for all web pages — proposed, not done | — | transcript | 1x |
| MISC-272 | 0.50 | cad | Wire PartFolderOrganizerEngine.resolveCustomer to customer-alias map + regen ENGINE/DISPAT | — | handoff | 1x |
| MISC-273 | 0.50 | cam | CAMStrategyRecommenderEngine only stubbed out | — | transcript | 1x |
| MISC-274 | 0.50 | cam | Maximum Coverage Plan: close all sub-90% CAMX roadmap gaps to 95%+ | — | plan | 1x |
| MISC-275 | 0.50 | cam | SolidWorks/Esprit live-bridge COM execution not yet wired (honest mock returns ok:false) | — | transcript | 1x |
| MISC-276 | 0.50 | docs | CLAUDE.md Consolidation: trim ~400 lines duplication across 4 files | — | plan | 1x |
| MISC-277 | 0.50 | docs | Phase 9d print-program join script + BlueprintOCREngine.ingestPhase8JSONL (Docustrata phas | — | handoff | 1x |
| MISC-278 | 0.50 | hooks | Re-apply 2 reverted hook fixes (scrutinize-before-stop ownership-check + per-agent-handoff | — | handoff | 1x |
| MISC-279 | 0.50 | infra | 6-chat parallel-exec v2 — wire pre-commit-conflict-sim.mjs hook + fix stable-session-id ca | — | handoff | 1x |
| MISC-280 | 0.50 | infra | Crash recovery and orphan node cleanup deferred — blocked by precompact threshold | — | transcript | 1x |
| MISC-281 | 0.50 | infra | Delete .lintstagedrc.json fake no-op config (eats commits — silences husky but breaks part | — | handoff | 1x |
| MISC-282 | 0.50 | infra | Fix scrutiny-3way.mjs / scrutiny-ledger.mjs test coverage gap (FAIL revocation, default-FA | — | handoff | 1x |
| MISC-283 | 0.50 | infra | fix slimResponse TS2554 dead-block cluster (4 sites) | — | loop-state | 1x |
| MISC-284 | 0.50 | infra | HS-day-0 — HS-06 skill manifest reduction (565 skills re-rendered per prompt) + 5 git-tree | HARNESS-STAB | handoff | 1x |
| MISC-285 | 0.50 | infra | JobProfitabilityWaterfallEngine inflates margins when actuals incomplete (cost fallback bu | — | transcript | 1x |
| MISC-286 | 0.50 | infra | Memory Monitor: recurring orphan reaper for 6-chat fleet (CronCreate) | — | plan | 1x |
| MISC-287 | 0.50 | infra | NFC badge login + IndexedDB offline queue deferred to v2 (shop-floor mobile) | — | transcript | 1x |
| MISC-288 | 0.50 | infra | OBSIDIAN-AUTOMATE-MS3 5 utilization-gap edits (Docker Scout CI, Gemini long-ctx arm, route | OBSIDIAN-AUTOMATE-MS3 | handoff | 1x |
| MISC-289 | 0.50 | infra | P2 deferred: JSONL concurrent-write atomicity + sid-sharded block ledger | — | transcript | 1x |
| MISC-290 | 0.50 | infra | portability-guards deeper fs-mock coverage (junction drift simulation) deferred | — | transcript | 1x |
| MISC-291 | 0.50 | infra | PRISM Local LLM Integration: hybrid Qwen local + DeepSeek V4 API | — | plan | 1x |
| MISC-292 | 0.50 | infra | ProductPillarEngine shows incomplete pillars (productDispatcher stub reference) | — | transcript | 1x |
| MISC-293 | 0.50 | infra | Re-spawn Boris Cherny patterns research card + PRISM dev-tool/MCP inventory research card; | — | handoff | 1x |
| MISC-294 | 0.50 | infra | Redirect Claude Desktop AppData to H: drive (junction + enforcement hook) | — | plan | 1x |
| MISC-295 | 0.50 | infra | System-viz Tier D backlog — 4 involved features (tribal-density heatmap, full Lvault layer | — | spec | 1x |
| MISC-296 | 0.50 | infra | system-viz Tier-B build: Lgit→structure cross-links + generate-vault-graph.mjs + multi-cha | — | handoff | 1x |
| MISC-297 | 0.50 | lathe | LatheBirdNest gap engine identified but not yet built (PENDING_GAP_ENGINES) | — | transcript | 1x |
| MISC-298 | 0.50 | lathe | turningActionSchemas.ts BATCH11 — 8 dead schemas (dispatcher enum+cases rejected) need fin | — | handoff | 1x |
| MISC-299 | 0.50 | mill | Recover MILL-BATCH5 dispatcher wiring from stash (3 corrupted commit attempts, work strand | U-WIRE-MILL-BATCH5 | handoff | 1x |
| MISC-300 | 0.50 | other | 9 residual MAJOR roadmap items (Weibull RUL incomplete-gamma, MATBAND citations, MIPSolver | — | handoff | 1x |
| MISC-301 | 0.50 | other | AGI training pipeline (T10/B6) deferred as research-grade scope | — | unknown | 1x |
| MISC-302 | 0.50 | other | Build React components for v8 features + wire to existing MCP dispatchers (remaining work) | — | transcript | 1x |
| MISC-303 | 0.50 | other | T10-02, T10-03 missing (Tier 10 incomplete) | — | transcript | 1x |
| MISC-304 | 0.50 | other | Wave 1 Session 6-5 deferred (wave execution incomplete) | — | transcript | 1x |
| MISC-305 | 0.45 | cad | Fusion360LiveBridgeEngine + PrintToFusion360Bridge appear incomplete / partially affected | — | transcript | 1x |
| MISC-306 | 0.45 | cam | CAM 3x-rule shared core extraction queued for follow-up unit (Mastercam U-CAMTEST04 cohort | — | transcript | 1x |
| MISC-307 | 0.45 | cam | real-sim re-integration deferred (proceeds with --sim-source=synthetic flag) | — | transcript | 1x |
| MISC-308 | 0.45 | infra | BUILD_STATE-read block duplicated in batch_unwired/dashboard — extract to shared helper (f | — | transcript | 1x |
| MISC-309 | 0.45 | infra | Cross-PC Seamless Operation + Master CLAUDE.md Unification (forge brainstorm) | — | plan | 1x |
| MISC-310 | 0.45 | infra | H-drive cleanup: diff 5 stranded engines in prism-forge-archive, reap 4 stale clones, prop | — | handoff | 1x |
| MISC-311 | 0.45 | infra | Mixed-session validation run (Steps 3-5) deferred to manual spike | — | transcript | 1x |
| MISC-312 | 0.45 | infra | U-PAY/MS-FRONTEND/MS-INFRA execution chain to Revenue Day 1 (HVA audit follow-ups) | HIGH-VALUE-ADDITIONS-AUDIT | handoff | 1x |
| MISC-313 | 0.45 | infra | Wire/run PDF→Qdrant ingestion test (Docker Desktop wedged — blocked end-to-end) | — | handoff | 1x |
| MISC-314 | 0.45 | mill | MILL-MASTER backend wiring incomplete (12 units, several incomplete) | — | transcript | 1x |
| MISC-315 | 0.45 | other | MIT-course math capabilities not yet implemented (interval arithmetic and other opportunit | — | transcript | 1x |
| MISC-316 | 0.45 | other | Weibull RUL incomplete — 9 residual MAJORS deferred (tracked in v7.2 R5.5) | — | transcript | 1x |
| MISC-317 | 0.40 | docs | Video-learn pipeline 5D — review generated TypeScript files and fill in domain-specific lo | — | transcript | 1x |
| MISC-318 | 0.40 | infra | GNN incomplete (P1-HIGH gap), no GPU acceleration | — | transcript | 1x |

## Next phase (deferred)

DEFERRED follow-up: combine MISC-TASKS-INVENTORY into the unified roadmap (PRISM-UNIFIED-ROADMAP-v2.md / roadmap-index.json) after human review.
