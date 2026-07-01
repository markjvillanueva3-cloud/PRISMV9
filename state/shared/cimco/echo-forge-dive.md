# Echo forge deep-dive (Ollama qwen2.5-coder:32b) -- 17/17 slices

## cimco-spine2 -- CIMCO closed-loop live-sim plan (SIM-1..7)
- PENDING: U-CIMCO-SIM-1 [BUILDABLE-NOW]
- BLOCKERS: Operator must open CIMCO interactively for ribbon realization [OPERATOR-GATED]
- BLOCKERS: Simulation Report grid UIA readability needs confirmation [DEPENDS:U-CIMCO-SIM-1]
- BLOCKERS: Confirm Machine-Simulation enabled per machine at runtime [OPERATOR-GATED]
- PENDING: U-CIMCO-SIM-4 [BUILDABLE-NOW]
- PENDING: U-CIMCO-SIM-5 [BUILDABLE-NOW]
- PENDING: U-CIMCO-SIM-6 [BUILDABLE-NOW]
- PENDING: U-CIMCO-SIM-7 [BUILDABLE-NOW]

## postgen-full -- post-generation full capability assessment
- [PENDING] ~14 AGI-tier engines FULLY DARK [DEPENDS: dispatcher cases]
- [PENDING] 8 stub-wired engines (5 WEDM + 3 lathe learners) [BUILDABLE-NOW]
- [PENDING] Master Post ~40% live coverage / 60% dark [DEPENDS: dark-wiring]
- [BLOCKERS] U-LEGAL-13 clean-IP gate not started [OPERATOR-GATED]
- [PENDING] Golden-NC byte-equivalence CI missing for Fanuc/Siemens/Heidenhain [BUILDABLE-NOW]
- [BLOCKERS] Alarm DB (2,588) not wired into P5 safety [DEPENDS: alarm oracle integration]
- [PENDING] JM-learning loop dormant (U-GAP-POST-JMDIE-LEARNING) [DEPENDS: JM-learning loop activation]
- [PENDING] WEDM post fleet skeletal — only Mitsubishi real; Sodick/Makino/Agie/Fanuc stub [BUILDABLE-NOW]

## postgen-vc -- post-gen VC report (most recent, 2026-06-08)
- PENDING: Clear U-LEGAL-13 [DEPENDS: legal review]
- PENDING: Green the RED `MasterPostFineTuning` suite [BUILDABLE-NOW]
- PENDING: Wire the 8 stub engines [BUILDABLE-NOW]
- PENDING: Surface ~14 AGI-tier engines [BUILDABLE-NOW]
- PENDING: Build golden-NC byte-equivalence CI [BUILDABLE-NOW]
- PENDING: Write the one missing numerical regression [BUILDABLE-NOW]
- PENDING: Replace the `T_cut` linear hack with a literature thermal model [BUILDABLE-NOW]

## postbridge-envelope -- POST-BRIDGE-SYNERGY milestone envelope (unit list/status)
- PENDING: U-LATHE-MASTERPOST-CLONE-MILL (7 engines) [DEPENDS:U-BRIDGE-CONTRACT-VERIFY]
- BLOCKERS: v11 is broken in production (holderFactor exception line 70) [OPERATOR-GATED]
- PENDING: U-V11-AUTO-POCKET-FROM-LIBRARY [DEPENDS:U-V11-HOLDERFACTOR-FIX]
- PENDING: U-V11-MAGAZINE-INTEGRITY-GATE [DEPENDS:U-V11-AUTO-POCKET-FROM-LIBRARY]
- PENDING: U-V11-PROVE-OUT-FLAG-EXPLICIT [BUILDABLE-NOW]
- PENDING: U-V11-WINMAX-COMMENT-RESTORE [BUILDABLE-NOW]
- PENDING: U-V11-AGGRESSIVENESS-RENAME-SHIM [BUILDABLE-NOW]
- PENDING: U-NOVEL-WEAR-MEMORY-MAGAZINE [DEPENDS:U-V11-MAGAZINE-INTEGRITY-GATE]
- PENDING: U-NOVEL-PER-SHOP-KC-IDENTITY [BUILDABLE-NOW]

