# Sidebar Navigation Architecture Review

## Information Architecture Critique of the Proposed 8-Group Sidebar

---

## Current State Analysis

**Existing sidebar (AppShell.tsx):** 11 groups, 55 items

| Group | Items | Notes |
|-------|-------|-------|
| Core | 3 | SFC Calculator, Post Processor, CAM Strategy |
| Shop | 6 | Dashboard, Jobs, Scheduling, Capacity, Inventory, Batch |
| Quoting | 9 | Quote Builder, Blueprint Quote, Sheet Metal, Additive, Injection Mold, Analytics, Secondary Ops, Material Pricing, Stock Optimizer |
| Finance | 6 | Invoices, Purchase Orders, General Ledger, Financial Analysis, Job Profitability, Tooling Cost |
| HR & Payroll | 5 | Employees, Shop Clock, Timecards, Payroll, HR Compliance |
| ERP | 9 | Dashboard, Quoting, Job Planner, Schedule, Job Tracker, Analytics, Maintenance, Inventory, Reports |
| Analysis | 6 | Job Planner AI, What-If, Machine Rates, Order Tracking, Customers, Purchasing |
| Viewer | 1 | 3D Viewer |
| Data & Quality | 6 | Data, Safety, Quality, Quality Mgmt, Reports, Exports |
| Billing | 1 | Post Processors |
| Admin | 3 | Costing, Learning, Settings |

**Key structural problems in the current sidebar:**
- ERP duplicates 5+ items from Shop (Jobs/Job Planner, Scheduling/Schedule, Capacity/Analytics, Inventory/Inventory)
- Billing group has a single orphan item (Post Processors) that has nothing to do with billing
- Viewer group has a single item
- "Analysis" is a grab-bag of unrelated pages (CRM, purchasing, simulation, AI planning)
- Quality and Quality Management are listed separately despite being the same domain
- Reports appears in both "Data & Quality" and "ERP"

---

## Question-by-Question Critique

### 1. Is 8 groups the right number?

**Verdict: 8 is too many. Target 6, with a 7th "pinned/recent" section.**

Miller's Law (7 plus/minus 2) is about short-term memory chunks, not navigation categories. More relevant research for persistent sidebar navigation:

- **Hick's Law** says decision time increases logarithmically with the number of choices. Fewer top-level groups means faster scanning.
- **Nielsen Norman Group studies on B2B enterprise nav** consistently recommend 5-7 top-level categories. Beyond 7, users stop scanning and start searching.
- **The sidebar is always visible**, which mitigates memory load -- users do not need to "remember" groups. But they do need to visually scan them every time they look for something. 8 groups at ~4 items each = 32 scan targets + 8 headings = 40 visual elements. That is still heavy.

**Recommendation: 6 groups + a pinned/recent section at the top.**

The groups "Crew" (HR/Payroll) and "Admin" are low-frequency. Crew has 5 items used by 1-2 people in a shop (owner, bookkeeper). Admin has 3 items used rarely. These can be combined into a single "Manage" or "Back Office" group without confusion, because their users overlap heavily (the shop owner who runs payroll also manages settings).

Proposed: Calculate, Shop Floor, QuoteForge, Finance, Quality, Back Office (6 groups).

---

### 2. Are the group names intuitive?

**Mixed. Some are excellent, some are problematic.**

| Proposed Name | Verdict | Issue |
|---------------|---------|-------|
| **Calculate** | WEAK | Too generic. "Calculate what?" Spreadsheets calculate. Taxes calculate. This group holds the core engineering tools (SFC, post processor, CAM). The verb form also breaks pattern -- all other names are nouns. |
| **Shop Floor** | GOOD | Clear manufacturing language. Every machinist knows what the shop floor is. |
| **QuoteForge** | PROBLEMATIC | Product names should not be group names. If QuoteForge is a feature inside the group, naming the group after it creates a tautology (QuoteForge > QuoteForge). Users will not know if clicking "QuoteForge" opens the tool or the category. |
| **Money** | BAD | See question 4 below. |
| **Crew** | MARGINAL | Clever but potentially confusing. "Crew" in maritime/aviation is well-understood. In machine shops, people say "guys on the floor," "team," or just "employees." A new user might not realize Crew means HR + Payroll. |
| **Intelligence** | PROBLEMATIC | Sounds like a spy thriller. In B2B manufacturing software, "intelligence" is vague. What kind? Business intelligence? Artificial intelligence? This group contains What-If simulation, machine rates, CRM, and purchasing -- those are not "intelligence" tools, they are operations/planning tools. |
| **Quality** | GOOD | Clear, industry-standard. Every shop has a quality department. |
| **Admin** | GOOD | Universal software convention. |

**Recommended name changes:**

