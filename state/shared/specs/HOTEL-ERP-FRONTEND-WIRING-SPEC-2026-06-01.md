# HOTEL/ERP Frontend↔Backend Wiring Gap Spec — 2026-06-01

> Synthesis lead: slot:hotel (business galaxy). Inputs: 6 frontend-page wiring-audit slices (quoting-cost,
> orders-jobs, financial, customer-exec, hr-people, ops-quality). Grounded against live backend on disk
> (`mcp-server/src/engines`, `src/tools/dispatchers/businessDispatcher.ts`, route layers `erp.ts`/`quote.ts`/`portal.ts`)
> and real JM data (`mcp-server/data/vendor-catalog-db/` — 425 vendors, 173 JM-AP procurement rows, $4.91M tool spend).
> Advisory; every number cites a source file or is flagged NEEDS-DATA (R12). Counts read live, not cached.

## VERIFICATION CORRECTIONS TO THE INPUT AUDITS (load-bearing — read before §1)

The raw audits over-severified three gaps. On-disk verification (`grep -nE 'case "..."' businessDispatcher.ts`) shows
these are **action-name mismatches to already-rich engines**, not missing engines:

| Audit claim | Verified reality | Net effect |
|---|---|---|
| RFQInbox `rfq_assign`/`rfq_update_status` ORPHAN (no dispatcher cases) | businessDispatcher has 14 `rfq_*` cases incl. `rfq_list`, `rfq_receive`, `rfq_draft_quote`, `rfq_mark_*` (L7124-7176), `rfq_get`. The *assign* + generic *status* verbs are absent, but `RFQBroadcastEngine.ts` (28.5K) + `RFQToOrderOrchestratorEngine.ts` (15.1K) exist. | Effort S, not L — add 2 alias cases + routes |
| OSHACompliance 5 ORPHAN actions (engine "never wired") | `OSHAComplianceEngine.ts` (5.3K) + `OSHA300LogEngine.ts` (11.6K) exist AND are wired as `osha_record_incident`/`osha_classify_recordable`/`osha_reporting_window`/`osha_annual_300a` (L7498-7513). Frontend calls *different verb names* (`osha_incidents`, `osha_300_log`, `osha_near_miss`, `osha_safety_training`, `osha_ppe_records`). | Mixed: 2 are pure aliases (S); `osha_near_miss`/`safety_training`/`ppe_records` need new methods (M) |
| Kaizen 2 ORPHAN actions (dispatcher "never routes") | businessDispatcher has 12 `kaizen_*` cases (L6643-6698) incl. `kaizen_submit_suggestion`, `kaizen_list_suggestions`, `kaizen_triage_suggestion`. Frontend calls `kaizen_list`/`kaizen_update_status` — wrong names. | Effort S — alias `kaizen_suggestions`→`kaizen_list_suggestions`, `kaizen_update_status`→`kaizen_triage_suggestion` |

`DailyFlashReportEngine.ts` (5.6K) **is fully implemented on disk** with `generateFlashReport(date, requestedBy)` — the
ONLY gap is a missing `daily_flash_generate` dispatcher case (confirmed: `grep daily_flash businessDispatcher.ts` → 0 hits).
This makes it the cleanest P0.