## post-all-engines -- scope of all post-processor engines
- [BUILDABLE-NOW] - PENDING: Conformal PI bands engines (4 engines, 0 post imports)
- [BUILDABLE-NOW] - PENDING: RCSA engine exists, no post consumer
- [BUILDABLE-NOW] - PENDING: Bayesian Vc/fz posterior engines exist, no post consumer
- [DEPENDS:lathe pattern transfer] - PENDING: Mill-post stack vs lathe (cloning the lathe pattern)
- [BUILDABLE-NOW] - PENDING: OptimalControl class wired in PRISM but zero mill-post consumption
- [BUILDABLE-NOW] - PENDING: Markov Decision class wired in PRISM but zero mill-post consumption
- [BUILDABLE-NOW] - PENDING: Information Theory class wired in PRISM but zero mill-post consumption
- [BUILDABLE-NOW] - PENDING: Fuzzy Logic class wired in PRISM but zero mill-post consumption
- [BUILDABLE-NOW] - PENDING: PINN-Cutting completion (34-line stub exists)
- [BUILDABLE-NOW] - PENDING: LTL modal-invariant suite for G-code
- [BUILDABLE-NOW] - PENDING: Sparse symbolic regression on shop outcomes
- [BUILDABLE-NOW] - PENDING: SE(3) SLERP+log-map 5-axis interpolation
- [BUILDABLE-NOW] - PENDING: SAT-solver collision certificate
- [OPERATOR-GATED] - BLOCKERS: Operator directive for next steps after initial fixes and immediate wins

## postgen-closedloop -- post-gen closed-loop training readiness
- PENDING: FeedbackBus→`MasterPostFineTuning.recordActualVsPredicted()` subscriber [BUILDABLE-NOW]
- PENDING: `outcome-bus-auto-tap.mjs` — VERIFIED ABSENT [DEPENDS:india]
- BLOCKERS: Golden-NC archive + byte-equivalence harness (U-PILOT-02) [OPERATOR-GATED]
- PENDING: De-circularize the reward [BUILDABLE-NOW]
- PENDING: Operator/correction-capture surface [BUILDABLE-NOW]
- PENDING: Labeled (CAM-input → generated-post → correct/golden-NC) triples [DEPENDS:india]
- PENDING: PostProcessorNeuralNetworkEngine has NO real `train()` [BUILDABLE-NOW]
- PENDING: Un-dark the learner dispatcher contracts [BUILDABLE-NOW]
- PENDING: `PostProcessorAGIContinuousLearning.recordFeedback` [BUILDABLE-NOW]
- PENDING: Replace `JMDieProgramLearningEngine` fabrication [DEPENDS:india]
- PENDING: Wire the genuine signals into ONE automated scored CI reward harness [BUILDABLE-NOW]
- PENDING: Post-GENERATION retrain trigger + deploy gate [DEPENDS:india]
- BLOCKERS: Clear U-LEGAL-13 [OPERATOR-GATED]

## echo-threads -- consolidated open echo handoff threads
- PENDING: U-WTW-AUDIT [BUILDABLE-NOW]
- PENDING: U-TRAIN-13 [DEPENDS:WEDMLoRADatasetBuilderEngine.ts]
- PENDING: WEDM-TRAINING-WIZARD-MS0 [BUILDABLE-NOW]
- PENDING: U-PDF-EXTRACT-INVENTORCAM-3D-HSR [BUILDABLE-NOW]
- PENDING: U-NCI-DOCS [BUILDABLE-NOW]
- PENDING: LATHE-P2P-CONSENSUS-MS4 [DEPENDS:NODE-CAPABILITY-INJECT-MS0]
- PENDING: U-GAP-TRIBAL-FORMULA-REGISTRY [BUILDABLE-NOW]
- PENDING: INFRA-CONSENSUS-WIRE-MS0 [BUILDABLE-NOW]
- PENDING: INFRA-AGI-ROUTER-MS2 [BUILDABLE-NOW]
- BLOCKERS: WEDMLoRADatasetBuilderEngine.ts is 0 BYTES [OPERATOR-GATED]

