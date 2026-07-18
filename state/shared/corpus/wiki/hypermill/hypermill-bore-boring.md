---
name: hypermill-bore-boring
description: hypermill CAM template for bore (native: boring)
metadata:
  type: cam-template
  op: bore
  system: hypermill
  nativeKey: boring
---
## Purpose

The **bore** operation in **hypermill** — exposed natively as "boring" (catalog key `boring`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In hypermill, this operation is reached via its catalog UI under the function family that owns "boring". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `bore`
- CAM system: `hypermill`
- Native catalog key: `boring`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
