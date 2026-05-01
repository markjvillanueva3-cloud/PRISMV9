---
description: Run CollisionPreventionEngine checks for holder/shank clearance and axis travel limits
model: sonnet
effort: HIGH
---

# /hypermill-collision-check

## Args: $ARGUMENTS

Check for collision risks in a hyperMILL operation: holder clearance, shank clearance, travel limits.

Expected args: `[tool_diameter=<mm>] [tool_length=<mm>] [holder_dia=<mm>] [depth=<mm>] [feature=<type>] [axes=<3|5>]`

## Steps

1. Call `prism_cam` → `cam_hypermill_cycle_recommend` with feature_type and diameter_mm
   - Extract collision clearance defaults (holder, shank, extension, head)
2. Call `prism_cam` → `collision_check_full` with tool assembly parameters:
   - Tool diameter, gauge length, holder dimensions
   - Stock model dimensions from args
3. Call `prism_cam` → `cam_safety_validate` to cross-check with safety constraints

## Present to User

Show collision analysis:
- Holder clearance: required X.X mm vs. available X.X mm (PASS/FAIL)
- Shank clearance: required X.X mm
- Extension clearance: X.X mm
- Head clearance: X.X mm (typically 1.5mm default from hyperMILL)
- Minimum tool length required for this feature depth
- Risk zones: near-vertical walls, narrow channels, deep pockets
- Recommendation: extend tool by X mm or switch to stub-flute tool
