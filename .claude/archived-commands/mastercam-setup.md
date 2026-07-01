---
name: mastercam-setup
description: Configure Mastercam integration for PRISM — controller lookup, material map, safety rules, and API connect.
---

# /mastercam-setup

Bootstraps Mastercam so PRISM can drive it end-to-end.

## Pipeline

1. `prism_cam` → `mastercam_controller_list`
2. `prism_cam` → `mastercam_controller_lookup` with `{ controller }`
3. `prism_cam` → `mastercam_material_lookup` with `{ material }`
4. `prism_cam` → `mastercam_safety_rules`
5. (Optional) `prism_cam` → `mastercam_api_connect` with `{ host, port }`
6. `prism_cam` → `mastercam_addin_generate` with `{ target_dir }`

## Exit criteria
- Controller profile resolved.
- Material entry found or flagged for ingest.
- Safety rules downloaded.
- Add-in scaffold written.
