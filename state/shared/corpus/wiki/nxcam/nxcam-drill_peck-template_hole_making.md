---
name: nxcam-drill_peck-template_hole_making
description: nxcam CAM template for drill_peck (native: HOLE_MAKING Process Template (FBM_HOLE_MAKING))
metadata:
  type: cam-template
  op: drill_peck
  system: nxcam
  nativeKey: template_hole_making
---
## Purpose

The **drill_peck** operation in **nxcam** — exposed natively as "HOLE_MAKING Process Template (FBM_HOLE_MAKING)" (catalog key `template_hole_making`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `template.template_id` | [object Object] |
| `template.apply_spot_drill_first` | [object Object] |
| `operation_chain.use_peck_for_deep_holes` | [object Object] |
| `operation_chain.peck_depth_to_diameter_ratio` | [object Object] |
| `operation_chain.use_chip_break_cycle` | [object Object] |
| `operation_chain.finish_by_ream_if_tolerance_below_um` | [object Object] |
| `tapping.rigid_tapping_enabled` | [object Object] |
| `tapping.tap_chamfer_lead_threads` | [object Object] |
| `tapping.tap_retract_feed_multiplier` | [object Object] |
| `overrides.spot_drill_depth_mm` | [object Object] |
| `overrides.drill_point_angle_deg` | [object Object] |
| `overrides.coolant_mode` | [object Object] |
| `overrides.abort_on_broken_tap` | [object Object] |
| `overrides.generate_paths_immediately` | [object Object] |

## System-specific notes

In nxcam, this operation is reached via its catalog UI under the function family that owns "HOLE_MAKING Process Template (FBM_HOLE_MAKING)". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `drill_peck`
- CAM system: `nxcam`
- Native catalog key: `template_hole_making`
- Parameter count: 14

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
