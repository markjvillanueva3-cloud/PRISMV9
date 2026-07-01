---
name: nx-strategy-guide
description: Siemens NX CAM strategy guide — IPW, FBM, adaptive milling.
---

# /nx-strategy-guide

## Pipeline

1. `prism_cam` → `nx_cam_list_strategies`
2. `prism_cam` → `nx_cam_recommend` with `{ operation, material, tool, feature }`
3. `prism_cam` → `nx_cam_parameters` with `{ strategy, material, tool }`
4. `prism_cam` → `nx_cam_ipw` with `{ part_id, stock_id }` (if adaptive)
5. `prism_cam` → `nx_cam_fbm` with `{ part_id }` (if feature-based)
6. `prism_cam` → `nx_code_templates` with `{ strategy }`

## Exit criteria
- Strategy + parameters resolved.
- IPW / FBM context available when relevant.
- Code templates ready to post.
