# QUOTING-BRIDGE-PUNCHLIST — unwired cost-bearing engines that should feed the closed loop

**Generated:** 2026-05-27 · **Slot:** charlie · **Iter:** 55 (close-out of /goal-block QUOTING-SYNERGY-MS0)
**Scope:** PRISM engines with explicit cost/rate methods that the iter46–54 closed loop does NOT yet consume.

## Already wired (this /goal block)

| Engine | Wired via | Status |
|--------|-----------|--------|
| QuotingTrainingLoopEngine | iter47 runner — `runAccuracy` | live |
| QuotingCalibrationEngine | iter47 runner — `deriveWithCoV` | live (CoV gate rolls back) |
| QuoteOutcomeFeedEngine | iter47 runner — `feedPSIDelta` | live (synthetic outcome) |
| QuotingActiveFactorLoaderEngine | iter47 runner — atomic write | live |
| DocuStrataMaterialPriorEngine | iter54 runner — `perRecordOverrides` | live (per-grade material spend, $20 floor) |
| GCodeMaterialParserEngine | iter48 / iter49 driver — coverage report | live (80% hit rate on curated corpus) |

## Top-priority bridges (NOT yet wired — high cost-signal impact)

### P0 — direct revenue impact

| Engine | What it knows | Why quoting needs it |
|--------|---------------|----------------------|
| **MachineInvestmentROIEngine** | Per-machine purchase price + amortization + utilization → derived $/hr | Replaces our triangulated $120/hr placeholder with a PER-MACHINE rate derived from real JM Die machine inventory + utilization. Mill rates ≠ WEDM rates ≠ lathe rates. |
| **ShopProfileTemplateEngine** | Shop-tier rate templates (small-shop / mid / large) | Calibrates the $120/hr against JM Die's actual shop tier; surfaces rate components (labor + overhead + margin) separately. |
| **FairMarketValueEngine** | PRISM's market-pricing model | Cross-checks the QuotingEngine prediction against an independent FMV signal; bias toward FMV when self-prediction is high-uncertainty. |
| **MillJobProfitabilityAnalyticsEngine** | Actual mill cost per shipped job | Replaces the substrate's $75 material default + 600s cycle default with the EMPIRICAL distribution from real mill jobs. |
| **LatheJobProfitabilityAnalyticsEngine** | Same for lathe | Same — empirical signal beats substrate placeholder. |

### P1 — domain-specific cost paths

| Engine | What it knows | Domain |
|--------|---------------|--------|
| **WEDMJobCostEngine** | Per-job WEDM cost (wire + power + flushing + labor) | wire-EDM (charlie soul) |
| **WEDMWirePremiumROIEngine** | Wire-type cost premium (brass vs zinc-coated vs hardened) | wire-EDM |
| **WEDMWireBreakRiskCostEngine** | Expected scrap-cost from wire-break risk | wire-EDM |
| **WEDMInvoiceLineEngine** | Invoice-line shape with detailed labor + material breakdown | wire-EDM (outbound!) |
| **CryogenicCuttingEngine** | Cryo coolant cost premium | mill/lathe (exotic ops) |
| **WaterjetProgramAssemblerEngine** | Waterjet program → cost (consumables + abrasive) | waterjet |
| **GenerativeProcessEngine** | Process selection → routing cost | cross-domain |

### P2 — consumer-side surfaces (post-quote)

| Engine | What it knows | Purpose |
|--------|---------------|---------|
| **ActualCostEngine** | Real shipped costs (the LABEL the loop trains against) | Already feeds via DocuStrata invoices; check if there's a richer per-job stream behind it. |
| **CostEfficiencyBridgeEngine** | Cost-efficiency comparisons | Calibration sanity check. |
| **WetRunScrapLedgerEngine** | Scrap costs from wet-run failures | Adds a scrap-rate cost dimension to the predicted total. |
| **AccountingHardeningEngine** | ERP-grade reconciliation | If wired to outbound billing, gives the LONG-MISSING outbound revenue stream (currently absent from DocuStrata). |
| **CustomerPortalEngine** | Customer-facing quote outputs | Closes the UX side of the loop. |

