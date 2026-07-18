# PRISM v9 -- Machine Shop Owner Business Review

## Review Scope
Six core business pages (QuoteBuilderPage, JobsPage, SchedulingPage, InvoicesPage, FinancialAnalysisPage, JobProfitabilityPage) plus the sidebar navigation (AppShell).

---

## 1. CAN I QUOTE A JOB QUICKLY (< 5 MINUTES)?

**Verdict: Almost, but not production-ready.**

### What works
- The Quote Builder form is compact: material, operation, dimensions, complexity, tolerance, quantity -- all on one screen.
- "Generate Estimate" gives unit price, total, cycle time, confidence, and a cost breakdown (material, machining, setup, tooling, overhead, margin) with visual bars.
- "Compare Materials" is genuinely useful -- side-by-side pricing across 5 materials with tool-life factors is something most shop software charges extra for.
- Price-break table (quantity discount tiers) is a strong differentiator.

### What is broken or missing

| # | SEVERITY | Finding |
|---|----------|---------|
| Q-1 | **CRITICAL** | **Material and Operation are free-text fields, not dropdowns.** A shop quoting 20 jobs/day cannot type "6061-T6" every time -- and a typo ("6061-T6" vs "6061 T6") will produce wrong pricing or an API error. These MUST be searchable dropdowns populated from the shop's material library and operation catalog. |
| Q-2 | **CRITICAL** | **No customer field on the quote.** A quote without a customer name/company attached is useless. I cannot track which customer received which quote, and I cannot convert a quote to a job without re-entering customer info. |
| Q-3 | **HIGH** | **No quote number, no save, no revision history.** Quotes evaporate when you navigate away. If a customer calls back about "that quote from last Tuesday," I have nothing to look up. Every competitor (JobBOSS, ProShop, Paperless Parts) has persistent quote records with revision tracking. |
| Q-4 | **HIGH** | **No "Convert Quote to Job" button.** The quote and job pages are completely disconnected. After quoting, I have to manually re-enter everything on the Jobs > Create page. This doubles data entry and introduces errors. |
| Q-5 | **HIGH** | **"Generate Quote Doc" renders raw JSON.** Line 238-240 literally does `JSON.stringify(quoteDoc, null, 2)` inside a `<pre>` tag. No shop owner can hand a customer a page of JSON. This needs to produce a formatted PDF with company logo, terms, validity date, and line items. |
| Q-6 | **MEDIUM** | **No multi-line-item quotes.** Real jobs have multiple operations (mill body, drill 4 holes, deburr, anodize). The form only supports a single operation. Competitors allow N line items per quote. |
| Q-7 | **MEDIUM** | **No outside-processing (secondary ops) in the quote.** Heat treat, plating, anodizing, grinding sent out -- these are standard cost components that are missing from the estimate breakdown. |
| Q-8 | **LOW** | **Hardcoded material list in Compare Materials** (line 54: `['6061-T6', '7075-T6', '304 Stainless', '4140 Steel', 'Ti-6Al-4V']`). Should be configurable per shop. Many shops run Inconel, Delrin, brass, copper regularly. |

---

## 2. CAN I SEE MY SHOP'S FINANCIAL HEALTH AT A GLANCE?

**Verdict: No. There is no consolidated financial dashboard.**

