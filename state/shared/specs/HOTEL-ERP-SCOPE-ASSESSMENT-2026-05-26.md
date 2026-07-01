# HOTEL ERP / Shop / Office Scope Assessment — 2026-05-26

**Author:** hotel slot, session `09808061`
**Operator ask:** "scope and assess the app needs for the shop/business management, employee portal, hr, accounting, logistics, departments, managers, audits, and all other front office and shop floor erp related features. we need automated scheduling for jobs, automated task delegation with manager approval. automated ai features throughout with summaries written and need admin approval"

---

## Executive summary

The substrate already has **~80% of the engines** the operator is asking about. The work is mostly **wiring / automation / AI gating** on top of what exists, NOT new domain engines. The 5 P0 builds below close the *automation + admin-approval-gate* gap; everything else is exposure work in the existing employee/manager portal frontends.

**Variability axes the assessment covers** (per comprehensive-build enforcement):
- **inputs**: employee, manager, admin, customer, vendor
- **states**: draft / proposed / accepted / rejected / approved / executed / closed / cancelled / blocked
- **failure modes**: SoD violation, missing rank, missing qualification, financial-invariant break, PII leak, double-spend, dangling reference, stale data, concurrent edit
- **adversarial cases**: self-approval, peer-collusion on triage, manager bypass of skill gate, admin-approving own AI output, retroactive timestamp edits

---

## 1. EXISTING SURFACE — what's already built (R8 read-before-write)

### 1.1 Employee operations (shipped — hotel iter1–iter40 marathon + 2026-05-23 mobile-portal)
| Engine | Purpose |
|---|---|
| `EmployeeTimeclockEngine` | Punch FSM (in/out/break/lunch) |
| `EmployeeShiftScheduleEngine` | Shift assignments + qualification |
| `EmployeeShiftSwapEngine` | Peer shift swap + manager approval |
| `EmployeeTaskHandoffEngine` ⭐ | Peer task handoff + manager bypass (TODAY) |
| `EmployeePerformanceFeedbackEngine` | 360° feedback intake |
| `EmployeePTOAccrualEngine` | PTO/sick/personal accrual |
| `EmployeeExpenseReimbursementEngine` | Expense submission + approval |
| `EmployeeRoleAcademyInjectionEngine` | Role-based course injection (17 roles, course-0a..34) |
| `EmployeeMachineDomainAcademyEngine` ⭐ | Per-machine specialist ladder (10 domains × 5 tiers, TODAY) |
| `EmployeeDailyDigestEngine` | Per-employee daily synergy capstone |
| `EmployeePerOpPartTrackerEngine` | Per-operation traveler |

### 1.2 Manager surfaces
| Engine | Purpose |
|---|---|
| `ManagerDailyDashboardEngine` | Foreman/manager team rollup |

### 1.3 HR / payroll / compliance
| Engine | Purpose |
|---|---|
| `PayrollEngine` | Payroll baseline |
| `EmployeePayrollGrossPayEngine` | Gross-pay calc |
| `HRComplianceEngine` | HR compliance gate |
| `OSHA300LogEngine` (per commit) | Federal OSHA 1904.7 |
| `SDSLibraryEngine` + `DocumentControlEngine` | OSHA HazCom + ISO 9001 §7.5 |

### 1.4 ERP core
| Engine | Purpose |
|---|---|
| `JobLifecycleEngine` · `JobCostingEngine` · `JobTravelerEngine` · `JobRoutingTemplateEngine` · `JobLearningEngine` · `JobProfitabilityWaterfallEngine` · `JobDeskAggregatorEngine` | Job-side ERP |
| `JobShopSchedulingEngine` | Shop scheduler (CPM-aware, U-CPM-SCHEDULING shipped earlier) |
| `CapacityPlanningEngine` · `CapacityMonteCarloEngine` | Capacity + stochastic capacity |
| `DistributedCriticalPathEngine` | Distributed CPM |
| `OrderManagerEngine` | Order lifecycle |
| `PurchaseOrderEngine` + `PurchaseOrderLifecycleEngine` | PO lifecycle |
| `VendorPerformanceTrackerEngine` | ISO §8.4 vendor scoring |
| `ShippingReceivingLogEngine` | Inbound/outbound log |
| `InspectionReportEngine` | QC inspection (FAI + lot) |
| `JMDieERPSimulationEngine` | E2E 90-day ERP simulation |

