---
description: Look up finishing cycle defaults and recommend finish pass parameters with tolerance-driven stepover
model: sonnet
effort: HIGH
---

# /hypermill-finish

## Args: $ARGUMENTS

Look up hyperMILL finishing parameters — stepover, tolerance, precision, surface quality — for a given feature.

Expected args: `[feature=<3d|2d|z-level|profile|equidistant>] [material=<name>] [diameter=<mm>] [Ra=<um>] [tolerance=<mm>]`

## Steps

1. Map feature to finish type:
   - z-level / steep → "3d_finish" with Z-Level Finishing
   - profile → "3d_finish" with Profile Finishing preference
   - equidistant / scallop → "3d_finish" with Equidistant Machining preference
   - 2d → "2d_contour" finishing pass
2. Call `prism_cam` → `cam_hypermill_cycle_recommend` with feature_type, material, diameter_mm, tolerance_mm
   - `include_full_defaults`: true
3. Call `prism_cam` → `cam_cycle_defaults` for detailed finishing defaults

## Present to User

Show finishing defaults:
- Stepover based on scallop height / Ra target
- Tolerance (CNTRES) and precision values
- Collision clearances: holder, shank, extension, head
- Macro approach/retract lengths (T:Dia*0.35 etc.)
- Slope angle limits (Z-Level vs. flat areas boundary)
- Cusp height formula: h = ae²/(8R) for ball-nose reference
