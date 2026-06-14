# ECHO FORGE ROADMAP (v2 — H-drive-wide ultracode synthesis)
**Date:** 2026-06-09 · **Slot:** echo (post-processors) · **Branch:** cad-fusion-live-ms0
**Supersedes:** v1 (commit `e5ef8227`, 7-slice Ollama dive). This v2 is the broader, ultracode-synthesized version the operator requested.

## Method (rate-limit-safe; Ollama bulk + ultracode synthesis)
1. **Deep-dive = LOCAL Ollama** (`qwen2.5-coder:32b`, **17 corpus slices** across ALL echo + post-processor work on H: — specs, the 89K adversarial digest, galaxy MEMORY/synthesis/KB, Hurco/india/consolidation specs, open handoff threads. Zero Claude API.) -> `state/shared/cimco/echo-forge-dive.{json,md}`.
2. **Synthesis = ultracode Workflow** (`wf_71586f0f-084`): 3 strategic-lens agents (closed-loop / product-launch / learning+cross-domain) -> 1 synthesis agent. Bounded 4-agent fan-out (the first attempt rate-limited at 6+; this one completed clean, 844K subagent tokens).
3. **Ground truth = git** (the dive read PLAN docs and over-lists shipped work; the synthesis subtracted the git-verified shipped set).

## Verification + corrections (R12 — I checked the load-bearing claims)
- **VERIFIED:** `registerPPDispatcher` IS commented out at `src/index.ts:229` and `:739` (`// NOT ON THIS BRANCH`); `ppDispatcher.ts` exists with **802 cases**. The `prism_pp` post surface is genuinely dark. **Caveat:** it is disabled as `NOT ON THIS BRANCH` alongside agentDispatcher + resourceHarvestingDispatcher — likely a deliberate branch-scope decision, so `U-PP-DISPATCHER-REGISTER` must start with a build check (uncommenting may surface branch-specific compile errors), not a blind uncomment.
- **CORRECTION:** `U-CIMCO-SIM-1A-P2` (read-report -> sim-driver wire) is listed below as `[NOW]` pending, but it **SHIPPED THIS SESSION** (driver `read-report` mode + `assessReadReport` + 12 tests, 52/52 green; commit follows this file). Treat Phase 5's first row as DONE.

---

# PRISM Echo (Post-Processor) Galaxy Finalization Roadmap

## Executive Summary
Echo is approximately 80 percent of the way to its north-star. The CIMCO closed-loop spine is fully shipped end to end at the engine + scripting layer (SPINE-1 verification bridge with `prism_cimco` 12 actions, SIM-2..7 covering sim-driver, UI-map FSM, bind gate, completion gate, the 5-gate `assessLiveRunClearance`, and the SIM-7 fleet rollup that already classifies 12 sim-able + 3 EDM-routed machines), plus the entire POST-BRIDGE-SYNERGY envelope (V11 fixes, EMIT-*, NOVEL-*, CAM add-ins) and the 2,588-row alarm DB wired at Stage 5.1b. The remaining work is NOT new physics; it is (1) closing the last read-report wire so the sim verdict is real and not faked [DONE this session], (2) lighting up the dark `prism_pp` tool surface so the post engines are actually reachable, (3) making the masked WEDM/lathe/AGI engines real, (4) building the launch-readiness CI + learning loop, and (5) the operator-gated LIVE interactive CIMCO loop and legal sign-off. The critical path to "closed-loop testing on all 15 JM machines" is short and almost entirely [NOW]-buildable up to the single operator action of opening CIMCO Edit interactively on VMC-01.

