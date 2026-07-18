---
name: hypermill-combined_cycle-combined_cycle
description: hypermill CAM template for combined_cycle (native: combined cycle)
metadata:
  type: cam-template
  op: combined_cycle
  system: hypermill
  nativeKey: combined_cycle
---
## Purpose

The **combined_cycle** operation in **hypermill** — exposed natively as "combined cycle" (catalog key `combined_cycle`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In hypermill, this operation is reached via its catalog UI under the function family that owns "combined cycle". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `combined_cycle`
- CAM system: `hypermill`
- Native catalog key: `combined_cycle`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
