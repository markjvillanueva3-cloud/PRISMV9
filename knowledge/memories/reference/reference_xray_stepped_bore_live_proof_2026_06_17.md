---
name: reference_xray_stepped_bore_live_proof_2026_06_17
description: "LIVE PROOF the stepped-bore prompt fix works on real prints (closes the R12 gap in [[reference_xray_stepped_bore_prompt_fix_rerun_2026_06_16]] which could only claim prompt-level verification). After the re-run processed 168/7142 prints overnight: 66 of 125 trainset records now capture >=2 coaxial diameters (the far-side smaller ID that was being missed); examples with 3-4 diameters per bore. Run resumed healthy under GPU contention (2 curls @ --max-time=600, node alive). slot:xray 2026-06-17."
type: reference
slot: xray
source: prism-memory
synced: 2026-06-27T20:30:47.277Z
aliases: reference_xray_stepped_bore_live_proof_2026_06_17
---


# Stepped-bore fix -- LIVE-PROVEN on real data -- slot:xray 2026-06-17

## What this closes
[[reference_xray_stepped_bore_prompt_fix_rerun_2026_06_16]] honestly stated the prompt fix was
"VERIFIED at the prompt level" only -- live re-OCR could not run in-session (reaper-kills in-session
VLM procs). The overnight reaper-immune scheduled task IS the live proof channel, and it has now
produced the proof.

## The proof (overnight re-run, cursor 0 -> 168 prints)
Analyzed `state/shared/ocr-training-loop/corpus-train/trainset.jsonl` (125 records, all extracted
with BOTH the stepped-bore prompt 84a78522f8 AND the per-call timeout cap d2e20e2e46):
- **66 of 125 records (53%) capture >=2 coaxial diameters.** Before the fix a stepped bore stopped
  at the dominant near-side ID (D22706-38 p0 had exactly 1 diameter -- the original miss).
- Examples (the far-side-ID capture the fix targets):
  - `D22706-10.pdf` p0 -> 4 diameters [13.843, 15.9512, 16.51, 16.5354] mm
  - `D22706-04.pdf` p0 -> 4 diameters [12.192, 22.5806, 28.575, 28.6004] mm
  - `2019_10_30...pdf#page=4` -> 3 diameters [5.3086, 6.2992, 18.669] mm

## R12 caveats (still need operator GOLD-verification)
1. **Chamfer capture is sparse: 3 of 125 records** carry a chamfer vs 66 with multi-diameter. The
   lead-in/transition chamfer rule fires but rarely -- either few of these 168 prints had a
   *dimensioned* lead-in chamfer, or chamfer capture is genuinely weaker than diameter capture.
   Watch the chamfer yield as the cursor grows; if it stays near-zero on chamfered prints, the
   chamfer half of the prompt needs strengthening.
2. **Near-duplicate diameters**: D22706-10's [16.51, 16.5354] = 0.650" vs 0.651" (0.025mm apart).
   Could be one diameter read twice with ensemble variance (the fusion clusters by value; this pair
   may be just outside the cluster tolerance) OR a real tight step. The GOLD gate catches it -- but
   if near-dupes are common, the fusion cluster tolerance is the lever, not the prompt.

## Run state at proof time (2026-06-17)
- Overnight: cursor 0 -> 168, trainset 125, AL-queue 503. Terminated cleanly at the 5h window
  (0x41306 = TASK_TERMINATED, expected -- NOT a crash).
- Re-triggered this session to resume from cursor 168 -> State Running, node alive, 2 VLM curls
  @ --max-time=600, GPU ~96GB/69% util (loaded under peer contention -- the cap makes it resilient).
- Desktop verify package regenerated: 502 dims / 77 prints at
  `C:/Users/wompu/OneDrive/Desktop/PRISM-OCR-GOLD-VERIFY` (VERIFY-dimensions.csv + 77 prints).

## Yield-dilution note (optimization, not a bug)
Many overnight prints are `Scanned Document - <date>.pdf` office paperwork -> "0 trainable dim(s)".
The opt-in `--page-classify` pre-VLM gate (num_ctx bug fixed in
[[reference_xray_page_classify_numctx_fix_and_wire_2026_06_16]]) would skip these and concentrate
VLM time on real drawings. It is default-OFF; enabling it in
`scripts/run-ocr-training-loop-overnight.ps1` is an operator decision (surface, don't silently flip).

Sibling: [[reference_xray_stepped_bore_prompt_fix_rerun_2026_06_16]] (the fix) +
[[reference_xray_percall_timeout_cap_2026_06_16]] (the cap that kept the overnight run alive).
