---
name: esprit-face-face_mill
description: esprit CAM template for face (native: face mill)
metadata:
  type: cam-template
  op: face
  system: esprit
  nativeKey: face_mill
---
## Purpose

The **face** operation in **esprit** — exposed natively as "face mill" (catalog key `face_mill`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `region` | _(none)_ |
| `levels` | _(none)_ |
| `strategy` | _(none)_ |

## System-specific notes

In esprit, this operation is reached via its catalog UI under the function family that owns "face mill". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `face`
- CAM system: `esprit`
- Native catalog key: `face_mill`
- Parameter count: 3

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
