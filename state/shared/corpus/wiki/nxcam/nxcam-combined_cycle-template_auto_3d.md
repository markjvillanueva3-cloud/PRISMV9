---
name: nxcam-combined_cycle-template_auto_3d
description: nxcam CAM template for combined_cycle (native: AUTO_3D Process Template (FBM_AUTO_3D))
metadata:
  type: cam-template
  op: combined_cycle
  system: nxcam
  nativeKey: template_auto_3d
---
## Purpose

The **combined_cycle** operation in **nxcam** — exposed natively as "AUTO_3D Process Template (FBM_AUTO_3D)" (catalog key `template_auto_3d`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `template.template_id` | [object Object] |
| `template.template_source_library` | [object Object] |
| `tool_selection.tool_selection_rule` | [object Object] |
| `tool_selection.min_tool_diameter_mm` | [object Object] |
| `tool_selection.max_tool_diameter_mm` | [object Object] |
| `tool_selection.prefer_existing_magazine` | [object Object] |
| `operation_overrides.rough_stepover_pct` | [object Object] |
| `operation_overrides.rough_depth_per_cut_mm` | [object Object] |
| `operation_overrides.finish_stepover_mm` | [object Object] |
| `operation_overrides.finish_stock_to_leave_mm` | [object Object] |
| `scope.apply_to_all_features_in_group` | [object Object] |
| `scope.feature_group_name` | [object Object] |
| `scope.skip_features_below_min_size` | [object Object] |
| `scope.generate_tool_paths_immediately` | [object Object] |
| `scope.log_skipped_features` | [object Object] |
| `scope.abort_on_first_collision` | [object Object] |

## System-specific notes

In nxcam, this operation is reached via its catalog UI under the function family that owns "AUTO_3D Process Template (FBM_AUTO_3D)". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `combined_cycle`
- CAM system: `nxcam`
- Native catalog key: `template_auto_3d`
- Parameter count: 16

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
