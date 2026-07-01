# Kienzle Frontend Merge — Quote + Business/ERP + Employee Portal (2026-06-30)

> Authoritative reconciliation + work order. Operator directive: build the Kienzle-design
> front-end web app, MERGING features from (1) the monolith build, (2) the two prior Codex
> web-app builds, and (3) the new Kienzle redesign, for quoting + business ERP/employee-portal.
> Read ALL domain context first; ensure everything is built + wired BEFORE live closed-loop testing.
> Authored slot:juliett (any-domain fallback) — DISPATCH to owners charlie + hotel + quebec.

## KEY FINDING (verified on disk, not assumed)

The three source builds are **already merged** into the single `mcp-server/web/src/` tree
(no separate monolith/codex directories remain on disk). The web app is **extensively built**:

- **163 page components** under `web/src/pages/*.tsx`
- **198 routes** declared in `web/src/App.tsx`
- **Every operator-named domain page already EXISTS** (50+ in this domain — see table).

**The real gap is NOT "build the features" — they exist. It is:**
1. **Kienzle redesign port:** only **12 of 163** pages use the Kienzle/iOS design tokens. For this
   domain, only **5** are ported (QuoteBuilderPage, BusinessSuitePage, EmployeePhonePortalPage,
   ToolCribPage, + oscar's SFC pages). ~11 domain pages still wear the OLD style.
2. **End-to-end wiring verification:** prove each domain page is wired through to a live backend
   action — the recurring `prism_business` slimResponse `{type,text}` envelope dead-panel class
   (must `unwrapQuotingBody`/JSON.parse the `.text`) + the nested↔flat shape-adapter class.
   These have bitten quoting AND ERP repeatedly (see Recent regressions + charlie/hotel memories).

## CANONICAL DESIGN SOURCE
`H:\KIENZLE APP BUILD.zip` (1,416,514 B, 2026-06-26, 42 files) → extracted to
`mcp-server/web/design-imports/kienzle-app-build/`. 26 `.dc.html` design pages = the whole app.
Per [[reference_kienzle_tool_crib_design_build_location_2026_06_26]]: Claude Design owns the UI;
quebec owns DATA/API wiring; each domain slot owns its backend.

## RECONCILIATION TABLE — Kienzle design page → existing FE page → status

| Kienzle `.dc.html` | Existing `web/src/pages/` | Kienzle-ported? | Owner |
|---|---|---|---|
| Quote | QuoteBuilderPage.tsx | ✅ | charlie |
| ERP | ErpDashboard.tsx | ❌ PORT | hotel |
| Employee Portal | EmployeePortalPage.tsx / HotelPortalPage.tsx | ❌ PORT (phone variant ✅) | hotel |
| Job Cost | JobProfitabilityPage.tsx / JobPlannerPage.tsx | ❌ PORT | hotel/charlie |
| Inventory | InventoryPage.tsx | ❌ PORT | hotel |
| Materials | MaterialPricingPage.tsx | ❌ PORT | charlie/oscar |
| Scheduling | SchedulingPage.tsx | ❌ PORT | hotel |
| Payroll Labor | PayrollPage.tsx | ❌ PORT | hotel |
| Shop Floor | ShopFloorLivePage.tsx (+ Clock/TV) | ❌ PORT | hotel |
| Quality | QualityManagementPage.tsx / QualityPage.tsx | ❌ PORT | hotel |
| Blueprint Intake | BlueprintQuotePage.tsx | ❌ PORT | charlie |
| Speed-Feed | SfcCalculatorPage / SpeedFeedPage | ✅ (oscar) | oscar |
| Tool Crib | ToolCribPage.tsx | ✅ | quebec |
| (others: Academy/Post/CAD/Wizards/Alarm/Thermal/Trilobe/Warm-Up/System Sync/Audit/Collision/Backend-Map) | various | mixed | lima/echo/delta/wizards |

## ADDITIONAL DOMAIN PAGES ALREADY BUILT (merged from monolith + codex — verify wired, port to Kienzle)
AdditiveQuotePage, SheetMetalQuotePage, MobileCameraQuotePage, QuoteAnalyticsPage,
QuoteFollowUpPage, SecondaryOpsPage, StockOptimizerPage, CapacityPlanningPage,
CustomersPage, CustomerPortalPage, CommissionTrackerPage, GeneralLedgerPage,
FinancialAnalysisPage, InvoicesPage, PurchaseOrdersPage, PurchasingPage,
VendorCatalogPage, VendorComparePage, VendorScorecardPage, OrderTrackingPage,
JobsPage, JobTravelerPage, RFQInboxPage, MaintenanceWorkOrderPage, KaizenBoardPage,
AuditManagerPage, EmployeeDirectoryPage, EmployeeProfilePage, HotelEmployeeHubPage,
LatheERPDashboard, ShopFloorClockPage, ShopFloorTVPage.

## ERP-AUTOFEED PIPELINE — LIVE-VERIFIED GAP (this session, slot:juliett)
The print→ship → ERP-autofeed pipeline (QUOTING-ERP-AUTOFEED, shipped) **does NOT complete
end-to-end** on representative input — verified live via `scripts/verify-erp-autofeed-live.mts`:
- Pipeline fails at **`DFM_CHECK` with `"features is not iterable"`** (FEATURE_RECOGNITION emits a
  `features` shape DFM_CHECK can't iterate — a stage-contract mismatch).
- Result: 24 downstream stages stay `pending`; autofeed populates only **2/21** operator fields.
- The projection layer (`ErpAutofeedProjectionEngine`) is CORRECT; the pipeline underneath can't
  reach the finish line, so in production the ERP-autofeed ships a near-empty payload.
- **This is a real backend blocker that must be fixed BEFORE live closed-loop testing of the
  autofeed.** Owner: charlie (quoting pipeline). Harness left at `scripts/verify-erp-autofeed-live.mts`.

## WORK ORDER (dependency-ordered, R13/R15)

**Phase 0 — backend completion gate (charlie, BEFORE any live test):**
- Fix the `QuoteToShipOrchestratorEngine` stage-contract breaks until `runFullPipeline` reaches
  `status:"complete"` on the `verify-erp-autofeed-live.mts` harness. Peel stage-by-stage (DFM_CHECK
  first), each fix with a stage-contract test (the missing chain test — unit tests passed in
  isolation, which is why this shipped). Target: autofeed populates →21/21 fields.

**Phase 1 — wiring verification (charlie + hotel, per page):**
- For each domain page, trace FE → api client → route → dispatcher action → engine. Confirm the
  route UNWRAPS the `prism_business` `{type,text}` envelope and the FE adapts nested↔flat shape.
  Flag every dead panel. (This is the recurring class — do NOT skip.)

**Phase 2 — Kienzle port (quebec lead, domain owners review), one page per unit:**
- Port each ❌ page above to Kienzle/iOS tokens (`web/src/index.css`: rounded-ios, shadow-ios,
  prism-glow, prism-chip, font-mono; `data-sf-density` on mount). 1:1 from the `.dc.html`.
  DELETE any inline material/physics constant tables in the design (SAFETY — design MAT tables
  diverge from canonical `constants.ts`, e.g. ti64 kc 1450 vs 2800). Backend-source all numbers.
- Per-file 2-arm scrutiny; verify route in App.tsx; confirm no dead panel.

**Phase 3 — live closed-loop + 3-of-3 (after Phases 0-2):**
- Run live `:3100` simulations across all ported pages (operator's "live simulation closed loop
  learning and testing"). Prove with numbers per page. End-of-task 3-of-3.

## DISPATCH
- **charlie** (quoting FE+BE): Phase 0 pipeline-completion (BLOCKER) + Quote/Blueprint/Materials port + quoting wiring verify.
- **hotel** (ERP/portal/payroll): ERP/Employee Portal/Job Cost/Inventory/Scheduling/Payroll/Shop Floor/Quality port + wiring verify.
- **quebec** (FE wiring): lead the Kienzle port mechanics + App.tsx routing + dead-panel sweep across all domain pages.

## DO-NOT
- Do NOT rebuild any page — they exist; PORT + WIRE-VERIFY only (R8/dedup).
- Do NOT port the design's inline MAT/physics tables (SAFETY; no-inline-constants hook blocks it).
- Do NOT run live closed-loop testing until Phase 0 (pipeline completes end-to-end) passes (R12).

## PIPELINE STAGE-PEEL PROGRESS (slot:juliett, 2026-06-30 — live-verified)

Phase 0 (pipeline must complete e2e before live closed-loop test) is a CHAIN of stage-contract
bugs, each masking the next. Unit tests passed in isolation; the full chain on representative input
was never run. Peeling order (via `scripts/verify-erp-autofeed-live.mts`, PRISM_DFM_DEBUG_STACK=1):

- [x] **INTAKE** — passes when input pairs `drawing_pdf` (path) + `drawing_text` (OCR text). Text-only
      `drawing_text` alone hits a dead `else` -> fail. (Harness input fixed.)
- [x] **FEATURE_RECOGNITION** — passes (feature_candidates -> recognize()).
- [x] **DFM_CHECK** — **FIXED (this session).** `executeDfmCheck` called
      `DFMFeedbackEngine.analyze({features,material,...})` (options OBJECT) but the engine signature is
      POSITIONAL `analyze(features, material_iso_group?, machine_axes?)` and does `for (const f of
      features)` -> iterated the OBJECT -> "features is not iterable". Fix: call positionally with a
      guaranteed array + ISO group (QuoteToShipOrchestratorEngine.ts:1511-1519). VERIFIED: pipeline
      advanced 2->3 passing stages.
- [ ] **FEASIBILITY** — **NEXT BLOCKER (charlie).** `executeFeasibility` calls
      `FeasibilityOrchestratorEngine.fullAnalysis({features,material,machine_ids,geometry})` but the
      method signature is `fullAnalysis(job: FeasibilityJob)` where it reads `job.operations.map(...)`
      + `job.stock.height_mm` (FeasibilityOrchestratorEngine.ts:88,117,230). The passed object has NO
      `operations`/`stock` -> "Cannot read properties of undefined (reading 'map')". Fix = build a
      `FeasibilityJob` adapter in executeFeasibility (operations likely from PROCESS_PLAN, which shows
      `missing` in the autofeed gaps -> may need PROCESS_PLAN wired FIRST, R13 dependency order).
- [ ] **QUOTE, JOB_LIFECYCLE, TOOL_SELECTION, MATERIAL_PROCUREMENT, SECONDARY_OPS, MAKE_VS_BUY,
      QUALITY, PROCESS_PLAN** — still pending/skipped behind FEASIBILITY; each likely has its own
      contract bug (same class). Peel one at a time; each fix needs a STAGE-CHAIN test (the missing
      coverage that let this ship).

**Doctrine confirmed:** these are calling-convention/shape-adapter mismatches between the orchestrator's
stage executors and the engine method signatures they invoke -- the same class as the FE dead-panel
envelope bugs, but on the backend stage-to-stage seams. A stage executor must call the engine with the
EXACT signature the engine exposes (positional vs options-object; FeasibilityJob shape), not an
assumed shape. Owner: charlie (quoting pipeline). Harness: `scripts/verify-erp-autofeed-live.mts`
(run with PRISM_DFM_DEBUG_STACK=1 + add the same stack-capture to each stage's catch to find the throw).
