---
name: reference-u-tdp08-paired-band-rc-2026-05-19
description: U-TDP08 paired-tolerance-band + Rc hardness patterns shipped to pdf-text-extract-lib — turning ~25% of previously-zero-dim drawing PDFs into recoverable training data via vertical-2-line tolerance bands.
aliases: reference_u_tdp08_paired_band_rc_2026_05_19
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.024Z
---


# U-TDP08 — paired-tolerance-band + Rc hardness (slot mike, 2026-05-19, commit `cafd0871c1`)

**What:** Extended the deterministic PDF-embedded-text extractor (`H:/prism-slot-mike/scripts/lib/pdf-text-extract-lib.mjs`) with two new patterns derived from inspecting 20 zero-dim PDFs in the JM Die `_PART LIBRARY` corpus.

## Pattern 1: paired-tolerance-band (vertical 2-line)

Standard US-engineering callout form: upper limit on top, lower limit beneath, no inline `±`, no `mm` suffix. Example real-corpus lines:
```
1.002      ← upper
1.000      ← lower    →  linear nominal 1.001, tol ±0.001
```
Previously deferred at L491-494 of the lib on false-positive grounds. The new guards beat that bar:
- both lines pass `isBareDecimalLine` (rejects `B .040`, `M-3115`, integers)
- decimal-place count matches AND ≥ `PAIRED_MIN_DECIMALS` (=3)
- `upper > lower` (strict — equal-value pairs rejected)
- delta ≤ `PAIRED_BAND_DELTA_MAX_PCT` (=5%) of upper
- nominal ∈ [`PAIRED_NOMINAL_MIN_MM`, `PAIRED_NOMINAL_MAX_MM`] = [0.001, 100] mm

Emits with `meta.format: "paired-band"` so the audit pipeline can distinguish from the split-token bilateral path. A pair failing ANY guard is silently rejected — R12 (missed pair beats fabricated midpoint).

## Pattern 2: Rockwell-C hardness range

`HARDNESS_RC_RE` handles three JM Die corpus idioms (`Rc 58-60`, `55-57 Rc`, `58 TO 60 Rc`). Fills `extraction.hardness_grade = "${min}-${max} HRC"` if the in-loop `Grade [HRC]:` line didn't already set it (first-match-wins). Clamps `HARDNESS_RC_MIN..HARDNESS_RC_MAX` = [20, 70]. En-dash variant (U+2013) supported.

## Live-corpus delta evidence

Re-ran harvester on `JM DIE/_PART LIBRARY/ACCURATE THREADED FASTENERS` (19 emitted PDFs):
- 7 paired-band dims emitted across 3 of 19 PDFs
- 4 PDFs got Rc hardness filled
- All new dims classified `stepped_revolved_axis` (correct linear kind)

Baseline (U-TDP07-CORPUS-REPORT.json): 600 PDFs / 81 with dims = 13.5%. This subdir post-U-TDP08: 4 / 19 = 21.1%.

## Tests: 77/77 pass

57 prior + 20 new U-TDP08. New coverage:
- 4 acceptance paths (3dp, 4dp, leading-dot, two consecutive bands)
- 7 REJECT paths (equal, 1dp, integer, decorated, wide-band, reversed, out-of-range)
- 1 confidence-ladder boundary (exact `=== 0.85` + `toleranced.length === 2`)
- 3 Rc acceptance idioms + en-dash
- 2 Rc REJECT (out-of-clamp)
- 1 first-match-wins (Grade [HRC]: NOT clobbered)
- 1 anti-regression on existing split-token bilateral path (locks `meta?.format !== "paired-band"`)

Every REJECT test asserts BOTH `paired.length === 0` AND `dimensions.length === 0` per Reviewer A's R12 fail-loud uplift (a rejected pair must emit NOTHING, not silently into another path).

## Per-file + 3-of-3 scrutiny

Per-file:
- Lib (arm A physics-review-agent, arm B reviewer): both PASS. Arm A flagged one P1 (paired-band runs before bare-number tolerance-triple path) — narrow false-positive surface because `isBareDecimalLine` rejects signed/decorated tokens; arm B independently confirmed no collision via integration spot-checks 1-11.
- Tests (arm A test-review-agent, arm B reviewer): arm A FAIL → 2 fixes applied (REJECT tests now lock `dimensions.length === 0`, ladder test tightened from `>= 0.85` to `=== 0.85`) → re-PASS. Arm B PASS with P2 follow-up (mismatched-decimal-count coverage) flagged as non-blocker.

3-of-3 Stop gate (target `cafd0871c1`, session `claude-396bc735`):
- opus / claude / analyst arms — all PASS. Ledger marked `blockCount: 0`.

## Deferred follow-ups (NOT in U-TDP08 scope)

- Comma-decimal normalization (European/scanner OCR — ambiguous with thousands separator)
- MAX/MIN qualifiers (`.360 MAX.`, `1.5000 MIN`)
- Slash-paired tolerance (`R.008/.005`)
- Bilateral `+.000/-.005` on consecutive lines
- Mismatched-decimal-count negative test (R8 invariant lib enforces; not yet pinned by a test)
- Full 600-PDF corpus re-run (background harvest stalled; ran on 19-PDF subdir as live-evidence sample)

## Lesson

The lib's prior deferral comment for paired-tolerance was honest R12 (refused to fabricate). Adding the pattern correctly required not just adding the regex but adding a TIGHT guard envelope with explicit false-positive REJECT tests proving silent-drop (not silent-fallthrough). Reviewer A's P0 on the REJECT test grain (`paired.length === 0` was too weak — needed `dimensions.length === 0`) caught a subtle hidden-emission risk class. Lesson: every REJECT test should prove TWO things: (a) the target emission didn't fire, AND (b) no OTHER emission fired in its place.

Related: [[reference_blueprint_ocr_training_ms1_collision]] · [[reference_cad_software_pipeline_recommendation]] · sister of U-TDP07 (`21b53f8fec`).
