---
name: esprit-thread_mill-thread
description: esprit CAM template for thread_mill (native: thread)
metadata:
  type: cam-template
  op: thread_mill
  system: esprit
  nativeKey: thread
---
## Purpose

The **thread_mill** operation in **esprit** — exposed natively as "thread" (catalog key `thread`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `thread` | _(none)_ |
| `passes` | _(none)_ |

## System-specific notes

In esprit, this operation is reached via its catalog UI under the function family that owns "thread". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `thread_mill`
- CAM system: `esprit`
- Native catalog key: `thread`
- Parameter count: 2

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
