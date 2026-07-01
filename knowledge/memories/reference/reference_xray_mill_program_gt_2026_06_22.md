---
name: reference_xray_mill_program_gt_2026_06_22
description: "Mill-program ground-truth extraction added to the OCR closed-loop measurement (was lathe-only) -- xray, commit d197fa6cd5"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.274Z
aliases: reference_xray_mill_program_gt_2026_06_22
---


**U-XRAY-MILL-PROGRAM-GT (slot:xray, 2026-06-22, commit `d197fa6cd5` on cad-fusion-live-ms0).**

The print<->CAD<->program triangulation that measures TRUE OCR recall (`scripts/validate-perfect-parts.mjs` + `scripts/lib/cnc-program-gt-lib.mjs`) was **lathe-only** — every mill program skipped as `program-non-lathe` because a mill's X/Y are POSITIONS, not diameters. The whole MILL share of the perfect-parts corpus was invisible to the closed loop (the operator's "utilizing our prints and models and programs" GT was blind to mill).

**What was added** — `extractMillProgramGT` + pure helpers (`fractionToDecimal`, `extractDiameterToken`, `parseToolComment`, `extractMillHoleDiameters`, `extractMillBoreDiameters`). Mill callout-class GT =
- **HOLE diameters from tool-change comments** (`.250 DRILL`, `1/2 REAM`, `.531 C'BORE`), decimal + fractional.
- **BORE diameters from FULL-CIRCLE G2/G3 arcs** — `2*sqrt(I^2+J^2)`, only when the arc endpoint returns to its start; bounded by `BORE_MAX_IN`.

Returns the SAME shape as `extractProgramGT` so `scorePartAgainstProgram` + the runner are unchanged; `gtReliable=false` ('mill-no-features') when empty so the runner SKIPS rather than scoring a fake recall=0. `validate-perfect-parts` routes `axis==='mill'` to mill GT and surfaces `program-mill-no-gt`.

**GT-precision rule (the key correctness insight) — a tool diameter is NOT always a print callout:**
- **Tap-drill diameters EXCLUDED** — a threaded hole is dimensioned on the print by its THREAD callout ("1/4-20"), never the tap-drill Ø (.201). Including it = false GT.
- **End-mill / ball / face-mill / chamfer cutter diameters EXCLUDED** — the pocket/contour a cutter makes is dimensioned by geometry, not the cutter Ø.
- **Bare "SPOT" (spot drill) EXCLUDED** — only a spot FACE (a fastener bearing-surface counterbore) is a print-dimensioned Ø; a spot DRILL is a center mark. (Caught by LIVE validation: `ALL STAR.NC` `(T1|.25 SPOT|...)` was a .25 spot drill, not a Ã.25 callout.)

**Live validation (R15):** `ALL STAR.NC` -> dia `.160` drill GT (correct); TAPTITE electrode mills -> honestly `reliable=false` (surface-milling, no holes). LATHE path byte-unchanged.

**Two P1 bugs the per-file 2-arm scrutiny caught BEFORE commit (reusable lessons):**
1. The thread-context regex `\d+-\d+` collided with a MIXED-FRACTION drill (`1-15/32 DRILL`, a 1.469" drill) -> misread as a "1-15" thread series -> the diameter silently dropped. Fix: a negative lookahead `(?!\s*\/)` so a fraction's dash is not read as thread. **Lesson: a `\d+-\d+` "size-pitch" pattern overlaps mixed-fraction syntax — guard it.**
2. `extractMillBoreDiameters` had no upper bound -> a runaway/misparsed arc center (`I999999`) minted a 1999998" junk diameter into the recall denominator (the same metric-artifact class the contour guard defends). Fix: `BORE_MAX_IN`. **Lesson: any geometric derivation (2*radius) fed into a metric must be sanity-bounded.**

Also note: `scripts/lib/cnc-program-gt-lib.mjs` + its test were UNCOMMITTED on disk (used by TRUE-TEST since Jun 8 but never tracked) — this commit also brought them into the tree.

**R15 RESULT-VALIDATION (live OCR, 2026-06-22):** ran `validate-perfect-parts.mjs --axis mill --fresh` (the new `--axis` filter, commit `3a2316206c`, isolates the mill subset). Result: **`9102741` (the Hurco mill that was the canonical `program-non-lathe` skip in the Jun-8 TRUE-TEST) now scores `recall=0.5 / PASS`** (OCR matched 1 of 2 callout-class mill GT dims; prec 0.0364 expected — a mill print has many non-hole dims). PROVES the mill-GT scores mill parts end-to-end on real OCR, not just in unit tests. Caveat (R12): the sweep was fleet-reaper-killed at 43/91 (long GPU OCR; resumable via cursor, no report.json). First-43 breakdown: 22 lathe (axis-filtered) + 20 `.mcx-8` (program-not-nc) + **1 mill scored+PASS** — confirms the mill perfect-part corpus is thin (most parts are lathe or mcx-8-only). Full mill mean-recall pends a resumed/nightly sweep, but the end-to-end mill-GT is validated.

Sibling: [[reference_xray_ocr_yield_mechanics_2026_06_10]] (the closed-loop yield mechanics). Corrected a STALE doctrine in the same pass: the `format:"json"` VLM-dropout fix was SHIPPED in `40b613afa7`, not "NOT YET BUILT" as the galaxy CLAUDE.md still claimed.
