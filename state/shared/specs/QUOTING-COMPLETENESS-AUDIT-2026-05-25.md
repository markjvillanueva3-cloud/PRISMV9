# QUOTING-COMPLETENESS-AUDIT — what's missing to make PRISM's quoting "ship to JM Die" (charlie /goal-20, 2026-05-25)

**Trigger:** Operator directive (verbatim): *"deep research on what is missing from the software suite that a shop would need to generate the most accurate, financially and shop optimized quote for any part. Utilize real time real world pricing of materials, tooling costs, utility costs, shop rate, logistics, all based of JM die data ... Then generate a quote with different price points depending on lead times, outsourcing potential to increase profits and roi investments on tooling or machines ... add additional benefits for other parts that can utilize tooling or machine upgrade for higher cost efficiency. make sure the entire quoting feature is phone friendly so salesmen can take pictures of prints and physical parts for instant accurate quoting. we need user customizations like adding additional secondary operations like laser marking, grinding, finishinig, painting, hardening, honing ... have adjustable pricing based off tolerances per dimension based off callouts on the print. synergize quoting throughout the entire prism app system and PSN and /system-viz"*.

**Author:** slot:charlie session `claude-2d29d422` /goal-20 iter1, 2026-05-25.
**Scope:** Audit-only (this iter). Build phases (iter2+) below.
**Method:** Read existing engine inventory + dispatcher coverage + frontend pages + prior memos. Surface gaps per axis. NO build until audit lands.

## TL;DR — surprising finding

**~85% of engine-side capability already exists.** The user's directive reads as a giant feature build, but the actual gap profile is:

| Slice | Status |
|---|---|
| Backend engines (math, physics, ROI, OCR, secondary-ops) | **~85% built** (lots of single-purpose engines per ENGINE_DIGEST) |
| Wired into `prism_quoting` quote-time path | **~30% wired** (gap-rich) |
| Surfaced in operator/mobile UI | **~25% surfaced** (gap-rich) |
| Live data feeds (real-time material spot, freight, utility) | **~5% live** (mostly cached/historical) |
| Cross-part tooling-synergy optimizer | **0% built** (novel — see Axis I) |
| Document-level (per-dimension) tolerance pricing | **~10% built** (encoder exists; pricing-impact wire absent) |

**Implication:** the path to "shop-deployable quoting" is **70% wiring + UI + live-data, 30% net-new code**. This dramatically changes the ROI ordering vs assuming everything needs to be built from scratch.

## 13-axis gap matrix

Cross-references existing engines (✓ exists). Gap class: **W**=wiring missing · **U**=UI missing · **D**=live data feed missing · **N**=net-new engine needed.

### Axis A — Real-time material pricing
- ✓ `HistoricalMaterialPriceEngine` (6.4K) + `JMDieMaterialPricingEngine` + `MaterialPricingPage.tsx` exist
- ✓ Constants for canonical material costs in physics/constants
- ✓ `ImportCostEngine` (5.3K) exists
- ✓ `VendorRealtimePricingClientEngine` (U-QP06) — adapter shape with cache fallback
- **GAPS**:
  - **D1**: No live commodity spot-price feed (LME / NYMEX / steel-benchmark). `VendorRealtimePricingClient` has the SHAPE but no API keys. **MS1 commercial integration.**
  - **D2**: `PRISM_COST_DATABASE.js` (288 KB) un-harvested per QUOTING-PIPELINE-MS0 close-out (G8 unit). Charlie/golf/echo follow-up.
  - **W3**: `HistoricalMaterialPriceEngine` not called by `QuoteEstimatorEngine.computeFMV()` — uses static rate.

### Axis B — Real-time tooling costs
- ✓ `InventoryAwareToolSelectorEngine` (9.9K) — selects from on-hand
- ✓ `ToolCostAmortizationEngine` (7.1K) — amortizes tool across part runs
- ✓ `ToolROIEngine` (24.2K) — full ROI math
- ✓ `InsertGradeSelectionEngine` (12.4K)
- **GAPS**:
  - **D4**: Live vendor pricing (McMaster/MSC/Travers/SEACO) is adapter-stub.
  - **W5**: Quote-time path doesn't query `ToolCostAmortizationEngine` for per-part allocation — uses flat tooling line item.