Genuine no-engine orphans: **KanbanBoard** (no kanban engine on disk — `grep -i kanban engines/` → 0) and
**MaintenanceWorkOrder** (frontend uses raw `fetch()`, but `ERPWorkOrderEngine.ts`/`PreventiveMaintenanceEngine.ts`/
`PredictiveMaintenanceEngine.ts` exist and dispatcher already has `pm_work_order_*` + `order_work_order_create` cases —
so it's a route+verb gap onto an existing engine, not a missing one). Kanban is the only true greenfield orphan.

---

## 1. Ranked gap punch-list

Ranked by build-value = (contract clarity × data-exists × revenue/ops leverage) ÷ effort. P0 = clear contract AND
data plausibly exists AND high leverage. Effort: S ≤ ~30 LOC dispatcher+route alias; M = new method(s) on existing
engine + route; L = new engine or data-model decision.

| Rank | Page | Backend gap | Severity | Effort |
|------|------|-------------|----------|--------|
| 1 | **DailyFlashReportPage** | Engine fully built; missing `daily_flash_generate` dispatcher case only. Route `/erp/flash-report` exists. | **P0** | **S** |
| 2 | **RFQInboxPage** | `RFQBroadcast`/`RFQToOrderOrchestrator` engines exist + 14 rfq_* cases; missing `rfq_assign` + `rfq_update_status` verbs and `/erp/rfq-assign` `/erp/rfq-status` routes. Frontend swallows errors (RFQInboxPage.tsx:48). | **P0** | **S** |
| 3 | **CreditManagementPage** | `customer_credit_check` wired; `credit_review_all` action + `/erp/credit-review-all` route missing. CustomerManagementEngine has credit_limit/available_credit but NO `reviewAll` batch method. | **P1** | **M** |
| 4 | **OEEDashboardPage** | `analyticsOEE` wired (prism_calc); `oee_losses`/`oee_trend` actions + `/erp/oee-losses` `/erp/oee-trend` routes missing. `OEECalculatorEngine.ts` exists (5.7K). | **P1** | **M** |
| 5 | **OSHACompliancePage** | Engines wired under *different* verb names. `osha_incidents`→alias `osha_record_incident`-list; `osha_300_log`→alias `osha_annual_300a`; new: `osha_near_miss`, `osha_safety_training`, `osha_ppe_records` methods + 5 routes. | **P1** | **M** |
| 6 | **MaintenanceWorkOrderPage** | Frontend uses raw `fetch('/api/v1/erp/maintenance/work-orders')` (no api/client). Route absent. `ERPWorkOrderEngine`/`PreventiveMaintenanceEngine` exist + `pm_work_order_list` case exists — needs read route + frontend migration off raw fetch. | **P1** | **M** |
| 7 | **KaizenBoardPage** | Engine + 12 cases exist; frontend calls wrong verbs `kaizen_list`/`kaizen_update_status`. Alias to `kaizen_list_suggestions`/`kaizen_triage_suggestion` + 2 routes. | **P1** | **S** |
| 8 | **BlueprintQuotePage** | `quote.ts:102`→`blueprint_to_quote` case exists but `getEngine("blueprintQuoteBridge")` resolves to an engine file NOT on disk. True STUB — needs the bridge engine built or re-pointed. | **P1** | **L** |
| 9 | **KanbanBoardPage** | No kanban engine anywhere on disk. Frontend falls back to `INITIAL_JOBS` seed with silent catch. Needs data-model decision (board/column/card schema) before any build. | **P2** | **L** |

### Flagged: needs a data-model decision before build (do NOT classify P0)
- **KanbanBoard** (Rank 9): no schema exists for board state. Decide: is the kanban board a *view* over `JobLifecycleEngine`
  status (recommended — jobs already have status enums) or a separate persisted board store? A view-over-jobs design is
  S effort and reuses `job_dashboard`; a standalone store is L. **Defer until decided.**
- **BlueprintQuoteBridge** (Rank 8): the referenced engine is missing. Decide whether to build a thin bridge that composes
  the existing `BlueprintReader`→`QuoteEstimatorEngine` pipeline (preferred — both exist) or repoint the dispatcher to
  call `QuoteEstimatorEngine` directly after blueprint extraction. Not a numbers gap; an architecture gap.

---

## 2. Top-3 algorithm specs (grounded in real JM shop data)

### GAP 1 — Daily Flash Report (`daily_flash_generate`)  [Rank 1, P0, S]

**What the page needs:** end-of-day operational rollup. The engine ALREADY computes it; this section documents the
real algorithm it runs so the dispatcher wiring is verifiable against intent (R9).

**Algorithm (as implemented in `DailyFlashReportEngine.generateFlashReport`):**

```
For each active employee e (employeeEngine.list("active")):
  jobs = timeClockEngine.getActiveAndPausedJobs(e.id)
  for job in jobs:
    if status in {completed, stopped}: goodParts += job.good_parts; scrap += job.scrap_count
    else: inProgress.push(job)
    for pause in job.pause_periods:
      downtime[pause.reason_category] += (resumed_at − started_at) minutes
    productiveHours += job.elapsed_hours
  shiftHours += 8                                    # ← see NEEDS-DATA

scrap_rate_pct      = scrap / (good + scrap) × 100
labor_utilization   = productiveHours / shiftHours × 100
oee_by_machine[]    = oeeCalculatorEngine per machine   # A×P×Q
top_downtime_causes = top-3 by total_minutes
```

**Parameter sourcing:**
| Parameter | Source | Status |
|---|---|---|
| good_parts / scrap_count per job | `TimeClockEngine.getActiveAndPausedJobs()` live state | REAL (engine data) |
| pause reason categories + durations | `TimeClockEngine` `pause_periods` | REAL |
| OEE A/P/Q per machine | `OEECalculatorEngine.ts` | REAL (engine) |
| **8-hour shift assumption** (`shiftHours += 8`) | hardcoded in engine line ~104 | **NEEDS-DATA** — JM runs Polish/Spanish-majority crews; verify actual shift length + count per `project_jm_die_shop_floor_languages` / ShopConfigurationEngine before trusting `labor_utilization_pct` |
| machine list (which machines) | should be ShopConfigurationEngine 21-machine fleet | VERIFY — engine iterates employees not machines; cross-check coverage |

**Backend wiring plan:**
- Engine: `DailyFlashReportEngine` (exists, no change).
- Dispatcher: add `case "daily_flash_generate"` in `businessDispatcher.ts` → `dailyFlashReportEngine.generateFlashReport(params.date ?? today, params.requested_by ?? "erp-ui")`. Add `"daily_flash_generate"` to the action enum.
- Route: `/erp/flash-report` GET already exists in `erp.ts` (L319-324) and calls `callTool("prism_business","daily_flash_generate")` — it will start working the moment the case lands. No route change.
- Test: real-data E2E asserting `scrap_rate_pct` matches a hand-rolled good/scrap fixture, and `top_downtime_causes` is correctly sorted/sliced to 3.

---

### GAP 2 — RFQ assignment + status (`rfq_assign`, `rfq_update_status`)  [Rank 2, P0, S]

**What the page needs:** RFQ inbox triage — assign an inbound RFQ to an estimator and advance its workflow status.
The RFQ lifecycle engine already models the state machine; the two missing verbs are thin mutators over it.

**Algorithm (RFQ triage + estimator load-balance):**

```
rfq_assign(rfq_id, employee_id):
  validate employee_id ∈ employeeEngine.list() with skill ∈ {estimator, quoting}
  rfq.assigned_to = employee_id; rfq.assigned_at = now; rfq.status = "in_review"
  append audit row

rfq_update_status(rfq_id, status):
  enforce forward-only transition on the existing RFQ state machine:
    received → in_review → quoted → sent_to_customer → {accepted|rejected|expired}
  reject illegal backward/skip transitions (fail-loud)
```

Optional auto-assign scoring (reuse, don't re-derive): `RFQMatchScoringEngine` already runs a TOPSIS matcher; for
*internal estimator* assignment the cheap version is round-robin by open-RFQ count per estimator.

**Parameter sourcing:**
| Parameter | Source | Status |
|---|---|---|
| RFQ records + state machine | `RFQToOrderOrchestratorEngine.ts` (15.1K) — `rfq_mark_*` cases already mutate status | REAL (engine) |
| estimator roster + skills | `EmployeeEngine` (`employee_search`, `employee_add_skill` wired) | REAL |
| forward-only status enum | existing `rfq_mark_sent_to_customer`/`rfq_mark_customer_accepted`/`rfq_expire_overdue` cases define the canon | REAL — reuse, don't invent a parallel enum |
| open-RFQ count per estimator (for auto-balance) | derivable from `rfq_list` filtered by assigned_to | REAL (compose) |

**Backend wiring plan:**
- Engine: `RFQToOrderOrchestratorEngine` — add `assign(rfqId, employeeId)` + reuse existing status mutators (`rfq_update_status` should delegate to the matching `rfq_mark_*` method to avoid a second source of truth, R7).
- Dispatcher: add `case "rfq_assign"` and `case "rfq_update_status"` (the latter dispatches to the right `rfq_mark_*` by target status). Add both to enum.
- Routes: add `/erp/rfq-assign` (POST) and `/erp/rfq-status` (POST) in `erp.ts` → `prism_business`.
- Frontend: RFQInboxPage.tsx:48 currently swallows errors — surface failures (R12) once the route returns real data.
- Test: state-machine test rejecting a backward transition; assign-then-list round-trip asserting `assigned_to`.

---

### GAP 3 — Credit review (all accounts) (`credit_review_all`)  [Rank 3, P1, M]

**What the page needs:** batch AR/credit risk review across the whole customer book — the page calls
`creditReviewAll()` and silently `.catch()`-fails today. CustomerManagementEngine has per-customer credit fields
but no portfolio sweep.

**Algorithm (per-customer credit exposure → portfolio risk score):**

```
For each customer c:
  available_credit_c = c.credit_limit − c.current_balance        # engine already computes (L192)
  utilization_c      = c.current_balance / c.credit_limit
  dso_c              = days_sales_outstanding(c)                 # ← NEEDS-DATA (AR aging)
  past_due_c         = AR aging buckets > terms(c.payment_terms) # ← NEEDS-DATA
  risk_c = w1·utilization_c + w2·(dso_c / terms_days_c) + w3·past_due_ratio_c
           − w4·tenure_factor_c
  flag if: available_credit_c < 0  (OVER LIMIT)
        OR utilization_c > 0.9      (NEAR LIMIT)
        OR dso_c > 1.5 × terms_days_c (SLOW PAY)

portfolio:
  concentration_risk = CustomerManagementEngine.revenueConcentration()  # HHI, already built (L324-417)
  total_exposure     = Σ current_balance
  weighted_at_risk   = Σ (current_balance × risk_c for flagged)
```

**Parameter sourcing:**
| Parameter | Source | Status |
|---|---|---|
| credit_limit, current_balance, available_credit | `CustomerManagementEngine` L184-197 | REAL (engine) |
| payment_terms (string, e.g. "Net 30") | `CustomerManagementEngine` customer record L18 | REAL — must parse "Net N" → terms_days |
| revenue concentration / HHI / churn risk | `CustomerManagementEngine.revenueConcentration()` L324-417 + churn L495-524 | REAL (engine) |
| **days_sales_outstanding (DSO)** per customer | not stored on customer record | **NEEDS-DATA** — requires AR aging. `integrationExportARAging` (ExportsPage, WIRED) implies AR-aging data exists in IntegrationAdapterEngine; wire that as the DSO source rather than inventing it |
| **AR aging buckets / past-due** | likely in `IntegrationAdapterEngine` (export-ar-aging route wired L470) | **NEEDS-DATA pointer** — confirm the AR-aging payload shape before scoring |
| risk weights w1..w4 | none defined | **NEEDS-DATA** — start with documented defaults (w1=0.4 utilization, w2=0.3 DSO, w3=0.3 past-due, w4=0.1 tenure) and flag as calibration TODO; do NOT present as authoritative |

**Backend wiring plan:**
- Engine: add `reviewAllCredit()` to `CustomerManagementEngine` — iterate `list()`, compute per-customer exposure
  reusing `available_credit` + `revenueConcentration()`, join DSO from `IntegrationAdapterEngine` AR-aging.
- Dispatcher: add `case "credit_review_all"` → `customerManagementEngine.reviewAllCredit()`. Add to enum.
- Route: add `/erp/credit-review-all` (GET) in `erp.ts` → `prism_business`.
- Frontend: replace the silent `.catch()` (CreditManagementPage L49) with an error banner.
- **Blocker note:** this is P1 not P0 precisely because DSO + AR-aging are NEEDS-DATA. If the AR-aging payload from
  IntegrationAdapterEngine turns out empty/synthetic, the risk score degrades to utilization-only — ship that
  honestly labeled rather than fabricating DSO.

---

## 3. Recommended next build unit

**`daily_flash_generate` (Rank 1) — vertical: DailyFlashReport route→dispatcher→engine wiring.**

Why this over everything else:
1. **Highest build-value, lowest risk.** The engine is fully implemented and tested-shaped on disk; the route exists.
   The entire gap is one missing `case` + one enum entry. This is the *exact* pattern as the just-shipped
   `commission_report` (engine present, dispatcher case the only gap) — proven template, near-zero regression surface.
2. **Data is 100% real, zero NEEDS-DATA blockers** (unlike credit_review_all which needs DSO). Every input comes from
   live `TimeClockEngine`/`OEECalculatorEngine` state — no data-model decision required.
3. **Operational leverage:** a daily flash report is the single most-used shop-owner artifact (scrap, OEE, on-time,
   downtime in one screen). Lighting it up converts a dead page into the ERP's daily-driver dashboard.
4. **Unblocks honesty fixes:** while wiring, fix the hardcoded `shiftHours += 8` to read ShopConfigurationEngine
   (the one NEEDS-DATA item) so `labor_utilization_pct` stops being a silent approximation (R12).

Sequence after it (logical/dependency order, R13): **#2 RFQ assign/status** (S, P0, no data blockers) → **#7 Kaizen
aliases** (S, drains an easy P1) → **#4 OEE losses/trend** (M, reuses OEECalculatorEngine already touched in #1) →
**#3 credit_review_all** (M, only after confirming the AR-aging payload exists). Defer #8 BlueprintQuoteBridge and
#9 Kanban until their data-model/architecture decisions are made.

---

### Sources cited
- `mcp-server/src/engines/DailyFlashReportEngine.ts`, `JobCostingEngine.ts` (rates: labor $45, overhead $35, setup $55, programming $75, inspection $50, admin $15, electricity $0.12/kWh — DEFAULT_RATES L82-84), `MachineRateDatabaseEngine.ts` (TCO rates VMC $35-175/hr, lathe $32-100/hr), `ActualCostEngine.ts`, `CustomerManagementEngine.ts`, `RFQToOrderOrchestratorEngine.ts`, `RFQMatchScoringEngine.ts`, `QuoteEstimatorEngine.ts`, `OEECalculatorEngine.ts`
- `mcp-server/src/tools/dispatchers/businessDispatcher.ts` (case-line numbers cited inline)
- `mcp-server/data/vendor-catalog-db/manifest.json` (425 vendors, $4,914,833.88 JM tool spend, 49 tool vendors) + `tables/vendors.jsonl` (173 JM-AP procurement rows: ACCU-CUT $15,858/47 lines, ABILITY WELDING $4,092/31, AETNA $141,651/6 — real outside-process+material spend for cost-buildup/lead-time grounding)
- Route layers: `erp.ts`, `quote.ts`, `portal.ts`
