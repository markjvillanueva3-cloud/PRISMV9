# Frontend / Backend Convergence Plan — 2026-03-27

## Verdict

The frontend roadmap is directionally correct, but it is not yet fully accounting for everything that is already built, recently added, or still only fixture-backed.

What is true today:

- the frontend now has strong provider seams, shared workflow primitives, and connected-shop desk shells
- the backend already contains a large engine foundation for auth, employees, time tracking, costing, files, parts, DFM, quoting, setup sheets, eventing, websocket fanout, and print-to-program orchestration
- the live route and pipeline layer still does not expose all of that capability in a clean, converged way for the rebuilt web app

So the right answer is:

- do not fork a new frontend roadmap
- do add an explicit convergence plan so fixture-backed UX does not get mistaken for a fully wired operating system

## Branch Model Alignment (2026-03-29)

The full branched `v24` execution model now lives in:

- `C:\PRISM\state\shared\ULTIMATE_V24_BRANCH_PLAN_2026-03-29.md`

Interpretation for this convergence plan:

- this document is the frontend/backend projection of the true path (`MP-0` through `MP-4`)
- side quests may strengthen the system, but they should not outrun the main convergence path
- business-scenario simulation should begin only after the main path reaches the simulation-readiness gate for the target flow

## Highest-Risk Accounting Gaps

These are the main places where the frontend currently looks more complete than the live backend contract surface actually is.

### 1. Employee shell and role-aware entry

Frontend already has:

- employee-only shell
- role-filtered navigation
- access posture, shift priorities, blockers, and handoffs

Still required for true convergence:

- backend-issued employee bootstrap payload
- role and policy claims
- allowed-route and allowed-module payloads
- live desk counts, pins, recents, and notifications
- stable sign-in bootstrap for `/employee/*` versus `/dashboard`

### 2. Jobs desk and traveler execution

Frontend already has:

- queue-first jobs desk
- traveler, shortages, approvals, timeline, attachments, purchasing lane
- QR packet and traveler-print posture

Still required for true convergence:

- canonical traveler state from backend
- live approval, shortage, attachment, and timeline payloads
- durable intake-to-job packet lineage
- purchase follow-up and next-action feeds
- realtime job-room updates

### 3. Shop Floor Clock and employee execution

Frontend already has:

- employee selection
- QR/job registration
- department check-in
- concurrent task timing
- quantity and extras capture
- ROI signal posture

Still required for true convergence:

- live employee directory endpoint parity
- shift clock in and out route parity
- job time start, pause, and stop route parity
- duplicate department check-in idempotency from the source of truth
- durable labor-session, quantity-actual, and cost rollup persistence
- employee-room and department-room realtime updates

### 4. Scheduling desk and workflow OS

Frontend already has:

- provider-backed scheduling studies
- release-gate posture
- exceptions, planner actions, and board visualization

Still required for true convergence:

- stable publish and release payloads
- live shortage and approval attachment to the same workflow spine used by jobs
- durable owner, hold, release, and publish actions
- realtime schedule and desk refresh fanout

### 5. Program Release / Print to CNC

Frontend already has:

- universal dropbox
- design-in-PRISM lane
- machine, holder, tooling, fixture, stock, CAD-source selection
- DFM, GD&T, simulation-gate, and source-compare review deck
- setup-sheet and quote posture visualization

Still required for true convergence:

- file storage and version lineage wired to the desk
- part and revision creation / selection
- CAD-source compare and trust payloads
- DFM and GD&T result persistence
- simulation result ids and review state
- setup-sheet generation payloads
- quote revision linkage
- program release status and downstream handoff state

### 6. Shell search, counts, pins, and recents

Frontend already has:

- provider-backed search UX
- desk counts
- focus routes
- pinned and recent entities

Still required for true convergence:

- real shell bootstrap endpoint
- search endpoint
- desk-count aggregation endpoint
- focus-record mapping from canonical ids
- live inbox and approval refresh

### 7. Realtime and pre-test confidence

Still required across all core desks:

- canonical websocket room model
- event bus fanout from workflow mutations
- convergence acceptance criteria that block testing before the app is actually synchronized

### 8. Accounting, legal, and customer-service convergence

Frontend already has:

- finance desks for payroll, invoicing, general ledger, exports, and financial analysis
- CRM, messages, and customer-facing workflow surfaces

Backend already has:

- accounting engines like `GeneralLedgerEngine`, `InvoicingEngine`, and `PayrollEngine`
- customer-facing engines like `CustomerManagementEngine` and `CustomerPortalEngine`
- partial compliance and HR-quality infrastructure like `ComplianceEngine`, `HRComplianceEngine`, and standards/quality surfaces

