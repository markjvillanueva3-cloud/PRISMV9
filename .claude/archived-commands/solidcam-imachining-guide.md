---
name: solidcam-imachining-guide
description: SolidCAM iMachining and HSS strategy tuning — chipload, engagement, safety.
---

# /solidcam-imachining-guide

## Pipeline

1. `prism_cam` → `solidcam_strategy_list`
2. `prism_cam` → `solidcam_strategy_recommend` with `{ operation, material, tool }`
3. `prism_cam` → `solidcam_strategy_params` with `{ strategy, material, tool }`
4. `prism_cam` → `solidcam_imachining_details` with `{ material, tool }`
5. `prism_cam` → `solidcam_hss_details` with `{ material, tool }`
6. `prism_cam` → `solidcam_safety_validate` with `{ strategy, material, params }`

## Exit criteria
- iMachining morph/chipload derived.
- HSS parameters available if selected.
- Safety rules satisfied.
