---
name: hypermill-chamfer-chamfer_drill
description: hypermill CAM template for chamfer (native: chamfer drill)
metadata:
  type: cam-template
  op: chamfer
  system: hypermill
  nativeKey: chamfer_drill
---
## Purpose

The **chamfer** operation in **hypermill** — exposed natively as "chamfer drill" (catalog key `chamfer_drill`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In hypermill, this operation is reached via its catalog UI under the function family that owns "chamfer drill". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `chamfer`
- CAM system: `hypermill`
- Native catalog key: `chamfer_drill`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