## postgen-adversarial -- post-gen adversarial audit digest (contamination findings, real-vs-claimed gaps)
- [PENDING] JM-Die learning-from-modified-posts [BUILDABLE-NOW]
- [PENDING] ThermalWear "outcome-bus publish via xproc_outcome_publish {slot:'echo'}" [OPERATOR-GATED]
- [PENDING] `modifiedPost`/`learnFromModified`/`operatorEditedPost` ingestion code [BUILDABLE-NOW]
- [BLOCKERS] No JM-post feeder in fine-tune engine [DEPENDS:JM-Die learning-from-modified-posts]
- [PENDING] `ThermalWearCouplingEngine.test.ts` [BUILDABLE-NOW]
- [PENDING] `ConstitutiveModelEngine.test.ts` [BUILDABLE-NOW]
- [PENDING] `PredictionCalibrationEngine.test.ts` [BUILDABLE-NOW]
- [PENDING] `BoringBarDeflectionEngine.test.ts` [BUILDABLE-NOW]
- [PENDING] `InstantaneousEngagementEngine.test.ts` [BUILDABLE-NOW]
- [PENDING] `SpeedFeedOrchestratorEngine.test.ts` [BUILDABLE-NOW]
- [PENDING] `EngagementAdaptiveFeedEngine.test.ts` [BUILDABLE-NOW]
- [BLOCKERS] No vendor branching in MasterPostFineTuningEngine [DEPENDS:Vendor-specific logic]
- [PENDING] "india NN retrains wear model" wire [OPERATOR-GATED]
- [PENDING] `thermalWearCoupling.analyze()` output mapping refinement [BUILDABLE-NOW]
- [BLOCKERS] No real actuals feeding MasterPostFineTuningEngine [DEPENDS:Real data]
- [PENDING] AGI Orchestration + Genius quality/output verification tests [BUILDABLE-NOW]
- [PENDING] Omega Safety S(x) integration into P5 gate [OPERATOR-GATED]

## post-consolidation -- post-processor engine consolidation map (duplicates, dark engines)
- [BLOCKERS] GATED on U-LEGAL-13 (re-derive posts from public manuals) [OPERATOR-GATED]
- [PENDING] REVENUE-v7.6/U-BRIDGE-MASTERPOST-CAM [BUILDABLE-NOW]
- [PENDING] REVENUE-v7.6/U-REV-MP-01 [BUILDABLE-NOW]
- [PENDING] REVENUE-v7.6/U-MASTERPOST-FENCE [BUILDABLE-NOW]
- [PENDING] REVENUE-v7.6/U-REV-AUDIT-MASTERPOST-01 [BUILDABLE-NOW]
- [PENDING] LAUNCH-READINESS/P0-U06.11 [BUILDABLE-NOW]
- [PENDING] LAUNCH-READINESS/P0-U06.7 (in_progress) [DEPENDS:LAUNCH-READINESS/P0-U06.11]
- [PENDING] UNIFIED-v2/U-INV-LATHE-04 [BUILDABLE-NOW]
- [PENDING] REVENUE-v7.6/U-REV-LATHE-03 [BUILDABLE-NOW]
- [PENDING] REVENUE-v7.6/U-PILOT-02 [BUILDABLE-NOW]
- [PENDING] REVENUE-v7.6/U-REV-MS0-ACT-WEDM-CTRL-01 [BUILDABLE-NOW]
- [PENDING] MS-RES-POST-CYCLE-LIB [BUILDABLE-NOW]
- [PENDING] LAUNCH-READINESS/P0-U06.13 [BUILDABLE-NOW]
- [PENDING] LAUNCH-READINESS/P0-U06.14 [BUILDABLE-NOW]
- [PENDING] LAUNCH-READINESS/P0-U06.15 [BUILDABLE-NOW]
- [PENDING] LAUNCH-READINESS/P0-U06.16 [BUILDABLE-NOW]
- [PENDING] LAUNCH-READINESS/P0-U06.17 [BUILDABLE-NOW]
- [PENDING] LAUNCH-READINESS/P0-U06.18 [BUILDABLE-NOW]
- [PENDING] LAUNCH-READINESS/P0-U06.19 [BUILDABLE-NOW]

## post-fleet-upgrade -- post-processor fleet upgrade plan
- PENDING: `PRISM-Master-AgieCharmilles-CUT-WEDM.cps` [DEPENDS: Agie-Charmilles machine roster confirmation]
- PENDING: `PRISM-Master-Fanuc-ROBOCUT-WEDM.cps` [DEPENDS: Fanuc ROBOCUT machine roster confirmation]
- PENDING: `WEDMPostSodickEngine.ts` [OPERATOR-GATED]
- PENDING: `WEDMPostMakinoEngine.ts` [OPERATOR-GATED]
- BLOCKERS: Verify existence of `WEDMPostSodickEngine.ts` and `WEDMPostMakinoEngine.ts` in `mcp-server/src/engines/` [DEPENDS: engine verification]

