---
name: hypermill-thread_mill-thread_milling
description: hypermill CAM template for thread_mill (native: thread milling)
metadata:
  type: cam-template
  op: thread_mill
  system: hypermill
  nativeKey: thread_milling
---
## Purpose

The **thread_mill** operation in **hypermill** — exposed natively as "thread milling" (catalog key `thread_milling`).

## Parameters

_No default parameters declared in catalog. Operator supplies all values._

## System-specific notes

In hypermill, this operation is reached via its catalog UI under the function family that owns "thread milling". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `thread_mill`
- CAM system: `hypermill`
- Native catalog key: `thread_milling`
- Parameter count: 0

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