### 1.5 Accounting / finance
| Engine | Purpose |
|---|---|
| `AccountingHardeningEngine` | Trial balance + double-entry invariants |
| `LedgerStoreEngine` · `LedgerProjectorEngine` · `LedgerRetentionEngine` | GL store + projections + retention |
| `DocuStrataAccountingBridgeEngine` | DocuStrata accounting wire |
| `BurdenRateEngine` (replaced by `AdaptiveShopRateEngine`) | Bayesian self-learning shop rate |
| `ExecutiveSummaryEngine` | C-suite weekly rollup |
| `LeadTimePricingTierEngine` | Lead-time pricing tier |
| `InvoiceX12ParserEngine` (per commit U-INVOICE-X12-PARSERS) | G2/G6 EDI parsers |

### 1.6 Sales / front office
| Engine | Purpose |
|---|---|
| `CustomerManagementEngine` · `CustomerKnowledgeEngine` · `CustomerPortalEngine` · `CustomerComplaintIntakeEngine` · `CustomerMaterialMapEngine` · `CustomerPortfolioMinerEngine` | Customer 360° |
| `ProspectiveCustomerEngine` (per U-PROSPECTIVE-CUSTOMER) | Sales pipeline + prospect scoring |
| `DistributorSearchEngine` · `DistributionNetworkEngine` | Distributor / vendor discovery |
| `QuoteEngine` · `QuoteEstimatorEngine` · `QuoteAnalyticsEngine` · `QuoteAutopilotEngine` · `QuoteOutcomeFeedEngine` · `QuoteOutcomePSIDeltaBridgeEngine` | Quoting full stack (incl. PSN feedback loop) |
| `VendorQuoteToPOEngine` (per commit) | Vendor quote → PO bridge |

### 1.7 Quality / audits / compliance
| Engine | Purpose |
|---|---|
| `NonConformanceAndCorrectiveActionEngine` | ISO 9001 §10.2 NCR + 8D |
| `InternalAuditCalendarEngine` (+ `ManagementReviewEngine`, `BidWinCalibratorEngine`) | ISO §9.2 internal audit + §9.3 management review |
| `ISO9001QMSEngine` | ISO 9001:2015 validator |
| `AuditEngine` · `AuditLoggingEngine` · `AuditManagerEngine` | 3-layer audit substrate |
| `ComplianceEngine` | Compliance gate |
| `KaizenLeanSigmaEngine` ⭐ | DOWNTIME + DMAIC + Cpk gate (TODAY) |

### 1.8 AI substrate (relevant to operator's admin-approval ask)
| Engine | Purpose |
|---|---|
| `ApprovalWorkflowEngine` (29.3K) | **Existing generic approval workflow** — KEY for the operator's "admin approval" ask |
| `AIGeneratedCodeApprovalGateEngine` (38.8K) | **AI-output approval gate — already covers the "AI summaries need admin approval" pattern** |
| `AIDecisionExplanationEngine` | Explainable AI for every AI decision |
| `AISystemRouterEngine` · `AICapabilityMaximizerEngine` · `AIIntelligenceMaximizerEngine` · `AIAutoUtilizationEngine` · `AIResourceLearningEngine` · `AIFeatureAutoRegistryEngine` | AI orchestration layer |
| `AIDeepKnowledgeIntegrationEngine` · `AIExtractionReasonerEngine` · `AIMLEngine` · `AIMLFormulasEngine` · `AIPhysicsOptimizationEngine` | AI domain integrations |

