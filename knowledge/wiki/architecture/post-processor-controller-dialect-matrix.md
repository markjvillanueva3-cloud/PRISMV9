---
title: Post-Processor Controller Dialect Matrix
type: architecture
domain: post-processor
slot: echo
maintainer: echo
created: 2026-05-28
tags: [post-processor, controller-dialect, fanuc, okuma, haas, hurco, siemens, gcode, echo]
---

# Post-Processor Controller Dialect Matrix

Controller-dialect mismatch is the **#1 post-processor prove-out failure** (per echo's POST-PROCESSOR-CAPABILITY-ASSESSMENT). Every emitted NC must match the target controller's exact dialect. Dialect tables are constants — they live in `mcp-server/src/data/controller-dialects/<vendor>.ts`, **never inlined** in engines.

## Canonical dialect gotchas (the traps)

| Trap | Detail |
|------|--------|
| **Feed-rate mode** | G93 inverse-time vs G94 ipm vs G95 ipr — wrong mode = wildly wrong feed |
| **Coolant ordering** | M8 must follow M3-at-speed; M8-before-spindle = wet floor before tool engages |
| **Comment syntax** | Okuma OSP uses `[]`; Fanuc / Haas / Hurco use `()` |
| **Modal tapping** | Siemens `MCALL` vs Fanuc `G84` modal-tap |
| **Decimal convention** | some Fanuc reject `0.5`, require `.5` (or vice-versa) |
| **Modal-state leak** | modal G/M state must survive subprogram (M98/M99) calls — leak = silent wrong WCS/plane |
| **Safe retract** | missing retract between operations = rapid through stock |

## Controller coverage (14 in `MasterPostProcessorUnifiedAGIEngine`)

fanuc · siemens · haas · okuma · mazak · heidenhain · mitsubishi · fagor · hurco · dmg_mori · brother · doosan · citizen · generic.

**JM Die production (4 of 14):**

| Controller | High-end features in JM posts |
|-----------|-------------------------------|
| **Haas Classic** | iMachining var-feed (8-level), G187 P1/P2/P3 smooth, M8/M88/M89 coolant |
| **Hurco WinMAX (MAX5)** | UltiMotion G64, G05.3 P10/P20/P35 smooth, M98 sub, M140 Z-retract |
| **Okuma OSP-P300** | Super NURBS G131, TCP G169/G170 + G255/G254, CAS collision-avoid, polar G137, Y-mode G138, HSM G132 |
| **Fanuc 31i** | AICC II G05.1 Q1, Nano smooth G5.1 Q3, HSM G05 P10000 |

Heidenhain / DMG-Mori / Citizen / Brother are supported by the engine but unused at JM (corpus gap, not code gap).

## See also
- [[architecture/post-processor-galaxy]] · [[architecture/post-processor-pipeline]]
- `mcp-server/src/engines/post-processor/MEMORY.md` §Known failure modes (echo's dialect lessons)

_Authored by slot:echo (claude-223d9a61), 2026-05-28._
