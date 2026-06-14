---
name: reference-u-tdp10-corpus-driven-2026-05-19
description: U-TDP10 quintet (a/b/c/d/e) — 5 corpus-driven print-reader accuracy patterns shipped 2026-05-19 slot mike. Document-type classifier + title-block tolerances + leading-dot radius + ASCII +/- normalization. 194/194 tests.
aliases: reference_u_tdp10_corpus_driven_2026_05_19
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.025Z
---


# U-TDP10 quintet — corpus-driven print-reader accuracy (slot mike, 2026-05-19)

Five accuracy patterns for the deterministic engineering-print extractor (`H:/prism-slot-mike/scripts/lib/pdf-text-extract-lib.mjs`), each found by running a **full-corpus harvest** of `JM DIE/_PART LIBRARY` (76,163 PDFs) and inspecting what the extractor missed. Sibling of [[reference_u_tdp09_quad_2026_05_19]].

## How they were found
`harvest-pdf-text-batch.py` (PyMuPDF) walks the corpus emitting one JSONL row per text-bearing PDF. Run via the **portable Python** `H:/Tools/python/python.exe` (the uv-managed `~/.local/bin/python` has no `fitz`). The harvest's "Errno 22 Invalid argument" parade in the first attempt was a red herring — it was visible *stderr* while successful emissions flowed silently through the Node pipe; a clean `python → file` run shows **0 errors**. Sampled ~880 text-bearing rows.

## The 5 patterns (all on slot/mike)

### U-TDP10b (`d840acd68c`) — leading-dot / unitless radius
`RADIUS_RE` required a leading digit AND trailing "m" — but scanned shop prints write `R.040` / `R.020` / `R.060` (leading-dot, no unit). New `/^R(\d*\.?\d+)\s*(mm)?$/i`; handler refuses bare-integer-no-unit (`R1` — revision-ambiguous) + zero magnitude.

### U-TDP10a (`22a7a7a6cc`) — title-block default-tolerance spec
New `extraction.default_tolerances[]` field. Recognizes `±1/64` (fractional-inch) + `±0°30'` (angular DMS) by VALUE shape (OCR garbles the `FRACTIONAL`/`ANGULAR` labels). Guards: pow-2 denominator 2..256, proper sub-unity fraction; degrees 0-89, minutes 0-59. A tolerance with no nominal is metadata → `default_tolerances`, never `dimensions[]`.

### U-TDP10c (`71f74b802b`) — document-type classifier
**The headline finding.** `_PART LIBRARY` interleaves drawings with business paperwork (job tracking sheets, P.O.s, inspection sheets). Of ~880 text PDFs: **256 drawings / 434 paperwork / 181 unknown**. Counting paperwork in the denominator deflated the apparent extraction rate from a true ~40% (drawings only) to a misleading ~12% (everything). `classifyDocumentType(text, hasHardData)` → `extraction.document_type` ∈ {drawing, paperwork, unknown}. hasHardData (dim/default-tol/grade/material found) → drawing unconditionally; else marker vote. Purely additive — does NOT gate extraction.

### U-TDP10d (`89c40656dc`) — ASCII `+/-` normalization + Rc-colon
A full-corpus harvest found **ZERO `±` glyphs** — scanned OCR never emits U+00B1; it renders as `+/-` (trailing `-` often mangled to `~`). Every ±-keyed extractor (INLINE_PM_RE, FRACTIONAL_TOL_RE, ANGULAR_DMS_TOL_RE) was DARK on scanned text. `normalizePlusMinusGlyph` folds `+/-`→`±` in the normalization chain. Plus `Rc\.?`→`Rc[.:]?` — the corpus writes `rc: 58-60` (colon), which `\.?\s*` could not bridge.

### U-TDP10e (`e6fc1bead6`) — decimal-place-keyed tolerance block
Title-block precision-tier form `XX=±.01 / XXX=±.005 / XXXX=±.001` — the X-count keys which decimal precision the tolerance applies to. Emitted into `default_tolerances[]` as `decimal_place_keyed` with `decimal_places` (2-4) + `value`. Guards: X-run 2-4, sub-unity value, comma-for-dot OCR fold.

## Measured impact (886-row sample, U-TDP10 active)
- document_type split: 256 drawing / 434 paperwork / 181 unknown
- drawing-only dimension rate: **39.8%** (up from ~28% pre-U-TDP10)
- **44 drawings now carry `default_tolerances`** (17.2%) — entirely new (0 before)
- 89 drawings with hardness grade (Rc-colon fix recovered colon-form grades)
- 65 total default-tolerance entries extracted

## Tests
194/194 in `pdf-text-extract-lib.test.mjs` (130 pre-U-TDP10 + 64 new across the quintet). No prior test rewritten. All pure (no fs/no network).

## Honest scope (R12)
~90% of the corpus is scanned-image PDFs whose embedded OCR text layer is heavily garbled — deterministic text extraction has a hard ceiling there (~40% on text-bearing drawings). The remaining gain needs a vision-OCR tier (qwen2.5vl or similar) for the image-only PDFs. The full 76K harvest runs hours; the ~880-row sample is representative — re-run `H:/Tools/python/python.exe scripts/harvest-pdf-text-batch.py 'H:/prism/JM DIE/_PART LIBRARY' --min-chars 100 > corpus.jsonl` for the complete set.

## Next mike pickup
- (deferred) vision-OCR tier for the ~90% scanned-image PDFs
- (deferred) wiki entry for U-TDP09 + U-TDP10 families
- (deferred) live U-TDP04 benchmark run via the U-TDP09d-wired adapter
- corpus report: `H:/prism-slot-mike/state/U-TDP10-CORPUS-REPORT.json`
