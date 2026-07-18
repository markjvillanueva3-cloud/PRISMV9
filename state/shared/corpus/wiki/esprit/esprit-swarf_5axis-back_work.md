---
name: esprit-swarf_5axis-back_work
description: esprit CAM template for swarf_5axis (native: back work)
metadata:
  type: cam-template
  op: swarf_5axis
  system: esprit
  nativeKey: back_work
---
## Purpose

The **swarf_5axis** operation in **esprit** — exposed natively as "back work" (catalog key `back_work`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `sub_spindle` | _(none)_ |
| `operations` | _(none)_ |
| `strategy` | _(none)_ |

## System-specific notes

In esprit, this operation is reached via its catalog UI under the function family that owns "back work". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `swarf_5axis`
- CAM system: `esprit`
- Native catalog key: `back_work`
- Parameter count: 3

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
