# Quoting Galaxy — slot:charlie
> Universal rails (R1–R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
> no-stub · no-inline-constants · duplication guard · RTK · Ollama→Sonnet→Opus ladder · wiki protocol):
> → `H:/prism/CLAUDE.md`. THIS file = quoting-domain doctrine ONLY; never re-inline universal prose.

---

## 1. Domain scope + slot identity

**Owns:** print-to-quote pipelines · instant quotes · multi-process quote routing (mill/lathe/wedm/casting/additive/injection-mold/sheet-metal/weld-fab) · quote-vs-actual reconciliation · historical-price + material-price tracking · freight + import cost · cost-aware routing · blueprint-to-quote bridge · customer-facing quote generation · JM Die financial baseline + DocuStrata ingest · closed-loop calibration + outcome ledger.

**EXCLUDES:** post-quote work-order management (hotel/business galaxy) · per-domain CAM strategy selection (mill/lathe/wedm) · OCR/blueprint parsing (xray) · ERP master-data (hotel).

**Slot:** charlie · worktree `H:/prism-slot-charlie` · branch `slot/charlie`.

**Engine geography:** quoting engines live flat at `mcp-server/src/engines/` (Cost*/Quote*/Estimat*/Freight*/Import* prefixes). The `quoting/` subdir holds this sentinel + `OPEN-THREADS.md`.

---

## 2. Verified engines

**Orchestrators:** `InstantQuoteEngine.ts` · `BlueprintToQuoteBridgeEngine.ts` · `JMDieQuoteTrainingPipelineEngine.ts`

**Per-process:** `AdditiveQuoteEngine.ts` · `CastingQuoteEngine.ts` · `InjectionMoldQuoteEngine.ts` · `SheetMetalQuoteEngine.ts` · `WeldFabricationQuoteEngine.ts`

**Cost core:** `JobCostingEngine.ts` · `ActualCostEngine.ts` · `CostEstimationEngine.ts` · `CycleTimeEstimatorEngine.ts` · `GCodeTimeEstimatorEngine.ts` · `FreightCostEngine.ts` · `ImportCostEngine.ts`

**Routing + governance:** `CostAwareRouterEngine.ts` · `CostEfficiencyBridgeEngine.ts` · `CostAlarmEngine.ts` · `CostSavingsTrackerEngine.ts`

**Reconciliation + loop:** `ERPCostFeedbackEngine.ts` · `QuoteToOrderBridgeEngine.ts` · `LatheActualCostReconciliationEngine.ts` · `QuoteOutcomeFeedEngine.ts` · `QuotingActualOutcomeLoaderEngine.ts` · `QuoteOutcomePSIDeltaBridgeEngine.ts` · `QuotingOutcomeLedgerDigestEngine.ts`

**Pricing indexes:** `VendorCostIndexEngine.ts` · `OutboundPriceIndexEngine.ts` · `QuotingCalibrationEngine.ts`

For exhaustive list: `mcp-server/data/docs/ENGINE_DIGEST.md`. Run `duplicationGuardEngine.checkBeforeCreating()` before adding any engine.

---

## 3. Dispatcher quick-ref

**Primary:** `prism_quoting` (`quotingDispatcher.ts` — confirmed present).

| Action | Use |
|--------|-----|
| `camera_intake_route` | Classify inbound image/print |
| `gcode_time_estimate` | Cycle time from G-code text |
| `gcode_cycle_time` | S-curve cycle time (canned cycles + kinematics) |
| `fair_market_value` | FMV estimate for a job |
| `inflation_adjust` | Adjust historical $ via CPI |
| `cost_index_prior` | Per-category unit-cost prior from JM AP ledger |
| `outbound_price_prior` | Confidence-gated real sold-price distribution |
| `outbound_promote_check` | Predicted vs real outbound alignment gate |
| `training_status` | Closed-loop training cycle status + active factor |
| `closed_loop_provenance_check` | Load real actuals; FAIL-LOUD if none |
| `cost_savings` | ROI savings ledger (8 `roi_*` sub-actions) |
| `closed_loop_outcome_digest` | Loop behavior distribution + health verdict |
| `quote_outcome_feed` | Feed a quote outcome into the loop |
| `jm_die_quote_training_pipeline` | Run JM Die training batch |
| `jm_die_docustrata_ingest` | Ingest DocuStrata prints |

