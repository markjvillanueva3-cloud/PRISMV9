# PRISM Campaign Engine

## Purpose
Manages multi-operation machining campaigns with cumulative safety tracking, batch optimization, and cycle time estimation.

## Actions (via prism_calc)
- `campaign_create` — Build full campaign from pre-computed operation results
- `campaign_validate` — Validate campaign config structure and physical bounds
- `campaign_optimize` — Reorder/adjust parameters by optimization objective (MRR, tool_life, cost)
- `campaign_cycle_time` — Quick cycle time estimate without full physics

## Usage Pattern
1. Define operations with material, tool, and cutting parameters
2. Create campaign: `campaign_create` with operations array
3. Validate: `campaign_validate` checks bounds and safety
4. Optimize: `campaign_optimize` reorders for minimum tool changes or maximum MRR
5. Estimate: `campaign_cycle_time` for quick scheduling

## Key Parameters
- `operations[]` — Array of {material, tool, speeds, feeds, depths}
- `objective` — "mrr" | "tool_life" | "cost" | "balanced"
- `batch_size` — Number of parts in campaign
- `safety_mode` — Cumulative wear tracking across operations

## Safety
Tracks cumulative tool wear across operations. Warns when tool life consumed > 80%. Blocks campaign if any single operation has S(x) < 0.70.
