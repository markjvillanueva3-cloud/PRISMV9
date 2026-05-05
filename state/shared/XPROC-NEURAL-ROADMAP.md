# XPROC-NEURAL-ROADMAP — Cross-Process Neural Learning Layer

**Status:** AUTHORED 2026-05-05 (Tier 1 SHIPPED · Tier 2-12 PLANNED)
**Owner branch:** `work/cad-fidx-solidworks` at `H:/prism-cad-sw-fidx` (Tier 1 commits)
**Mainline merge target:** `main` via `work/cam-exhaust-ms0` after Tier 12
**Linked milestone:** `mcp-server/data/milestones/INFRA-NEURAL-LEDGER-MS1.json`
**Federated weighting rule:** local 1.0×, shared 0.5× per `SLBRulesEngine` (Shared Learning Bus)

---

## North star

Five XPROC bridges (Layer 2) ship raw cross-process signal between mill / lathe / WEDM. Layer 3 (this roadmap) turns that signal into **closed-loop learning** — every print-to-program run becomes a training example, every operator override a labelled outcome, every safety veto a reinforcement penalty. The 46 engines below compose into a Tier-3 specialist AI (per the three-tier hierarchy in `CLAUDE-BRIEF.md`) that answers cross-process queries faster and with better calibrated confidence than any single-process specialist could.

---

## Tier-1 baseline (DONE — do NOT rebuild)

| ID | Engine | Commit | Lines | Role |
|----|--------|--------|-------|------|
| T1-01 | `CrossProcessOutcomeStore` | `619c4f037` | 610 + 740 test | Event-sourced ledger; `NUMERIC_FEATURE_KEYS` validation; replay/replayJob/replaySince |
| T1-02 | `CrossProcessNeuralLearningEngine` | `f8adfbdc2` | 743 + ~700 test | Pure-JS MLP 32→16→3 with Xavier init + SGD-momentum; trains on T1-01 ledger |
| T1-03 | `CrossProcessTransferLearningEngine` | `b69eed4c5` | 350 + ~400 test | 9 material clusters × 6 directional pairs; weight-surgery warm-start |
| T1-04 | `CrossProcessAttentionExplainEngine` | `f21ecc64a` | 544 + 316 test | LIME perturbation + ECE calibration + L1 anomaly detection |
| T1-05 | `CrossProcessAGIBridge` | `5919b5c4f` | 284 + 258 test | 50/50 keyword+neural blend; proceed/review/reject ladder |

**Tier-1 dispatcher actions wired into `prism_intelligence`:** `xproc_neural_train`, `xproc_neural_predict`, `xproc_neural_evaluate`, `xproc_transfer_classify`, `xproc_transfer_pairs`, `xproc_transfer_check`, `xproc_attention_explain`, `xproc_attention_ece`, `xproc_attention_baseline_add`, `xproc_attention_anomaly`, `xproc_attention_baseline_get`, `xproc_attention_baseline_reset`, `xproc_agi_compose` (plus `xproc_agi_orchestrate`, `xproc_agi_episodic`, `xproc_agi_aggregate_patterns`).

---

## Tier 2 — Memory & Replay (4 engines)

**Motivation:** T1-02 trains on the full ledger every call. That doesn't scale past ~10K events and forgets nothing (overfit to oldest examples). Tier 2 adds episodic memory + prioritized replay so the MLP learns from the *most informative* and *most recent* slices.

