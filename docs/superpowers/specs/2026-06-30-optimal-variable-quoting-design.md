# World-Class Variable Quoting — Two-Layer Optimal-Quote Algorithm

> **Design spec.** slot:juliett (build-it-all-here, operator-authorized). 2026-06-30.
> Status: APPROVED architecture (operator AskUserQuestion: "Both: predict+recommend", "Build it all here [MAIN-FORCE]").
> Goal: drive PRISM quoting toward "theoretically optimal" — single-digit MAPE on the cost basis + an
> honest CI band + a profit-optimal price recommendation, all grounded in REAL data.

## 1. Problem (measured, file:line)

A 6-agent parallel audit (3.3M tokens) + direct measurement established the accuracy stack is **data-starved and
half-wired, not engine-broken**:

- **Inputs stubbed (P0):** every baseline record has `machine_rate=95`, `material=60` (1 distinct value each),
  `time` in 4 buckets → the predictor emits only **4 distinct prices** ($75.83/$107.50/$155/$250) vs actuals
  $13–$3,275. True model accuracy is UNKNOWN — never exercised. (`baseline-records.json:4` self-declares BOOTSTRAP stub.)
- **Ground truth stubbed (P0):** `actual_revenue_usd = size_bytes×$` placeholder; 40/75 rows contaminated
  (19 placeholder + 15 machine-catalog + 7 synthetic). `QuotingTrainingLoopEngine.run()` filters only `≤0` → all garbage
  reaches calibration → bogus +2108% bias → clamped 0.2× factor.
- **Real actuals EXIST, unjoined (P0):** `state/shared/quoting/orders-closed-actuals.jsonl` holds **6,718 real
  settled-order records** ($297M, 424 customers, OCR `docustrata-text-extracted-v3-ocr-pass`, confidence-scored;
  5,195 at conf≥0.7). Shape: `{customer, part_id, date, actual_invoice_usd, order_number, extraction_confidence, join_key}`.
  But `quoting-actuals-match.mjs` uses them advisory-only; the real-revenue overlay points at a 10-row hand-curated fixture.
- **Non-cut cycle time missing (P0, math):** `InstantQuoteEngine` cycle_time = roughing + flat-30% finishing, **zero**
  tool-change/rapid/approach/air-cut/setup overhead (routinely 30–60% of real spindle time). The accurate kinematics
  engine only fires on the optional G-code path.
- **Apply-factor orphaned (P1, wiring):** `estimateCalibrated()` has ZERO production callers; live `instant_quote`
  uses raw `estimate()`. (Correctly P1 — applying a factor from garbage data would harm; wire AFTER data fix.)
- **Live market pricing absent (operator ask):** `VendorRealtimePricingClientEngine` is MS0 adapter-shape + CSV stubs;
  real live source (commodity steel index + vendor fetch) was deferred to MS1, never built. Material is 30–50% of a die
  part's cost and tool-steel prices move → a static AP-ledger $/in³ is stale.
- **Consumable tracker partial (operator ask):** `ToolUsageEngine`/`ToolCribEngine`/`ToolInventoryOrchestratorEngine`/
  `ToolCostPerPartEngine`/`ERPToolInventoryEngine` exist, but are not tied to LIVE prices nor feeding per-job consumption
  into the cost floor.

## 2. Doctrine reconciliation ("100% accurate")

"100% accurate" is a DIRECTION, not a literal. A quote has two separable parts:
- **Cost floor** (material + machine time + setup + overhead) = deterministic physics → drivable to **single-digit MAPE**.
- **Winning price** = cost floor + unobservable negotiation residual (relationship, urgency, capacity, competition) →
  NOT closed-form; the optimal estimator MINIMIZES expected error vs the **real** price distribution and reports an
  HONEST CI band carrying the residual.

The system never claims a point is 100% accurate; it quotes a point + calibrated interval, wide-and-honest now,
provably narrowing as real PO pairs accumulate. **Accuracy is a DATA lever, not an engine lever.**

## 3. The two-layer algorithm

```
OptimalQuote(part) =
  A. CostFloor = (T_cut + T_noncut + T_setup/qty)·rate
               + Vol_in³·$/in³_live·(1+scrap)
               + overhead
  B. PredictedPrice = CostFloor · MarkupModel(customer_tier, material_group, complexity, qty)   ← fit on 6,718 real prices
     ProfitOptimalPrice = argmax_price (price − CostFloor)·P(win | price/CostFloor, tier, qty)    ← when win-data sufficient
  Output: { predicted_price, profit_optimal_price?, ci95_low, ci95_high, cost_floor, breakdown }
```

- **Layer A** = deterministic; physics engines already built. Gaps: T_noncut (new), live $/in³ (new feed).
- **Layer B predictor** = multivariate/hierarchical markup regression on real pairs (NEW engine).
- **Layer B optimizer** = `BidWinCalibratorEngine` (EXISTS, logistic IRLS, `argmax margin×P(win)`) — fed, gated on win-data sufficiency, else suppressed (fail-honest).
- **CI band** = `AnchoredConfidenceEngine`/`computeObservedSigma` (EXISTS, widens to observed residual).

## 4. Build units (logical dependency order, R13)

