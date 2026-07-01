---
name: reference_cad_learn_calibrate_2026_06_25
description: "U-CAD-LEARN-CALIBRATE (slot:india 2026-06-25) -- closed the cad_learning loop's calibration last-mile: getLoopEfficacy MEASURED calibration error but nothing consumed it; recommendAdjustments now self-corrects riskScore via a raw-anchored logit-shift that CONVERGES on the realized rate."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.495Z
aliases: reference_cad_learn_calibrate_2026_06_25
---


# U-CAD-LEARN-CALIBRATE -- self-correcting calibration in the cad_learning loop (2026-06-25, slot:india)

Operator /goal (re-issue): "improve the learning and ai systems for cad drawing, print generation,
print to cad file." India-in-lane = the learning/AI layer. This continues
[[reference_cad_print_learning_ai_goal_scope_2026_06_24]].

## The gap (audit finding, R12-honest)
Audited all 9 `cad_learning_*` actions (cadAutomationDispatcher) -> ALL REAL, no dark facades; the
closed-loop attribution is structurally complete (recordRecommendation -> attributeOutcome/ingest ->
linkOutcome -> getLoopEfficacy). BUT `getLoopEfficacy()` only MEASURED `calibrationError`
(|meanPred - realizedFailFrac|) + Brier -- nothing CONSUMED it. A learning loop that measured but
never self-corrected.

## What shipped (commit 1a910d6015, [MAIN-FORCE] [CAD-LEARNING-AI]/U-CAD-LEARN-CALIBRATE)
`CADTrialErrorLearningEngine.recommendAdjustments(candidate, {calibrate})` recalibrates the raw
aggregate `riskScore` via a logit-space shift learned from the SCORED recommendations toward the
realized failure rate: `shift = (logit(realized) - logit(meanRaw)) * w`, `w = n/(n+SHRINKAGE_KAPPA=10)`,
gated `n >= MIN_EFFICACY_SAMPLES=3`. `corrected = sigmoid(logit(rawRisk) + shift)`. Helpers
clampProb/logit/sigmoid (EPS 1e-6). getLoopEfficacy now surfaces `calibrationShift`/`calibrationApplied`.

WIRE (R15): cad_learning_recommend + cad_learning_record_recommendation (cadAutomationDispatcher) AND
cad_trial_recommend (cadDispatcher) -- both live consumers of the SAME engine singleton. Default
`calibrate:true`, `disable_calibrate` opt-out. No-op until >=3 scored recs exist (thin live ledgers
unchanged). Engine method default is `calibrate:false` -> existing tests/consumers byte-identical.

## THE load-bearing lesson (scrutiny arm B P1 -> fix): anchor the shift on the RAW prediction
First cut persisted the CALIBRATED predictedRisk and derived `meanPred` from it -> a self-referential
loop that settled at a BIASED FIXED POINT (~0.53 for raw 0.75 / realized 0.2), NEVER reaching reality.
Fix: persist `rawPredictedRisk` separately (RecommendationRecord) and compute the shift from the RAW
mean, not the calibrated output. Then the corrected risk CONVERGES on the realized rate as scored data
grows (verified: 0.628 n3 -> 0.567 n5 -> 0.464 n10 -> 0.208 n500). RULE: a recalibration shift must be
anchored on the model's RAW output, never on its own already-corrected output, or the feedback is
self-referential and converges to a biased point instead of reality.

## Verification (R15)
- TEST: 10 new (7 engine reference-value: over/under-predict 0.56717/0.43283, equilibrium 0,
  below-floor identity, byte-identical-off, all-pass+all-fail clamp finite, efficacy-surface; +
  production-path multi-pass discriminator pinning the raw-anchor at shift -1.24245/risk 0.46411 --
  a predictedRisk-anchored revert gives -1.0216 and FAILS it; 3 dispatcher round-trip). 78/78 pass.
- VALIDATE: tsc-clean on all 5 changed files. (2 remaining tsc errors = the pre-existing month-old
  ReinforcementLearningCAMFeedbackEngine arity regression, owner lima -- NOT this unit.)
- 3-of-3 scrutiny PASS (A+B+C). Arm B caught 2 P1 (incomplete 2nd-consumer wiring + the self-reference
  bias) -> both fixed + re-verified independently.

## Already-done (do NOT duplicate -- verified this session, R8)
- tribal injection into the text->CAD Ollama loop (`scripts/cad-text-to-cadquery.mjs::loadTribalTips`)
  + its learning loop (ingestGenerationOutcome) -- shipped 2026-06-24.
- cad_learning_recommend tribal injection -- shipped 2026-06-24 (U-CAD-LEARN-TRIBAL-INJECT).
- the "PRISM Resources Tribal Drain" scheduled task (zulu's /learn pipeline) -- RUNNING (attempted
  152->243, drained 99->147 this fire). Do NOT blanket-kill drain procs (R14) -- the armed task owns continuation.

## Session 2026-06-25 delivery (2 units shipped, both verified)
1. **U-CAD-LEARN-CALIBRATE** (1a910d6015) -- this memo. Self-correcting calibration. 3-of-3 scrutiny PASS.
2. **U-CAD-TEXT-LEARN-PROMPT** (50bd919799) -- the REVERSE arrow: `scripts/cad-text-to-cadquery.mjs`
   `loadLearnedRisk()` reads the cad-failure ledger's learned patterns (via the CALIBRATED
   recommendAdjustments) back into the generation prompt as a "LEARNED FAILURE MODES" section, so the
   local-LLM is steered away from historically-failing modes. Closes generate->outcome->ledger->LEARN->
   next-gen. 17/17 node:test, 2-arm scrutiny PASS, live []-on-empty-ledger fail-soft. Consumes unit 1
   (each-pass-feeds-next). It is the ONLY local-LLM CAD-gen script using the learning engine (R15 apply-
   to-all satisfied -- no sibling scripts).

## Verified-done this session (do NOT duplicate)
- blueprint LoRA/RAG (blueprint_lora_*/blueprint_rag_*) is MATURE: blueprint_lora_prepare_set already
  defaults training pairs from the closed-loop ledger (U-BPA-LORA-PAIRS-WIRE) with an R12 empty-set guard;
  blueprint_rag_extract already mixes corpus/tribal/similar/family sources. Not a gap.
- The "PRISM Resources Tribal Drain" /learn task is RUNNING (drained 99->147 this session). R14: do NOT
  blanket-kill drain procs; the armed task owns continuation.

## NEXT unit (HANDOFF -- cross-lane, coordinate; NOT a quick india unit)
**Tribal injection into the PRINT->CAD generation path** (`BlueprintToCADGenerationEngine` /
`PrintToCADOrchestratorEngine` have 0 tribal references). The operator wants tribal injections on
"print to cad file." BUT: the generation runs through `NeuralCADGenerationEngine`, which DELEGATES to an
INJECTED `GenerationBackend` -- there is no in-engine prompt/corpus to inject tribal into; the prompt is
the backend's concern, and the backends + these orchestrators are xray/delta's domain (scope memo:
"xray's domain; coordinate, the india slice is the learning/RAG feeding it"). So this needs a
GenerationBackend-level tribal/RAG feed, coordinated with xray/delta -- NOT a unilateral india edit.
Attaching advisories to the result alone would be an orphan output (nothing consumes it). The
calibration self-correction PATTERN (logit-shift recalibration) is also generalizable to any other
measure-but-don't-act learning surface (e.g. blueprint-extraction confidence vs realized accuracy --
xray's blueprint-accuracy ledger). [[reference_cad_learn_tribal_inject_2026_06_24]]