Still required for true convergence:

- canonical accounting close-cycle payloads and route parity so finance desks stop looking more complete than live source-of-truth workflows
- legal/compliance operating payloads beyond templates and isolated alerts: retention, acknowledgements, legal-review gates, and document lineage
- automated customer-service pipeline:
  - portal/email/message driven case creation
  - SLA and escalation routing
  - linked follow-up against quote/order/job/invoice/quality records
  - AI-assisted/self-service response posture
  - durable service history shared across CRM, portal, and operations desks

## Reuse First — Existing Backend Foundation Already In Repo

These existing engines and surfaces should be reused before inventing new low-level engines:

- `AuthEngine`
- `EmployeeEngine`
- `TimeClockEngine`
- `ActualCostEngine`
- `ERPIntegrationEngine`
- `EventBus`
- `WebSocketEngine`
- `FileStorageEngine`
- `PartsLibraryEngine`
- `DFMPipelineEngine`
- `InstantQuoteEngine`
- `QuoteRevisionEngine`
- `SetupSheetEngine`
- `AutoPrintToProgramBridgeEngine`
- `PrintToProgramPipelineEngine`
- `QuoteToShipOrchestratorEngine`
- `ShiftHandoffEngine`

Interpretation:

- we do not need a brand-new backend ecosystem for every recent web feature
- we do need route, orchestration, and aggregation pipelines that expose the existing backend foundation in a way the rebuilt web app can bind to cleanly

## Extra Pipelines / Orchestration Surfaces Still Needed

These are the highest-value additions still required for convergence.

### A. Employee shell bootstrap pipeline

Purpose:

- combine auth, employee profile, role claims, desk counts, pins, recents, and allowed routes into one payload

Consumers:

- employee shell
- main shell entry gate

### B. Desk and search aggregation pipeline

Purpose:

- provide canonical desk counts, approval counts, inbox counts, pinned entities, recent entities, and global search results

Consumers:

- app shell
- employee shell
- jobs, scheduling, and command-center surfaces

### C. Shop execution pipeline

Purpose:

- unify traveler state, department check-ins, labor sessions, quantity actuals, duplicate guards, actual-cost rollups, and operator-facing handoffs

Consumers:

- Jobs
- Shop Floor Clock
- employee shift priorities and handoffs

### D. Program release pipeline

Purpose:

- connect file intake, parts library, revisions, DFM/GD&T, simulation, setup sheet, quote revision, and release posture

Consumers:

- Print to CNC / Program Release
- quote and planning desks

### E. Workflow / realtime fanout pipeline

Purpose:

- emit consistent workflow events and room updates for job, department, employee, and desk-level refresh

Consumers:

- Jobs
- Scheduling
- Shop Floor Clock
- shell counts and notifications

## Quote-To-Machining Decision Pipeline Overlay

The active convergence plan now explicitly includes the full decision pipeline from RFQ intake to actuals feedback. This is not a second plan. It is the highest-value integration path through the current frontend and backend work.

Canonical stages:

1. RFQ + document + CAD intake
2. requirements extraction and manufacturability fit
3. capability match and in-house route generation
4. parameter and toolpath planning
5. burdened costing
6. outsource comparison
7. quote / price-strategy recommendation
8. release handoff into Print-to-CNC, Jobs, Scheduling, Inventory, and purchasing
9. actuals feedback into the next quote

Backend focus inside this overlay:

- intake packet lineage
- capability and compatibility logic
- route generation and cycle-time posture
- burdened cost and outsource compare payloads
- live contract authority and event propagation

Frontend focus inside this overlay:

- RFQ / intake posture
- explainable quote and price-strategy surfaces
- route, risk, and release review
- workflow-ready handoff visibility
- simulation-style walkthroughs against live payloads once current frontend delivery closes

## Convergence Build Order

### Wave 0 — Freeze the contract map

Backend:

- define the canonical live payloads for:
  - employee shell bootstrap
  - desk counts and search
  - job desk record
  - traveler and labor session
  - schedule release record
  - program release packet

Frontend:

- keep these payloads as provider interfaces only
- stop adding page-local business modeling for active core desks

### Wave 1 — Employee and shell convergence

Backend:

- land auth/bootstrap/profile/count/search surfaces

Frontend:

- replace fixture shell bootstrap and employee bootstrap with live providers
- verify unauthorized surfaces are enforced by claims, not UI hiding

### Wave 2 — Traveler and shop-floor convergence

Backend:

- land employee list parity
- land shift clock and job time route parity
- land canonical traveler, department check-in, labor, quantity, and cost rollup surfaces

Frontend:

- replace local registration, duplicate guard, task seeds, and ROI posture with live providers
- keep mobile speed high while removing fake local state