| ID | Engine | Brief | Dispatcher action(s) | Depends on |
|----|--------|-------|----------------------|------------|
| T2-01 | `CrossProcessEpisodicMemoryEngine` | Hierarchical memory: hot (last 100), warm (last 1K, age-decayed), cold (≥1K, sampled). Keyed by (process, material, feature, decision). Returns N nearest episodes for context. | `xproc_episodic_recall`, `xproc_episodic_store` | T1-01 |
| T2-02 | `CrossProcessPrioritizedReplayEngine` | Schaul et al. PER: priority ∝ |TD-error|^α + ε. Sumtree backing. Importance-sampling weights for unbiased gradients. | `xproc_replay_sample`, `xproc_replay_update_priority` | T2-01, T1-02 |
| T2-03 | `CrossProcessExperienceReplaySamplerEngine` | Stratified sampler: balances by process (mill/lathe/WEDM), by material cluster, and by outcome class (success/marginal/fail). Prevents class imbalance in MLP gradient. | `xproc_replay_balanced_batch` | T2-01, T1-03 |
| T2-04 | `CrossProcessEpisodicSemanticLinkerEngine` | Bridges episodic (T2-01) and semantic (knowledge graph). For each retrieved episode, attaches relevant tribal-knowledge tips and Kienzle/Taylor citations. | `xproc_episodic_semantic_join` | T2-01, knowledge graph |

**Acceptance:** T1-02 retrains using T2-02 batches (no full-ledger scan); recall@10 of T2-01 on synthetic queries ≥0.85; T2-03 sample distributions are within 5% of stratified target across 1K samples; T2-04 returns ≥1 relevant citation per episode 80% of the time.

**Risks:** R1 — sumtree complexity bug bypasses prioritization → unit test priority distribution end-to-end. R2 — episodic memory bloat → fixed-size eviction with LRU + low-priority drop.

---

## Tier 3 — Online Learning & Drift (4 engines)

**Motivation:** Manufacturing parameters drift (tool wear, machine calibration, supplier change). Static models trained at t=0 silently degrade. Tier 3 detects drift and adapts the MLP without restarting training.

| ID | Engine | Brief | Dispatcher action(s) | Depends on |
|----|--------|-------|----------------------|------------|
| T3-01 | `CrossProcessOnlineMLPUpdaterEngine` | Streaming gradient updates on T1-02 weights. Per-event mini-batch (batch=1 or last-N). Adam optimizer with warm-start from existing weights. Bounded learning rate to prevent catastrophic update. | `xproc_online_update` | T1-02 |
| T3-02 | `CrossProcessDriftDetectorEngine` | Three detectors in parallel: DDM (Drift Detection Method), EDDM (Early DDM), ADWIN (Adaptive Windowing). Reports drift-confidence ∈ [0,1] and recommended-action ∈ {none, retrain, alert}. | `xproc_drift_check`, `xproc_drift_history` | T1-02, T2-01 |
| T3-03 | `CrossProcessConceptShiftHandlerEngine` | When T3-02 fires, decides recovery strategy: warm-restart (T3-01), full-retrain (T1-02), or transfer from sister-process (T1-03). Encodes the recovery decision tree from MASTER-AI-SYSTEM-ROADMAP. | `xproc_drift_recover` | T3-02, T1-03 |
| T3-04 | `CrossProcessEWCMemoryPreservationEngine` | Elastic Weight Consolidation++ (Schwarz et al. extension): Fisher-information-weighted regularizer protects weights critical to old tasks while learning new ones. Prevents catastrophic forgetting during T3-01 updates. | `xproc_ewc_freeze`, `xproc_ewc_compute_fisher` | T3-01 |

**Acceptance:** T3-01 update step <10ms; T3-02 detects synthetic step-change within 200 events at 95% recall; T3-03 chooses warm-restart for ≤5% drift, full-retrain for ≥20%; T3-04 preserves accuracy on old task within 3% after 1000 new updates.

**Risks:** R1 — overzealous drift detection causes thrashing → require 3 consecutive detector agreements. R2 — Fisher matrix memory cost → diagonal approximation only.

---

## Tier 4 — Reinforcement Learning (4 engines)

**Motivation:** Operator overrides + safety vetoes + post-job CMM measurements are reward signal. Tier 4 closes the loop: actions that produce good parts are reinforced; actions that trigger vetoes are penalized.