| # | SEVERITY | Finding |
|---|----------|---------|
| F-1 | **CRITICAL** | **No single "Financial Dashboard" landing page.** To understand my shop's health right now, I have to visit 4+ separate pages (Invoices, Financial Analysis, Job Profitability, Job Dashboard for pipeline). Competitors show a single-screen executive summary: revenue this month, outstanding AR, cash position, top 5 jobs by margin, overdue invoices. |
| F-2 | **CRITICAL** | **No Accounts Receivable aging report.** The Invoices page shows total outstanding as one number but does not break it down by 0-30, 31-60, 61-90, 90+ days. This is the #1 thing a shop owner checks every Monday morning. |
| F-3 | **HIGH** | **Financial Analysis page is capital-budgeting theory, not daily operations.** NPV, IRR, and breakeven calculators are useful maybe once a year when evaluating a new machine purchase. They are NOT what a shop owner needs daily. Daily needs: cash flow forecast, revenue vs. expense this period, margin trends, on-time delivery rate. |
| F-4 | **HIGH** | **No P&L (Profit and Loss) statement view.** Even a simple monthly P&L -- revenue, COGS (material + labor + overhead), gross profit, SG&A, net profit -- is missing entirely. |
| F-5 | **HIGH** | **Job Profitability requires manual job-ID lookup.** I have to know and type a job ID to see profitability. There is no aggregate view ("show me all jobs this month sorted by margin"). The Margin Alerts tab is the closest thing, but it only shows jobs below threshold, not a ranked list of all jobs. |
| F-6 | **MEDIUM** | **Breakeven analysis is duplicated.** It appears on both the Financial Analysis page AND the Job Profitability page with identical hardcoded defaults ($50K fixed, $150 price, $85 variable). This confuses the user and wastes sidebar space. |

---

## 3. IS JOB TRACKING INTUITIVE (QUOTE -> ORDER -> SCHEDULE -> PRODUCE -> SHIP -> INVOICE)?

**Verdict: The statuses exist but the flow is disconnected.**

| # | SEVERITY | Finding |
|---|----------|---------|
| J-1 | **CRITICAL** | **No link between Quote and Job.** Quoting and Job Creation are entirely separate workflows. There is no "Accept Quote" -> "Create Job" conversion. The standard lifecycle (RFQ -> Quote -> Order -> Job -> Schedule -> Ship -> Invoice) is broken at the very first transition. |
| J-2 | **CRITICAL** | **Status changes have no guardrails.** The Jobs page allows ANY status to change to ANY other status via a dropdown (line 150-156). I can change a "quoted" job directly to "shipped" or "invoiced" without it ever going through production. Real ERP systems enforce a state machine: quoted -> planned -> in_progress -> complete -> shipped -> invoiced. |
| J-3 | **HIGH** | **No link between Job and Invoice.** Creating an invoice requires typing a job ID manually. There is no "Invoice This Job" button on the Jobs page, and no indication on the Jobs table of whether a job has been invoiced. |
| J-4 | **HIGH** | **Job Summary renders raw JSON** (line 195-196: `JSON.stringify(summaryData, null, 2)`). Same problem as the quote doc. A shop foreman looking up a job summary gets unformatted JSON, not a readable job traveler. |
| J-5 | **HIGH** | **No job traveler / work order print.** The #1 physical artifact in any machine shop is the traveler that follows the part through the shop. There is no print view, no traveler template, no routing sheet. |
| J-6 | **MEDIUM** | **Job creation form missing critical fields.** No PO number (how customers reference the order), no revision level, no quantity shipped vs. ordered tracking, no notes/attachments. |
| J-7 | **MEDIUM** | **No progress tracking within a job.** There is no "operation routing" within a job -- just a single status. Real jobs have 5-15 operations, each trackable: Op 10 Saw, Op 20 Mill, Op 30 Drill, Op 40 Deburr, Op 50 Inspect. |

---

## 4. ARE THE FINANCE PAGES USEFUL FOR DAILY OPERATIONS?

**Verdict: The Financial Analysis page is academic; Job Profitability is closer but incomplete.**