### Axis C — Real-time utility costs (electricity/gas/water/compressed-air)
- ✓ `DEFAULT_ELECTRICITY_COST_USD_PER_KWH` + `MAX_ELECTRICITY_COST_USD_PER_KWH` constants exist
- ✓ `CoolantCostOptimizationEngine` (20.9K) covers coolant
- ✓ `EnergyConsumptionEngine` likely exists (need to verify)
- **GAPS**:
  - **N6**: `ShopUtilityCostEngine` — composes electricity + compressed-air + lighting + HVAC into per-part utility burden. Currently rolled into the flat overhead %.
  - **D7**: No live utility-rate feed (utility bills are JM Die input — manual quarterly update). Acceptable for MS0.
  - **W8**: Quote-time path doesn't break out utility from overhead.

### Axis D — Real-time shop rate (labor dynamics)
- ✓ `ShopConfigurationEngine` holds canonical shop rate
- ✓ `LaborCostEngine` (likely — need to verify in ENGINE_DIGEST)
- **GAPS**:
  - **N9**: `DynamicShopRateEngine` — modulates rate by (shift / overtime / weekend / holiday / operator skill tier). Currently single flat rate.
  - **W10**: Quote-time path doesn't pick rate by shift assignment.

### Axis E — Real-time logistics (freight/packaging)
- ✓ `OutsourceRecommenderEngine` covers outsource-vs-in-house
- ✓ Some shipping in ERP layer
- **GAPS**:
  - **N11**: `FreightCostEngine` — query rates from FedEx/UPS/freight broker adapter for LTL/parcel by zone + weight. **Net-new.**
  - **N12**: `PackagingCostEngine` — box/crate/foam/labor per-part. Net-new.
  - **W13**: Quote-time path doesn't add freight/packaging line items by default.

### Axis F — Multi-tier pricing by lead time
- ✓ `QueueingLeadTimeEngine` (8.5K) — predicts in-shop lead time from capacity model
- ✓ `CrossProcessTierRouterEngine` (12.9K) — routes across process tiers
- ✓ `OptimizationTierEngine` (67.9K) — the giant tier-optimizer
- ✓ `RiskTierClassifierEngine` (9.3K)
- **GAPS**:
  - **N14**: `LeadTimePricingTierEngine` — emits 3 price points {rush / standard / economy} with explicit lead-time + cost-delta + reasoning. Currently quote is single-priced.
  - **W15**: `QueueingLeadTime` not wired into the quote-emit path.

### Axis G — Outsource ROI analysis
- ✓ `OutsourceRecommenderEngine` (7.8K) — 5-rule decision matrix (shop loading / capability / cost-delta / volume / lead-time) per U-QT04
- ✓ Vendor catalog + pricing client
- **GAPS**:
  - **W16**: Quote UI doesn't show "outsource for $X more profit" delta — engine produces it, UI doesn't render it.
  - **W17**: ERP doesn't auto-create outsource PO from "accepted outsource" quote line.

### Axis H — Tooling/machine ROI investment calculator
- ✓ `ToolROIEngine` (24.2K) — tooling ROI math
- ✓ `WEDMWirePremiumROIEngine` (12.6K) — domain-specific (wire premium grade)
- ✓ `ROIAdvisorEngine` (8.0K) — general ROI
- ✓ `MachineROIEngine` likely exists
- **GAPS**:
  - **N18**: `MachineInvestmentRecommenderEngine` — at quote time, if "buying machine X would save $Y per part across N parts in pipeline → payback in M months", surface it. Composes ToolROI + InventoryAware + pipeline-volume forecast.
  - **W19**: ROI surfaces aren't injected into the quote UI by default — they exist standalone but a quoter never sees them.

### Axis I — Cross-part tooling/machine synergy (NOVEL)
- ✗ **No existing engine.** This is genuinely net-new.
- **GAPS**:
  - **N20**: `CrossPartToolingSynergyEngine` — given a quoted part requesting a new tool/fixture/machine investment, scan the JM Die _PART LIBRARY_ + open quote pipeline for OTHER parts that benefit from the same purchase. Output: "buying this $X collet also speeds parts A/B/C by total $Y/year". This is the operator's stated "additional benefits for other parts that can utilize tooling or machine upgrade for higher cost efficiency" — has no current implementation.
  - **D21**: Requires part-feature similarity index over JM Die corpus (could leverage the existing `tribal-embed-index` + part-classification engines).
  - **W22**: Wire into U-QP-MACHINE-INVESTMENT-RECOMMENDER + UI.

