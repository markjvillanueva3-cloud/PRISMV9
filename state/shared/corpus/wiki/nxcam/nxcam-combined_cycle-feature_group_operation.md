---
name: nxcam-combined_cycle-feature_group_operation
description: nxcam CAM template for combined_cycle (native: Feature Group Batch Operation (FBM_FEATURE_GROUP))
metadata:
  type: cam-template
  op: combined_cycle
  system: nxcam
  nativeKey: feature_group_operation
---
## Purpose

The **combined_cycle** operation in **nxcam** — exposed natively as "Feature Group Batch Operation (FBM_FEATURE_GROUP)" (catalog key `feature_group_operation`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `group.group_id` | [object Object] |
| `group.group_name` | [object Object] |
| `group.member_feature_ids` | [object Object] |
| `group.parent_group_id` | [object Object] |
| `batching.batch_by_tool` | [object Object] |
| `batching.batch_by_depth` | [object Object] |
| `batching.minimum_feature_count_per_tool` | [object Object] |
| `batching.allow_tool_change_per_feature` | [object Object] |
| `ordering.ordering_rule` | [object Object] |
| `ordering.shortest_path_optimization` | [object Object] |
| `ordering.respect_clamp_zones` | [object Object] |
| `cycle_time.estimated_tool_change_sec` | [object Object] |
| `cycle_time.estimated_rapid_between_sec` | [object Object] |
| `cycle_time.report_cycle_estimate` | [object Object] |

## System-specific notes

In nxcam, this operation is reached via its catalog UI under the function family that owns "Feature Group Batch Operation (FBM_FEATURE_GROUP)". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `combined_cycle`
- CAM system: `nxcam`
- Native catalog key: `feature_group_operation`
- Parameter count: 14

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
