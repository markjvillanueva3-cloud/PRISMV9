---
name: reference_charlie_closedloop_full_corpus_validated_2026_06_13
description: Closed-loop quoting training VALIDATED on all 47,905 real JM records + $355M actuals; cron trains on real corpus; outbound 194x ratio is a cross-granularity artifact, not a bug
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.507Z
aliases: reference_charlie_closedloop_full_corpus_validated_2026_06_13
---


**Closed-loop quoting training -- full validation (slot:charlie, 2026-06-13, R12).** Ran the whole loop on the COMPLETE real corpus to answer "complete closed loop training using all jm documents." Conclusion: **functionally complete + well-built.**

## Corpus enumeration (all means all)
- Docustrata: JMD Quotes 955 (drawings), Sales Orders 21,515 (price-free job sheets), Orders Closed 12,761 (PRICED -> 6,718 actuals = $355,028,170.89), Packing Slips 1,149.
- JM DIE archive: **317,139 files** (the 24,545 figure in CLAUDE.md is stale).

## Baseline reality (the prediction corpus)
- `state/shared/quoting/baseline-records.json` = **75 records**, small CLEAN curated set (52 unique revenues, 31 customers) -- guard-ADMITTED. (NOT the "100-record poisoned $10 stub" the 2026-06-02 comments describe; the file was replaced. The first record has revenue $10 but the rest vary -- do not be misled by a `slice(0,6)`.)
- `state/shared/quoting/baseline-records-corpus-with-real.json` = **47,905 records / 474 customers** -- the real corpus, guard-ADMITTED.
- The bare `node scripts/quoting-train-cycle.mjs` (DEFAULT_BASELINE = baseline-records.json) trains on the 75-record set. **The CRON (`install-quoting-pipeline-cron.ps1` lines 142/144) trains on the real corpus** via `--baseline $BaselineReal --fallback-corpus $BaselineFallback`, `--no-write` (observe-only; operator approves activation via the UI panels). So production DOES train on all JM docs.

## Live run on the full corpus (--no-write --json on baseline-records-corpus-with-real.json)
- `total_predicted: 47905`, `MAPE 71.1%`, `safe_to_activate: true`.
- **docustrata_actuals_match** (the $355M settled-price reference, TRUSTWORTHY): predicted_median $195.04 vs actual_median $594, median_ratio **0.33**, verdict `under-quoting` (PRISM under-quotes ~3x vs real PO settled totals), actuals_priced 5,436, $297M.
- **real_distribution_match** (outbound jm-sold-orders.json, OutboundPriceIndexEngine): median_ratio **194**, verdict `predicted-high`, reference_reliable `true`.

## The 194x is NOT a bug -- it is cross-granularity (R12, investigated + closed)
The two references disagree ~600x because they are at DIFFERENT granularities: docustrata actual = per-PO settled TOTAL ($594 median); outbound = per-unit price (median ~$1, legitimate for high-volume small parts); predicted_fmv = per-PART FMV ($195). `OutboundPriceIndexEngine.assessReferenceReliability` has 5 sound guards (insufficient-N, non-positive-median, IQR-collapse, floor-spike/OCR-"$1"-mass) and correctly classified the outbound distribution as a healthy (non-degenerate) distribution, so reliable:true is correct -- the 194x is a real directional ratio across mismatched grains, already labeled ADVISORY/DIRECTIONAL and never alters the factor. **Do not "fix" the reliability gate -- it is working.** The trustworthy reference for calibration is the docustrata actuals (sane per-PO $594, ratio 0.33).

## Standing conclusion
The closed-loop trains on all JM documents (cron, full real corpus), surfaces the calibration + the $355M advisory match to the operator via QuotingCalibrationHealthPage (TrainingStatusPanel + RealWorldMatch + ClosedLoopHealthPanel, shipped this session), and the operator approves activation. Further price-accuracy needs ERP/QuickBooks quote records (hotel galaxy, creds-blocked = U-QP-ACCOUNTING-WIRE). See [[reference_charlie_docustrata_corpus_price_map_2026_06_13]] + [[reference_charlie_orders_closed_355m_2026_06_12]].
