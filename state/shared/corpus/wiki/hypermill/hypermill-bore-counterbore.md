---
name: hypermill-bore-counterbore
description: hypermill CAM template for bore (native: counterbore)
metadata:
  type: cam-template
  op: bore
  system: hypermill
  nativeKey: counterbore
---
## Purpose

The **bore** operation in **hypermill** — exposed natively as "counterbore" (catalog key `counterbore`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In hypermill, this operation is reached via its catalog UI under the function family that owns "counterbore". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `bore`
- CAM system: `hypermill`
- Native catalog key: `counterbore`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