### 1.9 Portal frontends (shipped — `BusinessSuitePage.tsx`, `EmployeeMobilePortal`, `HotelPortalFrontend`, `ShopFloorLayout`)
- `BusinessSuitePage` — front-office desktop portal
- `EmployeeMobilePortal` (PWA + Auth + per-worker storage) — phone-first shop floor
- `HotelPortalFrontend` + `HotelPortalLiveIntegration` — manager+admin desktop
- `ShopFloorLayout` — shop-floor kiosk layout

---

## 2. GAP MATRIX — what's missing vs operator ask

Each row: (a) why needed, (b) depends on, (c) blocks. Status: **BUILT** (just wire) | **PARTIAL** (engine exists, automation missing) | **NEEDS-BUILD** (no engine).

| # | Capability | Status | Why | Depends on | Blocks |
|---|---|---|---|---|---|
| G1 | **Department entity** (org chart, dept → manager, dept rollups) | NEEDS-BUILD | Manager dashboards rollup-by-dept; audits scope to dept; AI summaries by dept | nothing (foundational) | G2, G6, G7, G9 |
| G2 | **Manager registry** (employee_id → manager rank + dept assignment + reports_to chain) | NEEDS-BUILD | Every approval/handoff currently passes `manager_employee_id` ad-hoc; no central org-chart truth | G1 | G3, G4, G6, G8 |
| G3 | **Automated job scheduler** (AI proposes schedule from JobShopSchedulingEngine + CapacityPlanning + employee qualifications + machine state) | PARTIAL | `JobShopSchedulingEngine` + CPM exist; the **AI proposer** that runs nightly and surfaces proposals for manager approval is the missing layer | G2 (manager auth), `JobShopSchedulingEngine`, `CapacityPlanningEngine`, `EmployeeShiftScheduleEngine`, `EmployeeMachineDomainAcademyEngine` | G4, G5 |
| G4 | **Automated task delegator** (AI scans workload+skill+shift+queue → proposes delegations → admin/manager accept/deny queue) | PARTIAL | `EmployeeTaskHandoffEngine` (TODAY) has the human peer-handoff lane; the **automated proposer** that uses scheduler+skills+load-balance to PROPOSE handoffs is missing | G3, `EmployeeTaskHandoffEngine` | G5, G7 |
| G5 | **Admin-approval-gated AI proposal queue** (any AI proposal — summary, delegation, schedule, quote — lands here for admin sign-off before going live) | PARTIAL | `ApprovalWorkflowEngine` + `AIGeneratedCodeApprovalGateEngine` exist; the **generic AI-Proposal queue** that consolidates ALL AI outputs (summary text, recommended action, auto-fix) into one admin admin-approval lane is missing | `ApprovalWorkflowEngine`, `AIDecisionExplanationEngine` | G6, G7, G8, G9 |
| G6 | **AI summary writer** (per-employee daily digest, per-dept weekly rollup, per-customer monthly insight — written by AI, gated by G5) | PARTIAL | `EmployeeDailyDigestEngine` + `ExecutiveSummaryEngine` exist (deterministic text); the **AI-narrative layer** that adds natural-language summaries is missing — needs G5 to land before going live | G5, `EmployeeDailyDigestEngine`, `ExecutiveSummaryEngine`, `CustomerKnowledgeEngine`, `ManagerDailyDashboardEngine` | nothing (leaf) |
| G7 | **Department audit dashboard** (rollup of audit findings by dept + KPI deltas + open CAPA count + Cpk trend per dept) | PARTIAL | `AuditEngine` + `InternalAuditCalendarEngine` + `ManagementReviewEngine` + `KaizenLeanSigmaEngine.wasteSummary()` exist; the **per-dept rollup view** is missing | G1, G2, all audit engines | nothing (leaf) |
| G8 | **Approval-chain expansion** (extend `ApprovalWorkflowEngine` to support N-step chains: requester → dept-manager → finance → admin) | PARTIAL | `ApprovalWorkflowEngine` exists but most usage is single-step; multi-step chains for expense (>$X needs CFO), PO (>$Y needs owner), schedule changes (>Z hrs needs ops manager) are not wired | G2, `ApprovalWorkflowEngine` | G3, G4, G5 (multi-step gates) |
| G9 | **Front-office RFQ → quote → order intake** (customer submits RFQ via portal → AI estimator drafts quote → admin approves → quote sent → customer accepts → order created) | PARTIAL | `QuoteAutopilotEngine` + `CustomerPortalEngine` + `OrderManagerEngine` + `QuoteEstimatorEngine` exist; the **stitched intake-to-order pipeline with G5 admin gate** between AI quote draft and customer send is missing | G5, `QuoteAutopilotEngine`, `CustomerPortalEngine`, `OrderManagerEngine` | G10 |
| G10 | **Logistics dashboard** (live inbound + outbound + carrier + customs + receiving discrepancies) | PARTIAL | `ShippingReceivingLogEngine` + `OrderManagerEngine` exist; the **unified logistics dashboard** consolidating PO arrivals + shipments + delivery exceptions is missing | `ShippingReceivingLogEngine`, `OrderManagerEngine`, `PurchaseOrderLifecycleEngine`, `VendorPerformanceTrackerEngine` | nothing (leaf) |
| G11 | **Per-employee training-progress UI** (employee mobile portal surfaces academy + domain-academy assigned/passed + Cpk-floor for promotion + next-tier preview) | NEEDS-BUILD (UI) | engines all exist (`EmployeeRoleAcademyInjectionEngine` + `EmployeeMachineDomainAcademyEngine`); the mobile-portal route doesn't surface them yet | G6 (AI summary of training progress), academy engines | nothing (leaf) |
| G12 | **Handoff acceptance UI** (employee mobile portal: notification + accept/deny button + optional `lean_waste_observed` chip) | NEEDS-BUILD (UI) | `EmployeeTaskHandoffEngine` is fully wired in dispatcher; mobile-portal route + push notification is missing | `EmployeeTaskHandoffEngine` (DONE), `EmployeeMobilePortal` | nothing (leaf) |
| G13 | **Audit-finding → CAPA bridge** (audit finding auto-spawns DMAIC kaizen event with the offending operation as baseline) | NEEDS-BUILD (bridge) | `InternalAuditCalendarEngine` produces findings; `KaizenLeanSigmaEngine.openEvent` accepts events. A 1-engine bridge wires them | `InternalAuditCalendarEngine`, `KaizenLeanSigmaEngine` | G7 |
| G14 | **Concurrent edit + financial-invariant gate at API boundary** (per hotel-soul: refuse GL write on imbalance, refuse posted-entry overwrite without journal-entry trail) | PARTIAL | `AccountingHardeningEngine` has the invariant logic; the **HTTP middleware** that enforces it on every accounting POST is partially wired | `AccountingHardeningEngine`, `LedgerStoreEngine` | G9 (quote→order accounting touch) |
| G15 | **PII redaction middleware on every export** (per hotel-soul: last4 SSN, masked card, role-only names) | NEEDS-BUILD | Engine-level returns are PII-free in new code; the **export endpoint middleware** that scrubs older engine outputs is not standardized | nothing | nothing (leaf — cross-cutting) |

