---
name: BIZ Track — Business Management Platform
description: 7 RGS milestones (BIZ-MS0..MS6, 57 units) for full business management — persistence, shop floor clock, HR/payroll, Lean dashboards, sales/procurement, maintenance/compliance, and cross-engine synchronization
type: project
originSessionId: d7cc8ed4-29ec-45a1-b15d-a487edb23534
---
## BIZ Track registered in roadmap-index.json (2026-04-08)

7 milestones, 57 units total:
- BIZ-MS0: Persistence & Data Model Hardening (6 units) — BLOCKING, do first
- BIZ-MS1: Shop Floor Clock & Multi-Job Tracking (5 units) — deps: MS0
- BIZ-MS2: Employee Management, HR & Payroll (7 units) — deps: MS0
- BIZ-MS3: Lean Mfg & CI Dashboards (9 units) — deps: MS0 + MS1
- BIZ-MS4: Quoting, Sales Pipeline & Procurement (8 units) — deps: MS0
- BIZ-MS5: Maintenance, Assets, Compliance & Integrations (10 units) — deps: MS0
- BIZ-MS6: Full Business Lifecycle Synchronization (12 units) — deps: MS0

**Why:** 20-agent audit found 7 of 10 business lifecycle transitions BROKEN (data stops flowing, requires manual re-entry). 9 of 15 engines lose all data on restart. 5 Lean pages use 100% mock data.

**How to apply:** Execute BIZ-MS0 first (persistence + data model). Then MS1-MS6 can parallelize after MS0 completes. For Friday delivery: MS0 (Day 1) + MS1 (Day 2) + MS2 partial (Day 3).

Key files:
- Plan: H:/prism/plans/erp-employee/BUSINESS-MANAGEMENT-MASTER-PLAN.md
- Sync plan: H:/prism/plans/erp-employee/FULL-BUSINESS-SYNC-PLAN.md
- Envelopes: H:/prism/mcp-server/data/milestones/BIZ-MS0.json through BIZ-MS6.json
