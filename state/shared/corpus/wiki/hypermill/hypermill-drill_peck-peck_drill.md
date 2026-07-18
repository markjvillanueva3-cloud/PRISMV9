---
name: hypermill-drill_peck-peck_drill
description: hypermill CAM template for drill_peck (native: peck drill)
metadata:
  type: cam-template
  op: drill_peck
  system: hypermill
  nativeKey: peck_drill
---
## Purpose

The **drill_peck** operation in **hypermill** — exposed natively as "peck drill" (catalog key `peck_drill`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In hypermill, this operation is reached via its catalog UI under the function family that owns "peck drill". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `drill_peck`
- CAM system: `hypermill`
- Native catalog key: `peck_drill`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
