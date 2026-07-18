---
name: hypermill-drill_spot-spot_drill
description: hypermill CAM template for drill_spot (native: spot drill)
metadata:
  type: cam-template
  op: drill_spot
  system: hypermill
  nativeKey: spot_drill
---
## Purpose

The **drill_spot** operation in **hypermill** — exposed natively as "spot drill" (catalog key `spot_drill`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In hypermill, this operation is reached via its catalog UI under the function family that owns "spot drill". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `drill_spot`
- CAM system: `hypermill`
- Native catalog key: `spot_drill`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
