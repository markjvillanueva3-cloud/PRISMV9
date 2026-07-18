---
name: reference_xray_ocr_observability_al_queue_surface_2026_06_16
description: "Closed-loop OCR training got two observability/surfacing shipments: the loop now reports the TRUE corpus denominator (7142 distinct prints, NOT 7418 worklist lines) splitting re-filed-dedup from real progress, and a new READ-ONLY AL-queue GOLD-verification worklist surfaces the gate to 100% (142 corroborated GOLD-candidate dims await operator confirm). The 294-vs-56 'already-done' anomaly was NOT a bug. slot:xray 2026-06-16."
type: reference
slot: xray
source: prism-memory
synced: 2026-06-27T20:30:47.275Z
aliases: reference_xray_ocr_observability_al_queue_surface_2026_06_16
---


# Closed-loop OCR: observability fix + AL-queue GOLD-verification surface — slot:xray 2026-06-16

Work order (/checkin-xray): "reorientate to most recent sessions and continue in engineered loops
and harnesses and crons." Reorientation confirmed the nightly `PRISM OCR Training Loop` scheduled
task is HEALTHY + advancing (cursor 56, AL-queue 149, trainset 59; last run 06-16 15:29 result 0;
next 06-17 02:00). Two shipments, both on `cad-fusion-live-ms0` via [MAIN-FORCE] (see lane note).

## The "294 already-done vs 56-key cursor" anomaly was NOT a bug (R12)
`partitionByResumeCursor` keys by **lowercased basename** (`printCursorKey`). The worklist
`corpus-worklist-drawing.txt` has 7418 lines but only **7142 distinct basenames** -> 276 duplicate
lines. Those 276 are timestamp-named re-filed scans (e.g. "scanned document - 8_31_2020 6_44 am.pdf"
x5 = same scan event, globally unique by minute -> correct dedup via `seen.has(k)`). "294 already-done"
= 276 worklist dedup + ~18 cursor-resume. Cursor is MONOTONIC (first ts 06-08, last 06-16; never
reset — my initial lost-progress hypothesis was wrong). The loop terminates correctly at **7142
distinct prints** (the TRUE denominator, NOT 7418 lines, NOT 7794 drawings). NO coverage loss.

## U-XRAY-LOOP-DEDUP-OBS (commit a2c58ef366) — observability split
`partitionByResumeCursor` now returns `skippedWorklistDup` (re-filed dedup) + `skippedCursorDone`
(genuine prior-run progress) + `distinctTotal` (true denominator); `skippedDone` kept as back-compat
SUM. Loop log + `weak_label` report surface the split + `corpus_percent_complete`. Live: 7142 distinct
= 55 done + 7087 todo = **0.77% corpus complete**. Observability-only; OCR/VLM path byte-untouched.
21/21 tests (2 new: split + completion invariant). 2-reviewer scrutiny PASS/PASS; arm-A P2 (percent
lag — numerator used start-of-run skippedCursorDone vs end-of-run corpus_processed_total) fixed inline.

## U-XRAY-AL-QUEUE-SURFACE (commit 0a59bd7979) — the gate to 100%
New READ-ONLY `scripts/ocr-al-queue-surface.mjs` (+ test, 8/8): reads `active-learning-queue.jsonl`,
dedups reaper-kill dup rows (last-wins by key+page, image/part fallback = sibling-parity with
xray-trainset-to-lora), ranks prints by GOLD-readiness (confidence-weighted corroborated dims /
ambiguous+hallucination noise = cheapest GOLD wins first), writes `AL-QUEUE-GOLD-REVIEW.{md,json}`.
**Live: 133 distinct prints, 142 GOLD-candidate dims (corroborated), 3119 ambiguous, 1028 halluc.**
Top verify-first = `scanned document - 11_25_2019 2_00 pm.pdf#3` (7 corrob). The operator confirms the
142 corroborated dims -> GOLD trainset for india LoRA. Tool NEVER writes GOLD (mustHumanVerify:true).
2-reviewer scrutiny PASS/PASS; 3 arm-A P2s (Windows isMain compare, dedup fallback, negative-clamp)
fixed inline.

## Lane note (important for future xray OCR work)
The OCR loop scripts (`blueprint-ocr-training-loop.mjs`, `lib/ocr-training-loop-lib.mjs`) exist ONLY
on `cad-fusion-live-ms0` (git empty-blob hash on slot/xray = absent there). The nightly cron is
hardcoded to `H:\prism\scripts\...`. So these are SHARED-TREE cron-pinned runtime assets -> commit
with `[MAIN-FORCE]` (slot-commit-enforce blocks a plain slot commit; the files can't live on slot/xray
without becoming a merge-conflicting phantom). Also: a hook auto-stages `feature-routing-graph.json`
during git ops — use `git commit <pathspec>` (after `git add`) to commit ONLY your files.

## Open / deferred (next session)
1. **page-classify wiring DEFERRED (measure-first).** `scripts/page-classify.mjs` is built + unwired
   (a cheap VLM drawing-vs-paperwork gate). Wiring it as a default-OFF pre-VLM page filter could cut
   GPU time, but the intra-drawing-PDF non-drawing-page rate is UNMEASURED and running a measurement
   now contends the GPU the live loop uses. Build only after measuring skip-rate on a sample.
2. **Operator action: GOLD-verify the 142 corroborated dims** in `AL-QUEUE-GOLD-REVIEW.md` -> unblocks
   india LoRA (the path to 100% accuracy).
3. **Dormant one-shot:** `PRISM Blueprint OCR Batch` task (raw-extract pilot, superseded by the loop)
   failed at launch 06-12 (result 1, zero log = cmd-quoting footgun), no next run. Left dormant — do
   NOT re-arm without operator intent.

Ties to [[reference_xray_corpus_train_nightly_armed_2026_06_16]] (the re-armed grinder this builds on)
and [[reference_xray_ocr_yield_mechanics_2026_06_10]] (the pipeline mechanics).