### Axis J — Phone OCR (real Tesseract/Azure CV)
- ✓ `MobileCameraQuotePage.tsx` (6.9K) exists — accepts pre-OCR text
- ✓ `BlueprintOCREngine` exists
- ✓ `CameraIntakeRouterEngine` (U-QP02) classifies image
- ✓ PWA manifest + service worker
- **GAPS**:
  - **N23**: `TesseractOCRBridgeEngine` — drop-in Tesseract.js worker (browser-side, no API key needed). **Highest-ROI net-new because it unlocks the live photo→quote flow JM Die salesmen need.**
  - **W24**: Mobile capture page doesn't call Tesseract pre-routing.
  - **D25**: Azure Computer Vision adapter for high-fidelity prints (optional MS1 upgrade).

### Axis K — Secondary operations customization (UI + pricing)
- ✓ `HyperMillSecondaryOpsSequencer` (16.4K) — sequences secondary ops
- ✓ Per-op engines exist:
  - Laser: `LaserMarkingEngine`, `LaserCuttingEngine`, `LaserAblationPhysicsEngine`
  - Grinding: 9 grinding engines (force/surface/wheel/dressing/replacement/etc.)
  - Hardening: `AccountingHardeningEngine` (27.9K), `HardenedAgentCapabilitiesEngine`
  - Finishing: `FinishTargetAdvisorEngine`, `FinishingPassOptimizationEngine`, `BoreFinishingEngine`, `CenterlessGrindingEngine`
  - Honing: needs verification (likely under bore-finishing)
  - Painting: needs verification (likely partial / outsource-only)
- **GAPS**:
  - **N26**: `SecondaryOpsQuotePricingEngine` — takes a list of operator-selected secondary ops and emits per-op cost + cycle time + capability check. Composes the existing engines into a quote-time pricing API.
  - **U27**: Mobile quote page has NO "add secondary op" checkbox UI. Operator can't pick ops at quote time.
  - **N28**: `PaintingQuotePricingEngine` — if missing, build (since painting is operator-named).

