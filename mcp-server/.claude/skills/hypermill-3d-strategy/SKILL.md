---
description: Recommend 3D milling strategies (roughing, finishing, rest machining) with physics cycle pipeline
model: sonnet
effort: HIGH
---

# /hypermill-3d-strategy

## Args: $ARGUMENTS

Recommend a hyperMILL 3D milling strategy for freeform surfaces with physics-backed parameters.

Expected args: `phase=<rough|finish|rest> [material=<name>] [diameter=<mm>] [depth=<mm>] [axes=<3|5>] [controller=<id>]`

## Steps

1. Map `phase` to feature type:
   - rough → "3d_rough"
   - finish → "3d_finish"
   - rest → "3d_rough" (with Optimized Rest Roughing preference)
2. Call `prism_cam` → `cam_hypermill_cycle_recommend` with feature_type, material, diameter_mm, depth_mm, controller_id
   - `include_speed_feed`: true
3. If axes=5, also call for "5axis_swarf" recommendation
4. Call `prism_cam` → `cam_multiaxis_recommend` for additional 5-axis strategy context

## Present to User

Show:
- Primary recommended cycle with category and code
- Factory defaults: stepdown, stepover, tolerance, precision, collision clearances
- Physics S/F: Vc, n, fz, Vf
- Holder/shank clearance requirements
- Collision avoidance parameters
- 5-axis tilting strategy if applicable (swarf, normal, tangent)
- Alternative cycles ranked by surface quality vs. cycle time