## post-capability -- post-processor capability assessment (what works / what is missing)
- PENDING: PostProcessorUnificationEngine [BUILDABLE-NOW]
- PENDING: LathePostGeneratorActiveLearningEngine [BUILDABLE-NOW]
- PENDING: JMDiePostProcessorLearningEngine [BUILDABLE-NOW]
- PENDING: LathePostProcessorAIEngine [BUILDABLE-NOW]
- PENDING: WEDMPostMitsubishiEngine [BUILDABLE-NOW]
- PENDING: WEDMPostSodickEngine [BUILDABLE-NOW]
- PENDING: WEDMPostMakinoEngine [BUILDABLE-NOW]
- PENDING: WEDMPostAgieEngine [BUILDABLE-NOW]
- PENDING: WEDMPostFanucEngine [BUILDABLE-NOW]
- BLOCKERS: prism_pp dispatcher is not exposed in the live tool surface [OPERATOR-GATED]
- PENDING: post-processor capability census script [BUILDABLE-NOW]
- PENDING: Declare ONE canonical MasterPost facade [BUILDABLE-NOW]
- PENDING: Programmatic .cps regen + version ledger [BUILDABLE-NOW]
- PENDING: Tribal feedback loop implementation [BUILDABLE-NOW]
- PENDING: Neural dialect-mismatch pre-flight gate [BUILDABLE-NOW]

## post-galaxy-synergy -- post-processor galaxy synergy validation (cross-galaxy wiring gaps)
- PENDING: System-viz node regen [DEPENDS:sierra]
- BLOCKERS: MCP restart for domain build [DEPENDS:MCP]
- BLOCKERS: 1M-context credits for domain build [DEPENDS:subagents]
- PENDING: PSN peer-symmetry back-ref from kilo/oscar/whiskey/mike/foxtrot/india/lima [OPERATOR-GATED]
- PENDING: CONN-5 recall round-trip verification [NEXT SESSION]