---

## 3. DEPENDENCY GRAPH (build order)

```
G1 (Department) ──┬──► G2 (Manager registry) ──┬──► G3 (Auto scheduler)
                  │                              ├──► G4 (Auto delegator)
                  │                              ├──► G7 (Audit dashboard)
                  │                              └──► G8 (Multi-step approval)
                  │
                  └────────────────────────────────► G7

G5 (Admin-approval AI queue) ──┬──► G6 (AI summary writer)
                                ├──► G3, G4 (their proposals queue through G5)
                                └──► G9 (RFQ→quote needs admin gate)

G13 (audit→CAPA bridge) ──► G7 (rollup includes open CAPA from G13)

G11, G12 (UIs) — leaf nodes, depend on already-shipped engines

G14 (financial middleware), G15 (PII middleware) — cross-cutting, can ship anytime
```

**Critical path: G1 → G2 → {G3, G4, G7, G8}** then **G5 → G6 → G9**.

---

## 4. RECOMMENDED BUILD ORDER (Theory of Constraints — optimize bottleneck)

The **G5 admin-approval queue** is the single biggest leverage point: it unblocks the entire "automated AI features with admin approval" axis the operator named. **G1 + G2** are foundational and unblock the most downstream work. **G4** is what the operator specifically asked for ("automated task delegation with manager approval").

