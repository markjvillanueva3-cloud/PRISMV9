---
name: reference_india_self_learning_test_audit_2026_05_29
description: "india self-improvement/self-learning test surface — 1290 tests audited, health + the 3 failing files + SelfImprovementPatternEngine now covered"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.621Z
aliases: reference_india_self_learning_test_audit_2026_05_29
---


**"Begin testing for self improvement and self learning" — slot:india 2026-05-29 (commit `592da33c82`).**

Self-learning substrate is present + healthy in the slot/india worktree (its own dev-line, not main). Test audit this session:

- **Calibration / conformal (india closed-loop surface #4): 376/376 PASS** (18 files — CAMConfidenceCalibration, Cascade/Adaptive/Stratified/Prediction/MultiController calibration, ConformalCalibrationMonitor, ConformalPredictionLog, CrossProcessConformal{Prediction,Classification}, physics-auto-calibration, calibrated-simulation).
- **Outcome / meta-learning / continual / feedback core: 900/911 PASS.** The chain (OutcomeCaptureBusEngine → CrossProcessOutcomeStore + feedbackbus → Outcome→{RL,episodic,replay-buffer,tribal,trace} bridges → meta-learning-optimizer / continual-LoRA / kipOutcomeRecorder) is exercised end-to-end by existing tests.
- **NEW: `SelfImprovementPatternEngine` — was ZERO coverage; now 14/14** invariant tests (`mcp-server/src/__tests__/SelfImprovementPatternEngine.test.ts`). It mines failure/quality/error/learning ledgers → ranked SIP-NNN improvement patterns (the self-IMPROVEMENT half; OutcomeFeedbackBus is the self-LEARNING half).

**11 pre-existing failures, isolated to 3 NON-india-core files (NOT my regressions):**
1. `businessDispatcherOutcomeBus.test.ts` (9) — imports `businessDispatch` from businessDispatcher.js but that symbol is NOT exported → `businessDispatch is not a function`. Hotel (business/ERP) domain. Test-side or export-rename break.
2. `CAMX-MS15-SelfLearning.test.ts` (1) — `StrategyEvolutionEngine evolve: best parameters respect machine power envelope` — real self-learning logic failure (evolved params exceed power envelope). Kilo (CAM) domain.
3. `WikiPrecheckBoostKeywords.test.ts` (1) — tangential (keyword boost).

**Engine wart (minor):** `SelfImprovementPatternEngine` resolves its persist path via `import.meta.dirname`, so under vitest it writes `SELF_IMPROVEMENT_PATTERNS.json` into `mcp-server/src/state/shared/` (pollutes the src tree). `summary()` returns the "No self-improvement patterns computed yet" sentinel ONLY when `read()` is null — a zero-pattern persisted report still renders the header + `**Total Patterns**: 0` (don't assume 0-patterns == sentinel; this tripped the first test draft).

Self-learning is testable + largely green from the worktree; the deferred NN-GRAPH deploy gate (the one red leg) still needs main + GPU. See [[reference_india_ms1_u6_blueprint_corpus_harvest_2026_05_29]] for the worktree↔main unrelated-history blocker.
