---
name: nxcam-combined_cycle-machining_knowledge_rule
description: nxcam CAM template for combined_cycle (native: Machining Knowledge Rule (MKE_RULE))
metadata:
  type: cam-template
  op: combined_cycle
  system: nxcam
  nativeKey: machining_knowledge_rule
---
## Purpose

The **combined_cycle** operation in **nxcam** — exposed natively as "Machining Knowledge Rule (MKE_RULE)" (catalog key `machining_knowledge_rule`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `identity.rule_id` | [object Object] |
| `identity.rule_name` | [object Object] |
| `identity.rule_description` | [object Object] |
| `match.feature_type` | [object Object] |
| `match.material_filter` | [object Object] |
| `match.min_depth_mm` | [object Object] |
| `match.max_depth_mm` | [object Object] |
| `match.min_diameter_mm` | [object Object] |
| `match.max_diameter_mm` | [object Object] |
| `action.applied_template` | [object Object] |
| `action.override_tool` | [object Object] |
| `action.override_feed_pct` | [object Object] |
| `action.override_speed_pct` | [object Object] |
| `constraints.required_machine_class` | [object Object] |
| `constraints.max_stickout_length_mm` | [object Object] |
| `constraints.minimum_rigidity_level` | [object Object] |
| `priority.priority` | [object Object] |
| `priority.enabled` | [object Object] |

## System-specific notes

In nxcam, this operation is reached via its catalog UI under the function family that owns "Machining Knowledge Rule (MKE_RULE)". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `combined_cycle`
- CAM system: `nxcam`
- Native catalog key: `machining_knowledge_rule`
- Parameter count: 18

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
