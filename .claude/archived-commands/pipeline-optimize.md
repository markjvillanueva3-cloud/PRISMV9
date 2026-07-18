---
name: pipeline-optimize
description: End-to-end pipeline optimization — cost, safety, TCO, tool changes, fixture, batch.
---

# /pipeline-optimize

## Pipeline

1. `prism_cam` → `pipeline_cost_compute` with `{ plan }`
2. `prism_cam` → `pipeline_safety_assess` with `{ plan }`
3. `prism_cam` → `tco_dashboard` with `{ plan }`
4. `prism_cam` → `tool_change_optimize` with `{ plan }`
5. `prism_cam` → `production_batch_optimize` with `{ batch }`
6. `prism_cam` → `pipeline_cost_breakeven` with `{ plan, alternatives }`
7. `prism_cam` → `pipeline_cost_sensitivity` with `{ plan }`

## Exit criteria
- Cost baseline + sensitivity computed.
- Safety veto clean.
- TCO model + tool-change plan returned.
- Break-even analysis available.