| Proposed | Recommended | Why |
|----------|-------------|-----|
| Calculate | **Engineering** or **Tools** | Groups the technical/engineering calculation tools. "Engineering" is the department that uses SFC, post processor, and CAM. "Tools" is shorter but ambiguous (cutting tools vs software tools). |
| QuoteForge | **Estimating** or **Quoting** | Industry-standard term. Every shop has an "estimating department." Keep the original "Quoting" -- it was fine. Use "QuoteForge" as the product name for the quote builder page, not the sidebar group. |
| Money | **Finance** | See question 4. |
| Crew | **People** or keep **HR & Payroll** | "People" is the modern B2B SaaS convention (Workday, BambooHR, Gusto all use "People"). Alternatively, the original "HR & Payroll" was perfectly descriptive. |
| Intelligence | **Planning** or **Operations** | These pages are about planning work and managing business relationships. "Planning" covers What-If, Job Planner AI, Machine Rates. Move Customers and Purchasing into a "CRM" subheading or into Shop Floor. |

---

### 3. Should "Calculate" contain both PRISM Calculator and CodeForge?

**Yes, but rename the group.**

PRISM Calculator (SFC) and CodeForge (Post Processor) serve overlapping users in different phases of the same workflow:

1. Engineer/programmer opens SFC to determine speeds and feeds for a new job
2. Same person opens CodeForge to generate the G-code post processor
3. Same person might check PathAdvisor (CAM) for toolpath strategy
4. Same person might open PartView (3D Viewer) to inspect the part geometry

These are all "engineering/programming" tasks done by the same person, often in sequence. Grouping them together is correct. The group name just needs to reflect this workflow -- "Engineering" or "Programming" works better than "Calculate."

A CNC programmer and a machinist both use the SFC calculator. A CNC programmer uses CodeForge. A shop owner does not use either regularly. The mental model is "tools I use to prepare a job for the machine," which is an engineering/programming function.

---

### 4. Is "Money" too casual for finance?

**Yes. Use "Finance."**

Reasons:

1. **Tone mismatch.** PRISM is B2B manufacturing software handling six- and seven-figure job costs, AR aging, general ledger entries, and P&L statements. "Money" sounds like a personal finance app or a mobile banking feature. The people using these pages are bookkeepers, controllers, and shop owners reviewing financial statements. They expect professional terminology.

2. **Semantic mismatch.** "Money" implies cash/currency. The group contains General Ledger (accounting), Financial Analysis (reporting), Job Profitability (margin tracking), and Purchase Orders (procurement). These are accounting/finance functions, not "money" functions.

3. **Industry convention.** Every ERP system (JobBOSS, E2 Shop, Epicor, ProShop) uses "Finance," "Accounting," or "Financial" as the nav category. Users coming from those systems will look for "Finance."

4. **The plan itself uses "Finance" as the current group name.** It was already correct. Changing it to "Money" adds personality at the cost of clarity.

**Recommendation: Keep "Finance."** If the brand personality demands something less stiff, "Financials" works. Never "Money."

---

### 5. Is merging ERP into Shop Floor correct?

**Yes, merging is correct. The ERP section must be eliminated. But not all of it belongs in Shop Floor.**

The current ERP section is the biggest structural problem in the sidebar. It duplicates 5+ pages that already exist elsewhere:

| ERP Item | Duplicate Of | Resolution |
|----------|-------------|------------|
| ERP > Quoting | Quoting > Quote Builder | Delete. Keep Quote Builder. |
| ERP > Job Planner | Shop > Jobs | Merge into Jobs. |
| ERP > Schedule | Shop > Scheduling | Delete. Keep Scheduling. |
| ERP > Job Tracker | Shop > Jobs (sub-view) | Fold into Jobs page as a view/tab. |
| ERP > Analytics | Shop > Capacity Planning | Merge. |
| ERP > Inventory | Shop > Inventory | Delete. Keep Shop > Inventory. |
| ERP > Reports | Data & Quality > Reports | Delete. Keep one Reports page. |
| ERP > Maintenance | (unique) | Move to Shop Floor as "Maintenance." |
| ERP > Dashboard | (unique) | Evaluate: is it used? If yes, merge into Shop Dashboard as a tab. If no, delete. |

**Distribution after merge:**
- Shop Floor absorbs: Maintenance (the only truly unique ERP page)
- Everything else is a duplicate that gets deleted
- The ERP Dashboard either becomes a tab on the Shop Dashboard or is removed

**ERP does NOT deserve its own group** because:
1. "ERP" is a technology category, not a user task. Users do not think "I need to do some ERP." They think "I need to check my job schedule" or "I need to run inventory."
2. Having both "Shop" and "ERP" forces the user to decide which "Jobs" page to use -- an impossible choice that signals a design flaw.
3. The plan already correctly identifies this (Phase 4.4: "De-duplicate Shop vs ERP").

