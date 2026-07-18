---
title: "JM-Die v2.0.0 upgrade is pure annotation pass-through (iter261 retraction)"
namespace: lessons
date: 2026-05-27
slot: whiskey
iter: 261
related:
  - reference_iter218_alcoa_outlier_retraction_2026_05_27
  - reference_jm_die_v2_upgrade_pattern_2026_05_27
  - feedback_jm_die_b_versions_are_ai_not_human_upgrade
status: R12-fail-loud-lesson
---

# Lesson: JM-Die v2.0.0 upgrade does NOT change machining content

## TL;DR

iter218 claimed the v2.0.0 lathe upgrade pipeline adds G40/G80 safety-state flags + canned-cycle codes to amateur-class source programs (specifically ALCOA). iter261 byte-verified this claim is FALSE. The v2.0.0 pipeline is pure annotation pass-through across all 5 sampled customers (CAMCAR / ITW / ACME / AGRATI / ALCOA, 80+ paired pairs). Zero body changes. iter227's `detectMissingSafetyStateFlags` detector remains semantically valid (raw motion without G40/G80 IS a code-smell), but its v2.0.0-citation rationale was wrong.

## What happened

iter218 sampled ONE ALCOA pair (`A0137471.MIN` → `PRISM_UPGRADED/Okuma_LB-3000EX/A0137471.nc`) and concluded the B-version had `G40, G80, G81, G85, G87` added to the body. That conclusion was propagated as a cross-customer finding into:

- `reference_jm_die_v2_upgrade_pattern_2026_05_27.md`
- `lathe-training-loop-stage-4-reason.mjs` (iter227 detector with `Per iter218 empirical pattern: ...` in its `why` rationale string)
- 4 hermetic regression tests locking in the detector

iter250-260 ran `--upgraded-only --score` against 4 additional customers (ITW, ACME, AGRATI, CAMCAR) expecting to see ALCOA's pattern repeat. Instead all 4 showed PERFECT G40/G80 parity between A and B — the v2.0.0 pipeline did NOT add safety flags for any of them.

iter261 re-ran ALCOA with `--upgraded-only` and verified A=B parity there too. Direct `grep -c "G40"` on `A0137471.nc` returned 0. Direct `Read` of the file showed body lines 113+ are byte-identical to the original Mazak source. **iter218's reading of "G40, G80, G81, G85, G87" present in the B-version was factually wrong.**

## Root cause of the iter218 error (hypothesis)

`parseBlocks()` returns a deduplicated set of G-codes seen in any block. PRISM v2.0.0 B-files have stacked metadata headers at the top (one per target machine, ~9 headers for ALCOA), and those header `rationale` strings may contain G-code-like tokens (e.g., `G81 drill cycle reference` in a rationale string). If `parseBlocks` interpreted parenthesized comment content as G-codes, iter218's reading of the B-version's G-code set would falsely include header-string G-codes.

Followup: verify whether `parseBlocks` is correctly skipping parenthesized comments. If yes, iter218 may have looked at a different file entirely.

## How the error propagated

1. **Single-pair generalization**: iter218 looked at one pair and concluded a pattern about "the ALCOA class". The actual ALCOA class (11 pairs) follows the same pass-through pattern as every other customer.
2. **Parsed-set comparison instead of byte-diff**: iter218 compared `Set(g_codes)` between A and B without inspecting the actual body lines. A byte-diff (what iter261 did) would have caught the error immediately.
3. **Test fixtures based on iter218 description**: the iter228 detector regression tests use synthetic G-code arrays that match iter218's incorrect description. They lock in the detector's behavior, not the detector's *correctness*. (Still passing tests is necessary but not sufficient evidence of correctness.)

## Lessons

### 1. Byte-diff > parsed-set-diff for empirical findings

When comparing two versions of a program, the source of truth is the file bytes. Parsing introduces interpretation. For "what changed" questions, `diff -u file1 file2` is the canonical answer.

### 2. Generalization needs cross-sample verification

One pair → one pair. Don't extrapolate to "the customer class" without scanning the customer class. iter218's claim was about "ALCOA-class amateur programs"; testing only 1 of 11 pairs was insufficient.

### 3. Hermetic test passing ≠ semantic correctness

The iter227 detector has 4 hermetic regression tests that all pass. They prove the detector behaves CONSISTENTLY according to iter218's described pattern. They do NOT prove the pattern itself exists in real data.

### 4. R12 fail-loud means retracting your own findings

iter261 contradicts iter218 directly. Per R12 (Fail Loud — from CLAUDE.md): "Default to surfacing uncertainty, not hiding it. Can't be sure it worked → say so explicitly." The right response is a public retraction with byte-level evidence, not silent removal or quiet edit.

## What's still valid

- The iter227 `detectMissingSafetyStateFlags` detector is semantically correct as a standalone code-smell check. Raw G00/G01 motion without explicit G40/G80 cancels IS a real risk (cutter-comp drift, canned-cycle re-entry). Industry guides (Sandvik, Kennametal, Sumitomo) recommend the cancels.
- The 4 regression tests still pass and still encode the detector's behavior. They just don't validate its v2.0.0 citation.
- The CAMCAR/ITW/ACME/AGRATI/ALCOA cross-customer matrix is now metric-clean (post iter258/259/260/261 corrections via `--upgraded-only`).

## What's invalidated

- iter218's claim that v2.0.0 adds G40/G80/canned cycles to ALCOA programs (factually wrong).
- The "ALCOA-as-outlier" hypothesis (every customer follows the same pass-through pattern).
- The iter227 detector's `Per iter218 empirical pattern: ...` rationale (rewritten in iter262 to remove the false citation).
- Any wizard training that relied on "v2.0.0 B-versions are improved A-versions" — they're A-versions + metadata headers, not improvements.

## What this means for the wizard

The whole iter1-iter261 wizard arc assumed the v2.0.0 pipeline was producing IMPROVED B-versions that could serve as training signal for an AI-pair pattern (A=source, B=improved). iter261 says: there is no improvement. The B-versions are essentially the A-versions wrapped in metadata.

The wizard's Stage 4 REASON can still produce useful recommendations from generic lathe-programming best-practice (the safety-state cancels are real). But the "learn from A→B pairs" framing is empty for the JM-Die archive — there's no delta to learn from.

For a real training-pair corpus, look at:
- Manual operator revisions (`-A` / `-B` filename suffix pairs in ACME) — these ARE human-edited improvements.
- Cross-customer comparisons (CAMCAR programs vs equivalent ALCOA programs) — different operators' approaches to the same operation.
- Industry-published "before/after" lathe programs from vendor catalogs (Sandvik machinability data, Kennametal application notes).

## Related

- `[[reference_iter218_alcoa_outlier_retraction_2026_05_27]]` — full retraction memo with per-pair evidence
- `[[reference_jm_die_v2_upgrade_pattern_2026_05_27]]` — original (retracted) iter218 finding
- `[[reference_jm_die_v2_upgrade_camcar_passthrough_2026_05_27]]` — iter253/254 cross-customer findings (still valid for non-ALCOA)
- `[[reference_ab_locator_over_pairing_human_revisions_2026_05_27]]` — iter256 over-pairing finding (different topic, still valid)
- `[[feedback_jm_die_b_versions_are_ai_not_human_upgrade]]` — B-version provenance (AI-generated; this lesson explains WHY the AI generation contains zero machining changes)
- `scripts/lib/lathe-training-loop-stage-4-reason.mjs` — contains iter262 rationale rewrite
- `scripts/scan-jm-die-ab-pairs.mjs` — contains iter257 `--upgraded-only` flag
