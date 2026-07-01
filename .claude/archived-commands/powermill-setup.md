---
name: powermill-setup
description: Configure Autodesk PowerMill integration — controller, material map, safety rules, add-in.
---

# /powermill-setup

## Pipeline

1. `prism_cam` → `powermill_controller_list`
2. `prism_cam` → `powermill_controller_lookup` with `{ controller }`
3. `prism_cam` → `powermill_material_lookup` with `{ material }`
4. `prism_cam` → `powermill_safety_rules`
5. `prism_cam` → `powermill_code_templates`
6. `prism_cam` → `powermill_addin_generate` with `{ target_dir }`

## Exit criteria
- Controller + material resolved.
- Safety rules + code templates loaded.
- Add-in scaffold written.