| ID | Engine | Brief | Dispatcher action(s) | Depends on |
|----|--------|-------|----------------------|------------|
| T4-01 | `CrossProcessRewardShaperEngine` | Maps `CrossProcessOutcomeEvent` → scalar reward. Components: surface-finish error (negative), tool-life delta (positive), cycle-time delta (positive when faster), safety-veto count (large negative), operator-override count (small negative). | `xproc_reward_shape`, `xproc_reward_audit` | T1-01 |
| T4-02 | `CrossProcessPolicyGradientEngine` | REINFORCE with baseline. State = (material, feature, machine), action = (sf, strategy, toolpath), reward = T4-01. Slow learner; only updates on confirmed outcomes (no speculation). | `xproc_policy_train`, `xproc_policy_select_action` | T4-01, T2-02 |
| T4-03 | `CrossProcessQLearningTabularEngine` | Q-learning over discrete actions (which post-process strategy? which adaptive-feed knob?). Tabular for ≤1000 state-action pairs; falls back to DQN when state-space explodes. | `xproc_qlearn_update`, `xproc_qlearn_argmax` | T4-01 |
| T4-04 | `CrossProcessMultiArmedBanditEngine` | UCB1 + Thompson Sampling for exploration of unknown parameter combinations (e.g. new material + new machine). Exploits T4-02/T4-03 once arm has ≥30 pulls; explores below that. | `xproc_bandit_select`, `xproc_bandit_update` | T4-01 |

**Acceptance:** T4-01 reward correlates with composite quality metric at r≥0.7 on holdout; T4-02 policy converges (variance <5%) within 500 episodes on synthetic env; T4-03 Q-table converges to optimal in 100 episodes; T4-04 regret bound √(K·T·log T) holds within 2× theoretical.

**Risks:** R1 — reward hacking (policy finds metric-loophole) → adversarial validation by Codex+Gemini consensus before deployment. R2 — exploration on real machine = $$$ → bandit only suggests; operator-in-the-loop (per CLAUDE.md mandate) approves.

---

## Tier 5 — Bayesian / Uncertainty Quantification (4 engines)

**Motivation:** Point predictions from T1-02 hide uncertainty. A "predicted SF=180 m/min" with σ=2 is shop-floor-actionable; σ=40 is sim-only. Tier 5 quantifies confidence so the safety gate (CLAUDE.md tiered-omega) can route correctly.

| ID | Engine | Brief | Dispatcher action(s) | Depends on |
|----|--------|-------|----------------------|------------|
| T5-01 | `CrossProcessBayesianMLPEngine` | Monte Carlo Dropout (Gal & Ghahramani): K=50 forward passes with dropout active → mean + variance. Drop-in over T1-02 weights, no retraining. | `xproc_bayes_predict`, `xproc_bayes_uncertainty` | T1-02 |
| T5-02 | `CrossProcessConformalPredictionEngine` | Inductive conformal: holdout calibration set produces non-conformity scores; new prediction returns prediction set (e.g. SF ∈ [165, 195]) at chosen confidence (1-α). Distribution-free. | `xproc_conformal_set`, `xproc_conformal_calibrate` | T5-01, T1-04 |
| T5-03 | `CrossProcessDeepEnsembleEngine` | Trains M=5 independent MLPs from different random inits; averages predictions; uses disagreement as epistemic uncertainty proxy. Cheaper than full Bayesian, captures multi-modality. | `xproc_ensemble_predict`, `xproc_ensemble_disagreement` | T1-02, T2-02 |
| T5-04 | `CrossProcessCalibrationAuditorEngine` | Continuous monitoring: computes ECE, MCE, Brier score on rolling window. Auto-recommends temperature scaling or Platt scaling when ECE exceeds threshold. | `xproc_calibration_score`, `xproc_calibration_recommend` | T5-01, T1-04 |