### Phase 1 — Foundation (P0, recommended next ship batch)
1. **G1: DepartmentEngine** — org-chart, dept → manager, dept → employees, dept → KPI rollup. ~250 LOC engine + 20-case test.
2. **G2: ManagerRegistryEngine** — employee_id → rank + dept + reports_to chain + on-rank-change auditing. ~300 LOC + 20-case test. Composes with G1.
3. **G5: AIProposalApprovalQueueEngine** — generic queue: any subsystem submits an AI-generated proposal (summary text + recommended action + explanation refs), admin pulls queue → approves/rejects/edits. Composes `ApprovalWorkflowEngine` + `AIDecisionExplanationEngine`. ~400 LOC + 25-case test.

### Phase 2 — Automation (P1)
4. **G4: AutomatedTaskDelegatorEngine** — nightly + on-demand: scans queued tasks + employee load + skill match + shift schedule → proposes handoffs via `EmployeeTaskHandoffEngine.proposeHandoff()` BUT through the G5 admin-approval queue. The operator's exact ask. ~400 LOC + 20-case test.
5. **G3: AutomatedJobSchedulerEngine** — nightly: pull job queue → run `JobShopSchedulingEngine` + `CapacityPlanningEngine` → propose schedule diff → queue through G5 for ops-manager approval. ~500 LOC + 25-case test.
6. **G6: AISummaryWriterEngine** — wraps `EmployeeDailyDigestEngine` + `ExecutiveSummaryEngine` outputs with LLM-generated narrative (offloaded to Ollama per token-budget); narrative queues through G5 before publication. ~350 LOC + 18-case test.

### Phase 3 — Wiring + UI (P2)
7. **G7: DepartmentAuditDashboardEngine** — rollup per-dept audit findings + open CAPA + Cpk trend. ~250 LOC + 15-case test.
8. **G13: AuditFindingToCAPABridgeEngine** — auto-spawn DMAIC event from audit finding. ~150 LOC + 10-case test.
9. **G8: ApprovalWorkflowEngine** — multi-step chain extension (DELTA on existing engine, not new). ~150 LOC delta + 15 new test cases.
10. **G9: RFQToOrderPipelineOrchestratorEngine** — stitches RFQ → quote-draft (G5 gate) → customer send → acceptance → order. ~400 LOC + 25-case test.
11. **G10: LogisticsDashboardEngine** — consolidated dashboard. ~200 LOC + 12-case test.
12. **G11: training-progress mobile route** (frontend)
13. **G12: handoff accept/deny mobile route** (frontend)
14. **G14: financial-invariant middleware** (Express middleware + tests)
15. **G15: PII-redaction export middleware** (Express middleware + tests)

---

## 5. STOP — check in before any code (per comprehensive-build enforcement)

Per the UserPromptSubmit `COMPREHENSIVE-BUILD ENFORCEMENT` injection: "If context is insufficient, do ALL the enumeration work first, then stop at the first write and check in — do not half-build."

**This assessment is the enumeration. Awaiting operator green-light on the Phase 1 P0 build batch (G1 + G2 + G5) before shipping code.**

Questions for the operator:
1. **Approve Phase 1 batch (G1 + G2 + G5) as next ship?** They unblock the most downstream work (~6 engines depend on them) and are the leverage point per ToC.
2. **Approval-queue admin role** — is "admin" a new rank above `owner` in the role hierarchy, or does it map to existing `owner` from `EmployeeRoleAcademyInjectionEngine.ShopRole`?
3. **AI summary cadence** — daily per-employee + weekly per-dept + monthly per-customer? Or only daily + weekly?
4. **Auto-delegation triggers** — nightly only, OR also on-demand when (a) a shift gap is detected, (b) a stalled handoff exceeds threshold (from `EmployeeTaskHandoffEngine.listStalledHandoffs`), (c) a sick-day call-in?
5. **Logistics scope** — internal logistics only (shop-floor material flow), or also external (carrier integrations, customs)?