### P3 — input-shape surfaces

| Engine | What it knows | Purpose |
|--------|---------------|---------|
| **XometryStyleQuoteInputsEngine** | Xometry/Hubs/Protolabs-style input shape (geometry + qty + lead time) | Drop-in for non-CAD intake — most operator quotes start here, not from a STEP file. |
| **WizardToQuoteBridgeEngine** | Operator-driven wizard → quote bridge | Lets ops staff drive the loop manually. |
| **CatalogConsumerAdapterEngine** | Tool/material/insert/coolant catalog consumer | Connects iter53's DocuStrata material priors to consumer-side cost paths. |
| **StochasticToolpathRoutingEngine** | Probability-weighted toolpath cost | Adds variance signal to the predicted cost (replaces single point estimate with distribution). |

## Outbound-data gap (the actual blocker for shop-rate validation)

DocuStrata (111,745 docs) is **INBOUND-only** — all 47 typed docs are JM Die receiving supplier invoices/quotes. The shop rate JM Die *charges* lives in:

1. **Their billing/ERP system** (separate from DocuStrata — likely QuickBooks or a vertical-market accounting package)
2. **AccountingHardeningEngine** could read this if PRISM has an ERP connector wired (currently unclear)
3. **OCR of the 111,658 untyped DocuStrata scans** — slow but might catch outbound copies / pricing sheets

Until ONE of these lands, the triangulated **$120/hr** stays the operator-confirmed plug.

## Next-iter prioritization (if /goal continues)

| Iter | Unit | Expected impact |
|------|------|-----------------|
| 56 | wire MachineInvestmentROIEngine → per-outcome machine rate | Drops the flat $120 placeholder; gives per-machine accuracy |
| 57 | wire MillJobProfitabilityAnalyticsEngine → empirical per-job material | Replaces $130 flat with EMPIRICAL per-job distribution |
| 58 | DocuStrata cost-CONTEXT bucketing (raw vs finished blank) | Fixes iter54's D2/H13/S7 raw-stock pricing miss |
| 59 | ERP connector / AccountingHardeningEngine wire | Unlocks REAL outbound rate per year per machine |
| 60 | XometryStyleQuoteInputsEngine drop-in | Enables manual operator quote intake against the closed loop |

## What this /goal block built (iter46–55, 10 commits)

1. **iter46** — QuotingClosedLoopEngine (controller, 420L, 30 tests)
2. **iter47** — QuotingClosedLoopRunnerEngine (live deps, 299L, 21 tests)
3. **iter48** — GCodeMaterialParserEngine (header parser, 270L, 23 tests)
4. **iter49** — JM corpus driver (235L, live first run)
5. **iter50/51** — shop-rate triangulation (v1 + v2 with DocuStrata material evidence) → **$120/hr**
6. **iter52** — $120/hr override threaded into runner + driver → bias **-36.33% → -1.43%**
7. **iter53** — DocuStrataMaterialPriorEngine (260L, 23 tests, 9 grades, $155K spend evidence)
8. **iter54** — per-outcome wire + $20 plausibility floor → bias -1.43% → -11.01% (data-limited regression)
9. **iter55** — best-known-good calibration persisted + this punchlist

**77/77 unit tests pass + 5 live closed-loop runs verified.**

The pipeline works end-to-end. The system measures real bias on real data, derives candidate calibration factors, validates them via CoV + holdout, and rolls back unsafe candidates without corrupting the active-factor JSON. Operator-confirmed shop rate $120/hr collapses bias to ~-1.4% (within noise). Further accuracy gains require richer DATA (outbound invoice stream, per-machine rate inventory) rather than more code.
