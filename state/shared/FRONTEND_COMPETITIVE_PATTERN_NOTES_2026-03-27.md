# Frontend Competitive Pattern Notes — 2026-03-27

Purpose: preserve competitor-informed UI direction for the frontend roadmap so future sessions build toward the right desk/workflow patterns instead of only polishing isolated pages.

Primary references reviewed:
- JobBOSS² / E2 / ECI manufacturing ERP positioning and feature pages
- QuickBooks Online Advanced feature patterns
- Xometry Instant Quoting flow
- Fictiv platform / order-visibility patterns
- ProShop / Odoo / Global Shop Solutions manufacturing ERP patterns

## High-Level Product Direction

PRISM should continue moving toward a connected operating system for manufacturing, not a collection of separate screens.

That means the frontend should increasingly favor:
- workspace desks over static pages
- queue-driven worklists over decorative summary cards
- drilldowns from KPI -> record -> timeline -> action
- shared object relationships across quoting, planning, quality, inventory, accounting, learning, and machine operations
- persistent personalization: saved views, pinned workspaces, recent records, role-based home surfaces

## Global Shell Patterns To Add

Competitor-inspired gaps still worth building:
- global command/search bar for records, jobs, customers, POs, quotes, parts, orders, and lessons
- role-aware home modes: programmer, estimator, scheduler, buyer, quality, controller, owner
- cross-app inbox / task tray for approvals, shortages, late jobs, overdue invoices, quality alerts, and training due items
- saved filters and saved table views everywhere
- recent records and pinned entities, not just pinned pages
- global timeline / activity pattern shared across major entities
- stronger drilldown pathways from summary cards into actionable list/detail workspaces

## Calculator / CAM / Machining Pattern Gaps

Relevant inspiration:
- Xometry part configuration and analyze/DFM flow
- JobBOSS² estimating with capacity visibility
- manufacturing ERP-style workcenter and scheduling context

Frontend should plan for:
- upload-first entry from part or drawing into calculator / quoting / toolpath workflows
- a proper part/operation context rail: process, material, quantity, tolerances, certs, notes
- versioned setups: saved machine, tooling, holder, workholding, controller, post, and CAM presets
- compare mode for multiple process/toolpath setups side by side
- operation history / setup history / recommended next actions
- deeper list/detail pattern for toolpath and what-if, not only form panels
- DFM / manufacturability feedback inside calculator-adjacent workflows
- tighter bridge between calculator -> toolpath advisor -> PPG -> setup sheet -> quote

## Quote / Customer Portal Pattern Gaps

Relevant inspiration:
- Xometry upload -> configure -> analyze -> delivery -> checkout -> order history
- Fictiv quote-to-delivery visibility, search, and team sourcing
- JobBOSS² estimate -> quote -> order conversion

Frontend should add:
- quote revision history and version compare
- multi-part quote workbench with part library / recent uploads
- share quote / purchaser handoff / internal approval states
- delivery-option comparison and cost/lead-time tradeoffs
- DFM tab with issue clusters, recommendations, and linked geometry/docs
- explicit cert/compliance request surfaces
- order-tracking timeline from quote to delivery
- repeat-order and reconfigure-from-history flows
- stronger customer collaboration surfaces: notes, approvals, attachments, status visibility

## ERP / Shop / Scheduling Pattern Gaps

Relevant inspiration:
- JobBOSS² planning board + whiteboard scheduler + finite/infinite scheduling
- Odoo work orders, quality triggers, barcode/shop-floor actions
- ProShop paperless connected job data
- Global Shop quote-to-cash breadth
- Katana shop floor assignment patterns

Frontend should evolve toward:
- list/detail scheduling workspaces with board + exception pane + job inspector
- machine, employee, workcenter, day/week/hour schedule pivots
- what-if scheduling views tied directly to capacity and due-date impact
- shop-floor task/clocking view with assignment, stopwatch, and work instructions
- shortage and material availability overlays on jobs and schedules
- route-step history / traveler view tied to jobs
- linked purchasing actions from shortages and job demand
- operator/mobile-friendly task surfaces for shop-floor execution

