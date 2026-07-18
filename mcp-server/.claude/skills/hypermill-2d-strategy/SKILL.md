---
description: Recommend 2D milling strategies (pocket, contour, face) with cycle type and factory defaults
model: sonnet
effort: HIGH
---

# /hypermill-2d-strategy

## Args: $ARGUMENTS

Recommend a hyperMILL 2D milling strategy for a given feature type and material.

Expected args: `feature=<pocket|contour|face|slot> [material=<name>] [diameter=<mm>] [depth=<mm>] [controller=<id>]`

## Steps

1. Call `prism_cam` → `cam_hypermill_cycle_recommend` with:
   - `feature_type`: from args ("pocket", "2d_contour", "face", or "slot")
   - `diameter_mm`, `depth_mm`, `material`, `controller_id` from args
   - `include_full_defaults`: true
2. Call `prism_cam` → `cam_strategy_recommend` for the feature type and material
3. Call `prism_cam` → `cam_hypermill_validate_cycle_defaults` if user provides custom params

## Present to User

Show:
- Recommended 2D cycle (Pocket Milling, Contour Milling, Face Milling, etc.)
- Factory defaults table: stepdown, stepover, allowance, tolerance, clearance plane
- Strategy recommendation: climb vs. conventional, approach type
- Controller-specific notes (canned cycle format, approach macro)
- Alternatives with reasons (axisparallel vs. contour-parallel pocket)
