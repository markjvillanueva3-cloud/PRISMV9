---
name: reference_xray_stepped_bore_prompt_fix_rerun_2026_06_16
description: "Operator GOLD-verification of the OCR trainset caught a SYSTEMATIC extraction miss: the VLM read the dominant near-side ID of a stepped bore but missed the smaller far-side ID + the lead-in chamfer between them. Fixed buildVisionPrompt (multi-diameter bore + transition-chamfer capture, anti-hallucination guard kept), then triggered a full reaper-immune re-run of all 7142 prints. slot:xray 2026-06-16."
type: reference
slot: xray
source: prism-memory
synced: 2026-06-27T20:30:47.277Z
aliases: reference_xray_stepped_bore_prompt_fix_rerun_2026_06_16
---


# Stepped-bore extraction miss -> prompt fix + full re-run — slot:xray 2026-06-16

The Desktop GOLD-verification package ([[reference_xray_page_classify_numctx_fix_and_wire_2026_06_16]]
chain) did its job on the FIRST batch: the operator reviewed it and found a **systematic VLM miss**.

## THE MISS (operator-found, the value of human-in-the-loop)
On a stepped bore the VLM extracted the dominant near-side ID and STOPPED -- it missed (a) the
**smaller diameter ID on the far/opposite side** and (b) the **lead-in chamfer** in the middle of the
bore transitioning to that smaller ID. Confirmed in the trainset: D22706-38 p0 had 8 linears + exactly
**1 diameter** (19.05mm). The schema already supported diameter/chamfer/counterbore -- the gap was the
PROMPT never told the model a bore can have MULTIPLE coaxial diameters.

## THE FIX (commit 84a78522f8) -- buildVisionPrompt, ollama-vision-extract-lib.mjs
Added 3 RULES: (1) report EVERY diameter of a stepped/counterbore/through-bore incl. the smaller
far-side ID; read section views from BOTH ends; (2) capture lead-in/transition/counterbore chamfers
between two diameters as type "chamfer"; (3) KEEP the anti-hallucination guard (only dimensions
ACTUALLY shown -- do not invent a 2nd diameter/chamfer if undimensioned). +1 regression test (65/65).
Applies to ALL extraction (nightly loop + broad OCR), since it is the single shared prompt.

## THE RE-RUN (operator: "double check all prints and run closed loop training again")
ALL-MEANS-ALL stated back: **7142 distinct prints** (55 OCR'd pre-fix). Re-run setup:
1. Backed up the old corpus-train state (cursor 56 / trainset 59 / queue 149) ->
   `state/shared/ocr-training-loop/corpus-train-pre-stepbore-backup-20260616/` (never delete).
2. Cleared the 3 live state files (cursor/trainset/queue) so the loop restarts fresh.
3. Triggered `PRISM OCR Training Loop` scheduled task -> State: Running (fresh [1/3] CALIBRATE).
The reaper-immune nightly now re-OCRs all 7142 with the corrected prompt over ~11 nights. The Desktop
verify package regenerates (re-run `scripts/build-ocr-gold-verify-package.mjs`) as dims accumulate.

## R12 HONESTY -- what is + isn't proven
- Prompt fix: VERIFIED at the prompt level (test asserts the guidance is present; 65/65).
- Live re-OCR validation: COULD NOT run in-session -- in-session node VLM procs get **reaper-killed**
  (the documented constraint; [[reference_xray_corpus_train_nightly_armed_2026_06_16]]). The live proof
  is the re-run's OUTPUT: spot-check the regenerated package for the now-captured far-side IDs + chamfers.
- LESSON: in-session VLM = unreliable (reaped); all VLM validation/corpus work must go through the
  scheduled task. Do not attempt live multi-call VLM probes in a long chat session.

Sibling memories: [[reference_xray_ocr_observability_al_queue_surface_2026_06_16]] (units 1-2) +
[[reference_xray_page_classify_numctx_fix_and_wire_2026_06_16]] (units 3-5). This is unit 7 of the day.
