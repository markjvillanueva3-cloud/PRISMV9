---
name: powermill-strategy-guide
description: Autodesk PowerMill strategy selection — Vortex, raster, waterline.
---

# /powermill-strategy-guide

## Pipeline

1. `prism_cam` → `powermill_material_lookup` with `{ material }`
2. `prism_cam` → `powermill_safety_validate` with `{ strategy, material, params }`
3. `prism_cam` → `powermill_code_templates` with `{ strategy }`
4. `prism_cam` → `post_normalize_cam` with `{ cam: "powermill", strategy }`

## Exit criteria
- Strategy validated against safety rules.
- Material map resolved.
- Code templates retrieved.
