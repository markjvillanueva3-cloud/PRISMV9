---
name: reference_charlie_extprice_calib_2026_06_01
description: U-QP-EXTPRICE-CALIB — per-line ext_price distribution + compareToPredicted against-grain selector + train-cycle ADVISORY real-distribution match; fixed a stale-fossil-dist latent bug (src-first loader)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.508Z
aliases: reference_charlie_extprice_calib_2026_06_01
---


QUOTING-SYNERGY-MS0/U-QP-EXTPRICE-CALIB (slot:charlie, 2026-06-01, /loop /goal /yolo iter7, commit `cf8402694f`). The loop-closing consumer of [[reference_charlie_outbound_price_calib_2026_06_01]], on the units-correct grain found in [[reference_charlie_predicted_expose_units_2026_06_01]].

**Shipped (R13, each step proven before the next):**
1. `OutboundPriceIndexEngine.pricePrior` now exposes `extPrice` (per-LINE ext_price = qty×unit_price distribution) alongside unitPrice (per-piece) + orderTotal (per-order) — additive. + `gatedExtObs`/`gatedOrderObs` helpers.
2. `compareToPredicted({against:"unit"|"line"|"order"})` — selects the real-outbound grain to compare against (default "unit" = backward compat). The SAME refObs feeds reference distribution + KS gap + within-band, so all metrics share one grain.
3. `quoting-train-cycle.mjs` ADVISORY wire: feeds `report.predicted_fmv_usd_all` → `compareToPredicted({against:"line", minConfidence:"high"})` → `real_distribution_match` in --json + a human line. READ-ONLY — never alters the calibration factor (soul refuses softening-reconciliation / margin-floor-gate-bypass).
35 engine vitest (incl. EXT_FIXTURE qty>1 proving ext≠unit: unit median 15 vs ext median 75; same predicted set → ratio 1 against:line vs ratio 5 against:unit) + guard-preflight T8 wire oracle. 2-reviewer PASS (P2 caveat-threading + P1 loader-doc fixed in-unit). Verified live via tsx.

**LATENT BUG FOUND + FIXED (the verification earned its keep — R12):** the train-cycle loaded `dist/engines/*.js` DIST-FIRST, but the current esbuild build (`esbuild.config.mjs`) bundles src/index.ts → dist/index.js + dist/chunks/ and does NOT emit per-file `dist/engines/*.js` — those ~7198 files are STALE FOSSILS (last tsc-emit era). So the train-cycle (and its calibration FACTOR math) was running ANCIENT orchestrator code (missing predicted_fmv_usd_all → the advisory silently no-op'd). FIX: flipped both engine loaders to SRC-FIRST, dist-fallback. Under tsx (documented run mode) → current src; under plain `node` (can't import .ts) → falls to dist fossil = prior behavior (no regression, CoV-gated so never activates unsafely). Production scheduled-retrain SHOULD invoke via tsx. Verified: tsx → realMatch computes (against:line, real_n=60); plain node → SAFE-DRYRUN exit 0 (no crash).

**DATA FINDING (advisory honesty):** the high-confidence ext_price reference median is ~$1.005 — DOMINATED BY OCR-NOISE $1 rows in jm-sold-orders (even at minConfidence:high). The advisory honestly surfaces a huge divergence (median_ratio≈208, ks_gap 0.9, verdict predicted-high) but the result now threads the source `reference_caveat` + a stdout warning so median_ratio/verdict read as DIRECTIONAL, not calibrated. Real fix = OCR de-noise the outbound corpus (xray pipeline) — a data/xray concern, not charlie code.

**STILL-OPEN follow-up (noted, not fixed — different path):** QuotingTrainingOrchestratorEngine psi-feed reads `pred.predicted_usd` but PerRecordPrediction only has `predicted_fmv_usd` → undefined in the psi_delta path (Stage 4, feedPsnAutonomy only).

**NEXT:** OCR-denoise the outbound ext_price reference (xray) so the advisory match becomes calibrated, OR a min-real_n guard. Wiki: [[quoting-outbound-price-prior]].