**Acceptance:** T5-01 prediction interval covers true value at nominal rate ±2%; T5-02 marginal coverage ≥1-α on 1K holdout queries; T5-03 ensemble Brier score < single-model Brier; T5-04 ECE ≤0.05 maintained over 30-day rolling window.

**Risks:** R1 — overconfidence after T3-01 online updates → T5-04 auto-recalibrates. R2 — ensemble compute cost (5× single-model) → run async, cache results.

---

## Tier 6 — Federated Learning (4 engines)

**Motivation:** Multi-shop deployment. Each shop has private outcome data; models must improve across shops without leaking proprietary geometry. Tier 6 implements the federated weighting from CLAUDE.md (local 1.0×, shared 0.5×).

| ID | Engine | Brief | Dispatcher action(s) | Depends on |
|----|--------|-------|----------------------|------------|
| T6-01 | `CrossProcessFedAvgAggregatorEngine` | FedAvg (McMahan et al.) with PRISM weighting: aggregated_w = Σ (n_i / N) · w_i; for shared (non-local) clients, n_i is halved per SLBRulesEngine 0.5× rule. | `xproc_fed_aggregate`, `xproc_fed_round_summary` | T1-02 |
| T6-02 | `CrossProcessSecureAggregationEngine` | Bonawitz et al. secure aggregation primitive: pairwise additive masks cancel at aggregator; aggregator never sees individual updates. Enables verifiable privacy. | `xproc_secure_mask`, `xproc_secure_unmask` | T6-01 |
| T6-03 | `CrossProcessDriftAwareFederationEngine` | Per-client drift score (T3-02) gates participation. High-drift clients wait for next round; low-drift clients aggregate. Prevents one drifting shop from poisoning the global model. | `xproc_fed_gate`, `xproc_fed_drift_report` | T6-01, T3-02 |
| T6-04 | `CrossProcessClientSelectionSchedulerEngine` | Per-round subset selection: prioritizes clients with (a) recent activity, (b) low drift, (c) underrepresented material clusters. Active client set ⊆ all clients each round. | `xproc_fed_select_clients`, `xproc_fed_round_plan` | T6-03, T1-03 |

**Acceptance:** T6-01 aggregated weights match centralized-trained baseline within 2% accuracy; T6-02 round-trip preserves correctness with masks zeroed; T6-03 rejects synthetic drift-injected client at ≥95% rate; T6-04 client schedule covers all material clusters within 10 rounds.

**Risks:** R1 — single malicious shop poisons aggregate → Krum/Median aggregation alternative when Byzantine threshold reached. R2 — stale clients (offline >1 round) → adaptive participation incentive.

---

## Tier 7 — Meta-Learning (4 engines)

**Motivation:** When a new material/machine arrives, T1-03 transfer learning cold-starts from cluster centroid. Meta-learning learns a *better init* — one that adapts to a new task in 1-5 examples.

| ID | Engine | Brief | Dispatcher action(s) | Depends on |
|----|--------|-------|----------------------|------------|
| T7-01 | `CrossProcessMAMLLiteEngine` | Model-Agnostic Meta-Learning (Finn et al.) — first-order approximation (FOMAML) for compute. Outer loop optimizes init θ such that 1-step gradient on new task is near-optimal. | `xproc_maml_meta_train`, `xproc_maml_adapt` | T1-02, T1-03 |
| T7-02 | `CrossProcessPrototypicalNetEngine` | Snell et al. prototypical networks: embed each known material into prototype space; new material classified to nearest prototype; few-shot regression head adapts. | `xproc_proto_classify`, `xproc_proto_regress` | T1-02, T2-04 |
| T7-03 | `CrossProcessLearnedLRSchedulerEngine` | Andrychowicz et al. "Learning to Learn": LSTM-based optimizer learns per-parameter learning-rate schedule. Improves T3-01 online updates. | `xproc_meta_lr_step`, `xproc_meta_lr_state` | T7-01, T3-01 |
| T7-04 | `CrossProcessHyperparameterMetaTunerEngine` | Bayesian optimization (Gaussian Process surrogate) over MLP hyperparams (layer sizes, dropout, batch size). Reuses T7-02 prototypes for transfer. | `xproc_hyper_propose`, `xproc_hyper_record_outcome` | T7-02 |

