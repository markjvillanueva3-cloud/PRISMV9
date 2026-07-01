---
description: Look up roughing cycle defaults and recommend roughing parameters for 2D/3D operations
model: sonnet
effort: HIGH
---

# /hypermill-rough

## Args: $ARGUMENTS

Look up hyperMILL roughing parameters — stepdown, stepover, allowance — for a given feature and tool.

Expected args: `[feature=<2d|3d|pocket>] [material=<name>] [diameter=<mm>] [depth=<mm>] [axial_doc=<mm>] [radial_doc=<mm>]`

## Steps

1. Determine feature type from args:
   - feature=2d or pocket → use "pocket" or "2d_contour"
   - feature=3d (default) → use "3d_rough"
2. Call `prism_cam` → `cam_hypermill_cycle_recommend` with feature_type, material, diameter_mm, depth_mm
   - `include_full_defaults`: true
3. Call `prism_cam` → `cam_cycle_defaults` filtered to roughing cycles for comparison
4. If user provides axial/radial DOC, call `cam_hypermill_validate_cycle_defaults` to check deviations

## Present to User

Show factory roughing defaults:
- Stepdown (VERTZUSTEL) [mm]
- Stepover (HORIZUSTEL) [mm] or radial depth
- Allowance (AUFMASS) [mm]
- Clearance plane (SICHEBENE) [mm]
- Ramp angle if applicable
- Any deviation warnings if user-provided params differ >30% from factory