## Accounting / Finance / Business Pattern Gaps

Relevant inspiration:
- QuickBooks custom dashboards, custom reports, reminders, workflows, role permissions, mobile visibility

Frontend should add:
- configurable KPI dashboards per role
- report builder posture: filter, group, summarize, save template, export
- transaction drilldown from finance cards/charts into detailed records
- approval workflow surfaces for invoices, bills, payroll, expenses, and estimates
- reminder/task rails for overdue items and required follow-ups
- cleaner customer/vendor ledger views with activity and attachments
- stronger permission-aware UI shaping by role

## Quality / Compliance Pattern Gaps

Relevant inspiration:
- JobBOSS² + uniPoint quality/compliance signals
- Fictiv inspection documents and cert visibility
- Odoo quality triggers inside manufacturing flow

Frontend should add:
- shared quality timeline on jobs, parts, orders, customers, suppliers
- due-soon and overdue compliance queue
- deeper NCR/CAPA/FAI/SPC detail drawers or inspectors
- inspection asset gallery and downloadable certs/docs
- quality-linked action buttons directly from job/order/part desks
- training / maintenance / document-control due-item surfaces in the same operating shell

## Learning / Knowledge Pattern Gaps

Even though the academy is much richer now, it still needs more operational integration:
- link lessons to machine/process/controller/CAM contexts from the rest of the app
- show recommended lessons from alarms, calculator scenarios, quality failures, and setup mistakes
- expose progress, certifications, and due training in people/HR/quality views
- treat documents, extracted knowledge, and lessons as connected objects, not separate tabs

## Suggested Next Frontend Direction

Highest-value UI work after the current shell pass:
1. Add a global command/search layer and record-level recent/pinned items.
2. Turn quote/order/job pages into stronger list/detail desks with timelines, attachments, and action rails.
3. Add Xometry/Fictiv-style revision, upload, DFM, and order-history patterns to quoting.
4. Add E2/ProShop/Odoo-style dispatch, traveler, shortage, and schedule-exception patterns to jobs/scheduling.
5. Add QuickBooks-style saved views, drilldowns, approvals, and report templates to finance/business pages.

## Sources

- QuickBooks Online Advanced: [https://quickbooks.intuit.com/accounting/advanced-features/](https://quickbooks.intuit.com/accounting/advanced-features/)
- Xometry How It Works: [https://www.xometry.com/how-xometry-works/](https://www.xometry.com/how-xometry-works/)
- Fictiv Platform: [https://www.fictiv.com/our-platform](https://www.fictiv.com/our-platform)
- JobBOSS² quoting: [https://www.ecisolutions.com/products/jobboss2/features/quotes/](https://www.ecisolutions.com/products/jobboss2/features/quotes/)
- JobBOSS² scheduling: [https://www.ecisolutions.com/products/jobboss2/features/scheduling/](https://www.ecisolutions.com/products/jobboss2/features/scheduling/)
- JobBOSS² advantage: [https://www.ecisolutions.com/products/jobboss2/the-jobboss2-advantage/](https://www.ecisolutions.com/products/jobboss2/the-jobboss2-advantage/)
- JobBOSS² integrations / MES / quality: [https://www.ecisolutions.com/products/jobboss2/features/integrations/](https://www.ecisolutions.com/products/jobboss2/features/integrations/)
- E2 MFG overview: [https://www.ecisolutions.com/products/e2-mfg/](https://www.ecisolutions.com/products/e2-mfg/)
- Odoo manufacturing features: [https://www.odoo.com/app/manufacturing-features](https://www.odoo.com/app/manufacturing-features)
- ProShop ERP: [https://proshoperp.com/](https://proshoperp.com/)
- ProShop specs: [https://proshoperp.com/proshop-specs/](https://proshoperp.com/proshop-specs/)
- Global Shop Solutions: [https://www.globalshopsolutions.com/](https://www.globalshopsolutions.com/)
