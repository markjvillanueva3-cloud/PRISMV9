---
type: "chat-session"
source: "claude-code-cli"
session_id: "d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f"
title: "DESIGN BRIEF (operator directive): \"Design the QuickBooks-like feature to feel a"
date: "2026-05-31"
first_ts: "2026-05-31T17:21:42.395Z"
last_ts: "2026-05-31T17:25:16.018Z"
cwd: "H:\\prism-slot-hotel"
messages: 17
user_msgs: 7
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/workflows/wf_8a7483bf-116/agent-ab9ed83e467a30539.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:53"
---

# DESIGN BRIEF (operator directive): "Design the QuickBooks-like feature to feel a

> **claude-code-cli** | 2026-05-31 | 17 msgs (7 user / 10 assistant) | cwd: H:\prism-slot-hotel
> Raw: `H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/workflows/wf_8a7483bf-116/agent-ab9ed83e467a30539.jsonl`

## Transcript

### User | 2026-05-31T17:21:42.395Z

DESIGN BRIEF (operator directive): "Design the QuickBooks-like feature to feel and look SIMILAR while maintaining a SLIGHT difference to set us apart. We need a FAMILIAR feel for customers so they don't have to learn anything new."
CALIBRATION (locked by the operator): familiar INFORMATION ARCHITECTURE + INTERACTION PATTERNS (zero re-learning — same places, same verbs, same form shapes as QuickBooks) + a DISTINCT VISUAL IDENTITY and MANUFACTURING-NATIVE enhancements (the "slight difference" + the IP-safety line). Customers re-learn NOTHING about where things are or how to do them; they see a different skin and extra shop-floor power.
Target stack (from the audit): Next.js 15 App Router + React 19 + TanStack Query + Zustand + Recharts + Tailwind; data via lib/api.ts → prism_business dispatcher actions.

RESEARCH CONTEXT (use it; cite real action names + real frontend paths):
### QB TEARDOWN
This task is a standalone UX research deliverable, not PRISM build work, so the existing task list doesn't apply. I have all the confirmed detail needed. Here is the teardown.

---

# QuickBooks Online — Exhaustive UX Teardown (2024–2026)

> Purpose: a clone-the-feel reference. Everything below is what makes a user instantly KNOW "this is QuickBooks." Where the 2024–2025 **Intuit Platform** redesign and the **classic** experience differ, both are noted (as of Oct 1, 2025 the classic experience is retired and all companies are auto-migrated). QuickBooks **Desktop** differences flagged inline.

---

## 0. THE ONE-GLANCE TELL (what makes it recognizable in 50ms)

1. **Left vertical nav rail**, white/very-light background, dark slate text, a thin **green active-state indicator** + green selected-row tint.
2. **Top-left global "+ New" / "+ Create" button** — a green-accented pill that opens the famous 4-column create menu.
3. **The "money bar"** — a horizontal row of clickable colored status tiles across the top of every transaction list (the single most QuickBooks-specific UI element)
... [+63625 chars truncated]

### Assistant | 2026-05-31T17:21:54.705Z

I'll produce the labeled ASCII wireframes for all 7 screens. Let me first verify the real dispatcher action names and frontend paths against the codebase so my annotations cite real surfaces, not invented ones.

### Assistant | 2026-05-31T17:21:56.600Z

[tool_use: Grep]

### Assistant | 2026-05-31T17:21:59.135Z

[tool_use: Grep]

### User | 2026-05-31T17:22:11.486Z