---

### 6. Where does the 3D Viewer go?

**Under "Engineering" (the renamed "Calculate" group), as the plan proposes.**

The 3D Viewer (PartView) is used primarily during job preparation: reviewing part geometry before programming speeds/feeds or generating G-code. Its user is the CNC programmer or engineer -- the same person using SFC Calculator and CodeForge.

Placement reasoning:
- It is NOT a "Shop Floor" tool (shop floor workers use the physical machine, not a 3D viewer)
- It is NOT a "Quality" tool (quality uses CMM reports, not CAD viewers -- unless you add GD&T overlay, which could warrant a Quality link later)
- It IS an engineering/programming tool used alongside SFC and CodeForge

**Final position: Engineering > PartView (3D Viewer), listed 4th after PRISM Calculator, CodeForge, PathAdvisor.**

However, consider also making PartView accessible from within other pages (embedded viewer in QuoteForge for blueprint review, embedded in Jobs for work order visualization) via a shared component, not just a nav link.

---

### 7. Does Cmd+K (command palette) eliminate the need for deep nav?

**It reduces the need but does not eliminate it. Both are required.**

**What Cmd+K solves:**
- Power users who know what they want can type "invoice" and jump directly. This eliminates the need to scan 30+ sidebar items.
- Infrequent pages (Exports, HR Compliance, General Ledger) become accessible without cluttering the sidebar.
- Cross-cutting searches ("find job #4521") that span multiple sections.

**What Cmd+K does NOT solve:**
- Discovery. New users do not know what pages exist. They need to browse the sidebar to understand the system's capabilities.
- Browsing. Sometimes users do not have a specific destination -- they are exploring ("what can I do with quality data?"). The sidebar serves this browse/discover use case.
- Context. The sidebar shows the user where they are in the information hierarchy (active group, active page). Cmd+K provides no spatial context.
- Mobile. Command palettes are a keyboard-first pattern. On tablets (common on shop floors), the sidebar is the only navigation.

**Recommendation:** Implement Cmd+K (the plan already includes `cmdk`) AND keep a clean sidebar. Use Cmd+K as justification to be aggressive about sidebar pruning -- pages that are used less than monthly can be Cmd+K-only (no sidebar link). Candidates for Cmd+K-only:
- Exports (infrequent)
- HR Compliance (quarterly)
- General Ledger (monthly close)
- Data Management (admin-only)
- Post Processors marketplace (rare)

This could bring the sidebar from ~30 items down to ~22-24, which is much more scannable.

---

### 8. Should there be a "Favorites" or "Recent" section at the top?

**Yes. Add a "Recent" section (not Favorites). Make it the topmost sidebar element.**

**Why Recent over Favorites:**
- Favorites require user effort to configure. In practice, most B2B users never set favorites (studies show <15% adoption for explicit favorites in enterprise tools).
- Recent is automatic and immediately useful from day one.
- Recent adapts to the user's actual workflow. A machinist who uses SFC 80% of the time will always see it at the top. A shop owner who lives in Jobs and Invoices will see those.

**Implementation:**
- Show the 3-5 most recently visited pages at the top of the sidebar
- Persist in localStorage per user
- Use a smaller font or muted style to differentiate from the grouped navigation
- Label it "Recent" with a `Clock` icon
- Cap at 5 items to avoid growing into its own navigation problem

**Why this matters for the group count question:** If users have "Recent" at the top, the pressure to keep all groups short is reduced. Users will access their top 3-5 pages from Recent, and only drill into groups when they need something unusual. This means the groups can be slightly larger without degrading usability.

---

### 9. Card Sorting Recommendation

Based on the user mental models of a machine shop (machinist, CNC programmer, shop owner, estimator, bookkeeper), here is the recommended grouping.

**Proposed: 6 groups + Recent section, ~24 sidebar items (remainder via Cmd+K)**

```
RECENT (auto-populated, 3-5 items)
----------------------------------------------

ENGINEERING (4 items)
  PRISM Calculator    /sfc
  CodeForge           /ppg
  PathAdvisor         /cam
  PartView            /viewer

SHOP FLOOR (7 items)
  Command Center      /shop
  Job Tracker         /jobs
  FloorPlan           /scheduling
  CapacityIQ          /capacity
  StockVault          /inventory
  BatchOptimizer      /batch
  Maintenance         /erp/maintenance

QUOTING (5 items)
  QuoteForge          /quote-builder
  PrintScan           /blueprint-quote
  Sheet Metal         /sheet-metal
  Additive            /additive
  Injection Mold      /injection-mold

FINANCE (4 items)
  BillForge           /invoices
  Purchase Orders     /purchase-orders
  ProfitPulse         /financial-analysis
  MarginTracker       /job-profitability

QUALITY (3 items)
  QualityGate         /quality
  SafeGuard           /safety
  InspectPro          /quality-management

BACK OFFICE (4 items -- or split into People + Admin)
  Crew                /employees
  ClockIn             /shop-clock
  PayRoll             /payroll
  Config              /settings
```