| # | SEVERITY | Finding |
|---|----------|---------|
| D-1 | **HIGH** | **Financial Analysis (NPV/IRR) is misplaced in daily workflow.** These are capital budgeting tools. They should be under an "Admin > Capital Planning" section, not front-and-center in "Finance." Putting NPV/IRR next to Invoices signals that the designers did not understand job-shop financial workflows. |
| D-2 | **HIGH** | **No labor cost tracking integration.** The Job Profitability page shows cost breakdown categories but there is no link to the timecards/shop-clock system. Actual labor hours * loaded rate should flow automatically into job costing. This is the core of ProShop's value proposition. |
| D-3 | **HIGH** | **Cost Forecast uses hardcoded "6 periods" (line 25).** No ability to change the forecast horizon. And forecast of what? Shop-wide costs? Per-job? The API call has no job filter, suggesting it is aggregate, but the UI gives no context. |
| D-4 | **MEDIUM** | **Margin Alerts threshold is hardcoded at 15% (line 34).** Every shop has different target margins. Aerospace shops target 25-30%; commercial work might target 15-20%. This should be configurable in Settings. |
| D-5 | **MEDIUM** | **Machine Investment analysis is standalone.** It is not connected to the actual machines in the system. If I have 5 CNCs in inventory, I should be able to click one and run "replacement analysis" with pre-populated current utilization and revenue data. |

---

## 5. WHAT IS MISSING THAT I NEED TO RUN MY SHOP?

### Absolute must-haves not present anywhere in the reviewed pages:

| # | SEVERITY | Missing Feature | Why Critical |
|---|----------|----------------|--------------|
| M-1 | **CRITICAL** | **Machine rate configuration with burden/overhead** | Every quote depends on $/hr per machine. The sidebar has a "Machine Rates" link under Analysis, but it is separated from quoting. Rates need to include: machine depreciation, power, coolant, tooling amortization, labor burden, overhead allocation. |
| M-2 | **CRITICAL** | **Overhead allocation model** | The quote estimate shows "overhead" as a line item but there is no configuration for HOW overhead is calculated. Is it a flat %, a $/hr rate, activity-based? ProShop and JobBOSS both have configurable overhead models. |
| M-3 | **CRITICAL** | **Shop floor data collection** | No barcode scanning, no operator clock-in/clock-out per operation, no way to capture actual cycle times from the floor. Without this, the "Actual vs Estimated" variance analysis on Job Profitability has no actual data to compare against. |
| M-4 | **HIGH** | **Shipping / packing slip generation** | The job status includes "shipped" but there is no shipping workflow: no packing slip, no BOL, no tracking number capture, no integration with UPS/FedEx. |
| M-5 | **HIGH** | **Customer management tied to jobs** | "Customers" exists in the sidebar under Analysis but is disconnected from quoting, jobs, and invoicing. I need: customer-specific pricing agreements, tax-exempt status, payment terms (Net 30/60/90), credit limits. |
| M-6 | **HIGH** | **Non-conformance / RMA tracking** | Quality Management exists in the sidebar but is not connected to jobs. When a customer rejects parts, I need to track the NCR, root cause, corrective action, and rework cost against the job. |
| M-7 | **HIGH** | **Purchase order receiving against jobs** | The PO page exists in sidebar but material receiving tied to specific jobs is essential for actual cost tracking. |
| M-8 | **MEDIUM** | **Margin tracking by customer, by machine, by time period** | Job Profitability is per-job only. I need to know: "What is my average margin on Customer X's work?" "Which machine is most profitable?" "Are my margins trending up or down quarter over quarter?" |
| M-9 | **MEDIUM** | **Quoting win/loss tracking** | No way to mark a quote as won, lost, or expired. No win rate analytics. ProShop and Paperless Parts both track this. |
| M-10 | **MEDIUM** | **Tax calculation on invoices** | The invoice table shows total and balance but no tax. Sales tax compliance is legally required. |

---

## 6. IS THE SIDEBAR ORGANIZED LOGICALLY FOR MY WORKFLOW?

**Verdict: Overwhelming and disorganized. A new employee would be lost.**

