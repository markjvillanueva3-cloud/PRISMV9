---
name: reference_charlie_calibration_freshness_preflight_2026_06_09
description: U-QP-CALIBRATION-FRESHNESS-PREFLIGHT (commit bf10035ec0) — quote-time freshness gate on calibration application + the VALIDATED fact that the quoting closed loop is closed & wired (QuoteEstimator -> applyToQuote)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.507Z
aliases: reference_charlie_calibration_freshness_preflight_2026_06_09
---


# Calibration freshness preflight at quote time (U-QP-CALIBRATION-FRESHNESS-PREFLIGHT, commit `bf10035ec0`, 2026-06-09 slot:charlie)

`QuoteEstimatorEngine.estimateCalibrated()` now ACTS on the loader's `isStale` flag instead of ignoring it.

## The gap (quote-time analog of soul-refuse #4)
`QuotingActiveFactorLoaderEngine` exposes `factor_metadata.isStale` (factor older than the loader's 24h threshold) + `ageMinutes`. `estimateCalibrated` previously applied the factor and carried the metadata but **never acted on staleness** — a stale over-prediction correction was applied SILENTLY to a live customer quote. That mis-prices once JM's real costs shift (the over-prediction correction derived weeks ago no longer holds). It's the quote-time form of soul-refuse #4 (training-on-stale-distribution-without-freshness-preflight).

## The fix
- **Soft path (default):** factor still applied (we do NOT silently drop a stale factor), but `calibration.is_stale=true`, `factor_age_minutes` carried, and a "re-derive before relying on this quote" dfm_warning emitted.
- **Hard path (opt-in `opts.maxFactorAgeHours`):** factor older than the cutoff is REFUSED -> raw FMV (uncalibrated), `applied:false`, reason `factor-too-stale-Nh`, UNCALIBRATED warning. Emitting the defined raw FMV is safer than applying a known-too-stale correction.
- `CalibrationResult` gains optional `is_stale` + `factor_age_minutes` (purely additive — no external consumer of THIS engine's CalibrationResult exists; other engines declare their own unrelated CalibrationResult).
- No inlined margin/shop-rate/physics constants — the gate reads only the factor age. Calibrated-path margin-floor re-evaluation preserved.

## VALIDATED: the quoting closed loop IS closed and wired (do NOT re-investigate)
Traced live: `QuoteEstimatorEngine.ts:1092` imports `quotingActiveFactorLoaderEngine` and calls `applyToQuote(base.pricing.unit_price, customer)`. So the OODA loop is closed end-to-end:
- Observe/Orient: `runAccuracy` MAPE -> calibration report
- Decide: `shouldPromote` + provenance gate ([[reference_charlie_provenance_gate_2026_06_09]]) + outbound gate ([[reference_charlie_outbound_promote_gate_2026_06_09]])
- Act: `writeActiveFactors` -> `state/shared/calibration/quoting-calibration-active.json`
- Consume: `QuoteEstimatorEngine.applyToQuote` -> corrected quote (now freshness-gated)
**Loop closure is NOT the production gap.** The real production unblock is data-side: clean the ext_price OCR `$1` noise / live ERP actuals (operator/ERP-side, not charlie code).

## Tests
9 pass (5 existing + 4 new freshness: soft-warn / fresh-no-regression / hard-cutoff-refuse / cutoff-boundary), all fail-on-revert + hermetic tmpdir. 3-of-3 PASS 0 P0/P1.