**Acceptance:** T7-01 reaches 80% of T1-02 batch-trained accuracy with 10 examples on held-out task; T7-02 classification accuracy ≥90% on 5-shot 5-way; T7-03 converges with learned LR ≥10% faster than fixed Adam on synthetic tasks; T7-04 finds better hyperparams than random search within 50 trials.

**Risks:** R1 — meta-overfit to training-task distribution → diverse cross-process meta-batches. R2 — second-order gradient compute (in MAML proper) → FOMAML-only commitment, document trade-off.

---

## Tier 8 — Neural-Symbolic Hybrid (4 engines)

**Motivation:** Pure neural predictions can violate physics (e.g. recommend feed >SF). PRISM has hard physics envelopes (Kienzle, Taylor, deflection, thermal). Tier 8 marries neural inference to symbolic constraint satisfaction.

| ID | Engine | Brief | Dispatcher action(s) | Depends on |
|----|--------|-------|----------------------|------------|
| T8-01 | `CrossProcessSymbolicConstraintEnforcerEngine` | Project neural prediction onto feasible region defined by Kienzle envelope, Taylor tool-life curve, machine-spindle-power curve, axis-rapid limit. Returns nearest feasible point + violation report. | `xproc_symbolic_project`, `xproc_symbolic_violations` | T1-02, `prism_calc:kienzle_force`, `prism_calc:tool_life` |
| T8-02 | `CrossProcessRuleExtractedNeuralInferenceEngine` | Extracts decision rules from T1-02 weights via decompositional methods (TREPAN-style). Output: human-readable IF-THEN rules that approximate the network. Audit + tribal-knowledge bridge. | `xproc_extract_rules`, `xproc_rule_explain_prediction` | T1-02, T1-04 |
| T8-03 | `CrossProcessNeuroSymbolicSafetyVerifierEngine` | Hard-gate: any neural recommendation must pass T8-01 projection AND PRISM tiered-omega thresholds. Returns pass/fail/escalate, never raw neural output for shop-floor tier. | `xproc_safety_verify`, `xproc_safety_escalate` | T8-01, `prism_safety:validate_physics` |
| T8-04 | `CrossProcessFormulaNeuralEnsembleEngine` | Weighted blend: prediction = α·formula(state) + (1-α)·neural(state); α adapts based on T5-04 calibration (high-confidence formula → α↑; high-drift state → α↓). | `xproc_blend_predict`, `xproc_blend_weight_report` | T8-01, T5-04 |

**Acceptance:** T8-01 0% Kienzle/Taylor envelope violations on 10K synthetic queries; T8-02 extracted rules cover ≥80% of network's decision regions with ≤10% fidelity loss; T8-03 zero shop-floor recommendations bypass safety gate; T8-04 ensemble RMSE ≤ min(formula RMSE, neural RMSE) on holdout.

**Risks:** R1 — over-restrictive constraint kills useful predictions → T8-03 escalates to operator with neural-rationale. R2 — formula errors propagate via ensemble → require formula citation in outcome event.

---

## Tier 9 — Causal Inference (4 engines)

**Motivation:** Correlation ≠ causation. T1-02 may learn "high SF correlates with poor finish" when the true cause is tool wear (SF and finish both downstream of wear). Tier 9 builds a causal graph and answers do-queries.

