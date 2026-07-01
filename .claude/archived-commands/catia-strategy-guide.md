---
name: catia-strategy-guide
description: CATIA Manufacturing / KBM strategy guide — template-driven parameters.
---

# /catia-strategy-guide

## Pipeline

1. `prism_cam` → `catia_strategy_list`
2. `prism_cam` → `catia_strategy_recommend` with `{ operation, material, tool, feature }`
3. `prism_cam` → `catia_kbm_details` with `{ strategy }`
4. `prism_cam` → `catia_strategy_params` with `{ strategy, material, tool }`
5. `prism_cam` → `catia_safety_validate` with `{ strategy, material, params }`
6. `prism_cam` → `catia_code_templates` with `{ strategy }`

## Exit criteria
- KBM-derived parameters resolved.
- Safety rules satisfied.
- Code templates ready.