### Axis L — Per-dimension tolerance pricing (callout-driven)
- ✓ `CADToleranceSignalEncoderEngine` (6.5K) — encodes tolerance callouts
- ✓ `CADToleranceCheckEngine` likely (need to verify)
- ✓ Tolerance constants in physics/constants
- **GAPS**:
  - **N29**: `TolerancePricingImpactEngine` — converts {tolerance band, datum scheme, surface-finish callout} → cost-multiplier. Currently the encoder produces signals but nothing prices them.
  - **W30**: Blueprint OCR → tolerance encoder → pricing-impact → quote line item is a 4-engine chain that isn't wired end-to-end.
  - **U31**: Quote UI has no per-dimension cost breakdown panel ("this ±0.0002" callout adds $47").

### Axis M — PSN / /system-viz synergy
- ✓ All quoting engines already L4-L7 graph nodes (auto-pickup on next regen)
- ✓ Memory + wiki + tribal hooks already wired
- ✓ `prism_quoting` MCP dispatcher exposed
- **GAPS**:
  - **W32**: Quote outcomes don't feed `psnAutonomyLoopEngine.scoreEvent({type:'psi_delta'})` — NN/GNN never gets the signal (this is U-QT12 already named).
  - **W33**: `/system-viz` doesn't have a `ghost.quote_funnel` roost showing live quote → ship conversion. Could surface bid-to-win, MAPE-by-customer, win-rate-by-process.
  - **U34**: `QuotingCalibrationHealthPage` (today's ship) not in top nav.

## Prioritized build queue (iters 2-20)

Ordered by **(unblocking-multiplicative-leverage)** ÷ **(LOC + days to ship)**:

| # | Unit | LOC est | Hours | Unlocks |
|---|------|---------|-------|---------|
| 1 | **U-QP-CALIBRATION-WIRE** — wire `applyToQuote` into `QuoteEstimatorEngine.computeFMV` | ~5 | 0.5 | EVERY quote becomes calibrated immediately (highest single ROI; named in last handoff) |
| 2 | **U-QP-TESS-OCR** — Tesseract.js worker in MobileCameraQuotePage (Axis J) | ~150 | 4 | First true photo→quote flow for JM Die salesmen |
| 3 | **U-QP-SECONDARY-OPS-PRICING** — `SecondaryOpsQuotePricingEngine` + UI checkboxes (Axis K) | ~300 | 8 | Operator selects secondary ops at quote time |
| 4 | **U-QP-TOL-PRICING** — `TolerancePricingImpactEngine` + 4-engine chain wire (Axis L) | ~250 | 6 | Tolerance callouts drive price |
| 5 | **U-QP-LEAD-TIME-TIERS** — `LeadTimePricingTierEngine` (3-tier emit) (Axis F) | ~200 | 5 | Quote ships with rush/standard/economy prices |
| 6 | **U-QP-CROSS-PART-SYNERGY** — `CrossPartToolingSynergyEngine` (Axis I, NOVEL) | ~400 | 12 | "Buying this tool helps parts A/B/C too" — operator-requested |
| 7 | **U-QP-FREIGHT** — `FreightCostEngine` + adapter (Axis E) | ~250 | 6 | Quotes include shipping |
| 8 | **U-QP-MACHINE-INVEST** — `MachineInvestmentRecommenderEngine` (Axis H) | ~300 | 8 | Quote surfaces "buy X machine → payback Y months" |
| 9 | **U-QP-OUTSOURCE-UI** — surface OutsourceRecommender output in quote UI (Axis G) | ~150 | 4 | Operator sees outsource $delta |
| 10 | **U-QP-COST-DB-HARVEST** — drain `PRISM_COST_DATABASE.js` 288KB (Axis A/D2) | ~600 (mostly data) | 12 | Cost ceiling rises (handed to golf) |
| 11 | **U-QP-PSI-DELTA-WIRE** — quote outcomes → `psnAutonomyLoopEngine.scoreEvent` (Axis M/W32) | ~50 | 2 | Closes NN/GNN learning loop |
| 12 | **U-QP-UTILITY-COST** — `ShopUtilityCostEngine` (Axis C) | ~150 | 4 | Utility breaks out of flat overhead |
| 13 | **U-QP-FRONTEND-NAV** — add Health page to top nav + new quote-funnel /system-viz roost | ~80 | 2 | Operator visibility |
| 14 | **U-QP-DYNAMIC-SHOP-RATE** — `DynamicShopRateEngine` (Axis D) | ~200 | 5 | Shift/OT/weekend rate awareness |
| 15 | **U-QP-PACKAGING-COST** — `PackagingCostEngine` (Axis E/N12) | ~120 | 3 | Quotes include packaging |
| 16 | **U-QP-DOC-LEVEL-TRAINING** — replace customer-AVG bucketing with per-document actuals | ~200 | 5 | Crushes residual MAPE 93.6% → <30% |

Total: **~3,205 LOC, ~86 hours of focused work** to take quoting from "calibrated-but-dormant" to "shop-deployable, multi-tier, tolerance-aware, photo-intake, ROI-surface, cross-part-synergy" complete.

## What this audit DOESN'T do (R12 fail-loud)

- Doesn't verify every named engine exists in source — it relies on `ls` output + memory. A few engines named above (LaborCostEngine, MachineROIEngine, CADToleranceCheckEngine, EnergyConsumptionEngine, painting engines) need explicit verification before depending on them.
- Doesn't count actual current MAPE / win-rate / quote-cycle-time — those metrics require live data.
- Doesn't price vendor API contracts (McMaster API, Tesseract is free; Azure CV is ~$1.50/1000 calls).
- Doesn't include ML/training improvements past what the substrate enables (training is NOT the bottleneck right now — see prior session response).

## Cross-references

- [[reference_quoting_calibration_u_qt10_2026_05_25]] — U-QT10 calibration parent
- [[reference_cov_engine_2026_05_25]] — CoV substrate (today AM)
- [[reference_quoting_active_factor_runtime_2026_05_25]] — active-factor loader (today PM)
- [[reference_quoting_pipeline_ms0_shipped_2026_05_24]] — QUOTING-PIPELINE-MS0 (foundation)
- [[reference_quoting_pipeline_ms0_assessment_2026_05_24]] — original 12-unit assessment
- [[feedback_high_roi_backend_first_slot_queue]] — backend-dev priority discipline

## Next iter (iter 2)

Start with **U-QP-CALIBRATION-WIRE** (highest-ROI single 5-LOC edit) → ship → tick → iter 3 starts on next priority unit. Aim 2-4 units per iter when LOC is small, 1 per iter when LOC > 200.
