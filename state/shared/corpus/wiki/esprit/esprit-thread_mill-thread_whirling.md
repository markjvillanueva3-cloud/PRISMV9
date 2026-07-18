---
name: esprit-thread_mill-thread_whirling
description: esprit CAM template for thread_mill (native: thread whirling)
metadata:
  type: cam-template
  op: thread_mill
  system: esprit
  nativeKey: thread_whirling
---
## Purpose

The **thread_mill** operation in **esprit** — exposed natively as "thread whirling" (catalog key `thread_whirling`).

## Parameters

| Parameter | Default |
|-----------|---------|
| `thread` | _(none)_ |
| `whirl` | _(none)_ |
| `strategy` | _(none)_ |

## System-specific notes

In esprit, this operation is reached via its catalog UI under the function family that owns "thread whirling". The parameter list above is sourced verbatim from the operator-mapped catalog (no synthetic parts, no fabricated values).

## Wiring

- CamOperation id: `thread_mill`
- CAM system: `esprit`
- Native catalog key: `thread_whirling`
- Parameter count: 3

## Provenance

- realDataOnly: true
- sourceMilestone: CAM-AI-TRAINING-MS0
- sourceSlot: kilo
- operatorConstraint: no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)
