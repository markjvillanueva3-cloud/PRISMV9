# CAD-LEARNING-AI/U-CAD-LEARN-CALIBRATE — [MAIN-FORCE] [CAD-LEARNING-AI]/U-CAD-LEARN-CALIBRATE (slot:india): self-correcting calibration closes the cad_learning loop last-mile

**Commit:** `1a910d6015de` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T08:24:53-05:00
**Tags:** cad-learning-ai, u-cad-learn-calibrate, auto-distilled

## Subject
[MAIN-FORCE] [CAD-LEARNING-AI]/U-CAD-LEARN-CALIBRATE (slot:india): self-correcting calibration closes the cad_learning loop last-mile

## Body
```
[MAIN-FORCE] [CAD-LEARNING-AI]/U-CAD-LEARN-CALIBRATE (slot:india): self-correcting calibration closes the cad_learning loop last-mile

CADTrialErrorLearningEngine's getLoopEfficacy() already MEASURED calibration error
(|meanPred - realizedFailFrac|, Brier) but nothing CONSUMED it -- a learning loop that
measured but never self-corrected. recommendAdjustments(candidate, {calibrate}) now
recalibrates the raw aggregate riskScore via a logit-space shift learned from the SCORED
recommendations toward the realized failure rate, shrinkage-weighted (w = n/(n+10), gated
n >= MIN_EFFICACY_SAMPLES=3) so a thin corpus barely corrects. The shift is anchored on a
separately-persisted RAW prediction (rawPredictedRisk), NOT the calibrated output, so the
corrected risk CONVERGES on the realized rate as scored data grows (0.628 n3 -> 0.567 n5 ->
0.464 n10 -> 0.208 n500) instead of settling at a biased fixed point. getLoopEfficacy now
surfaces calibrationShift/calibrationApplied (measurement -> action linked).

WIRE (R15): cad_learning_recommend + cad_learning_record_recommendation (cadAutomationDispatcher)
AND cad_trial_recommend (cadDispatcher) -- both live consumers of the same engine singleton,
default calibrate:true, disable_calibrate opt-out. record_recommendation persists the calibrated
predictedRisk (Brier measures the corrected predictions) + the raw basis.
TEST: 10 new (7 engine reference-value: over/under-predict 0.56717/0.43283, equilibrium 0,
below-floor identity, byte-identical-off, all-pass+all-fail clamp finite, efficacy-surface;
production-path multi-pass discriminator pins the raw-anchor at shift -1.24245/risk 0.46411
-- a predictedRisk-anchored revert gives -1.0216 and FAILS; 3 dispatcher round-trip). 78/78 pass.
VALIDATE: tsc-clean on all 5 changed files (2 remaining errors are the pre-existing month-old
ReinforcementLearningCAMFeedbackEngine arity regression, owner lima). Additive + backward-compatible
(engine default calibrate off; no calibration field unless requested).
3-of-3 scrutiny PASS (A+B+C); arm B caught 2 P1 (incomplete 2nd-consumer wiring + self-referential
convergence bias) -> both fixed + re-verified.

Backward-compat: legacy recommendation-ledger records lack rawPredictedRisk -> computeCalibrationShift
falls back to predictedRisk. Default-on at the dispatcher is a no-op until >=3 scored recs exist
(empty/thin live ledgers unchanged).
```

## Files touched (6)
- mcp-server/src/__tests__/CADTrialErrorLearningEngine.test.ts              | 125 ++++++++++++++++++++++++++++++++++
- .../__tests__/cadAutomationDispatcher.cad-learning-tribal-inject.test.ts  |  24 +++++++
- mcp-server/src/engines/CADTrialErrorLearningEngine.ts                     | 119 +++++++++++++++++++++++++++++++-
- mcp-server/src/tools/dispatchers/cadAutomationDispatcher.ts               |   8 +++
- mcp-server/src/tools/dispatchers/cadDispatcher.ts                         |   6 +-
- 5 files changed, 278 insertions(+), 4 deletions(-)

## Lessons surfaced in commit body
- til >=3 scored recs exist

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1a910d6015de`
- Milestone envelope: `mcp-server/data/milestones/CAD-LEARNING-AI.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._