---
name: catia-cam-setup
description: Configure CATIA Manufacturing / KBM integration — strategies, KBM tuning, safety, add-in.
---

# /catia-cam-setup

## Pipeline

1. `prism_cam` → `catia_strategy_list`
2. `prism_cam` → `catia_kbm_details` with `{ strategy }`
3. `prism_cam` → `catia_strategy_params` with `{ strategy, material }`
4. `prism_cam` → `catia_safety_rules`
5. `prism_cam` → `catia_mfg_program` with `{ part_id }`
6. `prism_cam` → `catia_addin_generate` with `{ target_dir }`

## Exit criteria
- Strategy catalog + KBM details loaded.
- Safety rules downloaded.
- MFG program scaffold + add-in in place.
