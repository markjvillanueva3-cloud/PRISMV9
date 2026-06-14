---
name: reference-u-tdp09-quad-2026-05-19
description: U-TDP09 quad (a/b/c/d) — all 4 deferred TDP09 candidates shipped 2026-05-19 slot mike. EU comma-decimal + MAX/MIN + slash-paired + benchmark-grader wiring. 130/130 + 11/11 tests.
aliases: reference_u_tdp09_quad_2026_05_19
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.025Z
---


# U-TDP09 quad — all 4 deferred candidates shipped (slot mike, 2026-05-19)

Closed all four U-TDP09 candidates that [[reference_u_tdp08_paired_band_rc_2026_05_19]] deferred. Sibling extensions to the deterministic engineering-print extractor at `H:/prism-slot-mike/scripts/lib/pdf-text-extract-lib.mjs`.

## What shipped (4 commits on slot/mike)

### U-TDP09a (`e1e5969e19`) — EU comma-decimal normalization
`normalizeDecimalComma(text)` applied to `rawText` BEFORE line splitting + before every `rawText.matchAll` post-loop scan. So every downstream pattern (split-token, inline-±, radius, stuck-mm, GD&T, Rc hardness, MAX/MIN, slash-paired) sees the canonical dot form.

Guard table (R12 — a missed dim beats a fabricated one):
- frac=1-2 digits → ACCEPT (canonical EU decimal: "1,5", "0,05")
- frac=3 digits → REJECT (thousands-separator-ambiguous: "1,500" / "12,500")
- frac=4-7 digits → ACCEPT (too many for a single thousands group)
- chained comma adjacency → REJECT ("1,234,567" → boundary guards refuse)
- int >4 digits → REJECT (\d{1,4} cap rules out serials / part nos)
- dot-then-comma → REJECT (left-lookbehind blocks ".5,0" corruption)

Closes the lib's documented zero-extraction class for `0,3345±.0002`-style EU corpus rows.

### U-TDP09b (`20a452a2a0`) — MAX / MIN qualifier extraction
Post-loop scanner emits single-bound dims with `meta.qualifier` + `meta.{upper,lower}_bound_mm`. Recognizes `".25 MAX"`, `"5 MIN"`, `"R0.5 MAX"`, trailing-period idiom.

Guards:
- LEFT_BOUNDARY `(?<![\dA-Za-z.,])` — refuses mid-token starts (same class as INLINE_PM_RE)
- Negative lookahead `(?![A-Za-z])` — refuses "5 MAXimum" word-prefix
- MAXMIN_INT_CAP_MM=1000 — bare-int ≥cap refused (qty / RPM collision)
- Kind+nominal de-dup against existing dims (no double-emit alongside a parallel bilateral)
- Reverse "MAX 5" intentionally NOT supported (label-form collision: MAX-5, MAX-1)

### U-TDP09c (`466d905d92`) — slash-paired tolerance (HIGH/LOW)
Inline `"0.501/0.500"` high-low form. Sibling of vertical U-TDP08 paired-tolerance-band.

Pattern: `/(?<![\dA-Za-z./])(\d+\.\d{3,7})\s*\/\s*(\d+\.\d{3,7})(?![\d/])/g`

Guards (mirror U-TDP08 PAIRED_*):
- Both magnitudes ≥3 decimals — refuses fractions (1/2) and dates (01/15/24)
- Matched decimal-place counts
- upper > lower (engineering convention; inverted refused — silent inversion guard)
- Band ≤ 5% of nominal
- Nominal ∈ [0.001, 100] mm
- Chained-slash trailing → refused (longer chain ambiguity)
- Alphanumeric prefix → refused (PART/0.501/0.500 chain)

**Documented gap (R12):** 3-digit-fractional EU comma-pairs (`"0,501/0,500"`) do NOT round-trip because U-TDP09a's thousands-safety reject blocks 3-digit fractional commas. 4+ digit fractional EU pairs DO round-trip.

### U-TDP09d (`38946fd411`) — wire pdf-text-extract-lib into benchmark grader
The `makeLiveExtractor()` in `scripts/run-ocr-benchmark.mjs` has been a hard `async () => null` stub since U-TDP04 — every benchmark run reported "no live extractor", masking the deterministic extractor's real grading signal.

Now wired: `pdf_path → defaultReadPdfText (PyMuPDF subprocess) → extractDimensionsFromText → {dimensions, confidence, material, ..., source: "pdf-text-extract-lib"}`.

- `opts.readPdfText` is an injectable sync reader for hermetic tests (no Python spawn in CI)
- Default reader spawns `H:/Tools/python/python.exe -c <inline-pymupdf>` per PDF (≤3 pages, 30s timeout, 16MB max buffer)
- Every failure path silent-nulls (R12) → benchmark counts a full FN for that print
- `main()` now gated on `import.meta.url === resolve(argv[1])` so tests can import without triggering CLI (the old unconditional `main()` was an import side-effect landmine — anyone trying to import this file would inadvertently run the benchmark)

## Tests

`pdf-text-extract-lib.test.mjs`: 130/130 PASS (71 prior + 28 U-TDP09a + 15 U-TDP09b + 16 U-TDP09c — counts include the slash-paired tests that subsumed the U-TDP09a 3-digit-frac gap test).

`run-ocr-benchmark.test.mjs` (NEW): 11/11 PASS — canonical / toleranced-bilateral / confidence-flows / null-text-reject / empty-reject / whitespace-reject / pdf_path-passthrough / non-string-reject / undefined-pdf_path-safe / U-TDP09abc-end-to-end-through-adapter / no-arg-signature-anti-regression.

## Harvester run (deferred validation, infrastructure-blocked)

The handoff resume directive included re-running `harvest-pdf-text-batch.py 'JM DIE/_PART LIBRARY' --max 600` to quote a fleet-wide rate-delta number. Re-ran with portable Python (`H:/Tools/python/python.exe`) — fitz.open() returns "Errno 22 Invalid argument" on the majority of JM DIE corpus PDFs. These are likely scanned-image-only or encrypted PDFs that PyMuPDF won't open. Real rate-delta measurement requires a CAD-exported-only subset filter; deferred to a follow-up that surfaces `pdf_type === 'vector'` BEFORE invoking the extractor.

## What's next for slot mike

- (deferred) Carve out a CAD-exported PDF subset for the harvester (or apply `--min-chars` filter that PyMuPDF can compute pre-extraction)
- (deferred) Wiki entry for U-TDP09 quad — placement: `knowledge/wiki/lessons/ocr-extraction-extensions.md` or sibling to U-TDP08
- (deferred) Run live U-TDP04 benchmark with the now-wired pdf-text-extract-lib live adapter against `state/shared/ocr-ground-truth/*.json` to grade extraction quality
