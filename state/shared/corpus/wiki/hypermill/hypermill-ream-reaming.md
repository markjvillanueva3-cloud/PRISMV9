---
name: hypermill-ream-reaming
description: hypermill CAM template for ream (native: reaming)
metadata:
  type: cam-template
  op: ream
  system: hypermill
  nativeKey: reaming
---
## Purpose

The **ream** operation in **hypermill** — exposed natively as "reaming" (catalog key `reaming`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In hypermill, this operation is reached via its catalog UI under the function family that owns "reaming". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `ream`
- CAM system: `hypermill`
- Native catalog key: `reaming`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
