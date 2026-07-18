---
type: "chat-session"
source: "claude-code-cli"
session_id: "5c0bd535-0ecb-4744-9e62-ac1ea40fbe71"
title: "PRISM is adding adaptive/online-learning algorithms to a 16-stage manufacturing "
date: "2026-05-27"
first_ts: "2026-05-27T01:03:17.044Z"
last_ts: "2026-05-27T01:08:15.746Z"
cwd: "H:\\PRISM"
messages: 105
user_msgs: 46
assistant_msgs: 59
raw_file: "H:/.claude/projects/H--prism/5c0bd535-0ecb-4744-9e62-ac1ea40fbe71/subagents/agent-a4a9261ad0c866bd1.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# PRISM is adding adaptive/online-learning algorithms to a 16-stage manufacturing 

> **claude-code-cli** | 2026-05-27 | 105 msgs (46 user / 59 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/5c0bd535-0ecb-4744-9e62-ac1ea40fbe71/subagents/agent-a4a9261ad0c866bd1.jsonl`

## Transcript

### User | 2026-05-27T01:03:17.044Z

PRISM is adding adaptive/online-learning algorithms to a 16-stage manufacturing orchestrator that ultimately emits G-code that runs on real CNC machines at JM Die Company. SAFETY is non-negotiable — wrong speed/feed wrecks a $40K spindle, wrong post breaks a tool, wrong toolpath collides with a fixture.

Your job: enumerate the safety risks of adaptive algorithms + what guardrails PRISM has + what's missing. READ-ONLY research.

Risk classes to assess:
1. **Reward hacking** — RL agent finds shortcut that satisfies reward but produces unsafe output (e.g. high MRR via excessive spindle load that exceeds bearing life)
2. **Distribution drift** — Model trained on 4140 starts predicting badly when shop runs new Inconel batch
3. **Catastrophic forgetting** — LoRA fine-tune on new material wipes out old material accuracy
4. **Reward gaming via fake outcomes** — Outcome bus poisoned by mislabeled actual data
5. **Confidence inflation** — Adaptive system becomes overconfident on common cases, blind to edge cases
6. **Silent regression** — Model degrades but neither training metrics nor production metrics catch it
7. **Operator override conflict** — Operator hand-tunes, system learns the override as "correct"
8. **Cold-start danger** — New material/machine combo has no prior; what's the safe default?
9. **Multi-agent interference** — Multiple chats in PRISM's 26-slot fleet update the same model concurrently
10. **Adversarial inputs** — Customer-supplied CAD has hostile geometry; orchestrator must refuse

Search:
- H:/prism/CLAUDE.md (safety doctrine — Ω≥0.95, S(x)≥0.98, fail-loud, R12)
- H:/prism/state/shared/omega-thresholds.json
- H:/prism/mcp-server/src/engines/ — find *Safety*, *SafetyValidator*, *S_x*, *Omega*, *FailLoud*, *EWC*, *Rollback*, *DriftDetection*, *DriftMonitor*, *ConfidenceCalibration*
- H:/prism/mcp-server/data/docs/ENGINE_DIGEST.md (safety + monitoring engines)
- H:/prism/knowledge/wiki/lessons/ (any safety regression lessons)
- H:/prism/mcp-server/src/phy
... [+884 chars truncated]

### Assistant | 2026-05-27T01:03:23.296Z

I'll conduct a systematic read-only exploration of PRISM's safety architecture to enumerate adaptive algorithm risks and guardrails. Let me start with the foundational documents.

### Assistant | 2026-05-27T01:03:23.581Z

[tool_use: Read]

### Assistant | 2026-05-27T01:03:23.721Z

[tool_use: Glob]

### Assistant | 2026-05-27T01:03:23.945Z

[tool_use: Glob]

### Assistant | 2026-05-27T01:03:24.168Z

[tool_use: Glob]

### User | 2026-05-27T01:03:28.926Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-281 of 361 total (27225 tokens, cap 25000). Call Read with offset=282 limit=281 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	# PRISM — Manufacturing Intelligence Platform
2	
3	## EXPERT ROLE (ALWAYS ACTIVE)
4	<!-- DUPLICATE-CANDIDA
... [+39801 chars truncated]

### User | 2026-05-27T01:03:46.374Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-27T01:03:46.728Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-27T01:03:46.781Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-27T01:03:49.074Z

Understood. Let me search for safety-specific files and the adaptive learning components with targeted queries.

### Assistant | 2026-05-27T01:03:49.694Z

[tool_use: Bash]

### Assistant | 2026-05-27T01:03:50.324Z

[tool_use: Bash]

### Assistant | 2026-05-27T01:03:50.473Z

[tool_use: Read]

### User | 2026-05-27T01:03:57.462Z

[tool_result] 1	# ENGINE DIGEST
2	## 3217 engines indexed
3	## Auto-generated: 2026-05-12 (manually appended 4 entries for TRAINING-LEARNING-MS0/U-TL-U5..U6)
4	
5	- **AbrasiveJetMachiningEngine**: Physics-Based Abrasive Waterjet Prediction
6	- **AbsorptionChillerEngine**: Absorption refrigeration cycle analysis
7	- **AbstractionHierarchyEngine**: Multi-level tip→principle→law generalization
8	- **AccessControlL
... [+10709 chars truncated]

### User | 2026-05-27T01:04:00.095Z

[tool_result] mcp-server/src/engines/AGISafetyContainmentEngine.ts
mcp-server/src/engines/AnchoredConfidenceEngine.ts
mcp-server/src/engines/BatchCAMSafetyEngines.ts
mcp-server/src/engines/BayesianSafetyEngine.ts
mcp-server/src/engines/CAMConfidenceCalibrationEngine.ts
mcp-server/src/engines/CAMMLDriftMonitorEngine.ts
mcp-server/src/engines/ConfidenceCommitEventBusEngine.ts
mcp-server/src/engines/CrossProcessDr
... [+689 chars truncated]

### User | 2026-05-27T01:05:00.958Z

[tool_result] ./.claude/worktrees/agent-a01e7b81d0946a97b/mcp-server/data/docs/LEARNING_RESOURCES.md
./.claude/worktrees/agent-a01e7b81d0946a97b/mcp-server/data/docs/roadmap/archive/superseded/PHASE_CC_CAD_CAM_MACHINING_LEARNING_ENGINE_v2.md
./.claude/worktrees/agent-a01e7b81d0946a97b/mcp-server/data/docs/roadmap/RESOURCE-LEARNING-HARDENING-ROADMAP.md
./.claude/worktrees/agent-a01e7b81d0946a97b/mcp-server/src/_
... [+1635 chars truncated]

### Assistant | 2026-05-27T01:05:03.515Z

Let me search directly for safety validation and adaptive learning components.

### Assistant | 2026-05-27T01:05:03.948Z

[tool_use: Read]

### Assistant | 2026-05-27T01:05:04.631Z

[tool_use: Read]

### Assistant | 2026-05-27T01:05:05.207Z

[tool_use: Read]

### Assistant | 2026-05-27T01:05:05.528Z

[tool_use: Grep]

### User | 2026-05-27T01:05:13.124Z

[tool_result] 1	/**
2	 * AGISafetyContainmentEngine — Validate autonomous goals before execution
3	 *
4	 * Phase 0.25.1 U-SAFE1 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Gates every
5	 * goal from AutonomousGoalSynthesisEngine against a configurable list of
6	 * safety constraints. A goal proceeds only if every constraint returns
7	 * `ok=true`; otherwise the engine returns a block record with per-rule
8	 * rea
... [+3693 chars truncated]

### User | 2026-05-27T01:05:13.126Z

[tool_result] 1	/**
2	 * DriftDetectionEngine — HMEMV06 semantic drift detection across time.
3	 *
4	 * Pure-core detector: caller supplies the embedding centroid of a memory
5	 * cluster at two times (baseline + current), and the engine reports the
6	 * drift magnitude (1 - cosine_similarity) plus a verdict (stable / drifting
7	 * / drifted) against caller-supplied thresholds.
8	 *
9	 * Use cases: detect when 
... [+3929 chars truncated]

### User | 2026-05-27T01:05:13.213Z

[tool_result] 1	/**
2	 * CrossProcessEWCMemoryPreservationEngine — XPROC-NEURAL Tier 3 (T3-04)
3	 *
4	 * Elastic Weight Consolidation++ (Schwarz et al. 2018 extension of
5	 * Kirkpatrick et al. 2017). Diagonal Fisher-information-weighted
6	 * regularization that protects weights critical to old tasks while learning
7	 * new ones. Used by T3-01 + T3-03 warm_restart path.
8	 *
9	 * References:
10	 *   Kirkpatrick
... [+3728 chars truncated]

### User | 2026-05-27T01:05:16.835Z

[tool_result] Found 1 file
mcp-server\src\engines\FusionAIOrchestrationEngine.ts

### Assistant | 2026-05-27T01:05:19.606Z

Let me search for the adaptive learning orchestrator and reward monitoring systems.

### Assistant | 2026-05-27T01:05:20.104Z

[tool_use: Bash]

### Assistant | 2026-05-27T01:05:20.483Z

[tool_use: Bash]

### Assistant | 2026-05-27T01:05:21.111Z

[tool_use: Grep]

### Assistant | 2026-05-27T01:05:21.472Z

[tool_use: Read]

### User | 2026-05-27T01:05:26.210Z

[tool_result] 1	/**
2	 * CAMConfidenceCalibrationEngine — CAM-EXHAUST-MS0/U-CAM119
3	 *
4	 * Decision-confidence calibration & uncertainty quantification for CAM AGI
5	 * decisions. Wraps the orchestrator's raw composite confidence into a
6	 * calibrated probability that the decision will actually be correct in
7	 * production, plus an uncertainty interval. Distinct from the existing
8	 * PredictionCalibrationE
... [+4485 chars truncated]

### User | 2026-05-27T01:05:26.376Z

[tool_result] Found 1 file
mcp-server\src\engines\CAMConfidenceCalibrationEngine.ts

### User | 2026-05-27T01:05:29.129Z

[tool_result] mcp-server/src/engines/AdaLoRARankAllocatorEngine.ts
mcp-server/src/engines/BlueprintLoRABridgeEngine.ts
mcp-server/src/engines/CAMLoRAAdapterTrainerEngine.ts
mcp-server/src/engines/CAMLoRAEngine.ts
mcp-server/src/engines/ContinualLoRAEngine.ts
mcp-server/src/engines/CrossProcessCuriosityDrivenExplorationEngine.ts
mcp-server/src/engines/CrossProcessRewardShaperEngine.ts
mcp-server/src/engines/Deta
... [+679 chars truncated]

### User | 2026-05-27T01:05:29.551Z

[tool_result] AIResourceLearningEngine.ts  43.3K
ActiveLearningStrategyEngine.ts  3.5K
AdaLoRARankAllocatorEngine.ts  7.0K
AdaptiveCalibrationEngine.ts  41.3K
AdaptiveChatterEngine.ts  10.6K
AdaptiveChiploadEngine.ts  9.4K
AdaptiveClearingEngine.ts  7.2K
AdaptiveControlEngine.ts  31.1K
AdaptiveEngagementEngine.ts  9.6K
AdaptiveFeedControlEngine.ts  13.8K
AdaptiveFeedModulationEngine.ts  10.4K
AdaptiveMachiningI
... [+330 chars truncated]

### Assistant | 2026-05-27T01:05:31.928Z

Let me read key safety and reward monitoring engines to understand the adaptive algorithm guardrails.

### Assistant | 2026-05-27T01:05:32.562Z

[tool_use: Read]

### Assistant | 2026-05-27T01:05:33.006Z

[tool_use: Read]

### Assistant | 2026-05-27T01:05:33.835Z

[tool_use: Grep]

### Assistant | 2026-05-27T01:05:34.001Z

[tool_use: Bash]

### system

... [25 middle messages omitted -- see raw_file] ...

### Assistant | 2026-05-27T01:06:17.777Z

[tool_use: Grep]

### User | 2026-05-27T01:06:19.421Z

[tool_result] 1	/**
2	 * OmegaSafetyScoreEngine — Scalar safety gate for G-code output
3	 *
4	 * Converts the 6-dimension SafetyAssessment from PipelineSafetyOrchestratorEngine
5	 * into a scalar S(x) ∈ [0, 1]. G-code output is BLOCKED when S(x) < 0.70.
6	 *
7	 * Scoring:
8	 *   Per-dimension: safe=1.0, caution=0.85, warning=0.60, critical=0.25, veto=0
9	 *   S(x) = geometric mean of 6 dimension scores
10	 *   
... [+5944 chars truncated]

### User | 2026-05-27T01:06:21.150Z

[tool_result] Found 20 files limit: 20
mcp-server\src\engines\QuotingNeuralReasoningBridgeEngine.ts
mcp-server\src\engines\PluginSandboxPolicyEngine.ts
mcp-server\src\engines\PolicyTestSuiteEngine.ts
mcp-server\src\engines\CADSystemNeuralArchAdapterEngine.ts
mcp-server\src\engines\LatheOpusReasoningEngine.ts
mcp-server\src\engines\XProcNeuralAutoFireEngine.ts
mcp-server\src\engines\ConsensusNeuralFeedbackEngine
... [+764 chars truncated]

### User | 2026-05-27T01:06:21.972Z

[tool_result] mcp-server/src/engines/CADSystemNeuralArchAdapterEngine.ts
mcp-server/src/engines/ChatterNeuralClassifierEngine.ts
mcp-server/src/engines/ConsensusNeuralFeedbackEngine.ts
mcp-server/src/engines/CrossCustomerPolicyTransferEngine.ts
mcp-server/src/engines/CrossProcessFormulaNeuralEnsembleEngine.ts
mcp-server/src/engines/CrossProcessHierarchicalNeuralOrchestratorEngine.ts
mcp-server/src/engines/Cross
... [+223 chars truncated]

### Assistant | 2026-05-27T01:06:24.836Z

Let me read the RL and neural learning engines to understand adaptive algorithm safety.

### Assistant | 2026-05-27T01:06:25.298Z

[tool_use: Read]

### Assistant | 2026-05-27T01:06:25.491Z

[tool_use: Read]

### Assistant | 2026-05-27T01:06:25.784Z

[tool_use: Read]

### User | 2026-05-27T01:06:28.254Z

[tool_result] 1	/**
2	 * OutcomeRLBridgeEngine — XPROC-NEURAL-CONNECT-MS0 / U-CN12
3	 *
4	 * The reinforcement-learning fan-out bridge. Closes the gap where the three
5	 * cross-process RL kernels — `CrossProcessRewardShaperEngine` (T4-01),
6	 * `CrossProcessQLearningTabularEngine` (T4-02), `CrossProcessPolicyGradientEngine`
7	 * (T4-03) and `CrossProcessMultiArmedBanditEngine` (T4-04) — were dispatcher-wired
8
... [+6411 chars truncated]

### User | 2026-05-27T01:06:28.317Z

[tool_result] 1	/**
2	 * CrossProcessPolicyGradientEngine — XPROC-NEURAL Tier 4 (T4-02)
3	 *
4	 * REINFORCE with baseline (Williams 1992; Sutton & Barto 2nd ed Ch.13).
5	 * Discrete-action policy gradient over (state, action) pairs where:
6	 *   state  = encoded (process, material, feature, machine) tuple
7	 *   action = index into a discrete action space (e.g. tool/strategy choice)
8	 *   reward = scalar from 
... [+4695 chars truncated]

### User | 2026-05-27T01:06:28.339Z

[tool_result] 1	/**
2	 * CrossProcessNeuralLearningEngine — pure-JS multi-layer perceptron that
3	 * predicts {success, failure, operator_override} from a CrossProcess
4	 * OutcomeRecord. Trained online from CrossProcessOutcomeStore events.
5	 *
6	 * Milestone: INFRA-NEURAL-LEDGER-MS1 / U-XPROC-NEURAL-T1-02.
7	 *
8	 * Why this exists
9	 * ---------------
10	 * T1-01 (CrossProcessOutcomeStore) gives the system a
... [+4254 chars truncated]

### Assistant | 2026-05-27T01:06:30.856Z

Perfect. Now let me search for documentation on the safety doctrine and adaptive learning risks.

### Assistant | 2026-05-27T01:06:31.106Z

[tool_use: Bash]

### Assistant | 2026-05-27T01:06:32.183Z

[tool_use: Grep]

### Assistant | 2026-05-27T01:06:32.644Z

[tool_use: Read]

### User | 2026-05-27T01:06:34.223Z

[tool_result] 1	/**
2	 * CAMLoRAAdapterTrainerEngine — U-CAM-ML-05
3	 * ===========================================
4	 *
5	 * Per-CAM LoRA (Low-Rank Adaptation) adapters that correct the U-CAM-ML-04
6	 * baseline Bayesian regressor with CAM-specific deltas.
7	 *
8	 * Architecture:
9	 *   y_hat = baseline_pred(x) + (B · A · x_std) · (alpha / rank)
10	 *
11	 * Where:
12	 *   - baseline_pred(x): frozen Bayesian ri
... [+3266 chars truncated]

### User | 2026-05-27T01:06:36.587Z

[tool_result] Found 30 files limit: 30
knowledge\memories\reference\reference_u_lima_a8_transfer_priors_2026_05_21.md
knowledge\memories\reference\reference_u_dhb_p1_hook_broker_classifier_2026_05_22.md
knowledge\memories\reference\reference_u_dhb_milestone_complete_2026_05_22.md
knowledge\memories\reference\reference_u_axis1_viz_closure_2026_05_26.md
knowledge\memories\reference\reference_quoting_active_factor
... [+1958 chars truncated]

### User | 2026-05-27T01:06:37.127Z

[tool_result] knowledge/memories/reference/node_algorithm_alg_adaptivecontrollermodel.md
knowledge/memories/reference/node_formula_formula_adjusted_adaptivecontroldispatcher_action_adaptive_override_calc.md
knowledge/memories/reference/node_formula_formula_adjusted_aireasoningdispatcher_action_ai_lathe_adaptive_engagement.md
knowledge/memories/reference/node_formula_formula_adjusted_aireasoningdispatcher_action
... [+694 chars truncated]

### Assistant | 2026-05-27T01:06:39.623Z

Now let me compile the safety risk matrix based on the code I've reviewed. Let me also check for any additional safeguards in the hooks or wiring.

### Assistant | 2026-05-27T01:06:39.923Z

[tool_use: Bash]

### Assistant | 2026-05-27T01:06:41.031Z

[tool_use: Grep]

### Assistant | 2026-05-27T01:06:41.338Z

[tool_use: Read]

### User | 2026-05-27T01:06:42.806Z

[tool_result] 1	/**
2	 * AnchoredConfidenceEngine — U-FORE-13 (PSAU-FORESIGHT)
3	 * =======================================================
4	 *
5	 * Every advice claim carries {engine, confidence, source_citation}
6	 * and — in manufactured-disagreement mode — a dissenting viewpoint so
7	 * the user doesn't uncritically trust a single source.
8	 *
9	 * Caller attaches an Anchor to each claim; this engine valid
... [+2510 chars truncated]

### User | 2026-05-27T01:06:45.668Z

[tool_result] (Bash completed with no output)

### User | 2026-05-27T01:06:58.572Z

[tool_result] Found 20 files limit: 20
knowledge\memories\reference\reference_zebra_fleet_precheck_2026_05_25.md
knowledge\memories\reference\reference_u_monolith_workholding_loader_2026_05_26.md
knowledge\memories\reference\reference_quoting_pipeline_session_2026_05_26.md
knowledge\memories\reference\reference_psn_self_improving_loop_ms0_iter1to3_2026_05_25.md
knowledge\memories\reference\reference_mike_osp_pr
... [+852 chars truncated]

### Assistant | 2026-05-27T01:07:02.143Z

Let me search for information on the EWC++ implementation and whether it's wired into the production path.

### Assistant | 2026-05-27T01:07:02.785Z

[tool_use: Bash]

### Assistant | 2026-05-27T01:07:03.417Z

[tool_use: Bash]

### Assistant | 2026-05-27T01:07:04.176Z

[tool_use: Grep]

### User | 2026-05-27T01:07:08.291Z

[tool_result] (Bash completed with no output)

### User | 2026-05-27T01:07:08.821Z

[tool_result] (Bash completed with no output)

### User | 2026-05-27T01:07:09.170Z

[tool_result] Found 7 files
mcp-server\src\tools\dispatchers\intelligenceDispatcher.ts
mcp-server\src\__tests__\CrossProcessEWCMemoryPreservationEngine.test.ts
mcp-server\src\engines\CrossProcessEWCMemoryPreservationEngine.ts
mcp-server\src\engines\CrossProcessConceptShiftHandlerEngine.ts
mcp-server\src\engines\CrossProcessOnlineMLPUpdaterEngine.ts
mcp-server\src\engines\CrossProcessTierRouterEngine.ts
mcp-serv
... [+41 chars truncated]

### Assistant | 2026-05-27T01:07:11.923Z

Let me read the wiring of EWC and the neural learning feedback path.

### Assistant | 2026-05-27T01:07:12.355Z

[tool_use: Read]

### Assistant | 2026-05-27T01:07:12.776Z

[tool_use: Read]

### Assistant | 2026-05-27T01:07:13.013Z

[tool_use: Bash]

### User | 2026-05-27T01:07:14.650Z

[tool_result] 1	/**
2	 * CrossProcessOnlineMLPUpdaterEngine — XPROC-NEURAL Tier 3 (T3-01)
3	 *
4	 * Streaming Adam-optimizer weight updater for online MLP training. The
5	 * (planned) T1-02 MLP — and any other gradient-trained predictor in the
6	 * XPROC-NEURAL stack — calls this engine to apply per-event mini-batch
7	 * gradient steps without restarting training.
8	 *
9	 * Reference: Kingma & Ba (2015). "Adam:
... [+4426 chars truncated]

### User | 2026-05-27T01:07:14.710Z

[tool_result] 1	/**
2	 * FisherInformationEngine — Information-theoretic quantities for discrete distributions
3	 *
4	 * Phase 0.25.3 U-MATH-B5 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Provides
5	 * closed-form information quantities used by AGI-safety and active-learning
6	 * callers:
7	 *
8	 *   - Shannon entropy H(P) = −Σ p·log₂ p
9	 *   - KL divergence D(P‖Q) = Σ p·log₂(p/q)
10	 *   - Jensen–Shannon diverg
... [+2777 chars truncated]

### User | 2026-05-27T01:07:16.730Z

[tool_result] 24 matches in 5 files:

1175:0:fisherR.result.fisher, decay });
143:0:default EWC penalty strength λ when consolidate is requested without one. */
1602:0:{
216:0:if set, after the epoch loop consolidate the *just-trained* samples as
mcp-server/.../engines/CrossProcessNeuralLearningEngine.ts:84:// lives in CrossProcessEWCMemoryPreservationEngine; this engine supplies the
mcp-server/.../engines/Cros
... [+401 chars truncated]

### Assistant | 2026-05-27T01:08:15.746Z

Perfect. I have enough information to compile the comprehensive safety risk matrix. Let me create the final report.

---

## PRISM Adaptive Algorithm Safety Risk Assessment

Based on read-only exploration of H:/PRISM's codebase, here is the enumerated safety risk landscape for the 16-stage manufacturing orchestrator adding adaptive/online-learning algorithms:

### Risk Matrix: 10 Adaptive Algorithm Hazards

| Risk | Mechanism | PRISM Guardrail TODAY | Status | Mitigation Needed |
|---|---|---|---|---|
| **1. Reward hacking** | RL agent finds shortcut satisfying reward but producing unsafe output (e.g. excessive spindle load via MRR optimization) | **CrossProcessRewardShaperEngine (T4-01)** shapes reward into 5 components: surface_finish (40% w), tool_life (30%), cycle_time (30%), safety_veto (-100% multiplier per veto), operator_override (-20% per override). Any safety veto cancels entire data-quality reward. SAFETY_VETO_PENALTY=2.0 dominates per spec. | **PARTIAL** — Reward function is policy; shop-floor tribal knowledge could silently retrain on operator overrides-as-correct. No adversarial-example pen-test. | **P0**: Audit reward audit trail — detect if RL agent converges to "always override" or "ignore thermal veto" patterns. Add reward-stability monitoring (check if reward components violate physical bounds week-over-week). |
| **2. Distribution drift** | Model trained on 4140 now predicts poorly on new Inconel batch; shop-floor inputs drift beyond training domain | **CAMMLDriftMonitorEngine (U-CAM-ML-07)** — append-only JSONL drift log with per-model MAE week-over-week. Thresholds: warn (5% ↑), degraded (15% ↑), critical (30% ↑). Emits DriftAlert with level. **DriftDetectionEngine** — cosine similarity on embedding centroids (drifting_threshold=0.1, drifted_threshold=0.3). | **WIRED** for CAM ML. Not wired for neural outcome learner (T1-02). Drift threshold (0.3) is advisory only — no auto-rollback. | **P1**: Wire DriftDetectionEngine into CrossProcessNeuralLe
... [+13971 chars truncated]
