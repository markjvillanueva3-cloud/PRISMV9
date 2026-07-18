---
name: erp-business-start
description: 'ERP and business management quick start. Use when the user asks about job costing, quoting, scheduling, inventory management, or shop floor operations tracking.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  product: ERP
---

# ERP/Business Management — Shop Operations Guide

## When to Use
- User asks about job costing or quoting a part
- Scheduling jobs across machines and shifts
- Tracking inventory, tool crib, or material consumption
- Generating OEE, utilization, or productivity reports

## How It Works
1. Capture job parameters (material, operations, quantities)
2. Estimate costs via `prism_calc→cost_estimate` (material + machine + tooling + labor)
3. Schedule via `prism_scheduling→job_schedule` with machine capacity
4. Track via `prism_automation→oee_calc` and shift handoff reports
5. Generate quotes via `prism_export→render_pdf`

## Returns
- Per-part cost breakdown (material, machining, tooling, overhead)
- Job schedule with machine assignments and due dates
- OEE metrics (availability x performance x quality)
- Quote document with margins and lead time

## Example
**Input:** "Quote 500 pcs of 4140 steel bracket, 3 ops (mill, drill, deburr)"
**Output:** Material: $2.40/pc, Machining: $8.15/pc (Mill 4.2min + Drill 1.8min + Deburr 0.5min @ $75/hr), Tooling: $0.35/pc, Overhead 22%. Total: $13.30/pc, Lot: $6,650, Lead: 3 weeks.
