---
description: Select and configure a CNC controller family for hyperMILL post-processor output
model: sonnet
effort: HIGH
---

# /hypermill-controller-select

## Args: $ARGUMENTS

Select a hyperMILL controller family and post-processor variant for NC output.

Expected args: `<controller name or keyword> [axes=<3|4|5>] [capability=<interactive|turning|additive>]`

## Steps

1. Call `prism_cam` → `cam_controller_catalog` with the search query from $ARGUMENTS
   - Returns matched families with variants and G-code dialect
2. Call `prism_cam` → `cam_compare_controllers` if user wants comparison
3. Call `prism_cam` → `cam_hypermill_ppp_defaults` with matched controller_id
   - Returns post-process pipeline defaults for the controller

## Present to User

Show for each matched controller:
- Family name and manufacturer
- Available variants (axis count, code, capabilities)
- G-code dialect (fanuc / siemens / heidenhain / mazak / okuma)
- PPP defaults: kinematics mode, canned cycle support, TCP/RTCP availability
- Recommendation: best variant for requested axis count and operation type

Ask user to confirm selection before proceeding to NC generation.
