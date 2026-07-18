---
name: cam-strategy-compare
description: Compare CAM strategies head-to-head — radar chart, cycle time, cost, safety.
---

# /cam-strategy-compare

## Pipeline

1. `prism_cam` → `strategy_compare` with `{ strategies, material, tool }`
2. `prism_cam` → `strategy_head_to_head` with `{ a, b, material, tool }`
3. `prism_cam` → `strategy_radar_chart` with `{ strategies }`
4. `prism_cam` → `strategy_benchmark_monte_carlo` with `{ strategies, samples }`
5. `prism_cam` → `strategy_stochastic_rank` with `{ strategies }`

## Exit criteria
- Pairwise comparison complete.
- Radar chart data returned.
- Ranked list with uncertainty bounds.
