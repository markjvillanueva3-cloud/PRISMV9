---
name: nxcam-combined_cycle-machining_knowledge_library
description: nxcam CAM template for combined_cycle (native: Machining Knowledge Library (MKE_LIBRARY))
metadata:
  type: cam-template
  op: combined_cycle
  system: nxcam
  nativeKey: machining_knowledge_library
---
## Purpose

The **combined_cycle** operation in **nxcam** — exposed natively as "Machining Knowledge Library (MKE_LIBRARY)" (catalog key `machining_knowledge_library`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `identity.library_id` | [object Object] |
| `identity.library_name` | [object Object] |
| `identity.library_scope` | [object Object] |
| `rules.rule_count` | [object Object] |
| `rules.rule_ids` | [object Object] |
| `inheritance.parent_library_id` | [object Object] |
| `inheritance.override_parent_rules` | [object Object] |
| `validation.enable_conflict_detection` | [object Object] |
| `validation.warn_on_priority_tie` | [object Object] |
| `validation.require_tested_templates_only` | [object Object] |
| `validation.last_validated_iso_date` | [object Object] |
| `validation.validation_pass_rate_pct` | [object Object] |

## System-specific notes

In nxcam, this operation is reached via its catalog UI under the function family that owns "Machining Knowledge Library (MKE_LIBRARY)". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `combined_cycle`
- CAM system: `nxcam`
- Native catalog key: `machining_knowledge_library`
- Parameter count: 12

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