| ID | Engine | Brief | Dispatcher action(s) | Depends on |
|----|--------|-------|----------------------|------------|
| T9-01 | `CrossProcessCausalGraphLearnerEngine` | PC algorithm (Spirtes & Glymour) over outcome events. Returns DAG over {material, feature, sf, strategy, tool, outcome} with conditional-independence tests. | `xproc_causal_learn_dag`, `xproc_causal_export_graph` | T1-01 |
| T9-02 | `CrossProcessDoCalculusEngine` | Pearl's do-calculus on T9-01 DAG: answers "what happens if we set SF=200 (intervention)?" vs "what was finish given SF=200 (observation)?" Distinguishes by back-door / front-door adjustment. | `xproc_do_intervene`, `xproc_do_identify` | T9-01 |
| T9-03 | `CrossProcessCounterfactualPredictorEngine` | Twin-network (Pearl): given observed outcome, asks "what would have happened with strategy=X instead?" Uses T9-01 DAG + T1-02 mechanism approximation. | `xproc_counterfactual_query`, `xproc_counterfactual_explain` | T9-01, T1-02 |
| T9-04 | `CrossProcessMediationAnalyzerEngine` | Decomposes total effect into direct + indirect: e.g. "SF→finish: 70% direct, 30% via tool-wear mediator". Identifies leverage points for shop optimization. | `xproc_mediation_decompose`, `xproc_mediation_path_strength` | T9-02 |

**Acceptance:** T9-01 recovers ≥80% of true edges in synthetic causal benchmark (Sachs cell-signaling); T9-02 do-query results match Monte-Carlo simulation within 5%; T9-03 counterfactual MAE ≤0.15 on test events; T9-04 mediation decomposition sums to total effect ±2%.

**Risks:** R1 — hidden confounders bias causal estimates → sensitivity analysis (E-value) attached to every query. R2 — DAG mis-specification → run T9-02 against multiple plausible DAGs, surface variance.

---

## Tier 10 — Multi-Modal Fusion (4 engines)

**Motivation:** Outcome events are tabular. But blueprint OCR yields vision features, sensor streams yield time-series, microphones yield audio (chatter). Tier 10 fuses modalities into a richer state representation.

| ID | Engine | Brief | Dispatcher action(s) | Depends on |
|----|--------|-------|----------------------|------------|
| T10-01 | `CrossProcessVisionTabularFusionEngine` | Late-fusion: blueprint-OCR output (BlueprintVisionOCREngine) → CNN embedding; concat with tabular features; joint MLP head. | `xproc_vision_fuse`, `xproc_vision_explain_attention` | T1-02, BlueprintVisionOCREngine |
| T10-02 | `CrossProcessTimeSeriesTabularFusionEngine` | Sensor streams (spindle load, vibration, temp) → 1D-CNN or small Transformer → embedding; gated fusion with tabular state. | `xproc_timeseries_fuse`, `xproc_timeseries_segment` | T1-02, AdaptiveControlEngine |
| T10-03 | `CrossProcessAudioTabularFusionEngine` | FFT/wavelet of microphone audio → chatter signature → embedding; fusion with cutting-condition tabular. Specialized for chatter prediction (linked to ChatterStabilityEngine). | `xproc_audio_fuse`, `xproc_audio_chatter_score` | T1-02, ChatterStabilityEngine |
| T10-04 | `CrossProcessModalityDropoutRobustifierEngine` | Training-time random modality dropout (mask out vision OR time-series OR audio); inference handles missing modalities gracefully. Critical for shops without sensor instrumentation. | `xproc_modality_predict`, `xproc_modality_availability` | T10-01, T10-02, T10-03 |

**Acceptance:** T10-01 improves accuracy ≥5% over tabular-only on blueprint-rich tasks; T10-02 detects sensor-leading-indicators within 200ms of event; T10-03 chatter detection F1 ≥0.85 on operator-labelled audio; T10-04 single-modality inference within 3% of full-modality accuracy.

**Risks:** R1 — modality dimensionality blowup → bottleneck embeddings ≤32 dim per modality. R2 — sensor calibration drift across shops → modality-wise normalization layer.

---

## Tier 11 — Active Learning & Curiosity (4 engines)

