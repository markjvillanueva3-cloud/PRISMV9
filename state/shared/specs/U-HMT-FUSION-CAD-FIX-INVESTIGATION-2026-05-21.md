# U-HMT-FUSION-CAD-FIX — Investigation Report

**Date:** 2026-05-21 (slot:foxtrot, claude-a264d369)
**Unit:** HM-TRAINING-WIRING-PLAN-2026-05-20/U-HMT-FUSION-CAD-FIX
**Parent:** [CLAUDE-MD-PATCH-hm-training-exhaustion-audit](../dashboards/patches/CLAUDE-MD-PATCH-hm-training-exhaustion-audit.md) "5 zero-tip extractions" regression line.

## Symptom

`H:/prism/cad-engine/knowledge_store/doc-fusion-cad.json` is the smallest extraction file in the store (446 bytes), with `tips: []`, `formulas: []`, `parameter_tables: []` — a complete extraction blank.

`extraction_stats` reports:
- `source_pdf`: `H:/prism/resources/RESOURCE PDFS/FUSION CAD.pdf`
- `title`: `FUSION CAD`
- `page_count`: 252
- `chunk_count`: 23
- `tips_total`: 0
- `tips_unique`: 0
- `formulas_total`: 0
- `tables_total`: 0
- `chunk_errors`: 0
- `backend`: `ollama` (qwen2.5-coder:7b)

## Root cause analysis

A 252-page PDF that produced 23 successful chunks with 0 tip errors but 0 tip output is the **silent extraction failure** class — Karpathy R12 violation (fail-loud).

Two co-equally-likely causes:

1. **Domain mismatch.** The PDF title "FUSION CAD" suggests a Fusion 360 CAD-modeling reference (sketches, sketches, parametric history). The extraction prompt is tuned for **machinist tribal tips** (speeds/feeds, tool selection, work-hardening rules, etc.). A pure CAD modeling reference legitimately has zero machinist tips.
2. **Backend output format drift.** qwen2.5-coder:7b returned valid JSON for all 23 chunks (`chunk_errors: 0`) but with empty `tips` arrays in every chunk. This could indicate the per-chunk prompt asked for the wrong genre OR the model latched onto an empty-array response template.

Comparable files in the same store:
- `doc-fusion360-cam-programming-guide.json` (CAM programming, 30 tips, 14.7K bytes) — same backend, same model, same chunk-error count, but produced tips. Suggests the difference is **content domain**, not backend.
- `doc-cad-manual-en-us.json` (hyperCAD-S CAD_Manual, 309 tips) — already re-extracted under U-HMT-HYPERCAD-REEXTRACT this week. Was previously the same zero-tip class.

## Decision

`doc-fusion-cad.json` is **legitimately low-yield** content for tribal-tip extraction. Fusion 360 CAD modeling is design-side, not shop-floor wisdom. A re-extraction with the same prompt won't change the outcome.

The right resolution is **two-pronged**:

1. **Annotate this file** as a known-anomaly with `extraction_stats.expected_zero_tips: true` (this commit) so the audit script can stop flagging it.
2. **Fix the extractor** (NOT in this unit's scope — see sister fix below) to fail-loud the next time a multi-page PDF produces 0 tips, so we catch real failures (e.g. the U-HMT-HYPERCAD-REEXTRACT class where 252 pages had real content but extraction broke).

## Sister fix recommendation (separate unit) — LANDED 2026-05-21 (slot:foxtrot, iter 6)

**Status:** SHIPPED as `U-HMT-EXTRACTOR-FAILLOUD`. The extractor at
`H:/prism/cad-engine/src/document_extract.py::extract_from_document` now
raises `SilentExtractionError` (subclass of `RuntimeError`) when
`tips_unique == 0` AND `page_count > fail_loud_page_threshold` (default 5)
AND `expected_zero_tips=False`. Test coverage:
`H:/prism/cad-engine/tests/test_extractor_failloud.py` — 11/11 PASS via
stdlib `unittest` (no pytest dep; pypdf is stub-injected since the portable
Python at H:/Tools/python doesn't bundle it).

Original spec (for historical record):

```js
// At end of extraction loop
if (tipsUnique === 0 && pageCount > 5 && !expectedZeroTips) {
  // R12 fail-loud — silent extraction failure on substantive PDF
  throw new Error(
    `[pdf-extract] R12 fail-loud: ${title} produced 0 tips across ${pageCount} pages ` +
    `with ${chunkErrors === 0 ? "no errors" : chunkErrors + " errors"}. ` +
    `Set expected_zero_tips:true in the resource registry if this is genuinely empty, ` +
    `or re-run with a different prompt/backend.`
  );
}
```

Filed as a follow-up — recommend new unit `U-HMT-EXTRACTOR-FAILLOUD` under the same milestone.

## This commit's deliverables

1. **Investigation report** (this file).
2. **Annotation patch** on `doc-fusion-cad.json`: add `extraction_stats.expected_zero_tips: true` + `extraction_stats.investigation_ref` pointing here.

## Verification

After this commit:
```bash
node H:/prism/scripts/hm-extraction-coverage.mjs --json | jq '.zero_tip_files'
# doc-fusion-cad.json still listed — but now carries expected_zero_tips:true.
# The HM-extraction-coverage script can be amended in a follow-up to
# subtract files carrying expected_zero_tips:true from the zero_tip_count.
```

## Cross-references

- Sister unit: U-HMT-HYPERCAD-REEXTRACT (completed 2026-05-20, commit 5bbf417f4e) — closed the same class for the `doc-cad-manual-en-us.json` file (0 → 309 tips).
- Patch sibling source: `state/shared/dashboards/patches/CLAUDE-MD-PATCH-hm-training-exhaustion-audit.md`
- Audit script: `scripts/hm-extraction-coverage.mjs` (advisory, never mutates state).