| # | SEVERITY | Finding |
|---|----------|---------|
| S-1 | **CRITICAL** | **11 navigation groups with 50+ items is far too many.** A shop foreman needs 5-6 links daily, not 50+. The cognitive load is extreme. JobBOSS has ~8 top-level items. ProShop uses role-based nav showing only what matters to each user. |
| S-2 | **CRITICAL** | **Massive duplication between "Shop" and "ERP" sections.** "Shop > Jobs" vs "ERP > Job Planner," "Shop > Scheduling" vs "ERP > Schedule," "Shop > Inventory" vs "ERP > Inventory." This is confusing -- which one do I use? Why are there two job systems? |
| S-3 | **HIGH** | **"Quoting" section has 9 items** including specialty methods (Sheet Metal, Additive, Injection Mold) that most machine shops never use. These should be hidden by default and enabled per-shop. A typical job shop only needs: Quote Builder, Blueprint Quote, Quote Analytics. |
| S-4 | **HIGH** | **"Core" section makes no sense to a machinist.** "SFC Calculator," "Post Processor," and "CAM Strategy" are engineering tools, not shop-floor operations. They should be under "Engineering" or "CAM" -- not as the first things a shop owner sees. |
| S-5 | **HIGH** | **"Billing" section contains only "Post Processors."** Post processors have nothing to do with billing. This is clearly a categorization error. |
| S-6 | **HIGH** | **"Analysis" is a grab-bag.** It contains Job Planner AI, What-If, Machine Rates, Order Tracking, Customers, Purchasing -- these are unrelated features dumped into a catch-all bucket. Order Tracking should be under Shop. Customers and Purchasing should be standalone or under a CRM group. |
| S-7 | **MEDIUM** | **No role-based visibility.** A machine operator should see: Shop Clock, Jobs, Quality. A shop owner should see: Dashboard, Finance, Analytics. Showing everything to everyone is overwhelming and a security concern. |

### Recommended sidebar restructure for a job shop:

```
Dashboard (single landing page with KPIs)
---
Jobs & Scheduling
  - Jobs
  - Scheduling
  - Capacity Planning
  - Order Tracking
---
Quoting
  - Quote Builder
  - Blueprint Quote
  - Quote Analytics
---
Finance
  - Invoices
  - Purchase Orders
  - Job Profitability
  - General Ledger
  - Reports
---
Shop Floor
  - Shop Clock
  - Timecards
  - Inventory
  - Quality
---
Engineering  (collapsed by default)
  - SFC Calculator
  - CAM Strategy
  - Post Processors
  - 3D Viewer
---
HR & Admin   (collapsed by default)
  - Employees
  - Payroll
  - Settings
  - Machine Rates
```

That is 6 groups, ~25 items. Half the current count.

---

## 7. WOULD A NEW EMPLOYEE BE ABLE TO USE THIS WITHOUT TRAINING?

**Verdict: No.**

| # | SEVERITY | Finding |
|---|----------|---------|
| U-1 | **HIGH** | **Scheduling page uses academic terminology.** "Johnson's Rule," "WSPT," "CPM Network" -- a shop scheduler knows "when can I run this job?" not "apply the Johnson's Algorithm to a 2-machine flow shop." The scheduling page reads like an Operations Research textbook, not a production tool. |
| U-2 | **HIGH** | **Scheduling uses only hardcoded sample data.** The "Run Job Shop Schedule" button (line 24-30) submits 3 fake jobs with fixed durations. There is no way to schedule actual jobs from the Jobs page. This is a demo, not a feature. |
| U-3 | **HIGH** | **Multiple results render as raw JSON.** Job Summary, Quote Doc, Single Machine schedule, Johnson's Rule, and CPM results all dump `JSON.stringify` to screen. This is developer output, not a user interface. |
| U-4 | **MEDIUM** | **No tooltips, no help text, no onboarding.** A field like "Complexity: simple/medium/complex" -- what do those mean in terms of number of setups, features, or tolerances? There is no guidance anywhere. |
| U-5 | **MEDIUM** | **No confirmation dialogs on destructive actions.** Job status changes happen on dropdown change (line 152) with no "Are you sure?" confirmation. One accidental click marks a job as "shipped" when it is still in production. |

---

## 8. COMPETITOR FEATURES MISSING (JobBOSS, ProShop, Paperless Parts)