### Wave 3 — Jobs and scheduling convergence

Backend:

- land job workflow, shortages, approvals, attachments, timelines, owners, and schedule release actions on one shared spine

Frontend:

- bind Jobs and Scheduling to the same workflow payload family
- remove remaining local release and desk synthesis

### Wave 4 — Program Release convergence

Backend:

- land file upload, revision lineage, parts linkage, DFM/GD&T payloads, simulation references, setup-sheet payloads, and quote revision linkage

Frontend:

- replace static catalog-only review posture with live packet state
- keep universal file acceptance while backend normalizes attachments and revisions

### Wave 4.5 — Accounting, legal, and automated customer-service convergence

Backend:

- finish live accounting close-cycle payloads across invoicing, payroll, GL, exports, and financial analysis
- extend partial legal/compliance infrastructure into real legal operations and audit posture
- extend CRM + portal + messages into an automated customer-service pipeline with case creation, SLA routing, escalation, and self-service

Frontend:

- harden finance desks against live close-cycle payloads instead of mixed local posture
- add contract-ready service-case, escalation, and customer-history surfaces without inventing backend authority
- keep customer-facing workflow context attached from portal/messages all the way into jobs, quality, invoices, and status desks

### Wave 4.75 — Underused backend activation + resource-learning prep

Bound this wave under the current finish-first gate using:

- `C:\PRISM\state\shared\COMPREHENSIVE_CONVERGENCE_AUDIT_2026-03-29.md`
- `C:\PRISM\mcp-server\data\docs\roadmap\RESOURCE-LEARNING-HARDENING-ROADMAP.md`

Backend:

- expose the highest-value already-built but frontend-underused route families first:
  - portal milestones and portal documents
  - compliance/legal operating routes
  - parts/files/revision lineage
  - quote revision/share/history
  - message and hot-job source-of-truth routes
- prepare canonical resource-learning registries and ingestion contracts without interrupting the current delivery tranche

Frontend:

- converge the remaining staged or partial seams against those route families:
  - `messages`
  - `hotJobs`
  - deeper `programRelease` lineage
  - `inventoryOperations`
  - portal/service-case continuity
- keep local-first pages under review when they are not yet on the main `api/client` or operating-system path:
  - `Calculator`
  - `Capture Ops`
  - `Viewer`
  - `Toolpath Advisor`
  - `What If`
  - `Safety Monitor`
  - `Pipeline`
  - `Integrations`
  - `Thread Calc`
- begin resource-learning work as audit, registry, provenance, and explainability preparation only; do not fork a second active build lane until the current convergence tranche is materially stable

### Wave 5 — Realtime convergence

Backend:

- emit websocket and event-bus updates for employee, job, department, and desk rooms

Frontend:

- wire live updates into shell counts, Jobs, Scheduling, Shop Floor Clock, and employee shell handoffs

### Wave 5.5 — Frontend hardening + simulation pass

After the remaining planned frontend convergence tasks are complete, but before broad testing:

Frontend:

- run scenario walkthroughs through the quote-to-machining pipeline using whatever live backend payloads are available
- harden explainability, missing-data warnings, and failure posture on the same desks instead of opening a parallel redesign lane
- keep tightening route / release / inventory / quote continuity until the system behaves like one operating flow rather than adjacent screens

### Wave 6 — Pre-test convergence gate

Testing should not begin until these are true:

- core desks no longer depend on fixture providers for active business flows
- employee access posture comes from live claims
- job, traveler, labor, quantity, and approval updates propagate across desks
- Program Release can trace packet, part, revision, DFM, quote, and setup posture
- shell search, counts, pins, and recents come from real backend aggregation
- frontend build and focused suites are green
- backend contract and integration suites are green

## Frontend Rule Until Convergence

Codex should keep doing frontend-first work, but only in ways that reduce swap cost when Claude lands live payloads.

That means:

- provider seams
- contract-ready loading, empty, unauthorized, and error states
- shared primitives
- explainable decision surfaces that can consume live quote-to-machining payloads
- no new disconnected page-local business engines for active desks

## Backend Rule Until Convergence

Claude should keep doing backend-first work, but prioritize surfacing and wiring the existing foundation before inventing parallel systems.

That means:

- route parity
- orchestration pipelines
- persistence
- realtime fanout
- shared workflow vocabulary

## Post-Convergence Reminder

Once this convergence plan is materially complete and both sides are stable:

1. Claude audits the frontend and fills remaining UX and workflow gaps.
2. Codex audits the backend and fills remaining contract and wiring gaps.
3. Run `/rgs-sync` again to generate the next SVI-closing roadmap pass and push Psi toward `100%`.