Full action list: read all `case '...'` blocks in `quotingDispatcher.ts`.

**MCP-down fallback:** `node H:/prism/scripts/quoting-pipeline-verify.mjs --json` (TAP aggregated; exit 0 = all pass).

---

## 4. Canonical constants + data paths

**NEVER inline** shop-rate, margin, machine-hour, or material-price constants.

| Constant / data | Canonical location |
|-----------------|--------------------|
| Shop rates + machine costs | `mcp-server/src/data/jm-die-profile.ts` |
| Material price history | `HistoricalMaterialPriceEngine.ts` runtime state |
| Training baseline (real) | `state/shared/quoting/baseline-records-corpus-with-real.json` (47,905 records) |
| Drift gate | `state/shared/dashboards/latest-drift-alert.json` — check freshness before training |
| JM customers | `state/shared/databases/jm-customers.jsonl` (473 customers — head-20 sample only, NEVER full-Read) |
| JM vendors | `state/shared/databases/jm-vendors.jsonl` |
| AP ledger | `state/shared/quoting/jm-vendor-ap-ledger.jsonl` (20,736 entries) |
| Sold orders | `state/shared/quoting/jm-sold-orders.json` (500 entries, 240 verified) |
| DocuStrata corpus | `H:/PRISM/Docustrata/` — search `manifest.json` + `.index/` ONLY; never re-OCR |

---

## 5. Domain gotchas / safety rails