**Motivation:** Outcome events are expensive (each = a real machined part). Tier 11 selects which experiments are worth running.

| ID | Engine | Brief | Dispatcher action(s) | Depends on |
|----|--------|-------|----------------------|------------|
| T11-01 | `CrossProcessUncertaintyDrivenSamplerEngine` | Selects pending jobs whose T5-01 prediction variance is highest; recommends them for instrumented runs. Maximum-information experiment selection. | `xproc_active_select`, `xproc_active_rationale` | T5-01 |
| T11-02 | `CrossProcessNoveltyDetectorEngine` | Distance from T2-01 episodic centroids; jobs in regions of low episodic density flagged as novel → priority instrumentation. | `xproc_novelty_score`, `xproc_novelty_alert` | T2-01 |
| T11-03 | `CrossProcessCuriosityDrivenExplorationEngine` | Schmidhuber curiosity: intrinsic reward = T1-02 prediction error on the new state. Explores parameter combinations where the model is most "surprised". Bounded by T8-03 safety gate. | `xproc_curiosity_propose`, `xproc_curiosity_score` | T11-02, T8-03 |
| T11-04 | `CrossProcessBayesianDOEPlannerEngine` | Bayesian Design of Experiments: given budget K experiments, plans which (material, machine, strategy) combinations maximize information gain. Constrained by shop schedule. | `xproc_doe_plan`, `xproc_doe_evaluate_completion` | T11-01, T7-04 |

**Acceptance:** T11-01 selected jobs reduce model variance ≥2× faster than random sampling; T11-02 novelty score correlates with test-time error at r≥0.6; T11-03 curiosity-driven runs uncover ≥3 useful new parameter regions per 100 runs; T11-04 K=10 plan recovers 80% of K=50 random plan's info-gain.

**Risks:** R1 — curiosity proposes unsafe experiments → T8-03 hard-gates. R2 — DOE budget over-spending → operator approval per experiment per CLAUDE.md mandate.

---

## Tier 12 — Master Orchestration (2 engines)

**Motivation:** Tier 1-11 = 44 engines. Without orchestration the caller must know which tier owns which question. Tier 12 routes.

| ID | Engine | Brief | Dispatcher action(s) | Depends on |
|----|--------|-------|----------------------|------------|
| T12-01 | `CrossProcessTierRouterEngine` | Classifies incoming query → tier(s). E.g. "what's the SF for new material?" → T7-02 (proto-net) + T1-03 (transfer); "is this prediction trustworthy?" → T5-04 + T1-04; "why did this fail?" → T9-03 + T8-02. | `xproc_route_query`, `xproc_route_explain` | All tiers |
| T12-02 | `CrossProcessHierarchicalNeuralOrchestratorEngine` | Composes tier outputs into final answer with provenance: "predicted SF=180 ± 12 (T1-02), conformal interval [165,195] at 95% (T5-02), formula bound = 175-195 (T8-01), causal effect from material (T9-04: 0.8 indirect via tool-wear), recommend (T8-04 blend, α=0.6)". | `xproc_orchestrate_full`, `xproc_orchestrate_brief` | T12-01, all tiers |

**Acceptance:** T12-01 routes 95% of test queries to correct tier(s); T12-02 produces unified answer with all provenance fields populated for ≥99% of queries; total round-trip latency <500ms for orchestrated query.

**Risks:** R1 — orchestrator becomes single point of failure → degraded-mode falls back to T1-05 AGIBridge. R2 — provenance leak (private ledger info exposed) → T6-02 secure aggregation primitive applied to cross-shop federations.

---

## Total tier counts

| Tier | Engines | Cumulative |
|------|---------|-----------|
| 1 (DONE) | 5 | 5 |
| 2 | 4 | 9 |
| 3 | 4 | 13 |
| 4 | 4 | 17 |
| 5 | 4 | 21 |
| 6 | 4 | 25 |
| 7 | 4 | 29 |
| 8 | 4 | 33 |
| 9 | 4 | 37 |
| 10 | 4 | 41 |
| 11 | 4 | 45 |
| 12 | 2 | **47** |

