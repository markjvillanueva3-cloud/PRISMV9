---
name: nx-cam-setup
description: Configure Siemens NX CAM integration — controller, material, strategy registry, add-in.
---

# /nx-cam-setup

## Pipeline

1. `prism_cam` → `nx_controller_list`
2. `prism_cam` → `nx_controller_lookup` with `{ controller }`
3. `prism_cam` → `nx_material_lookup` with `{ material }`
4. `prism_cam` → `nx_cam_list_strategies`
5. `prism_cam` → `nx_cam_parameters` with `{ strategy, material, tool }`
6. `prism_cam` → `nx_addin_generate` with `{ target_dir }`

## Exit criteria
- Controller + material resolved.
- Strategy list + IPW/FBM parameters pulled.
- Add-in scaffold written.
