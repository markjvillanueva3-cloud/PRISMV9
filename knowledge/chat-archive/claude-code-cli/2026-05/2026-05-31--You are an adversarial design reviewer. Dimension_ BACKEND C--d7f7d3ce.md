---
type: "chat-session"
source: "claude-code-cli"
session_id: "d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f"
title: "You are an adversarial design reviewer. Dimension: BACKEND COMPLETENESS / no orp"
date: "2026-05-31"
first_ts: "2026-05-31T17:26:56.302Z"
last_ts: "2026-05-31T17:30:18.178Z"
cwd: "H:\\prism-slot-hotel"
messages: 31
user_msgs: 11
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/workflows/wf_8a7483bf-116/agent-a3ecae3d6d02a2907.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:53"
---

# You are an adversarial design reviewer. Dimension: BACKEND COMPLETENESS / no orp

> **claude-code-cli** | 2026-05-31 | 31 msgs (11 user / 20 assistant) | cwd: H:\prism-slot-hotel
> Raw: `H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/workflows/wf_8a7483bf-116/agent-a3ecae3d6d02a2907.jsonl`

## Transcript

### User | 2026-05-31T17:26:56.302Z

You are an adversarial design reviewer. Dimension: BACKEND COMPLETENESS / no orphans.
Cross-check the design's screens/actions against the landed prism_business backend surface in the research context. Is EVERY major landed action (estimate/sales_order/credit_memo/receive_payment/statement/finance_charge/vendor_credit/bill_payment/bank_recon/bank_feed/bank_deposit/chart_of_accounts/journal_entry/financial_report/budget/list_management/item_master/inventory_adjust/payroll_liability/form_1099/asset_depreciation/marketplace_*) reachable from a screen? Is any screen designed with NO backing action (a paper UI)? Flag both orphan actions and orphan screens.

THE DESIGN UNDER REVIEW:
### IA & NAVIGATION
The task list is prior build work, not this UX deliverable — no update needed. I have everything verified: the real stack (Vite + React Router v7, base `/app/*`), the real route table, the real `prism_business` action names, and the real `client.ts` method names. Now I'll synthesize the IA & Navigation design.

---

# PRISM ERP — Information Architecture & Navigation

