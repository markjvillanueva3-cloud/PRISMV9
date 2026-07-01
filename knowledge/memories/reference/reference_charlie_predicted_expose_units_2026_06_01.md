---
name: reference_charlie_predicted_expose_units_2026_06_01
description: AccuracyReport exposes predicted_fmv_usd_all + the UNITS finding — per-part-job FMV is NOT per-piece-comparable to compareToPredicted; correct real-outbound ref = per-line ext_price (not yet exposed)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.511Z
aliases: reference_charlie_predicted_expose_units_2026_06_01
---


QUOTING-SYNERGY-MS0/U-QP-TRAIN-PREDICTED-EXPOSE (slot:charlie, 2026-06-01, /loop /goal /yolo iter6, commit `6a4d5fc717`). Iter6 of the closed-loop quoting training; builds toward consuming the iter5 [[reference_charlie_outbound_price_calib_2026_06_01]] diagnostic.

**Shipped (additive, safe):** `QuotingTrainingLoopEngine.AccuracyReport` now exposes `predicted_fmv_usd_all: number[]` — ALL per-record predicted FMVs in prediction order (was only worst_5/best_5 + a count). Populated from the predictions the loop already computes; `[]` on every early-return. Strictly additive (no existing field/signature changed; no existing test broke). +5 behavioral tests (length===total_predicted, finite>0, set===worst_5 for n≤5, skipped-excluded, []-on-empty, input-order). 20 tests, 2-reviewer per-file scrutiny PASS.

**UNITS FINDING (the load-bearing deliverable — 2-reviewer confirmed, prevents a silent bug):** the obvious next step "feed predicted prices into `compareToPredicted`" is a SILENT UNITS MISMATCH. `predicted_fmv_usd` is a per-PART-JOB dollar value — FairMarketValueEngine.estimate() = `((time_in_cut+setup)/3600·rate + material·markup)·(1+overhead)·(1+margin)`, NO qty (verified FairMarketValueEngine.ts:84-91). But `compareToPredicted` references the per-PIECE `unitPrice` distribution (qty×unit_price=ext, one obs/line-item). Per-part-job-$ vs per-piece-$ is a real grain mismatch — and SILENT (both are dollars, magnitudes overlap → a plausible-but-meaningless medianRatio/ksGap/verdict, no error). Same class as the AP cost-ledger units-blend stop earlier this session.

**Correct real-outbound reference (Reviewer B):** a per-LINE **ext_price** distribution (qty×unit_price = revenue JM charged for one part on one order) — NOT per-piece `unitPrice`, NOT per-order `orderTotal` (an order bundles several part types). `ext_price` IS parsed (`SoldOrderLineItem.ext_price`) but OutboundPriceIndexEngine does NOT yet expose a distribution over it. Residual caveat (R12): a multi-qty line bundles N pieces while the FMV's single setup-amortization assumes its own implied qty → ext_price is the correct GRAIN but still an approximate band.

**Latent bug noted (NOT fixed — different path, scope discipline):** QuotingTrainingOrchestratorEngine psi-feed reads `pred.predicted_usd` but PerRecordPrediction only has `predicted_fmv_usd` → `predicted_usd` is undefined in the psi_delta path (Stage 4, feedPsnAutonomy only). Follow-up for the orchestrator.

**NEXT (redirected, U-QP-EXTPRICE-CALIB, task #35):** (1) add additive `extPrice` distribution to pricePrior; (2) `compareToPredicted({against:"line"})`; (3) train-cycle advisory wire feeding `predicted_fmv_usd_all` → ext_price comparison, advisory-only (never alter the live factor). Wiki: [[quoting-outbound-price-prior]].
