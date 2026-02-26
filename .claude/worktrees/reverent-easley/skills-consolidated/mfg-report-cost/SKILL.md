---
name: Cost Estimate Report
description: Generate cost estimate report with detailed breakdowns by material, tooling, and labor.
---

## When To Use
- When quoting a new job and need a detailed cost breakdown
- When comparing manufacturing cost between process alternatives
- When management needs cost visibility for budgeting or pricing decisions
- When analyzing cost drivers to identify optimization opportunities

## How To Use
```
prism_calc action=render_report params={
  type: "cost_estimate",
  job_id: "JOB-001",
  format: "markdown"
}
```

Required: `type`, `job_id`. Optional: `format` (markdown, html, pdf), `batch_size` (integer), `include_overhead` (boolean).

## What It Returns
- Material cost with stock dimensions, weight, and unit price
- Tooling cost with tool life consumption and replacement cost per part
- Machine time cost broken down by operation
- Labor cost for setup, run, and inspection time
- Total cost per part and per batch with margin analysis

## Examples
- Input: `render_report params={ type: "cost_estimate", job_id: "JOB-001", format: "markdown" }`
- Output: Cost report showing $14.20/part breakdown: material $3.80, tooling $2.10, machine $5.60, labor $2.70 for batch of 50

- Input: `render_report params={ type: "cost_estimate", job_id: "JOB-001", batch_size: 200, include_overhead: true }`
- Output: Scaled cost estimate at $11.85/part with overhead allocation and volume discount on tooling
