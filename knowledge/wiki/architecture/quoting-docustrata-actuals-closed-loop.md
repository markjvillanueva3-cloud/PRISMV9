---
title: Quoting DocuStrata actuals closed-loop (the $355M real-price wire + display)
type: architecture
domain: quoting
slot: charlie
created: 2026-06-13
tags: [quoting, closed-loop, calibration, docustrata, training, frontend]
---

# Quoting DocuStrata actuals closed-loop

How PRISM's quoting calibration consumes the real settled-price ground truth extracted from the JM Die "Orders Closed" purchase-order corpus, and how that signal surfaces to the operator. Shipped 2026-06-13 (slot charlie) as a 3-unit arc on `cad-fusion-live-ms0`.

## The corpus reality (verified, R12)

Only ONE of the four `H:/PRISM/Docustrata/JMD *` folders carries dollar amounts. Verified by bounded `--routes textLayer --limit N` samples + reading the raw text (see [[reference_charlie_docustrata_corpus_price_map_2026_06_13]]):

| Folder | Files | Content | Prices |
|---|---|---|---|
| **JMD Orders Closed** | 12,761 | Purchase Orders w/ settled prices | **YES** -> 6,718 actuals = $355,028,170.89 (53% yield, 98% high-conf) |
| JMD Quotes | 955 | engineering drawings (scanned, OCR-garbled) | none |
| JMD Sales Orders | 21,515 | "Job Tracking Sheets" (PO#, customer, part, qty, due-date) | none ($0) |
| JMD Packing Slips | 1,149 | packing slips | none (excluded by design) |

Consequence: the quote-vs-actual *pairing* cannot be sourced from a separate priced-quote PDF corpus (none exists). Orders-Closed is the complete priced ground truth. Further price data requires the ERP/QuickBooks quote records (hotel galaxy, creds-blocked = `U-QP-ACCOUNTING-WIRE`).

## The pipeline

```
JMD Orders Closed PDFs (12,761)
  -> docustrata-run-all-documents.mjs (pypdf textLayer + OCR fallback, heap-guarded re-exec --max-old-space-size=16384)
  -> extract-docustrata-outcomes.mjs (scripts/lib/docustrata-outcome-extract-lib.mjs: classifyRow -> collectStandaloneActuals)
  -> state/shared/quoting/orders-closed-actuals.jsonl  ({ actuals: [{actual_invoice_usd, extraction_confidence, customer, part, order#, date}] }, 6,718 rows)
  -> quoting-train-cycle.mjs (loadActualPrices minConf 0.6 -> matchPredictedToActuals)
  -> latest-training-status.json (docustrata_actuals_match)
  -> prism_quoting:training_status (snapshot pass-through)
  -> QuotingCalibrationHealthPage (TrainingStatusPanel -> RealWorldMatch)
```

## The gate-safe consumption (U-QP-TRAINCYCLE-FEED, commit c26605117d)

`scripts/lib/quoting-actuals-match.mjs` (pure, 12 tests incl. live-dataset E2E):
- `summarizeDistribution(values)` -> median/mean/p25/p75/total (filters non-positive/NaN).
- `matchPredictedToActuals(predicted, actual)` -> ADVISORY `{median_ratio, within_band_pct, verdict (calibrated|over-quoting|under-quoting), actual_total_usd}`. **Never alters the calibration factor** (factor promotion stays CoV-gated in `QuotingClosedLoopEngine`) and **never touches the PLACEHOLDER_MARKERS provenance gate** (the actuals are REAL, not placeholders). Mirrors the existing outbound `real_distribution_match` exactly.
- `loadActualPrices(path, {minConfidence})` -> parses the `{actuals:[]}` wrapper, confidence floor, injectable readImpl.

`quoting-train-cycle.mjs`: `docustrata_actuals` data source flips `consumed:true` only when the match ran (`dataSourceCoverage` `docustrataActualsConsumed` branch); `docustrataMatch` threaded into the JSON emit + the frontend snapshot + stdout. Live: 6,718 -> 5,436 priced (>=0.6 conf), $297M, verdict `under-quoting` (predicted median $238.74 vs real $594, ratio 0.40).

## The display legs (charlie owns the frontend)

`mcp-server/web/src/pages/QuotingCalibrationHealthPage.tsx` fetches `quoting_active_factor_get` + `training_status` (`includeOutcomeDigest:true`) via `Promise.all` (independent; one failing never blanks the other):

- **TrainingStatusPanel** (U-QP-TRAINING-STATUS-UI, commit 512a112542) - MAPE / coverage / records / factor-activated + the **RealWorldMatch** subsection rendering `docustrata_actuals_match` (verdict / median_ratio / real $ total / actuals priced, "ADVISORY -- never alters the factor"). This unit ALSO fixed a false-completion regression: commit `7a421d3eb1` had committed a 6-case test for this panel but never shipped the panel (6 failing tests sat on the trunk - see [[reference_charlie_t5_orphaned_test_2026_06_11]]).
- **ClosedLoopHealthPanel** (U-QP-OUTCOME-DIGEST-UI, commit b99b82f382) - the OODA self-observation digest from `QuotingOutcomeLedgerDigestEngine`: total_cycles + 6-verdict distribution (count+rate, 0-count verdicts shown as signal) + advisory health (HEALTHY / NEEDS ATTENTION / INSUFFICIENT) + reasons.

11/11 tests on `QuotingCalibrationHealthPage.test.tsx`; each panel reconstructed/extended against the existing test contract; 2-reviewer per-file scrutiny PASS on every file.

## Doctrine pins
- The advisory match NEVER alters the factor and NEVER softens the PLACEHOLDER_MARKERS provenance gate. It is observability + a directional calibration signal only.
- "all means all": before claiming a folder is processed, enumerate + sample + read the real text. The Quotes/Sales-Orders folders LOOK like priced docs by name but are not.
- Memory: [[reference_charlie_orders_closed_355m_2026_06_12]] - [[reference_charlie_docustrata_corpus_price_map_2026_06_13]] - [[reference_charlie_t5_orphaned_test_2026_06_11]].
