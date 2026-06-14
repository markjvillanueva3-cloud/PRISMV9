# HOTEL — Order-to-Ship ERP Simulation: enumeration + build plan
> Goal (operator, 2026-06-01): "populate the prism app front end with prism databases … simulate real world
> rfq, order taking, order tracking, job tracking, material and tooling purchasing, quoting, job flow process,
> employee job tracking, accounting, scheduling, logistics, and all other processes for processing an order
> from quote to ship." Slot: hotel (223d9a61). Status: iter 1 = enumeration + plan (build blocked on env).

## ENUMERATION (what already exists — do NOT rebuild)
- **HR/people ERP sim EXISTS**: `JMDieErpSimulationEngine` (wired businessDispatcher:7304, action runs `run({seed,days})`).
  Deterministic 90-day seeded sim of the PEOPLE side: hire 12 (7 roles) → academy → shift schedule → PTO accrual/
  requests → shift swaps → performance → payroll → manager dashboard → ISO §10.2 NCRs → customer complaints.
  Reconciles PTO ledger, payroll components, swap qualification, NCR effectiveness. **Covers: employee job tracking.**
- **Order-processing 21-stage pipeline EXISTS (single order)**: `prism_business:quote_to_ship_{status,validate,run}`
  (BlueprintOCR → FeatureRecognition → DFM → … → PackingSlip). Processes ONE part quote→ship; NOT a time-series
  multi-order simulation.
- **Reusable order/job engines (compose, don't reinvent)**: JobLifecycleEngine, JobTravelerEngine,
  JobShopSchedulingEngine, JobRoutingTemplateEngine, CapacityPlanningEngine, ERPWorkOrderEngine, VendorEngine,
  DistributionNetworkEngine, GeneralLedgerEngine, AccountingHardeningEngine, JobCostingEngine, PackingSlipEngine,
  CustomerManagementEngine/CustomerKnowledgeEngine, InstantQuoteEngine/BlueprintToQuoteBridgeEngine (charlie).
- **REAL JM DATA already on disk** (use as the sim's ground truth — do NOT fabricate):
  - `mcp-server/data/state/jm-die-vendor-registry.json` — 174 real JM vendors (name/category/bill counts/dates)
  - `mcp-server/data/state/jm-die-purchases-summary.json` — 20,550 bill-lines, byCategory, byYear 2014-2026, top-25
  - `state/shared/quoting/jm-tool-purchases.json` — real tool spend (~$211K of $4.9M)
  - `mcp-server/data/jm-die-database/` — 111,745 DocuStrata entries (quotes/orders/packing-slips/AR/AP)
  - real customers via `prismSelfAwarenessEngine.getJMDieCustomerPath()` / CustomerPortfolioMiner (118 customers)

## THE GAP (what this goal needs built)
A **multi-order, time-series, real-data order-to-ship SIMULATION** — the order-side analog of the people-side
`JMDieErpSimulationEngine`. Proposed: `JMDieOrderToShipSimulationEngine` (deterministic seeded PRNG, hotel-soul:
financial-invariant-reconciled, PII-free, fail-loud). Over N simulated days it must flow:
1. **RFQ intake** — generate RFQs from REAL JM customers + REAL part/material categories (from purchases-summary).
2. **Quoting** — cost each RFQ (compose InstantQuote/JobCosting; SFC-aware where applicable). Win/loss by seeded prob.
3. **Order taking** — won quote → sales order (AR booked; financial-invariant gate).
4. **Job/traveler** — order → job + traveler (JobLifecycleEngine/JobTravelerEngine); route on 8 real JM machines.
5. **Material + tooling purchasing** — explode job BOM → POs to the REAL 174 vendors (AP booked; VendorEngine/DistributionNetwork).
6. **Scheduling** — JobShopScheduling/Capacity across HAAS-VF2/OKUMA-LATHE/FIVE-AX/WEDM/SURF-GRIND/CMM.
7. **Job flow** — WIP state machine (released→setup→run→inspect→done); employee job-tracking ties to people sim.
8. **Accounting** — GL postings per event (AR on order, AP on PO, COGS+revenue on ship), trial balance must reconcile.
9. **Logistics/shipping** — PackingSlip + UPS shipment; order closes.
10. **Reconciliation invariants (R12 fail-loud)**: Σdebits=Σcredits each day; AR_open + cash = revenue booked;
    AP_open ties to PO ledger; every shipped order traces a complete quote→order→job→PO→ship chain (no orphans).

Ships WITH: real reference-value tests (≥3 spanning material/customer configs, ≥3 failure modes, ≥2 adversarial
seeds incl. 0/NaN), `prism_business:order_to_ship_sim` dispatcher wiring (import+call+action enum+schema), and a
round-trip E2E assertion through the dispatcher. Then a thin frontend page consumes it (see frontend note).

## BLOCKERS (env — surfaced for golf/papa hygiene)
- **MCP :3100 DOWN** (ECONNREFUSED) — supervisor-pinned, dying under fleet load. Live dispatcher verify impossible
  until it's healthy (kill listener+zombies, let `scripts/mcp-server-supervisor.mjs` respawn the fresh dist).
- **Full `tsc` build OOMs** under current fleet load (16GB heap; crashed 2× this session). `build:fast` (esbuild)
  still works ~10-15s; standalone esbuild on one file ~217ms. Greps timing out at 20s.
- **Frontend ABSENT**: `mcp-server/web/` holds only `vitest.config.ts` — no Next.js `app/`, no pages. The
  "populate the front end" half has NO frontend scaffold at the documented path. That's **quebec's lane**
  (frontend web app); hotel provides the data/sim substrate the pages will consume via `prism_business` actions.

## NEXT ITERATION (when MCP + build env recover)
1. `duplicationGuardEngine.mustCheckBeforeCreating` for `JMDieOrderToShipSimulationEngine` (this plan = the dedup record).
2. Read JobLifecycleEngine + JobTravelerEngine + GeneralLedgerEngine surfaces (compose, don't reinvent).
3. Build the engine + tests + wire `order_to_ship_sim`; esbuild-verify; vitest the single file; restart :3100; live round-trip.
4. Coordinate with quebec on a frontend ERP dashboard page that calls `order_to_ship_sim` + the now-real business actions.
