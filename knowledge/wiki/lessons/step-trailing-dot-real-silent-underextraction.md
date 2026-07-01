---
title: STEP/EXPRESS trailing-dot reals (`20.`) silently dropped by a `\.[0-9]+` number regex
type: lesson
tags: [cad, step, parsing, regex, silent-underextraction, dimtol, slot-delta]
created: 2026-06-28
slot: delta
commits: [U-DELTA-STEP-TRAILING-DOT]
related: [extracted-value-without-unit-label-is-a-scale-bomb, cad-step-failure-modes]
---

# STEP number regexes must accept the trailing-dot real form (`20.`, `0.`, `-3.`)

**Context:** `scripts/lib/step-dimension-extract.mjs` — the shared STEP dimension extractor consumed by the
T-DIMTOL KS gate (`cad-dimtol-validate.mjs` / `cad-dimtol-ks-validate.mjs`), india's bbox/radii CAD
training signals (`build-cad-dimension-dataset.mjs`), and `cad-dimension-gt-lib.mjs`.

## The bug

STEP / ISO 10303-21 (EXPRESS) real literals are routinely written with a **trailing dot and no
fractional digits** — `20.`, `0.`, `-3.`, `-3.061616997868E-15`. This is a valid real. But the number
sub-pattern in both `RADIUS_ENTITY_RE` and `POINT_RE` was:

```
[0-9]+(?:\.[0-9]+)?      // digits REQUIRED after the dot
```

`\.[0-9]+` does not match `20.` (no digit after the dot), so the regex matched `20` and then failed on
the stray `.`. Effects, both SILENT:
- `extractBboxMm` matched **0 of 9** CARTESIAN_POINTs on a standard STEP file (`(0.,0.,0.)` /
  `(12.5,...,20.)`) → `n < 2` → returned `null` on a perfectly valid part. The whole point-envelope
  training signal was dead for every STEP that writes integer-valued coords as `N.` (most of them).
- `extractRadiiMm` dropped any integer-valued radius written `5.` → under-counted dims feeding the
  DIMTOL distribution gate.

Confirmed on a real corpus part (`cad-engine/exports/cylinder.step`): current regex → **0** 3D points;
fixed regex → **9**.

## The fix

Make the fractional part **zero-or-more** digits, single-sourced across both regexes:

```
[0-9]+(?:\.[0-9]*)?      // `20.`, `0.`, `12.5`, bare `20` all match; `-3.06E-15` unaffected
```

20/20 tests (16 prior + 4 regression that each FAIL pre-fix: `5.` radius, trailing-dot 3D envelope,
the exact `(0.,0.,0.)` repro, and a sci-notation guard).

## Meta-lessons

1. **A parse regex that silently drops a valid literal form is a SILENT under-extraction — the worst
   kind.** No error, no exception; the downstream distribution / envelope is just quietly incomplete,
   and every consumer (a KS drift gate, a training corpus) inherits the corruption with green tests.
   The only reason it surfaced: building a *new* consumer (a live-Fusion corpus closed loop) tried
   `extractBboxMm` on a real part and got `null` where geometry plainly existed.
2. **Test the literal forms your input format actually emits, not the ones you'd type.** The original
   tests used `0.5` / `0.10000…` (fractional digits present) — they never exercised the trailing-dot
   form that STEP writers overwhelmingly use, so the suite was green against a regex that failed on the
   majority real-world case (R9 coverage gap, sibling of the KS mid-tie pitfall).
3. **Point-based STEP bbox is unreliable for CURVED surfaces (separate, known limit).** Even after the
   fix, `cylinder.step` envelope came back `[40, 12.5, 0]` not `[25,25,40]` — CARTESIAN_POINTs are
   B-rep control/vertex points, not a true surface bound (a cylinder's lateral face has no points all
   round its circumference). `bboxStats` already excludes degenerate (min-dim≈0) bboxes downstream, so
   this is contained; reliable curved-part envelope needs the kernel (`/geometry` from the live bridge),
   which is the corpus-closed-loop's next-unit concern, not this parse fix.

## Downstream re-baseline (the fix shifts every consumer that pre-computed a distribution)

Two consumers had results computed against the pre-fix (incomplete) extraction and were re-run:
- **CAD-dimension training corpus** (`state/shared/lora/cad-dimension-dataset.jsonl`, regen
  `U-DELTA-DIMDATASET-REGEN` `add5958ae0`): 16 → 19 pairs — **+bracket, +plate** coverage (classes that
  previously yielded null/dropped dims) and corrected radii/envelope for blisk/casing/die/general/shaft.
- **T-DIMTOL KS gate** (`cad-dimtol-validate.mjs`, leave-one-out per class): re-baselined post-fix —
  **die 20%** (unchanged; its parts already used fractional-digit radii) and **general 26% → 31%** (the
  now-complete radii extraction shifted the pooled distribution + admits parts that previously fell below
  `MIN_RADII`). Treat 20%/31% as the current baseline; the older 20%/26% is pre-fix and not comparable.
  (The low absolute rate is the separately-documented intra-band heterogeneity finding, not drift.)

**Meta-lesson:** a fix to a shared extractor invalidates every persisted distribution/baseline computed
from it. Enumerate the consumers (`grep` the extractor's exports) and re-run each, recording the new
numbers, so a stale pre-fix figure is never silently treated as current (R12).