**Phase 1 — DATA (turn every MAPE from noise into signal):**
- **U1 — Real-actuals join.** Join the 6,718 real `orders-closed-actuals.jsonl` onto the training corpus by
  `join_key (customer|part_id)`, overwriting synthetic `actual_revenue_usd` with real `actual_invoice_usd`,
  weighted by `extraction_confidence`. Extend `quoting-baseline-from-corpus.mjs` (or a new joiner). Atomic write
  (juliett soul). Surface real `match_pct`/`coverage`.
- **U2 — Contamination sanitizer.** Filter placeholder(`<$20`)/machine-catalog/synthetic rows in
  `QuotingTrainingLoopEngine.run()` before calibration; surface `total_skipped_contaminated`. Mirror the existing
  `docustrataIsPlaceholder` preflight.

**Phase 2 — LIVE MARKET PRICING + CONSUMABLE TRACKER (operator ask):**
- **U3 — Live material/market price feed.** Promote `VendorRealtimePricingClientEngine` MS0→MS1: a real live source
  (commodity steel-grade index + vendor SKU fetch where keyed) → cached with a staleness gate → resolves
  `$/in³_live` per grade. Fail-loud `vendor-unconfigured` (never fabricate). Folds into Layer A material term.
- **U4 — Shop-floor consumable tracker.** A `ConsumableConsumptionLedgerEngine` (NEW) that ties the existing
  tool-crib/usage engines to LIVE prices and records per-job consumption (inserts/endmills/wheels/wire/coolant) →
  emits actual consumable $/job → feeds Layer A. Reuse `ToolUsageEngine`/`ToolCostPerPartEngine`; do NOT rebuild them.

**Phase 3 — COST-FLOOR MATH (single-digit MAPE):**
- **U5 — Non-cut cycle time.** Add tool-change + rapid/approach/retract + air-cut + per-setup load/probe to
  `InstantQuoteEngine`/`QuoteEstimator` feature-based path (~1.3–1.6× cut time, or coarse move budget →
  `CycleTimeEstimatorEngine`). The largest systematic under-quote on machine time.

**Phase 4 — PRICE MODEL (Layer B):**
- **U6 — `RealizedPriceModelEngine` (NEW).** Fit `markup = realized_price/cost_floor` as a hierarchical regression on
  the real pairs (per customer-tier × material-group × qty-band). Predict realized price + residual σ. Pure engine,
  injectable data source, real reference-value tests.
- **U7 — Profit-optimal recommendation.** Feed `BidWinCalibratorEngine` from real won/lost outcomes; report
  `argmax margin×P(win)` when win-data sufficient, else suppress (fail-honest). Compose with U6 + the CI band.

**Phase 5 — WIRE + PROVE:**
- **U8 — Apply-wire + dispatcher + route + FE.** Wire the calibration factor + price model into live `instant_quote`
  (provenance-gated: refuse bootstrap/stale). New `prism_quoting` actions for the price model + consumable tracker +
  live-price feed; routes; FE surfacing. Consolidate the two divergent active-factor files.
- **U9 — Live closed-loop proof + 3-of-3.** Re-run the loop on REAL joined data; show the real clean MAPE, the
  predicted-vs-profit-optimal spread, the CI band, ZERO synthetic. Per-file 2-arm scrutiny; end-of-task 3-of-3.

## 5. Reuse (R8 — never rebuild)

`BidWinCalibratorEngine` (win-prob/markup-opt), `AnchoredConfidenceEngine`+`computeObservedSigma` (CI band),
`VendorRealtimePricingClientEngine` (extend MS0→MS1), `VendorCostIndexEngine`+`materialCostForVolume` ($/in³),
`HistoricalMaterialPriceEngine`/`InflationAdjustEngine`/`DocuStrataMaterialPriorEngine`/`OutboundPriceIndexEngine`,
`ToolUsageEngine`/`ToolCribEngine`/`ToolInventoryOrchestratorEngine`/`ToolCostPerPartEngine`/`ERPToolInventoryEngine`,
`CycleTimeEstimatorEngine` (kinematic), `QuotingTrainingLoopEngine`/`QuotingCalibrationEngine`/`QuotingActualOutcomeLoaderEngine`
(loop), `DocustrataHistoricalPricingTrainerEngine` (real-pair consumer), `quoting-baseline-from-corpus.mjs` (extend).

## 6. Safety rails (preserve)

- Physics constants from `src/physics/constants.ts` — never inline.
- Units-first (inch vs mm = 25.4× error; JM convention INCH, verify per part).
- Calibration clamp [0.2,5] is a correct safety rail — do NOT widen (would amplify garbage).
- Margin-floor gate stays; never emit a point estimate without a CI.
- Live price fetch fail-loud `vendor-unconfigured` — never fabricate a price.
- Atomic JSON writes on multi-writer paths (juliett soul); schemaVersion on every state file.
- Entitlement/role from verified token, never request body.
- `[MAIN-FORCE]` on trunk; post to AGENT_CHAT so charlie doesn't double-build.

## 7. Out of scope (flag, don't build)

- Autonomous customer-facing quote emission without operator review.
- Rebuilding any existing engine in §5.
- Real vendor commercial-API keys (operator-provisioned; U3 ships the live-index source + adapter, keys are config).
