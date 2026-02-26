---
name: mfg-campaign-optimize
description: Optimize campaign parameters for batch economics and cycle time
---

# Campaign Optimizer

## When To Use
- Optimizing cutting parameters across a full batch for minimum cost or time
- Balancing tool life against cycle time for best batch economics
- Recalculating campaign parameters after mid-batch adjustments
- Estimating total campaign cycle time with optimized parameters

## How To Use
```
prism_calc action=campaign_optimize params={campaign_id: "CAMP-2026-001", objective: "min_cost", constraints: {max_cycle_time_min: 12}}
prism_calc action=campaign_cycle_time params={campaign_id: "CAMP-2026-001"}
```

## What It Returns
- `optimized_params` — recommended cutting parameters per operation
- `cost_per_part` — estimated cost per part after optimization
- `total_campaign_cost` — total batch cost estimate
- `cycle_time_per_part` — optimized cycle time per part
- `total_campaign_time` — total batch production time including tool changes
- `tool_changes` — number and timing of predicted tool changes

## Examples
- Optimize for minimum cost: `campaign_optimize params={campaign_id: "CAMP-2026-001", objective: "min_cost"}`
- Optimize for minimum time: `campaign_optimize params={campaign_id: "CAMP-2026-001", objective: "min_time"}`
- Get total cycle time estimate: `campaign_cycle_time params={campaign_id: "CAMP-2026-001", include_setup: true, include_tool_changes: true}`
