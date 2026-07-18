# TRUE-TEST VERDICT — OCR/blueprint reading vs CNC-program ground truth (slot:xray, 2026-06-08)

**Operator ask:** "use the 91 [perfect parts] as a true test of the system before continuing to the full-blown test of all documents."

**VERDICT: 🔴 NOT READY for the full corpus.** On real scanned JM prints, the OCR ensemble reads **1–3 dimensions per print and matches ZERO** of the part's machined ground-truth diameters. Do not launch the full-corpus run until the root cause (below) is resolved.

## Method (objective, no synthetic GT, no operator labeling)
For each perfect part (print + CAD + CNC program), the **CNC program is the answer key** — it encodes the actual machined coordinates. The harness: resolve the print + program on disk → OCR the print (qwen3-vl:8b-instruct + qwen2.5vl:7b ensemble) → parse the program for callout-class GT (distinct feed-move feature diameters, roughing-ramp-clustered, + overall length) → score recall (fraction of machined dims the OCR read) + precision (fraction of OCR dims that are real). Scripts: `scripts/validate-perfect-parts.mjs` + `scripts/lib/cnc-program-gt-lib.mjs` (12 tests).

## Result (8 STEP-bearing parts sampled)
| Part | program axis | callout GT dims | OCR dims read | matched | recall |
|---|---|---|---|---|---|
| T-11BT-27-250-GR5 | lathe | 14 | 1 | 0 | 0 |
| 05850 | lathe | 7 | 1 | 0 | 0 |
| 1648933 | lathe | 21 | 3 | 0 | 0 |
| 43210 | lathe | 8 | 1 | 0 | 0 |
| 9102741 | **skipped** (mill program — X≠diameter) | — | — | — | — |
| 110206, 113063, B0762-87-01 | **skipped** (binary .mcx-8 CAM source, not posted G-code) | — | — | — | — |

**Scored 4/8 · mean recall 0 · mean precision 0 · PASS 0.**

## What this proves + what it does NOT
- **Proven:** the OCR ensemble extracts almost nothing usable from these real scanned prints (1–3 dims vs 7–21 machined features; **zero** matches). At corpus scale this would mint a near-empty / useless trainset. The "true test before the full run" did exactly its job.
- **Two possible root causes — must disambiguate before fixing (R12, not yet determined):**
  1. **Weak real-scan OCR** — the VLMs underperform on low-quality scans (vs the clean synthetic prints the calibration used). This is the domain-shift gap flagged earlier.
  2. **Wrong-document resolution** — the join links a part number to a Docustrata scanned PDF via a classifier; the resolved `Scanned Document - <timestamp>.pdf` may be a router/traveler/cover sheet, NOT the dimensioned engineering drawing. The 1-dim reads are consistent with a non-drawing page.

## The harness itself is now trustworthy (2 scrutiny rounds, both fixed)
- **P0-1 (binary CAM read as G-code → garbage GT):** FIXED — `isParsableNcText` rejects `.mcx-8`/CAD sources + binary content (3 correctly skipped).
- **P0-2 (mill program scored as lathe → 1214 fake diameters):** FIXED — `classifyProgramAxis` mill-veto (G17/Y/end-mill) + true turning cycles only (G70–76, not G81–89 drilling); `9102741.hnc` now correctly skipped.
- **P0-3 (recall denominator = 121 toolpath vertices → ceilings perfect OCR at ~8%):** FIXED — feed-move-aware GT (G1/G2/G3 only, G0 rapids excluded) + roughing-ramp clustering → callout-class denominator (T-11BT 28→14).
- **Resolver bug** (`basename()` split on "/" in scan-date filenames): FIXED — `diskFilename` sanitization.

## Recommended next steps (before the full-blown run)
1. **Disambiguate the root cause** — visually inspect 3–5 of the scored prints: are they actually the dimensioned drawings? (`state/shared/ocr-training-loop/truetest/truetest-results.jsonl` has the resolved `print` paths.) This is a ~10-minute operator check that decides whether the fix is OCR or print-resolution.
2. If **wrong-document**: fix the join's PN→print link (use the print classifier's `role=PRINT` + page selection) before any corpus run.
3. If **weak OCR**: the real-scan domain-shift fix — higher-DPI/preprocessed raster (binarize+deskew, the `--preprocess` tier), a stronger VLM (the 3rd-family slot), or a fine-tune on operator-verified real scans.
4. **Re-run this true-test** (`node scripts/validate-perfect-parts.mjs --neutral-step-only`) after either fix — it is resumable and the gate is `recall>=0.5`.

**Bottom line:** the system as-is would produce garbage at corpus scale. The true-test caught it. Hold the full run until step 1 disambiguates.
