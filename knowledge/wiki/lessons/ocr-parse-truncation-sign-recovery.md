---
title: OCR parse — truncation × leading-dot/plus recovery (the closed-loop keystone)
type: lesson
tags: [ocr, blueprint-vision, vlm, json-repair, silent-data-loss, blackwell]
created: 2026-06-06
by: claude-xray
related: [[vlm-ensemble-ocr-and-leading-dot-parse-fix]], [[reference_xray_ocr_parse_truncation_fix_2026_06_06]], [[reference_xray_ocr_closed_loop_2026_06_01]]
---

# OCR parse — truncation × leading-dot/plus recovery

## Symptom
`blueprint-ocr-training-loop.mjs` (and the corpus `batch-ollama-vision-extract.mjs`) reported
`0 model(s) survived` / `ensemble all-failed` on EVERY print — yielding 0 trainable labels — even
on a print that produced gold labels days earlier. Read as "the VLMs/GPU broke." They did not.

## Root cause — it's the PARSER, not the VLM or GPU
VLMs return rich JSON for blueprint dims. `parseVisionResponse` (`scripts/lib/ollama-vision-extract-lib.mjs`)
discarded the WHOLE extraction of a print over a single invalid-JSON number. Two compounding classes,
both worsened by the fact that **VLM output is stochastic** (temp 0.1 still varies run-to-run):

1. **Truncation × leading-dot.** `num_predict` cuts a dense print mid-`raw_text` → unterminated trailing
   string. `repairLeadingDotDecimals` has a fail-safe `return inStr ? text : out` that BAILS on an open
   string → an earlier value-position `.86` survives. `repairTruncatedJson` then closes the braces but
   NOT the notation → `JSON.parse` still throws on `.86` → entire extraction lost. The two repairs were
   composed in the wrong order (leading-dot bailed *because of* the truncation; truncation repair ran
   *after* it).
2. **Leading `+`.** VLMs emit a `±0.015` tolerance as `"tolerance_upper": +0.015`. JSON allows a leading
   `-` but NEVER a leading `+`.

## Fix (structure-first, then notation)
- `repairTruncatedJson` closes an unterminated TRAILING string before appending brackets, and drops a
  dangling trailing escape (odd `\`) so a `\`-truncation can't escape the close quote.
- `parseVisionResponse` catch + `tryParseWithRepair` re-apply `repairLeadingDotDecimals` AFTER
  `repairTruncatedJson` — the truncation repair terminates the string so the leading-sign pass no longer
  bails.
- `repairLeadingDotDecimals` generalized to also strip a value-position leading `+` (digit/dot-led, prev
  ∈ {`:`,`,`,`[`} or start) — exponents `1.5e+3` and string interiors `"Ø86 +0.015"` preserved; idempotent.

## Validation
61/61 unit tests (7 new, R9-verified by reverting the fix → exactly the new tests fail). LIVE: the same
real JM print now extracts 8–9 dims → 7/9 trainable (silver) + flagged ambiguous/hallucination; calibration
0 → 38 samples. Per-file 2-reviewer scrutiny PASS (0 P0; reviewer-A P1 dangling-escape fixed in the same
commit). Commit `e354869c93` (U-XRAY-OCR-PARSE-TRUNCATION-FIX).

## Generalizable lesson
A VLM-to-JSON boundary is a **silent-data-loss surface**: models emit human-valid engineering shorthand
(`.86`, `+0.015`, `5.`) and truncate under token caps. Repairs must compose **structure-first, then
notation**, and each must be **string-aware** (never touch `raw_text` interiors). A whole print of dims
lost over one character reads as "the model is bad" — always probe the RAW model response before blaming
the model. Same class as the 2026-06-04 `.171` fix, one truncation deeper.
