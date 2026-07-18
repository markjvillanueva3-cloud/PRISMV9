---
name: esprit-swarf_5axis-sub_spindle_handoff
description: esprit CAM template for swarf_5axis (native: sub spindle handoff)
metadata:
  type: cam-template
  op: swarf_5axis
  system: esprit
  nativeKey: sub_spindle_handoff
---
## Purpose

The **swarf_5axis** operation in **esprit** — exposed natively as "sub spindle handoff" (catalog key `sub_spindle_handoff`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `sync` | _(none)_ |
| `transfer` | _(none)_ |
| `cut_off` | _(none)_ |
| `validation` | _(none)_ |

## System-specific notes

In esprit, this operation is reached via its catalog UI under the function family that owns "sub spindle handoff". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `swarf_5axis`
- CAM system: `esprit`
- Native catalog key: `sub_spindle_handoff`
- Parameter count: 4

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