## Shipped Reconciliation (do NOT re-propose)
SHIPPED: CIMCO SPINE-1 (CimcoVerificationBridgeEngine + prism_cimco 12 actions) + SPINE-2 SIM-2..7 (sim-driver, ui-map FSM, bind gate, completion gate, 5-gate assessLiveRunClearance, fleet rollup 12 sim + 3 EDM) + U-CIMCO-SIM-1A PART 1 (commit 01c53f6872: C# --op read-report MSAA reader + cimco-report-normalize.mjs + 15 tests) + **U-CIMCO-SIM-1A PART 2 (this session: sim-driver read-report mode + assessReadReport + 12 tests)** + POST-BRIDGE-SYNERGY envelope (~40 units: V11 x6, EMIT-*, NOVEL-* x5, Mastercam/hyperMILL/Inventor add-ins, BRIDGE-CONTRACT-VERIFY) + alarm-DB (2,588 rows) wired at Stage 5.1b.

## Phases

### PHASE 0 -- Pre-Diligence Hygiene (cheapest, no dependencies)
| id | what | tag | effort | dependency | done-when |
|----|------|-----|--------|------------|-----------|
| U-ECHO-FINETUNE-RED-GREEN | Green the 2 RED specs in MasterPostFineTuningEngine.test.ts (getConfidenceScore stability not in {stable,converging}); 44/46 -> 46/46 | [NOW] | h | none | `vitest run MasterPostFineTuningEngine.test.ts` reports 46/46 pass, 0 RED |
| U-PP-MISSING-ENGINE-TESTS | Add the 7 absent engine tests: ThermalWearCoupling / ConstitutiveModel / PredictionCalibration / BoringBarDeflection / InstantaneousEngagement / SpeedFeedOrchestrator / EngagementAdaptiveFeed | [NOW] | w | none | 7 new `*.test.ts` files exist, each with real reference-value asserts (no toBeDefined stubs), all green |
| U-PP-KIENZLE-EMIT-REGRESSION | Kienzle -> feed/RPM emit-boundary regression test through PostProcessorPipelineEngine P1; assert emitted F/S equals physics-core output | [NOW] | d | none | test fails if emitted F/S drifts from physics-core value; passes at parity on Hurco/Okuma/Haas goldens |

### PHASE 1 -- Make the Masked Engines Real (verifiable cores, before exposure)
| id | what | tag | effort | dependency | done-when |
|----|------|-----|--------|------------|-----------|
| U-ECHO-WEDM-DIALECT-UNMASK | Make Sodick/Makino/Agie/Fanuc WEDM posts REAL + reachable (drop the engine.method?.() mask); Mitsubishi already real | [NOW] | 1.5d | none | each of 4 engines emits a real NC string proven byte-equiv vs its golden; no method?.() mask remains in grep |
| U-PP-LATHE-LEARNERS-REAL | Un-dark the 3 lathe learners: LathePostProcessorAIEngine (73K, largest dark), JMDiePostProcessorLearningEngine, LathePostGeneratorActiveLearningEngine -> >=1 real executing path each | [NOW] | w | none | each engine has >=1 real method executing real logic (not stub-return), unit-tested with a reference assertion |
| U-PP-AGI-SURFACE | Give the ~14 AGI engines >=1 REAL case each: MasterPostProcessorUnifiedAGIEngine, MachineFingerprintEngine, CrossCAMPostEngine, HybridPostMergeEngine, NovelPostProcessorBridgeEngine, PostProcessorTransformerEngine, PostProcessorAGIContinuousLearningEngine | [NOW] | w | none | each engine imported + invoked by a real ppDispatcher case returning real output, round-trip asserted |

### PHASE 2 -- Expose the Post Surface (consumer atop now-proven engines)
| id | what | tag | effort | dependency | done-when |
|----|------|-----|--------|------------|-----------|
| U-PP-DISPATCHER-REGISTER | Uncomment + wire registerPPDispatcher at src/index.ts:229/739 so prism_pp (ppDispatcher.ts, 802 cases) is exposed. **START with a build check** -- it is disabled `NOT ON THIS BRANCH`, so confirm it compiles on cad-fusion-live-ms0 before relying on the uncomment | [NOW] | d | U-ECHO-WEDM-DIALECT-UNMASK, U-PP-LATHE-LEARNERS-REAL, U-PP-AGI-SURFACE | prism_pp appears in the live MCP tool list; a smoke action round-trips through the dispatcher and returns real output; no "NOT ON THIS BRANCH" comment remains; build green |
| U-MASTERPOST-FACADE | Declare ONE canonical MasterPost facade over MasterPostProcessor{UnifiedAGI,Genius,AGIOrchestration}Engine so consumers bind one entry, not 4 | [NOW] | d | U-PP-DISPATCHER-REGISTER | a single facade module is the sole import for MasterPost consumers; the 4 underlying engines reachable only through it; test asserts each route resolves |

### PHASE 3 -- Golden-NC CI Gate (proves correctness before any live machine)
| id | what | tag | effort | dependency | done-when |
|----|------|-----|--------|------------|-----------|
| U-ECHO-GOLDEN-NC-CI | Golden-NC byte-equivalence CI harness adding Fanuc/Siemens/Heidenhain to the proven Hurco/Okuma/Haas (covers the 3 EDM-routed + non-sim controllers); no golden*nc harness currently exists in src/__tests__ | [NOW] | w | U-ECHO-WEDM-DIALECT-UNMASK, U-PP-DISPATCHER-REGISTER | CI workflow gates >=6 controllers (Hurco/Okuma/Haas/Fanuc/Siemens/Heidenhain) on byte-equiv vs golden; red on any drift |

### PHASE 4 -- Learning Loop (closed-loop auto-tap on proven feedback path)
| id | what | tag | effort | dependency | done-when |
|----|------|-----|--------|------------|-----------|
| U-ECHO-FEEDBACKBUS-SUBSCRIBER | Add the FeedbackBus -> MasterPostFineTuningEngine.recordActualVsPredicted subscriber + de-circularize the reward (score actual-vs-golden, not predicted-vs-predicted) | [NOW] | d | U-ECHO-FINETUNE-RED-GREEN | a FeedbackBus event triggers recordActualVsPredicted automatically; reward scores against golden NC, test proves no predicted-vs-predicted circularity |
| U-ECHO-JMPOST-FEEDER | Add learnFromModified(modifiedPost) ingestion + vendor-branching so operator-edited JM .cps deltas feed the loop (currently zero JM-post feeder) | [NOW] | d | U-ECHO-FEEDBACKBUS-SUBSCRIBER | feeding a modified JM .cps delta produces a recorded training triple tagged by vendor; asserted on a real JM sample |
| U-PP-THERMAL-LITERATURE | Replace the linear T_cut hack in MasterPostFineTuning's reward with a literature thermal model (cited constants, imported from constants.ts, never inlined) | [NOW] | d | U-ECHO-FINETUNE-RED-GREEN | reward uses a cited thermal model; constants sourced from physics/constants.ts; test asserts non-linear T_cut response vs a reference point |
| U-ECHO-NN-REAL-TRAIN | Replace _trainingHistory.push accumulator with a real PostProcessorNeuralNetworkEngine.train() (epoch loop over the triples + backprop) | [india] | 1.5d | U-ECHO-JMPOST-FEEDER | train() runs an epoch loop reducing loss on a held set; test asserts loss decreases across epochs (not a no-op push) |

### PHASE 5 -- CIMCO Read-Report Wire (close the last sim verdict gap)
| id | what | tag | effort | dependency | done-when |
|----|------|-----|--------|------------|-----------|
| U-CIMCO-SIM-1A-P2 | **SHIPPED THIS SESSION** -- sim-driver `read-report` mode consuming the part-1 C# reader + cimco-report-normalize.mjs; assessReadReport gates clearance on a real (grid/textscrape/empty) read; 12 tests | [DONE] | -- | PART 1 (01c53f6872) | DONE: `node --test scripts/cimco-sim-driver.test.mjs` 52/52; a blocked/opaque read never clears |
| U-CIMCO-FSM-LIVE-DRIVE | FSM live drive chain in the sim-driver: navigate (PrismCimcoUI map/find/window-info) -> run -> read-report -> feed assessLiveRunClearance 5-gate | [NOW] | 2-3d | U-CIMCO-SIM-1A-P2 (done) | the full FSM chain executes navigate->run->read-report->assessLiveRunClearance end to end in a dry/recorded harness, returning a 5-gate clearance verdict |

### PHASE 6 -- LIVE Operator-Gated CIMCO Loop (the north-star)
| id | what | tag | effort | dependency | done-when |
|----|------|-----|--------|------------|-----------|
| U-LEGAL-13 | Operator legal gate: confirm public-manuals-only provenance before any post ships to a live machine | [OP-GATED] | h | none | operator records a public-manuals-only provenance sign-off; no post ships to a live machine without it |
| U-CIMCO-OPEN-VMC01 | Operator opens CIMCO Edit interactively on VMC-01 (Codejock/Machine-Sim ribbon realizes only in a foreground session); confirm Machine-Sim enabled | [OP-GATED] | h | U-CIMCO-FSM-LIVE-DRIVE | CIMCO Edit is open in a foreground session on VMC-01 with Machine-Sim confirmed enabled; PrismCimcoUI window-info resolves the ribbon |
| U-CIMCO-LIVE-E2E-VMC01 | First live closed-loop E2E on VMC-01: post -> NC -> CIMCO sim -> read-report -> cimco_live_run_clearance, with a real JM part | [OP-GATED] | d | U-CIMCO-OPEN-VMC01, U-LEGAL-13 | a real JM part runs the full post->sim->read-report->clearance loop on VMC-01 and emits a recorded clearance verdict |
| U-CIMCO-FLEET-ROLLOUT | Roll the proven loop across the 12 sim-able machines + confirm the 3 EDM-routed machines fall through to the EDM path (SIM-7 rollup lists them) | [OP-GATED] | 2-3d | U-CIMCO-LIVE-E2E-VMC01 | all 12 sim-able machines pass a live loop; the 3 EDM-routed machines confirmed routing to EDM path; 15/15 fleet accounted for |

### PHASE 7 -- Hardening + Polish (last)
| id | what | tag | effort | dependency | done-when |
|----|------|-----|--------|------------|-----------|
| U-ECHO-HURCO-DNC-CHAIN | Wire the proven Hurco chain end to end: CAM -> MillOperation[] -> HurcoV11MillMasterPostEngine.post() -> SLD/deflection/Ra/thermal per-op gates -> S(x)>=0.98 block -> winmax-driver --load --verify roundtrip -> cycle-time/quote/job-status emit | [NOW] | w | U-ECHO-GOLDEN-NC-CI, U-PP-DISPATCHER-REGISTER | full Hurco chain runs CAM-to-WinMax roundtrip with per-op physics gates and S(x)>=0.98 block enforced; emits cycle-time/quote/job-status on a real JM part |

## Critical Path to "Closed-Loop Testing on All 15 JM Machines"
The exact minimal sequence (everything off this path can run in parallel or defer):

```
U-CIMCO-SIM-1A-P2   [DONE this session]   wire read-report into sim-driver
   -> U-CIMCO-FSM-LIVE-DRIVE   [NOW, ~2-3d]   navigate->run->read-report->5-gate
       -> U-LEGAL-13   [OP-GATED, ~1h]   (parallel, no dep) legal sign-off
       -> U-CIMCO-OPEN-VMC01   [OP-GATED, ~1h]   operator opens CIMCO foreground
           -> U-CIMCO-LIVE-E2E-VMC01   [OP-GATED, ~1d]   first live loop on VMC-01
               -> U-CIMCO-FLEET-ROLLOUT   [OP-GATED, ~2-3d]   12 sim + 3 EDM-routed = 15/15
```

With P2 now shipped, the ONLY remaining [NOW] technical prerequisite on the critical path is **U-CIMCO-FSM-LIVE-DRIVE (~2-3 days)**. Everything after is operator-gated. The dark-engine / dispatcher / CI / learning phases (0-4, 7) are launch-quality hardening and do NOT block the first live loop, EXCEPT U-LEGAL-13 must clear before any post ships to a physical machine. Fastest path: build FSM-LIVE-DRIVE now, run U-LEGAL-13 in parallel, then hand to the operator.

## Operator Decisions Required
- **U-LEGAL-13**: confirm public-manuals-only provenance for the dialect/post corpus before any post reaches a live machine (legal, not technical). Blocks U-CIMCO-LIVE-E2E-VMC01.
- **U-CIMCO-OPEN-VMC01**: operator must open CIMCO Edit interactively in a foreground session on VMC-01 (the Codejock/Machine-Sim ribbon does not realize headless/background). Hard blocker on the live loop -- no code path around it (proven across 4 SIM-realize probes).
- **Fleet-rollout scheduling**: when to take each of the 12 sim-able machines for a live-loop window; confirm the 3 EDM-routed machines fall through to the EDM path rather than CIMCO sim.
- **india hand-off**: confirm U-ECHO-NN-REAL-TRAIN (real backprop loop) is owned by india vs echo (shares the triple schema with the learning loop).

## Top Risks
- **FOREGROUND-SESSION BLOCKER**: the ribbon realizing only interactively is unverified at scale -- if window-info cannot resolve the ribbon under automation, FSM live drive stalls. Mitigation: prove window-info ribbon resolution in U-CIMCO-FSM-LIVE-DRIVE before the operator opens VMC-01.
- **EXPOSING MASKED ENGINES**: registering prism_pp before the WEDM/lathe/AGI masks are dropped would surface stub-returning cases as live tools -- Phase 1 before Phase 2 is mandatory.
- **REWARD CIRCULARITY**: if the FeedbackBus subscriber scores predicted-vs-predicted, the learning loop optimizes a tautology -- the de-circularization assert is load-bearing.
- **GOLDEN COVERAGE GAP**: the 3 EDM-routed + non-sim controllers are NOT validated by CIMCO sim; golden-NC CI must cover Fanuc/Siemens/Heidenhain or they reach "tested" with no byte-equiv gate.
- **EMIT-BOUNDARY DRIFT**: physics-core F/S diverging at P1 would pass live sim yet cut wrong -- U-PP-KIENZLE-EMIT-REGRESSION must gate every post path.

## Provenance
- Ollama deep-dive: `state/shared/cimco/echo-forge-dive.{json,md}` (17 slices, qwen2.5-coder:32b)
- ultracode Workflow: `wf_71586f0f-084` (3 lens + 1 synthesis, 4 agents, 844K subagent tokens)
- Verification: `src/index.ts:229/739` (prism_pp commented), `ppDispatcher.ts` (802 cases) -- grep-confirmed
- v1 (superseded): commit `e5ef8227`