1. **Test-discovery glob silent-exclusion** (`211ab8e1f3`): prefix-anchored globs silently exclude tests whose filename doesn't match. Extend regex with explicit alternation; never assume one prefix covers all test files.
2. **Math.round() threshold boundary** (`d74521aa4c`): `Math.round(staleHours) > THRESHOLD` lets 48h+1m slip through. Use raw fractional comparison; round for display only.
3. **Non-customer filter false-positives** (`c83111d893`, `848e0107ab`): whole-segment anchors mandatory. HOLOTEST/OLDFIELD/TURNTECH/CADWORKS/ALCOA POST OFFICE/DOC HOLLIDAY are real customers — conservative match non-negotiable.
4. **DocuStrata is INBOUND-only**: `H:/PRISM/Docustrata/` = 72% SCAN_GENERIC receipts — NOT outbound revenue data. `H:/PRISM/JM DIE/QUOTES/` does NOT exist (was speculative).
5. **VendorCostIndex units-blended** (gotcha #25): `unitCost.median` blends $/bar·$/foot·$/piece. Never feed as per-unit cost into training/quote; safe only for spend concentration + cold-start range.
6. **Grain mismatch** (gotcha #15): `predicted_fmv_usd` is per-PART-JOB $, not per-piece. Real outbound reference = per-LINE `ext_price` distribution, NOT `unitPrice`/`orderTotal`.

---

## 6. What NOT to do

- **NEVER** inline shop-rate, margin, or machine-hour constants — read from `jm-die-profile.ts`
- **NEVER** train without freshness preflight on `latest-drift-alert.json` (poisoned stub baseline MAPE = 1881%)
- **NEVER** Glob `H:/PRISM/JM DIE/**` (24,545+ files, timeout) — use `prismSelfAwarenessEngine.getJMDieCustomerPath()` API
- **NEVER** treat DocuStrata as outbound-revenue ground truth (INBOUND prints + scan generics only)
- **NEVER** use `VendorCostIndexEngine` `unitCost.median` as per-unit cost (units-blended)
- **NEVER** claim test count without reverifying from live runner (count rot proven in iter28-32)
- **NEVER** compare `predicted_fmv_usd` (per-job) directly to outbound per-piece prices (grain mismatch)
- **NEVER** declare closed-loop working if `psi_delta_fed_count` is 0 (feed is dead — gotcha #17, fixed `1e67cfab93`)
- **NEVER** reference `ERPWorkOrderEngine` — it does not exist; use `QuoteToOrderBridgeEngine.ts`
- **NEVER** use `prism_business` as the primary quoting dispatcher — `prism_quoting` is primary
- **NEVER** write `knowledge/tribal/quoting-*.md` directly — use `prism_knowledge:tribal_capture slot=charlie`

---

## 7. Domain workflow / pipeline contract

Intake (`camera_intake_route`) → feature-extract (xray→`BlueprintToQuoteBridgeEngine`) → cost-build (`JobCostingEngine` + per-process engine) → cycle-time (`gcode_cycle_time`) → price-gate (`outbound_promote_check` + margin-floor) → emit (`fair_market_value` + `inflation_adjust`) → outcome-feed (`quote_outcome_feed` closes loop).

---

## 8. Tribal + corpus pointers

- **Wiki:** `knowledge/wiki/code-tribal/quoting/` — query `knowledge/wiki/index.md` before re-deriving
- **Memory search:** `prism_memory:semantic_search query="quoting" topK=20`
- **Bootstrap filter chain:** iter9-41 NON_CUSTOMER regex evolution is canonical — every extension adds anti-regression tests
- **Health check:** `node H:/prism/scripts/quoting-pipeline-verify.mjs --json`
- **Open threads:** `mcp-server/src/engines/quoting/OPEN-THREADS.md` (charlie-maintained)
- **JM Die corpus:** `prismSelfAwarenessEngine.getJMDieCustomerPath()` — NEVER Glob the 24K-file tree

---

## 9. Cross-galaxy edges (PSN)

| Direction | Partner | Bridge |
|-----------|---------|--------|
| quoting → hotel | ERP/business | `QuoteToOrderBridgeEngine.ts` · `ERPCostFeedbackEngine.ts` |
| quoting ← delta | CAD feature recog | `BlueprintToQuoteBridgeEngine.ts` consumes feature output |
| quoting ↔ whiskey | Lathe actuals | `LatheActualCostReconciliationEngine.ts` |
| quoting ← xray | Blueprint-vision | OCR print feeds auto-quote |
| quoting ← india | Learning loop | `xproc_*` feedback; defer retrain design to india |
| quoting ↔ oscar | Speed-feed | `SpeedFeedToQuoteBridgeEngine.ts` |

---

## 10. Closed-loop integration (india)

Publish outcomes via `xproc_outcome_publish {slot:'charlie', domain:'quoting'}` // UNVERIFIED action name — grep india dispatcher before calling.
Record actuals via `xproc_calibration_monitor_record`; emit features via `xproc_kg_project_features` // UNVERIFIED.
Full spec: `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`.

---

## 11. Test commands

```bash
cd mcp-server && rtk npx vitest run -t "Quote|Cost|Estimat|Pricing"
cd mcp-server && rtk npx vitest run src/__tests__/InstantQuoteEngine.test.ts
node H:/prism/scripts/quoting-pipeline-verify.mjs --json
```

---

## 12. Known bugs / open threads

- Training loop coverage: 2 of 5 sources (40%); unconsumed next: `jm-vendor-cost-index.json`, `jm-tool-purchases.json`, `docustrata-invoices.curated.json`
- `training_status` backend wired; frontend consumer pending (`U-QP-TRAINING-STATUS-SNAPSHOT`)
- `U-QP-COST-BASIS-NORMALIZE`: parse units+piece-counts from AP-ledger to grain-tag rows so VendorCostIndex becomes safe for training (prereq for gotcha #5 above)
- Full ledger: `mcp-server/src/engines/quoting/OPEN-THREADS.md`

---

## 13. AI / reasoning surface

```bash
node H:/prism/scripts/lib/galaxy-reasoning-bridge.mjs quoting "<question>"
```

Ollama routing: summarize RFQ/print → `gpt-oss:20b`; lint engine/test code → `qwen2.5-coder:32b`; deep pricing-model reasoning → `gpt-oss:120b`. Pricing math stays deterministic; $ rates are owner-gated, never inlined.
Neural routing: `prism_quoting:neural_route_quoting_task` · PSN synergy status: `prism_quoting:neural_psn_synergy_status`.
