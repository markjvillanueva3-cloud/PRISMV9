---
name: Shop Quotation Engine
description: Generate shop quotes with job costing and margin analysis
---

## When To Use
- When preparing a customer quote for a new job
- When analyzing margins on existing or past jobs
- When comparing your cost to market pricing
- When building multi-part or blanket order quotes
- NOT for detailed process costing — use mfg-process-cost for that first

## How To Use
```
prism_intelligence action=shop_quote params={
  part: "bracket-001",
  material: "6061-T6",
  quantity: 500,
  target_margin: 0.30,
  delivery_weeks: 4
}

prism_intelligence action=shop_cost params={
  part: "bracket-001",
  include_overhead: true
}

prism_intelligence action=shop_job params={
  job_id: "JOB-2024-0142",
  action: "cost_summary"
}
```

## What It Returns
- Quoted unit price with margin breakdown
- Cost build-up: material, labor, machine, tooling, overhead
- Quantity price breaks (100/250/500/1000)
- Lead time estimate based on current shop load
- Comparison to historical quotes for similar parts

## Examples
- Input: `shop_quote params={part: "housing", material: "304SS", quantity: 200, target_margin: 0.25}`
- Output: $67.50/unit quote, $50.63 cost, 25% margin, 3-week lead, price breaks at 500+ for $58.20

- Input: `shop_job params={job_id: "JOB-2024-0100", action: "cost_summary"}`
- Output: Actual cost $12,450 vs quoted $15,000, realized margin 17% (target was 25%), tooling overrun
