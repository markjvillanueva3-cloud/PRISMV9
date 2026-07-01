---
type: "chat-session"
source: "claude-code-cli"
session_id: "d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f"
title: "You are an adversarial design reviewer. Dimension: FAMILIARITY / zero-relearning"
date: "2026-05-31"
first_ts: "2026-05-31T17:26:56.300Z"
last_ts: "2026-05-31T17:28:25.584Z"
cwd: "H:\\prism-slot-hotel"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/workflows/wf_8a7483bf-116/agent-a650cce7eb8b0d9af.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:53"
---

# You are an adversarial design reviewer. Dimension: FAMILIARITY / zero-relearning

> **claude-code-cli** | 2026-05-31 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism-slot-hotel
> Raw: `H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/workflows/wf_8a7483bf-116/agent-a650cce7eb8b0d9af.jsonl`

## Transcript

### User | 2026-05-31T17:26:56.300Z

You are an adversarial design reviewer. Dimension: FAMILIARITY / zero-relearning.
Scrutinize the design AS A QUICKBOOKS USER. Would they find Invoices, create one, read the dashboard, and reconcile WITHOUT learning anything new? Flag every spot where a QB user's muscle memory would FAIL (wrong label, moved location, changed verb, unfamiliar form shape). The operator's #1 requirement is zero re-learning — be ruthless.

THE DESIGN UNDER REVIEW:
### IA & NAVIGATION
The task list is prior build work, not this UX deliverable — no update needed. I have everything verified: the real stack (Vite + React Router v7, base `/app/*`), the real route table, the real `prism_business` action names, and the real `client.ts` method names. Now I'll synthesize the IA & Navigation design.

---

# PRISM ERP — Information Architecture & Navigation

**Stack reality check (verified, not the audit's claim):** the frontend is **Vite + React 19 + React Router v7**, not Next.js. Routes are flat children under the secure shell at **`/app/*`** (`mcp-server/web/src/App.tsx`); nav is data-driven from **`mcp-server/web/src/components/shell/shellCatalog.ts`** (`NAV_SECTIONS`), rendered by `Layout.tsx`. The data client is **`mcp-server/web/src/api/client.ts`** (HTTP bridge `/api/v1` → `prism_business`), not `lib/api.ts`. All paths and actions below are the verified real names. Where I reference a route as `app/<x>`, that is the React Router child path; the live URL is `/app/<x>`.

**Calibration applied:** QB's *grouping, ordering, and verbs* are mirrored 1:1 (zero re-learning). The "slight difference" is (1) a distinct teal/indigo identity instead of QB green, (2) two QB-coined terms swapped for the cross-platform-generic alternatives the legal arm flagged (`Estimate→Quote`, `Classes/Locations→Tracking categories`), and (3) one extra nav group + one extra `+New` column that are pure manufacturing additions slotted into QB's exact furniture.

---

## 1. LEFT NAV — item-for-item

White/light rail, dark-
... [+139566 chars truncated]

### Assistant | 2026-05-31T17:27:17.288Z

I'll review this design as a QuickBooks user testing whether my muscle memory survives. Let me trace the four canonical tasks the operator named: find Invoices, create one, read the dashboard, and reconcile.

Let me work through each against what a QB user's hands and eyes expect.

**Task 1: Find Invoices**

A QB user knows: click **Sales** in the left rail → **Invoices** sub-item. In this design, the left nav has `Sales ▸ (group) → Invoices`. That works. But note the design has *two* contradictory nav specs:
- The IA section's left nav lists 9+ groups: Dashboard, Sales, Manufacturing, Expenses, Banking, Projects, Payroll, Reports, Taxes, Accounting.
- The wireframe (Dashboard, screen 1) renders the actual rail as: `Dashboard, Sales, Expenses, Banking, Jobs, Reports, Taxes, Accounting, Marketplace`.

The wireframe rail shows **"Jobs"** and **"Marketplace"** as top-level items — but the IA spec says Manufacturing is a *group* containing Jobs, and Marketplace lives *inside* Manufacturing. These don't match. A QB user faced with the wireframe rail sees no "Manufacturing" group at all and a bare "Jobs" entry where QB has no analog. This is an internal inconsistency that will surface as a wrong-location failure depending on which spec ships.

**Task 2: Create an invoice**

QB muscle memory: `+ New` (top of rail) → Customers column → Invoice (first item). The design preserves `+New` position, the Customers column, and Invoice as row 1. Good. The split-Save button, 4-tab layout, blue header, line grid, lower-right totals — all faithfully mirrored.

**Task 3: Read the dashboard**

QB user scans for the **Invoices money bar**, the **Expenses donut**, **P&L**, **Bank accounts (In QuickBooks vs Bank balance)**. The dashboard wireframe keeps all of these. The "In PRISM | Bank" relabel is a necessary IP change but reads identically.

**Task 4: Reconcile**

This is where I need to look hardest — the design routes Reconcile through *three different places*. Let me catalog the fami
... [+27 chars truncated]

### Assistant | 2026-05-31T17:28:13.231Z

[tool_use: StructuredOutput]

### User | 2026-05-31T17:28:17.145Z

[tool_result] Structured output provided successfully

### Assistant | 2026-05-31T17:28:25.584Z

I've completed the familiarity review and submitted my verdict: **PASS_WITH_FIXES**.

The design's core promise holds — a QuickBooks user can create an invoice, read the dashboard, and operate the +New tray with intact muscle memory. The faithful mirroring of the 4-tab invoice form, split-Save button, dashboard tile grid, and bank-feed Review loop is genuinely strong.

But there are two **P0 (must-fix-before-build)** failures, both internal contradictions rather than design choices:

1. **Reconcile is triple-routed and self-contradictory** — the spec literally hedges `app/banking?tab=reconcile` "or" `app/reconcile`, and surfaces it from three different entry points. QB has exactly one Reconcile destination; the clone must too.

2. **The left-nav ships in two incompatible shapes** — the IA prose rail (with a "Manufacturing" group) doesn't match the Dashboard wireframe rail (bare "Jobs" and "Marketplace" top-level, no Manufacturing group, no Projects/Payroll). A QB user can't build muscle memory against a rail that exists in two forms.

The P1/P2 findings are real but bounded: missing QB +New verbs (Check, Refund receipt), the reshaped Expenses group, the "Quote" term collision across three nav locations, and the honest acknowledgment that the IP-required Money Bar → Receivables Snapshot change is the one genuine visual-recognition cost the design shouldn't hand-wave as "zero relearning."