---

## 6. What was NOT recommended (avoiding duplicate work per R8)

- **PayrollEngine** — exists + hardened (`AccountingHardeningEngine`). No new payroll work needed.
- **Performance feedback** — `EmployeePerformanceFeedbackEngine` exists. Just needs G11-style mobile route.
- **OSHA logging** — `OSHA300LogEngine` shipped. Done.
- **ISO 9001 QMS** — `ISO9001QMSEngine` + audit calendar + management review shipped. Done.
- **Quote stack** — Full 6-engine quote stack exists. G9 just orchestrates.
- **Sales pipeline** — `ProspectiveCustomerEngine` shipped. No new sales-pipeline engine needed.
- **Customer portal** — `CustomerPortalEngine` shipped. G9 extends it, doesn't replace.
- **Capacity planning** — `CapacityPlanningEngine` + Monte Carlo variant exist. G3 uses them.
- **Vendor management** — `VendorPerformanceTrackerEngine` + `DistributorSearchEngine` + `DistributionNetworkEngine` shipped. Done.
- **GL / accounting hardening** — `AccountingHardeningEngine` + `LedgerStoreEngine` (50.2K) + `LedgerProjectorEngine` + `LedgerRetentionEngine` shipped. G14 is middleware-only on top.
- **Compliance** — `ComplianceEngine` + `HRComplianceEngine` shipped.

---

## 7. Token / cost note (per hotel-soul)

- Phase 1 P0 batch est. ~1100 LOC engines + ~60 test cases = ~3 hours of focused work, ~30K-40K tokens (well within budget).
- Phase 2 P1 batch est. ~1250 LOC engines + 63 test cases = ~30K-40K tokens.
- Phase 3 P2 batch est. ~1200 LOC engines + middleware + 65 test cases + 2 mobile routes ~ ~50K tokens.
- Total: ~110K-130K tokens for the entire app-needs closure across 3 phases.

---

## 8. Composes with prior hotel work (compounding gains)

- **U-EMPLOYEE-TASK-HANDOFF** (today) → G4 (auto-delegator) is its automated proposer.
- **U-KAIZEN-LEAN-SIGMA** (today) → G7 (dept audit dashboard) consumes `wasteSummary()` + `listEvents()`; G13 (audit→CAPA) writes through `openEvent()`.
- **U-MACHINE-DOMAIN-ACADEMY** (today) → G4 reads `reportPath()` for skill-match in delegation; G11 surfaces the ladder in mobile portal.
- **U-EMPLOYEE-SHIFT-SWAP** (2026-05-25) → G3 (auto-scheduler) reads + proposes swap deltas.
- **U-MANAGER-DAILY-DASHBOARD** (2026-05-25) → G7 (dept rollup) is a per-dept variant.
- **U-CPM-SCHEDULING** (prior) → G3 wraps it as the auto-proposer.
- **U-PROSPECTIVE-CUSTOMER** (prior) → G9 ingests prospects into RFQ intake.
- **U-INVOICE-X12-PARSERS** (prior) → G9 also handles inbound vendor invoices for the order-side accounting.

---

## 9. Anti-patterns this assessment AVOIDS

- ❌ Re-building `ApprovalWorkflowEngine` — it exists; G5 composes it.
- ❌ Re-building `AuditEngine` — three audit engines exist; G7 + G13 compose them.
- ❌ Re-building `JobShopSchedulingEngine` or `CapacityPlanningEngine` — G3 wraps them.
- ❌ Re-building any payroll/GL/customer/quote engine — all exist.
- ❌ Building a "PortalDashboard" — the portals exist (`BusinessSuitePage` + `EmployeeMobilePortal` + `HotelPortalFrontend` + `ShopFloorLayout`); G11 + G12 add routes.
- ❌ Inventing a "DepartmentRollupEngine" *and* a separate "DepartmentEngine" — single engine (G1) holds both the entity and the rollup methods.
