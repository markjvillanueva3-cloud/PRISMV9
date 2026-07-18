---
type: "chat-session"
source: "claude-code-cli"
session_id: "d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f"
title: "You are a UX analyst. Produce an EXHAUSTIVE teardown of QuickBooks Online's UX ("
date: "2026-05-31"
first_ts: "2026-05-31T17:16:34.249Z"
last_ts: "2026-05-31T17:21:41.353Z"
cwd: "H:\\prism-slot-hotel"
messages: 22
user_msgs: 9
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/workflows/wf_8a7483bf-116/agent-aa83e40f0975b1674.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:53"
---

# You are a UX analyst. Produce an EXHAUSTIVE teardown of QuickBooks Online's UX (

> **claude-code-cli** | 2026-05-31 | 22 msgs (9 user / 13 assistant) | cwd: H:\prism-slot-hotel
> Raw: `H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/workflows/wf_8a7483bf-116/agent-aa83e40f0975b1674.jsonl`

## Transcript

### User | 2026-05-31T17:16:34.249Z

You are a UX analyst. Produce an EXHAUSTIVE teardown of QuickBooks Online's UX (also note QuickBooks Desktop where it differs) — the things that make a user instantly KNOW they are in QuickBooks. Use WebSearch to confirm current (2024-2026) QBO UX. Cover, concretely:
1. LEFT NAV: every primary nav item in order (Dashboard/Bookmarks, Banking/Transactions, Sales [Invoices, Customers, Products & Services], Expenses [Vendors, Bills], Projects, Payroll, Time, Reports, Taxes, Mileage, Accounting [Chart of Accounts, Reconcile], My Accountant, Apps) and what lives under each.
2. The "+ New" CREATE menu: its column structure (Customers / Vendors / Employees / Other) and every item in each column.
3. DASHBOARD tiles: each card (Invoices status bar, Expenses donut, Profit & Loss, Sales line, Bank accounts with "in QuickBooks vs bank", Cash flow) — what viz + what data.
4. TRANSACTION FORM anatomy (invoice/bill): header layout (customer top-left; date/terms/due-date top-right; #; billing address), the line-item GRID columns (Product/Service, Description, Qty, Rate, Amount, Tax, class/location), subtotal/discount/tax/total placement, the split "Save and send / Save and close" button, attachments, message box.
5. LIST page pattern: the "money bar" of clickable status tiles at top (e.g. Estimates | Unbilled | Overdue | Open invoices | Paid), the table columns, filters, batch actions, inline row actions (Receive payment / Send reminder / Print).
6. ACCOUNT REGISTER (bank/ledger spreadsheet) pattern.
7. REPORT CENTER: categories + the classic reports (P&L, Balance Sheet, Cash Flow, Trial Balance, A/R & A/P Aging, Sales by Customer/Product, General Ledger).
8. TOP BAR: search, +New, help (?), gear/settings menu contents, notifications, company switcher.
9. VISUAL LANGUAGE: exact brand green (Intuit green ~#2CA01C), nav treatment, content background, typography (Avenir Next / system sans), spacing density, icon style, the "card" aesthetic, empty states.
10. SIGNATURE INTERACTIONS: aut
... [+246 chars truncated]

### Assistant | 2026-05-31T17:16:44.614Z

I'll research current QuickBooks Online UX to confirm the 2024-2026 design, then produce the exhaustive teardown.

### Assistant | 2026-05-31T17:16:45.620Z

[tool_use: WebSearch]

### Assistant | 2026-05-31T17:16:45.993Z

[tool_use: WebSearch]

### User | 2026-05-31T17:17:14.457Z

[tool_result] Web search results for query: "QuickBooks Online "+ New" create menu columns Customers Vendors Employees Other list of items"

I'll search for that information about the QuickBooks Online "+ New" menu structure.

Links: [{"title":"Add, sort, duplicate, and edit lists - QuickBooks - Intuit","url":"https://quickbooks.intuit.com/learn-support/en-us/help-article/customer-lists/add-customer-employee-ve
... [+4395 chars truncated]

### User | 2026-05-31T17:17:18.146Z

[tool_result] Web search results for query: "QuickBooks Online left navigation menu items 2024 2025 Bookmarks Transactions Sales Expenses redesign"

I'll search for information about the QuickBooks Online left navigation menu redesign.

Links: [{"title":"How to Customize the New QuickBooks Online Menu (And Actually Find Your Way Around Again) | My Cloud Bookkeeping | QuickBooks Expert","url":"https://www.myclou
... [+5627 chars truncated]

### Assistant | 2026-05-31T17:17:22.130Z

[tool_use: WebFetch]

### Assistant | 2026-05-31T17:17:23.270Z

[tool_use: WebSearch]

### Assistant | 2026-05-31T17:17:20.732Z

Let me get the authoritative detail on the +New menu items, dashboard tiles, and the transaction form anatomy.

### User | 2026-05-31T17:17:55.263Z

[tool_result] Web search results for query: "QuickBooks Online invoice form layout customer date terms due date line items Product/Service Description Qty Rate Amount Tax save and send save and close"

I'll search for information about QuickBooks Online invoice form layout.

Links: [{"title":"Create an Invoice in QuickBooks Online - Instructions","url":"https://www.teachucomp.com/create-an-invoice-in-quickbooks
... [+6222 chars truncated]

### User | 2026-05-31T17:18:31.799Z

[tool_result] timeout of 60000ms exceeded

### Assistant | 2026-05-31T17:18:34.418Z

Let me confirm the dashboard tiles, the list-page money bar, and the gear/settings menu contents.

### Assistant | 2026-05-31T17:18:35.489Z

[tool_use: WebSearch]

### Assistant | 2026-05-31T17:18:35.834Z

[tool_use: WebSearch]

### User | 2026-05-31T17:19:06.184Z

[tool_result] Web search results for query: "QuickBooks Online dashboard widgets Invoices Expenses Profit and Loss Sales Bank accounts cash flow donut chart 2024"

I'll search for information about QuickBooks Online dashboard widgets.

Links: [{"title":"View your business dashboard details - QuickBooks - Intuit","url":"https://quickbooks.intuit.com/learn-support/en-us/help-article/product-setup/business-dashboa
... [+5315 chars truncated]

### User | 2026-05-31T17:19:09.780Z

[tool_result] Web search results for query: "QuickBooks Online invoices list page status tabs Estimates Unbilled activity Overdue Open Paid money bar columns"

I'll search for information about the QuickBooks Online invoices list page and its status tabs and features.

Links: [{"title":"View sales transactions - QuickBooks - Intuit","url":"https://quickbooks.intuit.com/learn-support/en-us/help-article/journal-p
... [+5399 chars truncated]

### Assistant | 2026-05-31T17:19:11.966Z

I have enough confirmed detail. Let me do two final searches on the gear/settings menu and the visual/brand language to nail the recognizability specifics.

### Assistant | 2026-05-31T17:19:13.306Z

[tool_use: WebSearch]

### Assistant | 2026-05-31T17:19:13.713Z

[tool_use: WebSearch]

### User | 2026-05-31T17:19:41.283Z

[tool_result] Web search results for query: "QuickBooks Online gear settings menu columns Your Company Lists Tools Profile Account and settings chart of accounts"

I'll search for information about the QuickBooks Online gear/settings menu structure.

Links: [{"title":"Find the Gear Icon in QuickBooks Online and Desktop","url":"https://www.reconcilebooks.com/gear-icon-in-quickbooks/"},{"title":"Where is the Gear
... [+5571 chars truncated]

### User | 2026-05-31T17:19:42.791Z

[tool_result] Web search results for query: "Intuit QuickBooks brand green hex color #2CA01C typography Avenir design system green nav bar"

I'll search for information about Intuit QuickBooks brand colors and design system.

Links: [{"title":"Color","url":"https://design.intuit.com/quickbooks/brand/design-foundations/color/"},{"title":"Co-branding design guidelines and assets for 3rd parties Sep 2025","url":"h
... [+6240 chars truncated]

### Assistant | 2026-05-31T17:21:41.353Z

This task is a standalone UX research deliverable, not PRISM build work, so the existing task list doesn't apply. I have all the confirmed detail needed. Here is the teardown.

---

# QuickBooks Online — Exhaustive UX Teardown (2024–2026)

> Purpose: a clone-the-feel reference. Everything below is what makes a user instantly KNOW "this is QuickBooks." Where the 2024–2025 **Intuit Platform** redesign and the **classic** experience differ, both are noted (as of Oct 1, 2025 the classic experience is retired and all companies are auto-migrated). QuickBooks **Desktop** differences flagged inline.

---

## 0. THE ONE-GLANCE TELL (what makes it recognizable in 50ms)

1. **Left vertical nav rail**, white/very-light background, dark slate text, a thin **green active-state indicator** + green selected-row tint.
2. **Top-left global "+ New" / "+ Create" button** — a green-accented pill that opens the famous 4-column create menu.
3. **The "money bar"** — a horizontal row of clickable colored status tiles across the top of every transaction list (the single most QuickBooks-specific UI element).
4. **The gear icon, top-right**, opening a 4-column settings menu (Your Company / Lists / Tools / Profile).
5. **Card aesthetic** — soft white cards with subtle shadow and rounded corners on a light-gray (`#F4F5F8`-ish) canvas.
6. **Intuit green `#2CA01C`** used sparingly as the accent (CTAs, active states, positive numbers, the logo) — never as a full nav background.
7. **Avenir Next for Intuit** typeface + **sentence case** everywhere ("Receive payment," not "Receive Payment").

---

## 1. LEFT NAV — every primary item, in order

### Classic experience (still the mental model most users have)
Top → bottom, vertical rail:

1. **Dashboard** — Home overview (widgets/tiles).
2. **Banking** *(a.k.a. Transactions → Bank transactions)* — sub: **Bank transactions**, **Rules**, **Receipts**, **App transactions**, **Tags**.
3. **Sales** — sub: **Overview**, **All sales**, **Invoices**, **Estimate
... [+19934 chars truncated]
