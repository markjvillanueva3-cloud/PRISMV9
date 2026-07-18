---
name: reference_cam_feed_regex_broken_2026_06_01
description: "CAM feed extraction was 9x under-capturing — Okuma leading-dot/trailing-dot feed notation (F.002, F1.) was unparseable by the regex; the n≈6 feed coverage was a broken regex, not CSS-sparsity"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.503Z
aliases: reference_cam_feed_regex_broken_2026_06_01
---


# CAM feed regex was broken — Okuma dot-notation unparseable (U-CAM-FEED-PER-REV, slot:kilo, 2026-06-01)

`CAMFeatureExtractorEngine` feed regex `F(\d+(?:\.\d+)?)` matched **neither** of JM Okuma's two dominant feed forms: **leading-dot `F.002`** (no leading digit) nor **trailing-dot `F1.`** (no trailing digits). Measured A/B over 77 real JM `.MIN`: OLD = 91 feed-lines / 43-of-77 files; NEW `F(\d*\.\d+|\d+\.?)` = **817 feed-lines (9×) / 77-of-77 files** (+34 files, 44% of sample, went from ZERO parseable feeds to some).

## Why it matters
The CAM-FIRST-TRAIN-METRICS "feed n stays ~6" was attributed to G96-CSS-sparsity (2026-05-31). That was **incomplete** — the bigger cause was this silent regex miss. Two prior feed fixes (U-CAM-FEED-EXTRACT-FIX: `\bF` word-boundary + mm/rev↔mm/min units) both missed the dot-notation. py_compile + the hermetic unit tests passed throughout because no test used real Okuma dot-feed strings. LESSON: when parsing a real corpus, **test against the corpus's ACTUAL token notation** — a synthetic `F0.15` proves nothing about a shop that writes `F.002`/`F1.`. → [[reference_fusion_scratch_close_enforce_2026_06_01]] (sibling "hermetic fakes don't prove wiring" this session).

## Also shipped
`estimated_feed_range_per_rev` + `feed_per_rev_unit` (in/rev|mm/rev|unknown) on FeatureVector — native CSS-shop feed target, unit-tagged from G20/G21 so in/rev and mm/rev never silently mix (25.4× class). 6 regression tests (synthetic G94/G95/G20/G21 + real-corpus). 31/31.

## Open follow-up (units-first — do NOT assume)
G95 is modal; only 7/77 sample files declare it explicitly. The other ~70 likely rely on the Okuma machine's feed-per-rev DEFAULT (param-set). Confirming that default would unlock per-rev capture for them. Until confirmed, their feeds are captured-but-skipped — never mislabeled. dist regenerates on next build; the corpus runner picks up the fix then. Doc: `state/shared/cam-drive/CAM-FIRST-TRAIN-METRICS.md` (2026-06-01 update).