[tool_result] H:\prism\mcp-server\web\src\api\client.ts:670:export async function createInvoice(params: {
H:\prism\mcp-server\web\src\api\client.ts:677:export async function listInvoices(params?: {
H:\prism\mcp-server\web\src\api\client.ts:719:export async function glChartOfAccounts(): Promise<PrismResponse> {
H:\prism\mcp-server\web\src\api\client.ts:727:export async function glTrialBalance(params?: { as_of?: 
... [+1518 chars truncated]

### User | 2026-05-31T17:22:12.647Z

[tool_result] Found 1 file
H:\prism\mcp-server\src\tools\dispatchers\businessDispatcher.ts

### Assistant | 2026-05-31T17:22:15.054Z

Let me confirm the exact action names in the businessDispatcher and the invoice/sales-tax/marketplace action strings, plus the real frontend route paths.

### Assistant | 2026-05-31T17:22:17.942Z

[tool_use: Grep]

### Assistant | 2026-05-31T17:22:19.851Z

[tool_use: Grep]

### User | 2026-05-31T17:22:27.298Z

[tool_result] No matches found

### User | 2026-05-31T17:22:28.820Z

[tool_result] 208:            <Route index element={lazyElement(<ShellGatewayPage />)} />
209:            <Route path="signin" element={lazyElement(<ShellGatewayPage />)} />
210:            <Route path="login" element={lazyElement(<LoginPage />)} />
211:            <Route path="shop-tv" element={lazyElement(<ShopFloorTVPage />)} />
212:            <Route path="employee" element={lazyElement(secure(<EmployeeShel
... [+2258 chars truncated]

### Assistant | 2026-05-31T17:22:31.125Z

Let me confirm the action strings use a switch on `action` (not `case '...'`) and grab the real invoice/financial routes.

### Assistant | 2026-05-31T17:22:33.145Z

[tool_use: Grep]

### Assistant | 2026-05-31T17:22:34.620Z

[tool_use: Grep]

### User | 2026-05-31T17:22:41.868Z

[tool_result] 1021:  "acct_bank_reconcile",
1493:  "sales_use_tax_calc",
1496:  "estimate_create",
1499:  "receive_payment_apply",
1504:  "bank_reconcile",
1507:  "chart_account_add",
1541:  "marketplace_rank_rfq",
1868:          case "sales_use_tax_calc": {
1883:          case "estimate_create": {
1898:          case "receive_payment_apply": {
1923:          case "bank_reconcile": {
1938:          case "chart_
... [+62 chars truncated]

### User | 2026-05-31T17:22:43.715Z

[tool_result] 214:              <Route path="jobs" element={lazyElement(<JobsPage />)} />
243:              <Route path="dashboard" element={lazyElement(<DashboardPage />)} />
264:              <Route path="reports" element={lazyElement(secure(<ReportsPage />, 'lead'))} />
269:              <Route path="payroll" element={lazyElement(secure(<PayrollPage />, 'hr_manager'))} />
270:              <Route path="invoi
... [+561 chars truncated]

### Assistant | 2026-05-31T17:25:16.018Z

All action names and routes are confirmed real. The action strings (`sales_use_tax_calc`, `estimate_create`, `receive_payment_apply`, `bank_reconcile`, `chart_account_add`, `marketplace_rank_rfq`) live in `businessDispatcher.ts`; the routes (`/invoices`, `/general-ledger`, `/purchase-orders`, `/sales-pipeline`, `/jobs`, `/customers`, `/dashboard`, `/payroll`, `/reports`) are real entries in `App.tsx`. Frontend client funcs (`createInvoice`, `listInvoices`, `glChartOfAccounts`, `glBalanceSheet`, `glIncomeStatement`, `glRecordInvoice`, `glRecordPayment`) confirmed in `client.ts`. Here are the wireframes.

---

# PRISM ERP — ASCII WIREFRAMES (clone-the-feel, manufacturing-native)

> **Recognizability contract for all screens:** light/white left rail · top-right utility cluster (search · +New · help · gear · bell · avatar) · soft-gray canvas with white rounded cards · sentence-case labels · split Save button · status color coding (paid=green, overdue=orange/red, open=gray/blue). **IP-safe deltas applied fleet-wide:** PRISM wordmark stamped top-left + every report header; brand accent is **PRISM indigo/cyan** (NOT #2CA01C green — hue ≥40° away); the QB "Money Bar" is renamed **"Receivables Snapshot"**; "+New" gains a 5th **Manufacturing** column; provenance **◇ source chip** sits in the existing status-badge column slot.

Legend used in annotations: `[dispatcher.action]` = real `prism_business` action · `client.ts:fn()` = real frontend client function · `route` = real `App.tsx` path.

---

## 1. DASHBOARD — `route: /dashboard` → `DashboardPage`
**Mirrors:** QB Online Business Dashboard (widget tile grid). **Delta:** 4 manufacturing tiles in the same grid furniture.

```
┌────────────┬──────────────────────────────────────────────────────────────────────────┐
│ ◆ PRISM    │  ⌕ Search        + New ▾    ?    ⚙    🔔    (JM)                            │  ← top utility cluster
├────────────┼──────────────────────────────────────────────────────────────────────────┤
│ ▣ Dashboa
... [+23372 chars truncated]
