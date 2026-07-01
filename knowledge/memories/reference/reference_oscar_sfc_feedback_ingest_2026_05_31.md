---
name: oscar-sfc-feedback-ingest-2026-05-31
description: "prism_calc:sfc_dl_record_feedback — first ingestion surface for the SFC L1 self-learning loop (U-OSC9-FEEDBACK-INGEST, commit ac9b7b3bd7)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.702Z
aliases: reference_oscar_sfc_feedback_ingest_2026_05_31
---


`U-OSC9-FEEDBACK-INGEST` (slot:oscar, 2026-05-31, commit `ac9b7b3bd7`) added the calcDispatcher action **`prism_calc:sfc_dl_record_feedback`** — the first *ingestion* surface for the SFC self-learning loop, which previously had only the read-only `speedfeed_dl_stats` action and so could never actually learn.

It wires `SpeedFeedDeepLearningEngine.recordFeedback(jobId, predicted{speed_mpm,feed_mm,tool_life_min,Ra_um}, actual{…optional})` — the only working calibration-update path. recordFeedback computes errorPct, feeds `selfLearning.recordFeedback`, AND emits the predicted-vs-actual pair onto the SFC outcome bus (lineage = job_id). The action returns updated `getSelfLearningStats()` so the caller confirms the loop moved.

**Calibration thresholds (engine, `SpeedFeedDeepLearningEngine.ts`):** calibration *factors* begin adjusting at `feedbackHistory.length >= 5` (line 473); the advertised `calibrated` flag flips at `>= 10` (line 509). The wire-test mirrors the 10 as `CALIBRATION_MIN_SAMPLES` with a comment citing the line.

**Scrutiny-found P1 (fixed in-unit):** all four `predicted` fields are errorPct *denominators*, so a finite **zero** passes `Number.isFinite` but yields a `-Infinity` residual that permanently poisons `calibrationFactors`. Guard hardened to require `v > 0` (rejects zero/negative/Infinity) + dedicated test. This is the standing rule for any future actuals-ingestion surface: **validate predicted denominators as finite AND positive, not merely finite.**

**Scrutiny note:** one subagent returned a *fabricated* review of a nonexistent file (wrong imports/action/stub asserts) — discarded; the fix was a fresh quote-verbatim grounded review that PASSed. Lesson: when a reviewer's findings don't match the file you wrote, treat it as hallucination and re-run grounded — don't act on a false FAIL. Relates to [[feedback_verify_actual_contract_not_proxy]].

This does NOT close the loop end-to-end — there is still no production *actuals-producer* writing real shop-floor measurements through this action (the keystone `U-OSC9-ACTUALS-PRODUCER` in `state/shared/specs/SFC-COMPLETENESS-ROADMAP-2026-05-31.md`). It opens the ingestion door. See [[reference_oscar_sfc_closed_loop_readiness_2026_05_31]].
