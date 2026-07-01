# CLAUDE.md Recent-regressions archive
> Externalized from CLAUDE.md by slim-claude-md-injection.mjs (U-ALPHA-CLAUDEMD-SLIM) to cut the fleet-wide token injection. Append-only.


## migrated 2026-06-11
- 2026-06-03 | **NN/GNN schema-read blindness, one shape deeper — `classifyGnn` blind to the GRADED NN-EVAL shape (slot:india)** | observed-in: 93f85ec067 | root cause: U-NN-REFPOOL-REEVAL re-ran `nn-graph-eval` against today's live 676MB graph; the perma-DEFERRED eval (poolSize 0, stale May-16) finally produced a real **62-ghost holdout** → the GRADED shape `{deferred:false, metrics:{auroc,brier}, grade:{verdict}}` with NO `checkpointMeta`/`checkpointPresent`. But `classifyGnn` (the canonical reader the f436b2c614 fix routed BOTH consumers through) read AUROC *only* from `checkpointMeta.auroc` → graded report classified `{dormant:true, auroc:null}` → both fleet hooks (psn-leg-state per-prompt ×26 slots + nn-graph-health SessionStart) newly mis-reported a real measured grade as "DORMANT poolSize 0 / AUROC n/a". Same regression CLASS as f436b2c614, exposed because the producer's second output shape was never exercised while the eval was data-blocked. fix: classifyGnn reads `metrics.auroc/brier` (deploy gate) first, falls back to `checkpointMeta` (link-pred pretext), treats a scored holdout as checkpoint-present so a graded report is never dormant — only below-gate/healthy. Leg #10 now honestly = AUROC 0.5 (8-dim classifier collapsed to a constant `prism_turning` predictor) BELOW-GATE. +9 tests (87 total green), 2-reviewer PASS 0 P0/P1. | verify: `git -C H:/prism show 93f85ec067` · [[nn-graded-schema-read-fix]]
- 2026-06-02 | **WEDM tech-tables registry lost 2 of 5 ACU 7-pass E-code families (E952/E56xx) + getJMDiePatternForMaterial silently mislabeled compound materials (slot:mike)** | observed-in: cad-fusion-live-ms0 (uncommitted) | root cause: `JM_DIE_ECODE_FAMILIES` + `selectECodeFamily` were never wired to the real extracted FA-S data (`mitsubishi-fa-s-extracted.ts`) → `wedm-acu-7pass.test.ts` RED (17/20), `WEDMProgramOptimizerEngine.find(f.id.includes("acu"))`→undefined, neural-analysis family lookup missed; meanwhile a THIRD selector `WireEDMDeepAIHardeningEngine._selectECodeFamily` had its own acu impl (R7 N-divergent-selectors drift). Separately `getJMDiePatternForMaterial` returned a confident `standard_4pass` for uncalibrated compound/exotic materials (carbide/Inconel/Ti/17-4PH/CPM), poisoning `WEDMNeuralTrainingEngine:2109` labels. fix: `buildAcuFamilyFromFAS()` single-sources E952/E56xx from extracted records (3→5 families) + ACU branch in `selectECodeFamily` + `material_calibrated`/`warning` fail-loud flag (calibrated set single-sourced from the registry). RED→GREEN, 117/117. | verify: `node mcp-server/scripts/wedm-print-to-program-accuracy.ts` · [[reference_acu_7pass_families_regression_2026_06_02]]
- 2026-06-02 | **NN/GNN PSN-leg health fabricated an "embeddingSource mismatch" diagnosis fleet-wide — schema-read blindness (slot:india)** | observed-in: f436b2c614 | root cause: `psn-leg-state-inject.legStateNnGraph` read top-level `evalDoc.auroc`, but real `NN-EVAL.json` nests it at `checkpointMeta.auroc` + carries `deferred`/`reason`/`poolSize` → read ALWAYS undefined → every prompt across all 26 slots emitted "AUROC not finite … likely embeddingSource mismatch" (a fabricated cause; true state = DEFERRED, insufficient-reference-pool poolSize 0, AUROC 0.096). India's own "schema-read-blindness" regression class — two consumers of one state file diverged (nn-graph-health-inject read it correctly via `classifyGnn`). fix: delegate read to canonical `classifyGnn` (one source of truth) + type-strict top-level fallback (guards `Number(null)===0`) + `DEFERRED` status w/ real reason + gate on `classifyGnn.healthy` (AUROC *and* Brier, fail-closed) + export `PROMOTE_AUROC_MIN`/`PROMOTE_BRIER_MAX` (no re-inlined 0.78). 81/81 tests incl real-data anti-drift + negative-assert the fabricated string can't return. Also verified `U-NN-TRAINER-EXPORT-RESTORE` is a STALE CLAUDE.md claim (exports present, 154/154 pass). | verify: `git -C H:/prism show f436b2c614` · [[nn-leg-schema-read-fix]]
- 2026-06-01 | **fleet-task-health watched only 12/39 PRISM scheduled tasks — `discoverInstallerTasks` blind in 2 dims (slot:bravo)** | observed-in: 213a1da6f8 | root cause: KNOWN list synced to its OWN blind discovery (typed-param-only regex + `install-*-task.ps1`-singular glob; spec-key `Name=` + `-tasks/-cron/register-*` registrars unseen) → drift test self-referentially green-but-blind; 27 safety-net tasks silently unwatched. fix: complete-by-construction — `Register-ScheduledTask` content gate + broad glob + 3 capture forms; KNOWN 12→39; +Zulu Orchestrator CRASH_CRITICAL. 52/52 tests, per-file scrutiny A+B PASS (B caught 2 layers). | verify: `git -C H:/prism show 213a1da6f8` · [[fleet-task-health-discovery-drift]]
- 2026-05-31 | **MCP :3100 "Already connected to a transport" disconnect — fresh McpServer per /mcp request (slot:golf)** | observed-in: 1297b0a8f5 | root cause: `/mcp` handler called `server.connect(transport)` on the SHARED singleton per request; SDK allows 1 transport/server, so overlapping multi-chat requests threw before responding → client timeout → "MCP DISCONNECTED" + watchdog restarts. fix: `buildRequestServer()` (fresh server per request, SDK stateless pattern); split `registerTools`→`bootstrapServices`(once)+`bindDispatchers`(per-server)+`_postBindDone`-guarded tail. Validated 115 isolation + 36 live concurrent reqs, 0 collisions. | verify: `git -C H:/prism show 1297b0a8f5` · [[reference_mcp_sdk_single_transport_invariant_2026_05_25]]
- 2026-05-20 | **103-case max-variability matrix on UltimateSpeedFeedEngine + AutoSpeedFeed R12 Math.round fix (slot:kilo)** | observed-in: 1b87f98f2 | fix: see commit | verify: `git -C H:/prism show 1b87f98f2`
- 2026-05-19 | **re-enable 7 of 7 disabled crash-critical PRISM scheduled tasks (slot:alpha)** | observed-in: 2bc54961b | fix: see commit | verify: `git -C H:/prism show 2bc54961b`
- 2026-05-19 | **protect reaper procs from sibling reap** | observed-in: de70cddf8 | fix: see commit | verify: `git -C H:/prism show de70cddf8`
- 2026-05-19 | **2 of 5 SessionStart file-reader injectors converted to pointer mode (ai-deep-intelligence + claude-brief-inject). Per SESSIONSTART-HOOK-A...** | observed-in: e05d90be9 | fix: see commit | verify: `git -C H:/prism show e05d90be9`
- 2026-05-19 | **shipped (a) slot-worktree-cwd-advisory hook + 33/33 tests, (b) global settings fix (CLAUDE_AUTOCOMPACT_PCT_OVERRIDE 95→80, CLAUDE_CODE_MA...** | observed-in: 64d1793dc | fix: see commit | verify: `git -C H:/prism show 64d1793dc`
- 2026-05-19 | **html-companion-discipline wiki — placement rule (specs/research/dashboard-patches) + 3 render entry points + 5 WAI-ARIA a11y requirements...** | observed-in: 3421c5a53 | fix: see commit | verify: `git -C H:/prism show 3421c5a53`
- 2026-05-18 | **track + fix audit-unwired-engines table-driven ACTION_MAP detection** | observed-in: 9e27d9d42 | fix: see commit | verify: `git -C H:/prism show 9e27d9d42`
- 2026-05-18 | **[MAIN] [SFC-ACCURACY-MS1]/U-STAGE5-FIX (slot:india): 3-of-3 arm-C P1 — materialize optimizer zod default** | observed-in: 52fdada4d | fix: see commit | verify: `git -C H:/prism show 52fdada4d`
- 2026-05-18 | **correct OperationPhysics field name** | observed-in: 16f354e8e | fix: see commit | verify: `git -C H:/prism show 16f354e8e`
- 2026-05-18 | **anti-regression test for iter15 wires [iter16]** | observed-in: 0772ad49b | fix: see commit | verify: `git -C H:/prism show 0772ad49b`
- 2026-05-18 | **hook fire-rate audit + punch list — 516 zero-fire categorized into 136 wired-silent + 380 unwired-on-disk** | observed-in: e467a4ca0 | fix: see commit | verify: `git -C H:/prism show e467a4ca0`
- 2026-05-18 | **root-cause + fix doc — heartbeat-keepalive 8ms timeout typo broke chat-slot heartbeat fleet-wide slot:alpha. Root cause: H:/.claude/setti...** | observed-in: 1d2678026 | fix: see commit | verify: `git -C H:/prism show 1d2678026`
- 2026-05-18 | **JULIETT F1 latent-bug fix — system-graph oversize → architecture-graph fallback** | observed-in: b0c1ad418 | fix: see commit | verify: `git -C H:/prism show b0c1ad418`
- 2026-05-18 | **PRISM_VIZ_GRAPH_PATH env override + hermetic test rewrite + production-graph restore** | observed-in: ef402e02b | fix: see commit | verify: `git -C H:/prism show ef402e02b`
- 2026-05-18 | **post-blend min_confidence filter (R12 fix) + 22-case dispatcher round-trip test + /knowledge-query skill** | observed-in: affff27a2 | fix: see commit | verify: `git -C H:/prism show affff27a2`

- 2026-06-21 | **[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-ORCH-REGRESSION-BASELINE (slot:oscar): numeric-regression baseline for SpeedFeedOrchestratorEngine.c...** | observed-in: 266588666 | fix: see commit | verify: `git -C H:/prism show 266588666`

- 2026-06-21 | **[MAIN-FORCE] [BOOTSTRAP-SLOT-ENFORCE] [BACKEND-GOVERNANCE]/U-DRIFT-COMPLETENESS-FIX (slot:bravo): detector now recognizes completed/shipp...** | observed-in: 54ca90e5a | fix: see commit | verify: `git -C H:/prism show 54ca90e5a`

- 2026-06-21 | **[MAIN-FORCE] [TOKEN-SAVINGS]/U-PSN-AGGREGATE-TAILREAD-FIX (slot:alpha): raise 500K tail-read cap -> fleet headline was under-reporting ~4...** | observed-in: 54f0b2d7a | fix: see commit | verify: `git -C H:/prism show 54f0b2d7a`

- 2026-06-21 | **[MAIN-FORCE] [MATERIAL-DB-FIX]/U-MATDB-DESCRIPTIVE-KEY-ALIAS (slot:india): resolve descriptive material keys on CANONICAL_MATERIAL_DB via...** | observed-in: b60bba5e8 | fix: see commit | verify: `git -C H:/prism show b60bba5e8`

- 2026-06-21 | **[MAIN-FORCE] [BUILD-FIX]/U-INVENTORCAP-LOCAL-IFACE (slot:india): clear the sole authoritative-build tsc error -- type INVENTOR_CAPABILITI...** | observed-in: a4a89dcc9 | fix: see commit | verify: `git -C H:/prism show a4a89dcc9`

- 2026-06-21 | **[MAIN-FORCE] [BUILD-FIX]/U-INVENTOR-STALE-TEST-FIXTURES (slot:india): fix 6 stale Inventor buildScript test fixtures -> 73/73 (was 67/73)** | observed-in: 5ede61533 | fix: see commit | verify: `git -C H:/prism show 5ede61533`

- 2026-06-21 | **[MAIN-FORCE] [BUILD-FIX]/U-WEDM-NEURAL-DUTY-FIXTURE (slot:india): conform 2 stale duty-cycle fixtures in the WEDM neural test to the cano...** | observed-in: 581269da0 | fix: see commit | verify: `git -C H:/prism show 581269da0`

- 2026-06-21 | **[MAIN-FORCE] [BUILD-FIX]/U-CAM-DUP-ROUTE (slot:india): remove duplicate lathe_master_post_route from prism_cam ACTIONS enum + its dead ge...** | observed-in: 1e5c5b541 | fix: see commit | verify: `git -C H:/prism show 1e5c5b541`

- 2026-06-21 | **[MAIN-FORCE] [AI-LATHE-FIX]/U-LATHE-LORA-REWARD-CONTRACT (slot:india): align LoRA RewardResult schema to the engine's actual output (bonu...** | observed-in: fa08abd0d | fix: see commit | verify: `git -C H:/prism show fa08abd0d`

- 2026-06-21 | **[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-PROVEN-PIPELINE-SCRUTINY-FIX (slot:oscar): fix 3 P1 data-integrity findings from 3-of-3 scrutiny (A+...** | observed-in: d469dfce8 | fix: see commit | verify: `git -C H:/prism show d469dfce8`

- 2026-06-21 | **[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-MILL-PROVEN-REQUIRE-FIX (slot:oscar): fix CommonJS require() in ESM -- mill proven-extraction path w...** | observed-in: f10b3aec2 | fix: see commit | verify: `git -C H:/prism show f10b3aec2`

- 2026-06-21 | **[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-ORCH-TURNING-FIX (slot:oscar): fix P0 LIVE turning bug -- orchestrator rpm/Vc now uses WORKPIECE dia...** | observed-in: 679a27226 | fix: see commit | verify: `git -C H:/prism show 679a27226`

- 2026-06-21 | **[MAIN-FORCE] [FORCE-LOOP-FIX]/U-FORCE-LOOP-STUCK-PICKER (slot:alpha): fix force-loop-continue nag-livelock on a stuck picker** | observed-in: 46d33ef8d | fix: see commit | verify: `git -C H:/prism show 46d33ef8d`

- 2026-06-21 | **[MAIN-FORCE] [FORCE-LOOP-FIX]/U-FORCE-LOOP-STUCK-PICKER-P2 (slot:alpha): document the task-population coupling (scrutiny B P2)** | observed-in: 965b9da54 | fix: see commit | verify: `git -C H:/prism show 965b9da54`

- 2026-06-21 | **[MAIN-FORCE] [FORCE-LOOP-FIX]/U-FORCE-LOOP-STUCK-PICKER-WIKI (slot:alpha): wiki lesson — a wedge/progress detector must key on a monotoni...** | observed-in: 662df285b | fix: see commit | verify: `git -C H:/prism show 662df285b`

- 2026-06-21 | **[MAIN-FORCE] [LEFTOVER-TRUTH]/U-MISC-COMPOUND-BASENAME-FIX (slot:zulu): extractCodeAssets dropped compound basenames -> false-ABSENT -> f...** | observed-in: 1ac297d7c | fix: see commit | verify: `git -C H:/prism show 1ac297d7c`

- 2026-06-22 | **[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-MACHINEAWARE-CONSTRAINTS (slot:oscar): make machine-aware S/F clamping respect per-machine feed/base...** | observed-in: efb570b72 | fix: see commit | verify: `git -C H:/prism show efb570b72`

- 2026-06-22 | **[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-DUALREG-AUDIT (slot:sierra): FAST[]+merge-splice dual-registration auditor + fix 3 echo roosts silently d...** | observed-in: 2d787d609 | fix: see commit | verify: `git -C H:/prism show 2d787d609`

- 2026-06-22 | **[MAIN-FORCE] [SAFETY-UNITS]/U-MINPARSE-UNITS-CYCLE-FIX (slot:alpha): Okuma MIN parser mapped G70/G71 to inch/mm -> roughing-cycle blocks ...** | observed-in: 25f1ee33f | fix: see commit | verify: `git -C H:/prism show 25f1ee33f`

- 2026-06-22 | **[MAIN-FORCE] [LATHE-PRO-MS6a]/U-LPM02-VERIFYSCHEDULE (slot:romeo): implement SyncCodeVerificationEngine.verifySchedule -- fix 7 pre-exist...** | observed-in: a0ffcaf80 | fix: see commit | verify: `git -C H:/prism show a0ffcaf80`

- 2026-06-22 | **[MAIN-FORCE] [FRONTEND-APP]/U-Q-CHECKOUT-OUTCOME-PAGES (slot:quebec): fix post-payment 404 -- checkout success/cancel landings** | observed-in: 4d7441540 | fix: see commit | verify: `git -C H:/prism show 4d7441540`

- 2026-06-22 | **[MAIN-FORCE] [AI-SYSTEMS-WEDM]/U-WEDM-LEARNING-LOOP-RECORD-FIX (slot:india): fix R12 silent-no-op stub -- wedm_learning_loop_record now t...** | observed-in: 62c6c24ad | fix: see commit | verify: `git -C H:/prism show 62c6c24ad`

- 2026-06-22 | **[MAIN-FORCE] [AI-SYSTEMS]/U-OPEN-LOOPS-BACKLOG-VERIFY (slot:india): correct the open-learning-loops backlog -- reject CAM #4 (regression ...** | observed-in: 3e7e3909a | fix: see commit | verify: `git -C H:/prism show 3e7e3909a`

- 2026-06-22 | **[MAIN-FORCE] [JM-FUSION-TOOLS]/U-ROMEO-HOLDER-IMPORT (slot:romeo): holder-catalog -> Fusion import driver + designation-corruption fix** | observed-in: bc9956b61 | fix: see commit | verify: `git -C H:/prism show bc9956b61`

- 2026-06-22 | **[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-FS-INVENTORY-WALK-FIX (slot:sierra): fix the >120s hang/OOM (74,704 L9 over-iteration) + FAST-add -> 301 ...** | observed-in: 56e461eee | fix: see commit | verify: `git -C H:/prism show 56e461eee`

- 2026-06-22 | **[MAIN-FORCE] [OCTOPUS-DRAIN-FIX]/U-DRAIN-WIKI-LESSON (slot:zulu): wiki lesson for the Windows cp.spawn(extensionless shim) ENOENT silent-...** | observed-in: a03ffa60e | fix: see commit | verify: `git -C H:/prism show a03ffa60e`

- 2026-06-22 | **[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-P15-ARC-COMPLETE-DOCS (slot:xray): mark P1.5 region-routing arc COMPLETE -- summary-recompute ...** | observed-in: 7c8ca636b | fix: see commit | verify: `git -C H:/prism show 7c8ca636b`

- 2026-06-22 | **[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-WINDOWSHIDE-DOCS (slot:sierra): wiki lesson + CLAUDE.md regression for the windowsHide console-window fix** | observed-in: f2a5abab9 | fix: see commit | verify: `git -C H:/prism show f2a5abab9`

- 2026-06-22 | **[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-P15-COMPARISON-FINDING (slot:xray): decide-by-the-number -- region routing UNDERPERFORMED full...** | observed-in: ca91dcb5d | fix: see commit | verify: `git -C H:/prism show ca91dcb5d`

- 2026-06-22 | **[MAIN-FORCE] [SFC-BACKEND]/U-OSC9-SPEEDFEED-MATERIAL-AWARE (slot:oscar): fix material-blind prism_calc:speed_feed -- delegate to Ultimate...** | observed-in: 986b36a2b | fix: see commit | verify: `git -C H:/prism show 986b36a2b`

- 2026-06-22 | **[MAIN-FORCE] [HOOK-ROBUSTNESS]/U-BARE-NODE-SPAWN-FIX (slot:zulu): fix 10 silently-broken bare-node spawns -> process.execPath (R15 apply-...** | observed-in: c7e255179 | fix: see commit | verify: `git -C H:/prism show c7e255179`

- 2026-06-22 | **[MAIN-FORCE] [HOOK-ROBUSTNESS]/U-BARE-NODE-SPAWN-FIX-TESTS (slot:zulu): fix the last 5 bare-node spawns (3 test-infra + 2 scratch) -> pro...** | observed-in: 3b8d2e6dc | fix: see commit | verify: `git -C H:/prism show 3b8d2e6dc`

- 2026-06-22 | **[MAIN-FORCE] [HOOK-ROBUSTNESS]/U-BARE-NODE-CLOSEOUT-FIX (slot:zulu): fix close-out-milestone.mjs bare-node spawns -> process.execPath (ro...** | observed-in: 0e95e0843 | fix: see commit | verify: `git -C H:/prism show 0e95e0843`

- 2026-06-23 | **[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-P15-REGION-NONDIM-RESCUE (slot:xray): recover region GD&T/notes on the dense-rescue path (regi...** | observed-in: e7fd24791 | fix: see commit | verify: `git -C H:/prism show e7fd24791`

- 2026-06-23 | **[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-OCR-ADAPTER-WIRE-EXEMPT-REVERT (slot:xray): revert the WIRE-EXEMPT marker from the prior commi...** | observed-in: 8ec7abf1d | fix: see commit | verify: `git -C H:/prism show 8ec7abf1d`

- 2026-06-23 | **[MAIN-FORCE] [AI-SYSTEMS]/U-DEEPAI-SUGGEST-TIMING-FIX (slot:india): DeepAIIntelligenceEngine.deepReason returned processingTimeMs=0 (Date...** | observed-in: 22d4536e9 | fix: see commit | verify: `git -C H:/prism show 22d4536e9`

- 2026-06-23 | **[MAIN-FORCE] [FRONTEND-APP]/U-SHELL-OUTDIR-ALIGN (slot:charlie): fix Electron+Capacitor shells packaging an EMPTY SPA -- align webDir/fil...** | observed-in: 3ba3a7f6e | fix: see commit | verify: `git -C H:/prism show 3ba3a7f6e`

- 2026-06-23 | **[MAIN-FORCE] [AI-SYSTEMS]/U-DEEPAI-SUGGEST-FALLBACK-PIN (slot:india): pin the cold-awareness suggestions fallback with a focused regressi...** | observed-in: efc891c3a | fix: see commit | verify: `git -C H:/prism show efc891c3a`

- 2026-06-23 | **[MAIN-FORCE] [AI-SYSTEMS]/U-SELFAWARE-EXPORT-CLASS (slot:india): export the PRISMSelfAwarenessEngine class (engine-convention fix -- 'eve...** | observed-in: ad65e6c5f | fix: see commit | verify: `git -C H:/prism show ad65e6c5f`

- 2026-06-23 | **[MAIN-FORCE] [LAUNCH-FE]/U-Q-CUSTOMER-SIGNUP (slot:quebec): customer signup page + AuthContext.register + /signup route + G5 backend regi...** | observed-in: 89245bbfb | fix: see commit | verify: `git -C H:/prism show 89245bbfb`

- 2026-06-23 | **[MAIN-FORCE] [AI-SYSTEMS]/U-SELFAWARE-COVERAGE-FILL-P1 (slot:india): tighten getJMDieProgramPaths test to assert dir BASENAME (scrutiny P...** | observed-in: a3e0117b2 | fix: see commit | verify: `git -C H:/prism show a3e0117b2`

- 2026-06-23 | **[MAIN-FORCE] [AI-SYSTEMS]/U-LEARNLOOP-CLEARALL-ISOLATION (slot:india): fix LearningLoopEngine.clearAll test-isolation -- mark initialized...** | observed-in: 86df6d9fa | fix: see commit | verify: `git -C H:/prism show 86df6d9fa`

- 2026-06-23 | **[MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-XGAL-MILL-PDF-WIRE-TESTS (slot:sierra): R9 regression lock for the milling-bridge wire** | observed-in: d86206339 | fix: see commit | verify: `git -C H:/prism show d86206339`

- 2026-06-23 | **[MAIN-FORCE] [LAUNCH-FE]/U-Q-LOGIN-TOKEN (slot:quebec): fix THE wave-1 E2E blocker -- login() read the wrong token path so no session eve...** | observed-in: 3ad292ee4 | fix: see commit | verify: `git -C H:/prism show 3ad292ee4`

- 2026-06-23 | **[MAIN-FORCE] [AI-SYSTEMS]/U-INCRLEARN-STALE-MODEL-TAG (slot:india): fix stale IncrementalLearningEngine test -- retired qwen2.5-coder:7b ...** | observed-in: e2a41e1af | fix: see commit | verify: `git -C H:/prism show e2a41e1af`

- 2026-06-23 | **[MAIN-FORCE] [AI-SYSTEMS]/U-LORACOMP-FLAKE-FIX (slot:india): fix loraComposition mlDispatcher test flake -- await the real handler promis...** | observed-in: b716e0414 | fix: see commit | verify: `git -C H:/prism show b716e0414`

- 2026-06-23 | **[MAIN-FORCE] [SFC-PAGE-CLOSED-LOOP]/U-ENGAGEMENT-ARC-DOUBLING-FIX (slot:oscar): fix the 2x-doubled engagement arc in calculateEngagementA...** | observed-in: 247c5856f | fix: see commit | verify: `git -C H:/prism show 247c5856f`

- 2026-06-23 | **[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-READING-GUIDANCE-VALIDATE-WIRE (slot:xray): wire --reading-guidance into validate-perfect-part...** | observed-in: 0b1452bb4 | fix: see commit | verify: `git -C H:/prism show 0b1452bb4`

- 2026-06-23 | **[MAIN-FORCE] [QUOTING]/U-QT04 (slot:charlie): make-vs-buy panel + FIX 3 silently-dead quoting FE panels (bare /quoting body)** | observed-in: d526c01ed | fix: see commit | verify: `git -C H:/prism show d526c01ed`

- 2026-06-23 | **[MAIN-FORCE] [AI-SYSTEMS-CONSENSUS]/U-AUTOCONSENSUS-TEST-WORKTREE-FIX (slot:india): AutoConsensusHooks.test.ts 3 red -> 23/23. Repoint st...** | observed-in: b637e0be7 | fix: see commit | verify: `git -C H:/prism show b637e0be7`

- 2026-06-23 | **[MAIN-FORCE] [SFC-PAGE-CLOSED-LOOP]/U-SFC-MATERIAL-CANONICAL-DOCS (slot:oscar): CLAUDE.md regression line for 4ad8a0116b (SFC inline-mate...** | observed-in: ddba51015 | fix: see commit | verify: `git -C H:/prism show ddba51015`

- 2026-06-23 | **[MAIN-FORCE] [QA-REGRESSION-WIRE-MS0]/U-REGRESSION-BASELINE-WIRE (slot:zulu): wire orphaned RegressionBaselineEngine onto prism_dev (CI d...** | observed-in: b3356e88c | fix: see commit | verify: `git -C H:/prism show b3356e88c`

- 2026-06-23 | **[MAIN-FORCE] [POST-PROCESSOR]/U-PP-KIENZLE-EMIT-REGRESSION (slot:echo): lock Stage-1.1 emitted force == canonical kienzleForce of reporte...** | observed-in: 7cf0427bf | fix: see commit | verify: `git -C H:/prism show 7cf0427bf`

- 2026-06-23 | **[MAIN-FORCE] [QUOTING]/U-WHATIF01-WIKI (slot:charlie): wiki lesson for the estimate-flow envelope+nested dead-path fix** | observed-in: b628263cd | fix: see commit | verify: `git -C H:/prism show b628263cd`

- 2026-06-23 | **[MAIN-FORCE] [SFC-PAGE-CLOSED-LOOP]/U-SFC-DEFLECTION-VC-LEVER-DOCS (slot:oscar): CLAUDE.md regression line + wiki lesson for the deflecti...** | observed-in: fc2171e4c | fix: see commit | verify: `git -C H:/prism show fc2171e4c`

- 2026-06-23 | **[MAIN-FORCE] [POST-PROCESSOR]/U-PP-GCODE-OPT-CLASSIFIER-TIGHTEN (slot:echo): fix arc classifier miscounting G20/G21/G28/G30 as arcs** | observed-in: 39e8324c3 | fix: see commit | verify: `git -C H:/prism show 39e8324c3`

- 2026-06-23 | **[MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-5AX-DEEPLEARN-WIRE (slot:india): fix DARK five_axis_deep_learn + close its learning loop** | observed-in: 50143ece3 | fix: see commit | verify: `git -C H:/prism show 50143ece3`

- 2026-06-23 | **[MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-DARK-FACADE-INDIA-VERIFY (slot:india): verified india's 13 dark actions into a fix-ready queue (4 clean)** | observed-in: 0e491a59d | fix: see commit | verify: `git -C H:/prism show 0e491a59d`

- 2026-06-23 | **[MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-XDOMAIN-ORCH-WIRE (slot:india): fix dark cross_domain_orchestrate -> real static planJob (1st from the...** | observed-in: 964535033 | fix: see commit | verify: `git -C H:/prism show 964535033`

- 2026-06-23 | **[MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-WETRUN-PILOT-WIRE (slot:india): fix dark wet_run_pilot_orchestrate -> real pilotPromotionReadiness (3r...** | observed-in: 62661e33f | fix: see commit | verify: `git -C H:/prism show 62661e33f`

- 2026-06-23 | **[MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-UNCERTAINTY-PIPELINE-WIRE (slot:india): fix dark uncertainty_pipeline_run -> real propagate (4th/last ...** | observed-in: 82aa392d6 | fix: see commit | verify: `git -C H:/prism show 82aa392d6`

- 2026-06-23 | **[MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-SMARTTOOL-ORCH-WIRE (slot:india): fix dark smart_tool_select -> real selectToolOrchestrated (was mis-f...** | observed-in: 29af45fc1 | fix: see commit | verify: `git -C H:/prism show 29af45fc1`

- 2026-06-23 | **[MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-SAMPLING-PLAN-WIRE (slot:india): fix dark sampling_plan_generate -> mil1916/aoqlPlan standard router (...** | observed-in: d1a97a3a4 | fix: see commit | verify: `git -C H:/prism show d1a97a3a4`

- 2026-06-23 | **[MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-MIT-KNOWLEDGE-QUERY-WIRE (slot:india): fix dark mit_course_knowledge_query -> searchAlgorithms/searchC...** | observed-in: 9c4e94ff9 | fix: see commit | verify: `git -C H:/prism show 9c4e94ff9`

- 2026-06-23 | **[MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-ROLLBACK-PLAN-WIRE (slot:india): fix dark rollback_plan_build -> real positional planRollback/planAndV...** | observed-in: bb5605b55 | fix: see commit | verify: `git -C H:/prism show bb5605b55`

- 2026-06-23 | **[MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-RAW-GRAPH-PARSE-GUARD (slot:sierra): regression-lock the 875MB-graph string-cap crash class** | observed-in: 1ffd8c229 | fix: see commit | verify: `git -C H:/prism show 1ffd8c229`

- 2026-06-23 | **[MAIN-FORCE] [SFC-FRONTEND]/U-SFC-FE-TEST-OVERSTRICT (slot:oscar): fix 2 over-strict getByText->getAllByText in CalculatorPage tests** | observed-in: e1a5c5723 | fix: see commit | verify: `git -C H:/prism show e1a5c5723`

- 2026-06-23 | **[MAIN-FORCE] [SFC-FRONTEND]/U-SFC-FE-UNIT-TOGGLE-TEST (slot:oscar): fix over-strict tool-diameter query in inch/metric test** | observed-in: 4cc78761a | fix: see commit | verify: `git -C H:/prism show 4cc78761a`

- 2026-06-23 | **[MAIN-FORCE] [CAD-DRAW-MAX]/U-XRAY-CORPUS-TOLERANCE-SHAPE-FIX (slot:xray): fix 16 tsc errors -- cad-validation-corpus callouts to real To...** | observed-in: 91c5d7c98 | fix: see commit | verify: `git -C H:/prism show 91c5d7c98`

- 2026-06-23 | **[MAIN-FORCE] [SFC-FRONTEND]/U-SFC-FE-LATHE-G71-ASYNC (slot:oscar): fix manual-lathe G71 test async-timing** | observed-in: 06c187cc9 | fix: see commit | verify: `git -C H:/prism show 06c187cc9`

- 2026-06-23 | **[MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-DEADPIXEL-CAPSAFE (slot:sierra): fix dead-pixel-guard raw 875MB-graph utf8 parse (string-cap crash class)** | observed-in: 42bf1c598 | fix: see commit | verify: `git -C H:/prism show 42bf1c598`

- 2026-06-23 | **[MAIN-FORCE] [CAD-LEARNING-AI]/U-CAD-LEARN-STATS-RATE-FIX (slot:india): cad_learning_stats byCategory credited 0 successes on pass -> inf...** | observed-in: fd78507a7 | fix: see commit | verify: `git -C H:/prism show fd78507a7`

- 2026-06-23 | **[MAIN-FORCE] [CAM-PARITY-AGI]/U-XRAY-POWERMILL-RECOMMEND-WIRE-ENGINE (slot:xray): land the PowerMill engine fix DROPPED by 134b0e74bd's l...** | observed-in: 9e755f940 | fix: see commit | verify: `git -C H:/prism show 9e755f940`

- 2026-06-23 | **[MAIN-FORCE] [PDF-TRIBAL-HERMES]/U-TRIBAL-DRAIN-LOCK-PIDLIVE (slot:zulu): fix dead-lock that froze the overnight drain -- PID-liveness + ...** | observed-in: 5dc91d9cb | fix: see commit | verify: `git -C H:/prism show 5dc91d9cb`

- 2026-06-24 | **[MAIN-FORCE] [TEST-INTEGRITY]/U-RIGOR-JUDGE-HERMES-MODEL-FIX (slot:alpha): fix ollama --model forwarded to hermes fallback (HTTP 400) + o...** | observed-in: 02641a95c | fix: see commit | verify: `git -C H:/prism show 02641a95c`

- 2026-06-24 | **[MAIN-FORCE] [TEST-INTEGRITY]/U-STOPGATE-R9 (slot:alpha): land stop_on_failing_tests stale-green freshness block (net-new vs HEAD) + extr...** | observed-in: ab2b3bc84 | fix: see commit | verify: `git -C H:/prism show ab2b3bc84`

- 2026-06-24 | **[MAIN-FORCE] [TEST-INTEGRITY]/U-RIGOR-JUDGE-CLI-R9 (slot:alpha): R9 coverage for the AI judge fallback ladder -- make callJudge callers-i...** | observed-in: 1a0177736 | fix: see commit | verify: `git -C H:/prism show 1a0177736`

- 2026-06-24 | **[MAIN-FORCE] [QUOTING]/U-COSTPAGE-SHAPE (slot:charlie): fix CostEstimatorPage dead-panel -- route shape adapter + {result} envelope unwrap** | observed-in: 940599eeb | fix: see commit | verify: `git -C H:/prism show 940599eeb`

- 2026-06-24 | **[MAIN-FORCE] [HERMES-UTIL]/U-HERMES-VERIFIED-TIER-WIRE (slot:alpha): wire tiered verified-offload into the canonical ollama-offload.mjs C...** | observed-in: a6a6243a2 | fix: see commit | verify: `git -C H:/prism show a6a6243a2`

- 2026-06-24 | **[MAIN-FORCE] [POST-PROCESSOR]/U-PP-BACKPLOT-G0NORM (slot:echo): fix dead backplot gouge + rapid-into-material detection (G0-normalization...** | observed-in: 8f4787223 | fix: see commit | verify: `git -C H:/prism show 8f4787223`

- 2026-06-24 | **[MAIN-FORCE] [CAD-LEARNING-AI]/U-BPA-WRITER-CONSOLIDATE-ALL-FIX (slot:india): drop now-unused mkdirSync import in print-to-cam** | observed-in: 23ce35bd4 | fix: see commit | verify: `git -C H:/prism show 23ce35bd4`

- 2026-06-24 | **[MAIN-FORCE] [BACKEND-INTEGRITY]/U-FLEET-DISPATCHER-DRIFT-REMEDIATION (slot:xray): fix 25 dispatcher->engine method-drift actions + patch...** | observed-in: d8b102291 | fix: see commit | verify: `git -C H:/prism show d8b102291`

- 2026-06-24 | **[MAIN-FORCE] [CAD-LEARNING-AI]/U-TRIBAL-DRAIN-TASK-FIX (slot:india): rename $args->$taskArgs (PS automatic-var shadow) + fix MaxPdfs doc ...** | observed-in: 454cf4127 | fix: see commit | verify: `git -C H:/prism show 454cf4127`

- 2026-06-24 | **[MAIN-FORCE] [SFC-FRONTEND]/U-SFC-MILL-SURFACE-FINISH (slot:oscar): implement MillSurfaceFinishPanel helpers (28 red->green) + fix whole-...** | observed-in: ea24d9cee | fix: see commit | verify: `git -C H:/prism show ea24d9cee`

- 2026-06-24 | **[MAIN-FORCE] [POST-PROCESSOR]/U-PP-MEMORY-CURRENT-STATE (slot:echo): bump galaxy MEMORY.md CURRENT STATE -- 515 tests/10 engines + U-PP-B...** | observed-in: 32e0ea7d9 | fix: see commit | verify: `git -C H:/prism show 32e0ea7d9`

- 2026-06-24 | **[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-OFFLOAD-STATS-BUMP-DEDUP (slot:alpha): extract shared atomic-RMW offload-stats envelope (scripts/lib/offl...** | observed-in: 7d6f31499 | fix: see commit | verify: `git -C H:/prism show 7d6f31499`

- 2026-06-24 | **[MAIN-FORCE] [TEST-INTEGRITY]/U-STOPGATE-WIKI (slot:papa): code-tribal learning for the session-attribution freshness fix + rename under-...** | observed-in: e04a76493 | fix: see commit | verify: `git -C H:/prism show e04a76493`

- 2026-06-24 | **[MAIN-FORCE] [PSN-TRAINING]/U-PSN-CORPUS-HEAP-GUARD (slot:papa): self-reexec --max-old-space-size guard so the PSN training-corpus build ...** | observed-in: cf7c3bcc0 | fix: see commit | verify: `git -C H:/prism show cf7c3bcc0`

- 2026-06-24 | **[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-ZULU-ROUTE-MODEL-LATENCY (slot:zulu): point the auto-route gist model at the fast trivial tier so reroute...** | observed-in: 57caa974e | fix: see commit | verify: `git -C H:/prism show 57caa974e`

- 2026-06-24 | **[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-ZULU-ROUTE-MODEL-DOCDRIFT (slot:zulu): fix JSDoc default-model drift (32b->1.5b) flagged by 2-of-2 scruti...** | observed-in: e667e5d70 | fix: see commit | verify: `git -C H:/prism show e667e5d70`

- 2026-06-24 | **[MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-DOMAIN-RECALL-VERIFY (slot:papa): verify reclassifier recall ceiling -- bucketed 704 neither (192 ...** | observed-in: 4a987399b | fix: see commit | verify: `git -C H:/prism show 4a987399b`

- 2026-06-24 | **[MAIN-FORCE] [OLLAMA-STRESS]/U-ALPHA-OLLAMA-NUMCTX-WIRE (slot:alpha): wire the proven num_ctx fix into the fleet offload path (R15 complete)** | observed-in: 07c67700d | fix: see commit | verify: `git -C H:/prism show 07c67700d`

- 2026-06-24 | **[MAIN-FORCE] [AUTONOMOUS-FLEET]/U-STOP-FORCE-HANDOFF-PEERLEAK (slot:papa): fix full-UUID-vs-short-chatId peer-leak -- the Stop hook got s...** | observed-in: 66a0154e7 | fix: see commit | verify: `git -C H:/prism show 66a0154e7`

- 2026-06-24 | **[MAIN-FORCE] [AUTONOMOUS-FLEET]/U-STOP-FORCE-HANDOFF-PEERLEAK-WIKI (slot:papa): code-tribal lesson for the full-UUID-vs-short-chatId Stop...** | observed-in: 4761a1983 | fix: see commit | verify: `git -C H:/prism show 4761a1983`

- 2026-06-24 | **[MAIN-FORCE] [OLLAMA-STRESS]/U-ALPHA-OLLAMA-NUMCTX-CJK-FIX (slot:alpha): size num_ctx by UTF-8 BYTES not chars/3 -- fixes a CJK/non-Latin...** | observed-in: 4ec7e7c1e | fix: see commit | verify: `git -C H:/prism show 4ec7e7c1e`

- 2026-06-24 | **[MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-DOMAIN-KNOWLEDGE-LORA (slot:papa): inject rescued domain knowledge into ACTUAL LoRA training (oper...** | observed-in: ddfb66eab | fix: see commit | verify: `git -C H:/prism show ddfb66eab`

- 2026-06-24 | **[MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-LORA-SCRUTINY-FIXUP (slot:papa): 3-of-3 arm-C P1 -- strip C0/C1/DEL control bytes in cleanText + s...** | observed-in: 2ff58c298 | fix: see commit | verify: `git -C H:/prism show 2ff58c298`

- 2026-06-24 | **[MAIN-FORCE] [OLLAMA-STRESS]/U-ALPHA-OLLAMA-CODEGEN-SANDBOX-FIX (slot:alpha): close a vm sandbox ESCAPE in the codegen battery (Workflow ...** | observed-in: f00515f3d | fix: see commit | verify: `git -C H:/prism show f00515f3d`

- 2026-06-24 | **[MAIN-FORCE] [FLEET-TASK-HEALTH]/U-NNGRAPH-WARN-ROOTCAUSE (slot:india): diagnose the recurring every-Stop NN-Graph-Retrain=stale WARN -- ...** | observed-in: d90e92c53 | fix: see commit | verify: `git -C H:/prism show d90e92c53`

- 2026-06-24 | **[MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-NEAR-ARGFIX (slot:sierra): fix P0 bare 'near <id>' never extracted the id (3-of-3 arm B catch)** | observed-in: 4dcc21826 | fix: see commit | verify: `git -C H:/prism show 4dcc21826`

- 2026-06-24 | **[MAIN-FORCE] [POST-PROCESSOR]/U-PP-AMFINISHING-ASCII-FIX (slot:echo): replace 118 U+2500 box-drawing divider chars with ASCII in PostAMFi...** | observed-in: a5998c580 | fix: see commit | verify: `git -C H:/prism show a5998c580`

- 2026-06-24 | **[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-NEEDS-CONFIRM-HALLUCINATION (slot:xray): fix the confidence gate -- a single-model (hallucinat...** | observed-in: 7bcd73ab9 | fix: see commit | verify: `git -C H:/prism show 7bcd73ab9`

- 2026-06-24 | **[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-FEEDER-SPECULATIVE-WARN-DOC (slot:india): memory + handoff for the feeder fail-loud fix -- 2 recovera...** | observed-in: eafc455f4 | fix: see commit | verify: `git -C H:/prism show eafc455f4`

- 2026-06-24 | **[MAIN-FORCE] [SFC-JM-PROVEN]/U-SFC-JM-PROVEN-SFM-UNITS (slot:oscar): JM proven CSS is SFM not m/min -- units fix INVERTS the divergence v...** | observed-in: e0fdd23c5 | fix: see commit | verify: `git -C H:/prism show e0fdd23c5`

- 2026-06-24 | **[MAIN-FORCE] [SFC-JM-PROVEN]/U-SFC-JM-PROVEN-DIVERGENCE-CSSUNIT (slot:oscar): divergence reads the store's own cssUnit -- forward-compat ...** | observed-in: 8d01248f4 | fix: see commit | verify: `git -C H:/prism show 8d01248f4`

- 2026-06-25 | **[MAIN-FORCE] [CAD-LEARNING-AI]/U-BPA-LOOP-DRAIN-CORE (slot:india): injectable closed-loop drain core (resolveDispatch + drainEvents, fail...** | observed-in: da9f7cc3c | fix: see commit | verify: `git -C H:/prism show da9f7cc3c`

- 2026-06-25 | **[MAIN-FORCE] [SFC-VENDOR-PARITY]/U-OSC-TEST15-ALU-COVERAGE (slot:oscar): fix stale aluminum-unclamped coverage threshold (pre-existing fa...** | observed-in: 7de7f110e | fix: see commit | verify: `git -C H:/prism show 7de7f110e`

- 2026-06-25 | **[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-REFPOOL-GROW-FIX-ESTIMATE (slot:india): scrutiny-caught mislabel -- prism_business:estimate -> estimate_c...** | observed-in: 783615cd3 | fix: see commit | verify: `git -C H:/prism show 783615cd3`

- 2026-06-25 | **[MAIN-FORCE] [OLLAMA-ROUTING]/U-ALPHA-OLLAMA-ROSTER-SYNC (slot:alpha): wedge-safe full-roster capability probe + restore the DEAD `balanc...** | observed-in: 69bd13c82 | fix: see commit | verify: `git -C H:/prism show 69bd13c82`

- 2026-06-25 | **[MAIN-FORCE] [BLUEPRINT-VISION]/U-XRAY-REDACT-SPEC-FIELD-GRADE-GUARD (slot:xray): fix the under-redaction P1 (3-of-3 arm C) -- value-awar...** | observed-in: 9ff067db3 | fix: see commit | verify: `git -C H:/prism show 9ff067db3`

- 2026-06-25 | **[MAIN-FORCE] [SFC-WEB-ACCURACY]/U-OSC-SFC-PRODUCT-BRIDGE (slot:oscar): SFC web calculator was non-functional -- prism_product:sfc_calcula...** | observed-in: dec03327c | fix: see commit | verify: `git -C H:/prism show dec03327c`
