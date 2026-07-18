---
title: Mill 5-Axis & Kinematics — configs, RTCP, singularity, 3+2 (safety + calc-feed)
type: reference
domain: mill
tags: [mill, 5-axis, kinematics, RTCP, TCP, singularity, trunnion, 3plus2, CYCLE800, TRAORI, collision, calculation-feed]
status: living
created: 2026-06-12
author: slot:bravo
related: [mill-machine-stack-reference, mill-toolholder-connection-style-reference, mill-workholding-reference, mill-advanced-techniques, mill-data-contents-inventory]
---

# Mill 5-Axis & Kinematics

> Operator ask 2026-06-12: *"kinematics."* The JM **VMC-02 Okuma M460V-5AX** (OSP-P300MA-H, trunnion) makes this real. 5-axis adds reach + single-setup complex parts — and a **divide-by-zero safety trap** (RTCP singularity) that the calc must gate before it ever posts a move.

## §1 — Kinematic configurations
| Config | Axes | Use | Rigidity |
|--------|------|-----|----------|
| **3-axis** | X Y Z | prismatic, 2.5D | highest |
| **Indexed 4th** | + A (or B) rotary, locked while cutting | repeat features around a part | high |
| **3+2 (positional)** | tilt to a fixed angle, then 3-axis cut | most "5-axis" work — angled faces, deep reach w/ short tools | high (axes clamped) |
| **Full 5-axis simultaneous** | all 5 moving together | impellers, blades, organic 3D | **lowest** (nothing clamped) |

**Machine kinematics:** **trunnion / table-table** (the M460V — part tilts on A/C or B/C) vs **head-head** (spindle tilts) vs **head-table**. The trunnion adds two rotary joints below the part → **rigidity drops vs a 3-axis bed**, and tilt **rotates the gravity + cutting-force vector** on the part *(eng.)*.

## §2 — RTCP / TCP (tool center point)
RTCP (a.k.a. TCPC / TCP) keeps the **tool TIP on the programmed path while the rotary axes move** — without it, rotating an axis swings the tip off the toolpath by the tool length. It's a real-time kinematic transform in the control:
- **Fanuc** (VMC-05 Roku-Roku class): `G43.4` / `G43.5` *(eng., standard)*.
- **Siemens** (Sinumerik 840D/828D): `CYCLE800` (swivel) + **`TRAORI`** (transform) + `TCP` — cite `milling-pdf-cited-tips.ts:893` (JM-curated Siemens 5-axis manual).
- **Okuma OSP-P300MA-H** (VMC-02): has an RTCP/5-axis tool-tip mode — *(verify the exact OSP command/G-code against the M460V post; UNVERIFIED here — the post is `OKUMA_M460V-5AX-Ai Enhanced-(iMachining).cps`)*.
- **Tool-vector drilling:** keep the drill axis on the hole normal through the pivot — `G08 P_ ASR` (cite `:253`, Cope post).

## §3 — The singularity (the safety gate — mill/CLAUDE.md gotcha #6)
At **A (or B) = 0 with the tool axis aligned to Z**, the RTCP transform **divides by zero** — the rotary axes can demand an instantaneous 180° flip to hold the vector, slamming the C axis. **Always check `MillKinematicsCollisionEngine.detectSingularity()` (also `Fusion360MillTurnBridgeEngine.detectSingularity()`) BEFORE generating any A-axis move < 0.5° from zero** (mill/CLAUDE.md §gotcha 6). This is a hard gate, not advisory — a posted simultaneous move through the singularity is a crash.

## §4 — 3+2 vs simultaneous (the practical trade — link [[mill-advanced-techniques]])
**Default to 3+2** unless the geometry truly needs simultaneous: 3+2 clamps the rotaries → full rigidity, simpler programming, shorter tools reaching angled features. Reserve full 5-axis simultaneous for surfaces a fixed tilt can't reach (impeller/blade/organic) — accept the rigidity + programming + singularity cost.

## §5 — Interactions (5-axis couples the whole stack)
| Couples to | Effect |
|------------|--------|
| **Machine** | trunnion rigidity < 3-axis bed; verify the M460V's actual RTCP support + travels before promising a simultaneous path. |
| **Holder** | tilt must clear the part → **slim nose** → HSK shrink-fit ([[mill-toolholder-connection-style-reference]]); a bulky chuck collides on steep angles. |
| **Work-holding** | low-profile 5-axis vise / zero-point so the jaws don't hit the spindle at tilt ([[mill-workholding-reference]] §1). |
| **Deflection** | tilt changes the effective overhang + the gravity/force vector → the deflection + chatter calc must use the *tilted* geometry, not the nominal Z. |
| **Toolpath** | tool-vector drill (G08), flowline/swarf finishing; the post must match the controller's RTCP dialect (echo's post-processor domain). |

## §6 — Feeds the calculations
- **Kinematic transform + `detectSingularity()`** → the **collision/safety gate** before any A<0.5° move (hard block).
- **Tilt angle → effective overhang + force vector** → the deflection + chatter calc uses the real tilted geometry.
- **3+2 vs simultaneous** → the rigidity term (clamped vs free rotaries) feeds the max-DOC/chatter budget.
- Doctrine: 5-axis is where geometry, the machine kinematics, and safety fuse — the calc can't treat a tilted cut like a 3-axis one. The singularity gate is non-negotiable; the rest (deflection/rigidity under tilt) is the refinement.

## §7 — JM fleet
- **VMC-02 Okuma M460V-5AX** (OSP-P300MA-H, trunnion) — the only simultaneous-5-axis machine; runs **iMachining** (constant-load adaptive, cite `jm-die-profile.ts:249`). Default 3+2; reserve simultaneous for true 3D.
- **VMC-05 Roku-Roku HC 658-II** — high-precision 3-axis (Fanuc 31i-B5); **no post registered yet** (program by hand / register a Fanuc post).

## Shop-floor tips (tribal)
- **3+2 first** — clamp the rotaries for rigidity; reach 90% of "5-axis" work with short tools + fixed tilt. (eng.)
- Never post a simultaneous move through A≈0 with the tool ∥ Z — the singularity flips C 180° → crash. Gate with `detectSingularity()`. (mill/CLAUDE.md #6)
- RTCP dialect is per-controller (Fanuc G43.4 / Siemens TRAORI+CYCLE800 / Okuma OSP) — the post must match the machine, not the CAM default. (src: `:893`)
- 5-axis needs a slim holder + low-profile fixture so nothing collides at tilt. (eng. + holder/workholding refs)

## Source data (cite)
`milling-pdf-cited-tips.ts:253` (G08 tool-vector drill), `:893` (Siemens CYCLE800/TRAORI/TCP, JM-curated), `:877` (hyperMILL 5-axis function catalog). `jm-die-profile.ts:249` (M460V iMachining). Singularity gate: mill/CLAUDE.md §gotcha 6 (`MillKinematicsCollisionEngine.detectSingularity`). Strategy: [[mill-advanced-techniques]]. Stack: [[mill-machine-stack-reference]]. Full surface: [[mill-data-contents-inventory]].
