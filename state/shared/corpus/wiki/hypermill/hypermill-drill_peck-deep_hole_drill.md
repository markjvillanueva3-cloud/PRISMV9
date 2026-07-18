---
name: hypermill-drill_peck-deep_hole_drill
description: hypermill CAM template for drill_peck (native: deep hole drill)
metadata:
  type: cam-template
  op: drill_peck
  system: hypermill
  nativeKey: deep_hole_drill
---
## Purpose

The **drill_peck** operation in **hypermill** — exposed natively as "deep hole drill" (catalog key `deep_hole_drill`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In hypermill, this operation is reached via its catalog UI under the function family that owns "deep hole drill". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `drill_peck`
- CAM system: `hypermill`
- Native catalog key: `deep_hole_drill`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
