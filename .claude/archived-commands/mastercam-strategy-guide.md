---
name: mastercam-strategy-guide
description: Recommend Mastercam strategies (Dynamic Motion, OptiRough, Profit Turning) with parameters.
---

# /mastercam-strategy-guide

## Pipeline

1. `prism_cam` → `mastercam_strategy_list`
2. `prism_cam` → `mastercam_strategy_recommend` with `{ operation, material, tool, feature }`
3. `prism_cam` → `mastercam_strategy_params` with `{ strategy, material, tool }`
4. `prism_cam` → `mastercam_strategy_dynamic_motion` with `{ material, tool }` (if dynamic)
5. `prism_cam` → `mastercam_strategy_optirough` with `{ material, tool }` (if OptiRough)
6. `prism_cam` → `mastercam_strategy_profit_turning` with `{ material, tool }` (if turning)

## Exit criteria
- Strategy recommendation with rationale.
- Parameter block (stepdown, stepover, feed, speed, engagement).
- Safety check passed.