| Feature | JobBOSS | ProShop | Paperless Parts | PRISM v9 |
|---------|---------|---------|-----------------|----------|
| Quote-to-Job conversion | Yes | Yes | Yes | **NO** |
| Multi-operation routing | Yes | Yes | N/A | **NO** |
| Shop floor data collection | Yes | Yes | N/A | **NO** |
| Traveler / work order print | Yes | Yes | N/A | **NO** |
| AR aging report | Yes | Yes | N/A | **NO** |
| P&L statement | Yes | Yes | N/A | **NO** |
| Configurable machine rates | Yes | Yes | N/A | **Exists but disconnected** |
| Overhead allocation | Yes | Yes | N/A | **NO config** |
| Role-based nav/permissions | Yes | Yes | Yes | **NO** |
| PDF quote generation | Yes | Yes | Yes | **Renders JSON** |
| Customer price agreements | Yes | Yes | Partial | **NO** |
| PO receiving against jobs | Yes | Yes | N/A | **NO** |
| Barcode/QR scanning | Yes | Yes | N/A | **NO** |
| Quote win/loss tracking | Partial | Yes | Yes | **NO** |
| NCR / RMA tracking | Yes | Yes | N/A | **NO** |
| Tax on invoices | Yes | Yes | Yes | **NO** |
| Integrated shipping | Partial | Yes | N/A | **NO** |

---

## SUMMARY: PRIORITIZED ACTION ITEMS

### P0 -- Cannot sell software without these (CRITICAL)
1. **Quote-to-Job conversion flow** -- Connect the quoting and job lifecycle end-to-end
2. **Persistent quote records** with quote numbers, customer, save/load/revise
3. **Material/Operation dropdowns** (not free-text) populated from a configurable catalog
4. **Job status state machine** -- Enforce valid transitions, prevent accidental changes
5. **Financial dashboard** -- Single page: revenue, AR aging, margin trend, overdue invoices, cash position
6. **Eliminate Shop/ERP duplication** in sidebar -- one system, one truth
7. **Reduce sidebar to ~25 items** organized by workflow role

### P1 -- Needed within first 3 months
8. **PDF quote document generation** (replace JSON dump)
9. **Job traveler / routing with multi-operation tracking**
10. **AR aging report** (0-30, 31-60, 61-90, 90+ buckets)
11. **P&L statement** view (monthly/quarterly/annual)
12. **Connect timecards to job costing** for actual labor costs
13. **Job-to-Invoice one-click creation** from the Jobs page
14. **Configurable overhead allocation and margin targets**
15. **Real scheduling from actual job data** (not hardcoded sample jobs)

### P2 -- Needed within 6 months to compete
16. Shop floor data collection (barcode scan, operator clock per op)
17. Customer management with pricing agreements and payment terms
18. Purchase order receiving tied to job material costs
19. Tax calculation on invoices
20. Shipping workflow with packing slips
21. Quote win/loss analytics
22. Non-conformance / RMA tracking
23. Role-based navigation and permissions
24. Rename/restructure scheduling tabs from academic to practical language

---

## FILES REVIEWED

- `C:\PRISM\.claude\worktrees\zen-dirac\web\src\pages\QuoteBuilderPage.tsx` (245 lines)
- `C:\PRISM\.claude\worktrees\zen-dirac\web\src\pages\JobsPage.tsx` (241 lines)
- `C:\PRISM\.claude\worktrees\zen-dirac\web\src\pages\SchedulingPage.tsx` (300 lines)
- `C:\PRISM\.claude\worktrees\zen-dirac\web\src\pages\InvoicesPage.tsx` (161 lines)
- `C:\PRISM\.claude\worktrees\zen-dirac\web\src\pages\FinancialAnalysisPage.tsx` (356 lines)
- `C:\PRISM\.claude\worktrees\zen-dirac\web\src\pages\JobProfitabilityPage.tsx` (251 lines)
- `C:\PRISM\.claude\worktrees\zen-dirac\web\src\components\layout\AppShell.tsx` (410 lines)