**Discrepancy note:** CLAUDE.md cites "46 remaining" plus the 5 of Tier 1 = 51. This roadmap delivers 47 (5 done + 42 planned). Two reconciliations possible:
- (a) Drop one engine — recommend dropping T11-04 (Bayesian DOE) since it overlaps with T7-04 hyperparameter tuner; net 46.
- (b) Add one engine to Tier 12 — `CrossProcessFleetCoordinatorEngine` (per-shop coordination of all tiers); net 48.

Defer this decision to roadmap claim time. Either way, the 11-tier architecture is intact.

---

## Build sequencing (critical path)

```
T1 (DONE)
  ├─→ T2 (Memory) ─→ T3 (Online) ─→ T6 (Federated)
  ├─→ T4 (RL)  ─────────────────────┐
  ├─→ T5 (Bayes) ─→ T8 (Neuro-Sym) ──┼─→ T12 (Orchestrate)
  ├─→ T7 (Meta) ────────────────────┤
  ├─→ T9 (Causal) ──────────────────┤
  ├─→ T10 (Multi-modal) ────────────┤
  └─→ T11 (Active) ─────────────────┘
```

T2-T11 are largely independent; can be claimed by different chats in parallel. T12 is the only post-condition for production cutover.

---

## Acceptance criteria (roadmap-level)

- All 42 new engines ship with concrete vitest tests (≥3 failure modes each per CLAUDE.md acceptance bar).
- Each engine wired to `prism_intelligence` AND every dispatcher its outputs naturally consume (per CLAUDE.md "wire to all sources" rule).
- Cumulative test count ≥ existing baseline + (42 engines × ~6 tests avg) = +250.
- Tier 12 orchestrator query: any operator question routes correctly with full provenance in ≤500ms p99.
- Federated round (T6) verified end-to-end with 3 simulated shops on synthetic data; weight-aggregation matches centralized baseline.

---

## Open questions for next session

1. Which chat owns Tier 2-12 build? (Recommend forking `H:/prism-xproc-neural-tier2` per CLAUDE.md conflict-fork rule.)
2. CLAUDE.md says 46; this delivers 47. Which reconciliation (drop T11-04 or add T12-03)?
3. Tier 1 engines live on `work/cad-fidx-solidworks` — must merge to `main` before Tier 2 starts, OR Tier 2 builds on the same fork branch.
4. Per the JM Die test-shop mandate, which tier ships first to JM Die? Recommend T8 (neuro-sym safety) — directly enforces existing physics envelopes operators trust.

---

## Bibliography (peer-reviewed sources cited above)

- McMahan et al. 2017 — *Communication-Efficient Learning of Deep Networks from Decentralized Data* (FedAvg)
- Schaul et al. 2016 — *Prioritized Experience Replay*
- Gal & Ghahramani 2016 — *Dropout as a Bayesian Approximation*
- Finn et al. 2017 — *Model-Agnostic Meta-Learning for Fast Adaptation*
- Snell et al. 2017 — *Prototypical Networks for Few-shot Learning*
- Schmidhuber 1991 — *A Possibility for Implementing Curiosity and Boredom in Model-Building Neural Controllers*
- Pearl 2009 — *Causality: Models, Reasoning, and Inference* (do-calculus)
- Spirtes & Glymour 1991 — *An Algorithm for Fast Recovery of Sparse Causal Graphs* (PC algorithm)
- Kirkpatrick et al. 2017 — *Overcoming Catastrophic Forgetting* (EWC)
- Bonawitz et al. 2017 — *Practical Secure Aggregation for Privacy-Preserving Machine Learning*
- Schwarz et al. 2018 — *Progress & Compress* (EWC++)

All citations to be embedded in per-engine doc-comments at build time.
