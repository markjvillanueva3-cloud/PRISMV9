---
name: Shop Analytics Dashboard
description: Shop analytics dashboard with KPIs, reports, and comparisons
---

## When To Use
- When reviewing shop performance metrics and KPIs
- When generating management reports for a time period
- When comparing performance across machines, operators, or periods
- When identifying trends in scrap, utilization, or on-time delivery
- NOT for individual job tracking — use mfg-job-manage instead

## How To Use
```
prism_intelligence action=shop_dashboard params={
  period: "last_month",
  metrics: ["utilization", "oee", "scrap_rate", "on_time_delivery"]
}

prism_intelligence action=shop_report params={
  type: "monthly_summary",
  period: "2024-02"
}

prism_intelligence action=shop_compare params={
  compare: "machines",
  metric: "oee",
  period: "last_quarter"
}
```

## What It Returns
- KPI summary with current values and trend direction
- Machine-level OEE breakdown (availability, performance, quality)
- Scrap rate by part, material, and operation type
- On-time delivery percentage with root cause for late jobs
- Period-over-period comparison charts data

## Examples
- Input: `shop_dashboard params={period: "last_week", metrics: ["oee", "scrap_rate"]}`
- Output: OEE 78% (up 3%), scrap 2.1% (down 0.4%), VMC-3 underperforming at 62% OEE

- Input: `shop_compare params={compare: "periods", metric: "revenue_per_hour", periods: ["Q3", "Q4"]}`
- Output: Q4 $142/hr vs Q3 $128/hr (+11%), driven by higher-margin aerospace work
