---
name: hypermill-face-back_spot_face
description: hypermill CAM template for face (native: back spot face)
metadata:
  type: cam-template
  op: face
  system: hypermill
  nativeKey: back_spot_face
---
## Purpose

The **face** operation in **hypermill** — exposed natively as "back spot face" (catalog key `back_spot_face`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In hypermill, this operation is reached via its catalog UI under the function family that owns "back spot face". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `face`
- CAM system: `hypermill`
- Native catalog key: `back_spot_face`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