**Total: 6 groups, 27 sidebar items.**

**Moved to Cmd+K only (accessible via search, no sidebar link):**
- WinRate (Quote Analytics) -- accessible from QuoteForge page as a tab/view
- MetalMarket (Material Pricing) -- accessible from QuoteForge as a panel
- CutPlanner (Stock Optimizer) -- accessible from StockVault as a tool
- FinishLine (Secondary Ops) -- accessible from QuoteForge as a line item type
- ToolSpend (Tooling Cost) -- accessible from MarginTracker as a drill-down
- General Ledger -- monthly accounting, not daily nav
- Timecards -- accessible from ClockIn as a tab
- HR Compliance -- quarterly, Cmd+K only
- DataVault (Data Management) -- admin function, Cmd+K only
- ReportForge (Reports) -- accessible from each section's own reports
- ExportHub (Exports) -- accessible from Reports as an action
- PostStore (Post Processors) -- marketplace, Cmd+K only
- CostIQ (Cost Estimator) -- fold into QuoteForge or PRISM Calculator
- PRISM Academy (Learning) -- Cmd+K or help menu
- ProcessIQ (Job Planner AI) -- fold into Job Tracker as an AI assist panel
- SimLab (What-If) -- fold into PRISM Calculator or CapacityIQ as a mode
- RateCard (Machine Rates) -- accessible from CapacityIQ or Config
- OrderPulse (Order Tracking) -- fold into Job Tracker view
- ClientBook (Customers) -- accessible from QuoteForge or Cmd+K
- BuyDesk (Purchasing) -- fold into Purchase Orders page
- OpsCenter (ERP Dashboard) -- merge into Command Center

**Pages eliminated (duplicates):**
- ERP > Quoting (duplicate of QuoteForge)
- ERP > Job Planner (duplicate of Jobs)
- ERP > Schedule (duplicate of FloorPlan)
- ERP > Job Tracker (duplicate of Job Tracker)
- ERP > Analytics (duplicate of CapacityIQ)
- ERP > Inventory (duplicate of StockVault)
- ERP > Reports (duplicate of Reports)

---

## Summary of Recommendations

| Question | Plan Proposes | This Review Recommends |
|----------|--------------|----------------------|
| Group count | 8 | **6** (+ Recent section at top) |
| "Calculate" name | Calculate | **Engineering** |
| "QuoteForge" as group name | QuoteForge | **Quoting** (QuoteForge is a page name, not a group name) |
| "Money" name | Money | **Finance** |
| "Crew" as group name | Crew | **Back Office** (merge HR + Admin) or keep **People** |
| "Intelligence" name | Intelligence | **Eliminate** (distribute pages into existing groups or Cmd+K) |
| ERP merge | Into Shop Floor | **Yes, delete ERP group entirely**. Only Maintenance is unique; move it to Shop Floor. |
| 3D Viewer | Fold into Calculate | **Yes, into Engineering group as PartView** |
| Cmd+K | Planned (cmdk dependency) | **Use it aggressively to keep sidebar under 27 items** |
| Favorites/Recent | Not mentioned | **Add Recent (3-5 items) at sidebar top** |
| Item count | ~30 | **27 in sidebar, ~20 more via Cmd+K only** |

### Risk: Over-Consolidation

The one risk with aggressive pruning is that Cmd+K becomes a crutch. If a user cannot find General Ledger in the sidebar and does not know about Cmd+K, they are stuck. Mitigations:
1. Onboarding tour must teach Cmd+K on first visit
2. A visible search icon in the sidebar header (not just keyboard shortcut)
3. Each page that absorbs sub-pages (e.g., QuoteForge absorbing Secondary Ops) must have clear internal tabs/navigation
4. Consider a "More..." link at the bottom of each group that expands to show the Cmd+K-only items in that domain

### Priority for Implementation

1. **Delete the ERP group entirely** -- this is the single biggest win. Removes 9 duplicate items.
2. **Add Recent section** -- immediate usability improvement with minimal code.
3. **Rename groups** -- Engineering, Quoting, Finance, Quality, Back Office.
4. **Move Cmd+K-only pages** -- remove from sidebar, ensure Cmd+K indexes them.
5. **Implement Cmd+K** -- required before step 4.