## hurco-bridge -- Hurco post pipeline bridge assessment (DNC-proven controller path)
- [BUILDABLE-NOW] - PENDING: wire `MillOperation[]` source-of-truth from CAD output through `HurcoV11MillMasterPostEngine.post()` [U1]
- [BUILDABLE-NOW] - PENDING: close the template → MillOperation[] arrow via `CAMOperationGeneratorEngine` [U2]
- [BUILDABLE-NOW] - PENDING: upstream binding for "give me CAD file → MillOperation[] in one call" [U3]
- [BUILDABLE-NOW] - PENDING: auto-tool-pick from `ToolCatalogEngine.recommend(material, ap, ae)` when `op.tool` absent [U4]
- [BUILDABLE-NOW] - PENDING: wire SLD per-op gate before emit; reject ops that fall in unstable lobe [U7]
- [BUILDABLE-NOW] - PENDING: stickout deflection ratio check (test #6 from 2026-05-22 spec) [U8]
- [BUILDABLE-NOW] - PENDING: predict Ra per finish-op + emit as `(Ra predicted = X.X um @ 95% CI)` comment [U9]
- [BUILDABLE-NOW] - PENDING: flag ops where predicted temperature exceeds tool-coating envelope [U10]
- [BUILDABLE-NOW] - PENDING: promote tribal-citation → wiki-citation alongside, format `(see [[wiki-slug]] line N)` [U14]
- [BUILDABLE-NOW] - PENDING: chain `Hurco post → S(x) gate → block emit if S(x) < 0.98 (shop_floor tier)` [D4]
- [OPERATOR-GATED] - BLOCKERS: REQUIRED per echo slot soul ("emitting-gcode-without-collision-check") [D5]
- [BUILDABLE-NOW] - PENDING: emit `.NC` + run kinematics-replay → report axis-limit violations + cycle time [D6]
- [BUILDABLE-NOW] - PENDING: `post → winmax-driver --load <ncfile> --verify` round-trip [D7]
- [BUILDABLE-NOW] - PENDING: emit cycle time as post-metadata comment [D8]
- [BUILDABLE-NOW] - PENDING: post output → quote refresh [D9]
- [BUILDABLE-NOW] - PENDING: post completion → job-status transition [D10]
- [DEPENDS:D11] - PENDING: fix `generatePost` before any downstream chaining (per POST-PROCESSOR-PROVE-OUT-2026-05-25.md) [D11]
- [DEPENDS:D11] - PENDING: gated on D11 fix [D12]
- [BUILDABLE-NOW] - PENDING: emitted NC + post-job outcome → tribal-tip promotion [D15]

## india-to-echo -- india->echo post queue migration (learning-loop ownership handoff)
- PENDING: U-JMDIE-SIDECAR-ROLLOUT [OPERATOR-GATED]
- PENDING: U-JMDIE-PHYSICS-OKUMA [OPERATOR-GATED]
- PENDING: U-JMDIE-GAPS-VIZ-ROOST [OPERATOR-GATED]
- PENDING: U-HURCO-ROUNDTRIP-TSX-SIDECAR [DEPENDS:Windows child_process workaround]
- PENDING: U-GAP-POST-RL-POSTPROCESSOR [BUILDABLE-NOW]
- PENDING: U-MASTERPOST-DIALECT-SYMMETRY [BUILDABLE-NOW]
- PENDING: U-MASTERPOST-DIALECT-HEIDENHAIN-COMMENT-FP [BUILDABLE-NOW]
- PENDING: U-MASTERPOST-DL-COMMENT-REGEX-CONSISTENCY [BUILDABLE-NOW]

## galaxy-memory -- post-processor galaxy MEMORY (compounded patterns/decisions/open-threads)
- PENDING: U-BRIDGE-MASTERPOST-CAM [BUILDABLE-NOW]
- PENDING: U-REV-MP-01 unified API [BUILDABLE-NOW]
- PENDING: U-MASTERPOST-FENCE [BUILDABLE-NOW]
- PENDING: Wire real method surface for 8 stub-wired engines [BUILDABLE-NOW]
- PENDING: Wire real method surface for ~14 AGI-tier engines [BUILDABLE-NOW]
- PENDING: TCP/RTCP support in JM posts (only M460V-5AX) [BUILDABLE-NOW]
- PENDING: Tribal-tip citation in NC [BUILDABLE-NOW]
- PENDING: CAS collision-avoid feature in JM posts [BUILDABLE-NOW]
- PENDING: NURBS support in JM posts [BUILDABLE-NOW]
- PENDING: Polar interp support in JM posts [BUILDABLE-NOW]
- PENDING: Per-op CI95 support in JM posts [BUILDABLE-NOW]
- PENDING: Thermal-comp closed loop feature in JM posts [BUILDABLE-NOW]
- PENDING: Multi-channel sync feature in JM posts [BUILDABLE-NOW]
- BLOCKERS: MS-MASTERPOST blocked on U-LEGAL-13 (public-manual re-derive) [OPERATOR-GATED]
- BLOCKERS: WEDM-P2P-PRODUCTION-MS0 6/24 units pending [DEPENDS:WEDM-P2P-PRODUCTION-MS0]
- BLOCKERS: P2P-FULLSTACK-MS0 1/1 unit pending [DEPENDS:P2P-FULLSTACK-MS0]

## galaxy-synthesis -- post-processor domain synthesis (open threads)
- PENDING: Automated Qdrant health & rename detection [BUILDABLE-NOW]
- PENDING: Stale slot worktree reconciliation [BUILDABLE-NOW]
- PENDING: Mill galaxy audit flag validity [DEPENDS:mill_galaxy_audit_flags]
- PENDING: Salience scorer integration [BUILDABLE-NOW]
- PENDING: Large model pull resilience verification [BUILDABLE-NOW]
- PENDING: Semantic recall version drift migration strategy [BUILDABLE-NOW]

## galaxy-kb -- post-processor canonical knowledge base
- PENDING: customer-prefs → emit pipeline not proven wired [DEPENDS:Customer context]
- PENDING: 4 P0 gaps in machine routing [DEPENDS:Machine routing]
- PENDING: alarm-aware post-gen gap [DEPENDS:Alarms]
- PENDING: material→feed/speed auto-pull [DEPENDS:Materials + feed/speed]
- BLOCKERS: MS-MASTERPOST is legally gated (U-LEGAL-13) [OPERATOR-GATED]
- BLOCKERS: Controller dialect codes are re-derived only from public manuals [OPERATOR-GATED]
- PENDING: alarm-aware post-gen not wired into pipeline P5 [DEPENDS:Alarms]
- PENDING: customer-prefs → emit pipeline not proven wired [DEPENDS:Customer context]
- PENDING: material→feed/speed auto-pull [DEPENDS:Materials + feed/speed]
