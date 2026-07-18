---
name: esprit-slot-groove
description: esprit CAM template for slot (native: groove)
metadata:
  type: cam-template
  op: slot
  system: esprit
  nativeKey: groove
---
## Purpose

The **slot** operation in **esprit** — exposed natively as "groove" (catalog key `groove`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `profile` | _(none)_ |
| `strategy` | _(none)_ |

## System-specific notes

In esprit, this operation is reached via its catalog UI under the function family that owns "groove". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `slot`
- CAM system: `esprit`
- Native catalog key: `groove`
- Parameter count: 2

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
