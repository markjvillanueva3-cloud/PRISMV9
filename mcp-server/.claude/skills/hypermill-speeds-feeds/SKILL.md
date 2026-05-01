---
description: Calculate physics-backed speeds and feeds for hyperMILL operations using SpeedFeedOrchestrator with hyperMILL material bridge
model: sonnet
effort: HIGH
---

# /hypermill-speeds-feeds

## Args: $ARGUMENTS

Calculate physics-optimised spindle speed and feedrate for a hyperMILL operation.

Expected args: `material=<name> tool_diameter=<mm> operation=<milling|drilling|tapping> [depth=<mm>] [feature=<drill|pocket|3d_rough>]`

## Steps

1. Call `prism_cam` → `cam_hypermill_material_to_physics` with the material name
   - Extract `iso_group` and `kc1_1`
2. Call `prism_cam` → `cam_hypermill_cycle_recommend` with:
   - `feature_type`: extracted from args (default "pocket")
   - `material`: as provided
   - `diameter_mm`: tool diameter from args
   - `include_speed_feed`: true
3. Call `prism_cam` → `cam_hypermill_calibration_compare` to flag any >20% deviation from catalog

## Present to User

Show in a compact table:
- Recommended Vc [m/min], n [RPM], fz [mm/tooth], Vf [mm/min]
- Cycle type with category
- Any calibration warnings (>20% deviation flagged)
- Factory defaults for stepdown, stepover, allowance
