---
name: solidcam-setup
description: Configure SolidCAM integration — iMachining tuning, material map, safety rules, add-in scaffold.
---

# /solidcam-setup

## Pipeline

1. `prism_cam` → `solidcam_controller_list`
2. `prism_cam` → `solidcam_controller_lookup` with `{ controller }`
3. `prism_cam` → `solidcam_material_lookup` with `{ material }`
4. `prism_cam` → `solidcam_safety_rules`
5. `prism_cam` → `solidcam_imachining_details` with `{ material, tool }`
6. `prism_cam` → `solidcam_addin_generate` with `{ target_dir }`

## Exit criteria
- Controller + material resolved.
- iMachining chipload + strategy defaults retrieved.
- Safety rules and add-in in place.
