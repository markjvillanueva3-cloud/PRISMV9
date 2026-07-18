---
name: esprit-turn_rough-profitmilling_rough
description: esprit CAM template for turn_rough (native: profitmilling rough)
metadata:
  type: cam-template
  op: turn_rough
  system: esprit
  nativeKey: profitmilling_rough
---
## Purpose

The **turn_rough** operation in **esprit** — exposed natively as "profitmilling rough" (catalog key `profitmilling_rough`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `boundary` | _(none)_ |
| `levels` | _(none)_ |
| `engagement` | _(none)_ |
| `smoothing` | _(none)_ |
| `linking` | _(none)_ |

## System-specific notes

In esprit, this operation is reached via its catalog UI under the function family that owns "profitmilling rough". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `turn_rough`
- CAM system: `esprit`
- Native catalog key: `profitmilling_rough`
- Parameter count: 5

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