**Stack reality check (verified, not the audit's claim):** the frontend is **Vite + React 19 + React Router v7**, not Next.js. Routes are flat children under the secure shell at **`/app/*`** (`mcp-server/web/src/App.tsx`); nav is data-driven from **`mcp-server/web/src/components/shell/shellCatalog.ts`** (`NAV_SECTIONS`), rendered by `Layout.tsx`. The data client is **`mcp-server/web/src/api/client.ts`** (HTTP bridge `/api/v1` → `prism_business`), not `lib/api.ts`. All paths and actions below are the verified real names. Where I reference a route as `app/<x>`, that is the React Router child path; the live URL is `/app/<x>`.

**Calibration applied:** QB's *grouping, ordering, and verbs* are mirrored 1:1 (zero re-learning). The "slight difference" is (1) a distinct teal/indigo identity instead of QB green, (2) two QB-coined terms swapped for the cross-platform-generic alternatives the legal arm flagged (`Estimate
... [+139805 chars truncated]

### Assistant | 2026-05-31T17:27:09.690Z

I'll review this design for backend completeness, cross-checking every landed `prism_business` action against the screens. Let me first verify the ground truth against the actual dispatcher.

### Assistant | 2026-05-31T17:27:11.539Z

[tool_use: Grep]

### User | 2026-05-31T17:27:15.320Z

[tool_result] No matches found

### Assistant | 2026-05-31T17:27:18.928Z

The grep found nothing — let me verify the dispatcher exists and find its actual location and action literals.

### Assistant | 2026-05-31T17:27:20.369Z

[tool_use: Bash]

### Assistant | 2026-05-31T17:27:21.351Z

[tool_use: Grep]

### User | 2026-05-31T17:27:25.739Z

[tool_result] mcp-server\src\tools\dispatchers\businessDispatcher.ts:441

Found 441 total occurrences across 1 file.

### User | 2026-05-31T17:27:30.600Z

[tool_result] H:/prism-slot-hotel/mcp-server/src/tools/dispatchers/businessDispatcher.ts  136.3K
---WC---
3515

### Assistant | 2026-05-31T17:27:34.411Z

The dispatcher here has 441 cases (the stale worktree count the audit mentions was merged to MAIN with 879). Critically, the grep for the specific action literals found NOTHING. This confirms the design's own caveat. Let me check what action literals actually exist for the QB-parity surface and marketplace.

### Assistant | 2026-05-31T17:27:39.711Z

[tool_use: Bash]

### User | 2026-05-31T17:27:47.896Z

[tool_result] /usr/bin/grep: -P supports only unibyte and UTF-8 locales
0
=== QB-PARITY + MARKETPLACE PROBES ===
MISSING receive_payment_apply
MISSING estimate_create
MISSING sales_order_create
MISSING credit_memo_create
MISSING customer_statement_generate
MISSING finance_charge_compute
MISSING vendor_credit_create
MISSING bill_payment_run
MISSING bank_reconcile
MISSING bank_feed_import
MISSING bank_deposit_rec
... [+762 chars truncated]

### Assistant | 2026-05-31T17:27:50.042Z

The `-P` flag failed (locale issue) so the action list is empty — the probe is unreliable. Let me use a portable extraction and look at the actual case structure.

### Assistant | 2026-05-31T17:27:53.268Z

[tool_use: Bash]

### User | 2026-05-31T17:28:00.761Z

[tool_result] TOTAL ACTIONS: 393
=== SAMPLE (first 40) ===
accounting_audit
accounting_validate
acct_bank_reconcile
acct_cost_to_complete
acct_multi_period_compare
acct_quickbooks_sync
acct_variance_analysis
acct_wip_valuation
actual_cost_calculate
actual_cost_forecast
actual_cost_margin_alerts
actual_cost_profitability
actual_cost_trend
actual_cost_variance
additive_compare_technologies
additive_list_materials
... [+94 chars truncated]

### Assistant | 2026-05-31T17:28:02.812Z

Now I have 393 real action literals. Let me probe the QB-parity + marketplace set against this real list.

### Assistant | 2026-05-31T17:28:09.516Z

[tool_use: Bash]

### User | 2026-05-31T17:28:20.820Z

[tool_result] === QB-PARITY ACTIONS (design claims LANDED) ===
MISSING receive_payment_apply
MISSING estimate_create
MISSING sales_order_create
MISSING credit_memo_create
MISSING customer_statement_generate
MISSING finance_charge_compute
MISSING vendor_credit_create
MISSING bill_payment_run
MISSING bank_reconcile
MISSING bank_feed_import
MISSING bank_deposit_record
MISSING chart_account_add
FOUND   gl_journal_e
... [+1207 chars truncated]

### Assistant | 2026-05-31T17:28:25.296Z

The task list confirms these engines were built. But the dispatcher in THIS worktree (441 cases / 393 literals) is the STALE copy. The design claims the 879-action MAIN dispatcher was "golf-merged." Let me confirm whether this is purely a worktree-staleness issue or a genuine gap, by checking the actual case labels for the marketplace/QB-parity engines and searching how these engines are actually invoked.

### Assistant | 2026-05-31T17:28:31.303Z

[tool_use: Bash]

### User | 2026-05-31T17:28:42.438Z

[tool_result] === git state of THIS worktree ===
54d1ce67ce [hotel] [NETPLAT-P1]/U-P1-05: SupplierOnboardingEngine (supply-side acquisition gate, 22 tests)
slot/hotel

=== Is there a MAIN/other businessDispatcher with the 879 actions? ===
d19c23bf31 LATHE-MASTER/U-LTH58-62: PX AGI Substrate — bridge + learning + KG + safety + forge-triple
bb8c5707d5 LATHE-MASTER/U-LTH54-55-56-57: P5-S3+S4 — BI + Orchestrator + 
... [+1196 chars truncated]

### Assistant | 2026-05-31T17:28:47.344Z

This is now conclusive. This worktree (`slot/hotel`, branch `slot/hotel`, last commit `54d1ce67ce [hotel] [NETPLAT-P1]/U-P1-05`) is the STALE worktree. The `businessDispatcher.ts` here contains NONE of the 23 QB-parity actions and NONE of the 13 marketplace actions — only `quote_estimate`, `multi_process_estimate`, `acct_bank_reconcile`, `gl_income_statement`, etc. The design's entire route→action map is written against a dispatcher that does not exist in the tree the design files point at.

Let me verify the design's "verified ground truth" claim about `client.ts` methods, and check whether the producer chain is real, since the design's wireframes lean heavily on `client.ts` line citations.

### Assistant | 2026-05-31T17:28:51.955Z

[tool_use: Bash]

### User | 2026-05-31T17:28:58.583Z

[tool_result] client.ts exists: YES
=== client.ts methods cited in design ===
FOUND   createInvoice
FOUND   listInvoices
FOUND   glChartOfAccounts
FOUND   glBalanceSheet
FOUND   glIncomeStatement
FOUND   glTrialBalance
FOUND   glRecordInvoice
FOUND   glRecordPayment
FOUND   glRecordPayroll
FOUND   glRecordPurchase
FOUND   glJournalEntry
FOUND   quoteEstimate
FOUND   quoteInstant
FOUND   customerList
FOUND   cus
... [+295 chars truncated]

### Assistant | 2026-05-31T17:29:02.313Z

Now I have the full picture. The `client.ts` methods are a mixed bag too — `arAgingReport`, `invoiceAging`, `cashFlowProject`, `financialReportSalesByCustomer`, `profitabilityAnalyze` are all cited in the design as existing client methods but DON'T exist. Let me do one final check: confirm whether the QB-parity engines exist on disk at all in this tree (to distinguish "engine exists but unwired in this worktree" from "doesn't exist anywhere"), since that changes the severity framing.

### Assistant | 2026-05-31T17:29:06.850Z

[tool_use: Bash]

### User | 2026-05-31T17:29:13.847Z

[tool_result] === QB-parity engine files on disk in THIS tree ===
ON-DISK  ReceivePaymentEngine -> ./ReceivePaymentEngine.ts
ON-DISK  EstimateEngine -> ./EstimateEngine.ts
ON-DISK  SalesOrderEngine -> ./SalesOrderEngine.ts
ON-DISK  CreditMemoEngine -> ./CreditMemoEngine.ts
ON-DISK  CustomerStatementEngine -> ./CustomerStatementEngine.ts
ON-DISK  FinanceChargeDunningEngine -> ./FinanceChargeDunningEngine.ts
ON-D
... [+1041 chars truncated]

### Assistant | 2026-05-31T17:29:24.550Z

This is the complete picture. Now I can render a precise verdict.

**Key findings synthesized:**
1. The 19 QB-parity engine FILES exist on disk in this worktree, BUT none of their action literals are wired into this worktree's `businessDispatcher.ts` (which only has the old `quote_estimate`/`acct_bank_reconcile` names). The wiring lives only in the MAIN dispatcher (the 879-action one the design references but which is NOT in this tree).
2. The 5 marketplace engines (`MarketplaceMatchOrchestratorEngine`, `MarketplaceFinalRankEngine`, `SupplierReputationEngine`, `GeoLogisticsEngine`, `MarketplaceSeedingEngine`) are ABSENT from this tree entirely — and the design's Marketplace screens (7, supplier-match, logistics) depend entirely on them.
3. Four `client.ts` methods the design cites as "verified real" (`arAgingReport`, `invoiceAging`→actually different, `cashFlowProject`, `financialReportSalesByCustomer`, `profitabilityAnalyze`) do NOT exist.

The design's own "Differentiators" section caught #2 (the marketplace caveat) honestly. But the IA & Wireframes sections did NOT — they assert the action names as "verified real" when they are not in the tree the design's file paths point at.

For the assigned dimension (backend completeness / orphans): the design's orphan-MAPPING logic is sound — every screen has an intended action, and the design correctly flags orphan-screens (Manufacturing-native) and the "needs client.ts wrapper" gaps. The problem is the inverse: the design overcounts backend reachability by treating plan-named actions as landed.

### Assistant | 2026-05-31T17:30:05.223Z

[tool_use: StructuredOutput]

### User | 2026-05-31T17:30:07.189Z

[tool_result] Structured output provided successfully

### Assistant | 2026-05-31T17:30:18.178Z

I've completed the adversarial backend-completeness review and returned the verdict via StructuredOutput.

**Verdict: PASS_WITH_FIXES**

The headline: the design's orphan-*mapping logic* is sound (every screen has an intended action; orphan-screens and orphan-actions are partly flagged), but its *backend reachability claims are overcounted against the wrong tree*.

Hard evidence I verified against `H:/prism-slot-hotel/mcp-server/src/tools/dispatchers/businessDispatcher.ts` (the file the design's own path block points at):
- This worktree's dispatcher has 441 case statements / 393 unique action literals. Of the 23 QB-parity actions the design calls "LANDED," only **1** (`gl_journal_entry`) exists here. The other 22 (`receive_payment_apply`, `estimate_create`, `bank_reconcile`, `sales_use_tax_calc`, etc.) are absent — this tree still uses the old names (`quote_estimate`, `acct_bank_reconcile`).
- Mitigating: all 19 QB-parity *engine files* are on disk here, so it's a wiring-staleness problem, not vapor. But an implementer editing this tree binds to handlers that 404.
- The 13 marketplace actions are all missing AND 5 marketplace engines (`MarketplaceMatchOrchestratorEngine`, etc.) are absent from disk entirely. Wireframe 7 + supplier-match + logistics/escrow are **paper UIs in this tree**. The Differentiators section caveats this honestly; the IA section and Wireframe 7 do not (they cite a fabricated `businessDispatcher.ts:1541` — the file is only 3515 lines).
- 5 `client.ts` methods cited as "verified real" don't exist: `arAgingReport`, `cashFlowProject`, `financialReportSalesByCustomer`, `profitabilityAnalyze`, `invoiceAging`-as-method.
- True backend→screen orphans the design missed: `acct_wip_valuation`, `acct_variance_analysis`, `acct_multi_period_compare`, the `actual_cost_*` analytics family, and `additive_*` (the `/additive` route was silently dropped from the new IA).
