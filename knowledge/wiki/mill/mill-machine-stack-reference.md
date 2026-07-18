---
title: Mill Machine-Stack Reference — spindle, table, ways/guides, frame (ratings + calc-feed)
type: reference
domain: mill
tags: [mill, spindle, ways, guides, linear-rail, box-way, table, machine, rigidity, thermal, kinematics, deflection, chatter, calculation-feed]
status: living
created: 2026-06-12
author: slot:bravo
related: [mill-toolholder-connection-style-reference, mill-data-contents-inventory, mill-foundations, mill-applied-practice, feedback_foxtrot_spindle_power_headroom]
---

# Mill Machine-Stack Reference

> Operator directive 2026-06-12: the SAME comparative-ratings + interactions + **calculation-feed** lens as [[mill-toolholder-connection-style-reference]], now for the **spindle, table, ways/guides, and the machine frame** — "down to the atomic level… so our calculations can be modified and expanded." The machine is the foundation under the holder: every µm of holder runout sits on top of spindle runout, and every Newton of cutting force is reacted by the ways, table, and frame. A speed/feed or deflection calc that ignores the machine assumes an *infinitely rigid, perfectly true, thermally stable* machine — these are the terms that replace that fiction.
>
> **Grounding note:** the comparative engineering below is universal/textbook *(eng.)*. The JM fleet is cited from `mcp-server/src/data/jm-die-profile.ts`. Machine-specific spindle/HP/taper/way numbers are NOT in that file — where a specific figure would be needed it is marked **(UNVERIFIED — confirm vs manufacturer spec / `ShopConfigurationEngine.ts`)** rather than fabricated.

## JM Die mill fleet (cite: `jm-die-profile.ts:248-252`)
| ID | Machine | Control | Class / notes |
|----|---------|---------|---------------|
| VMC-01 | Hurco VM30i | WinMAX v10 | 3-axis VMC, conversational+G-code |
| VMC-02 | **Okuma M460V-5AX** | OSP-P300MA-H | **5-axis** trunnion, iMachining post |
| VMC-03 | Haas VF-2 | PRE-NGC | 3-axis workhorse VMC |
| VMC-04 | Haas OM-2 | PRE-NGC | office-mill / small-envelope |
| VMC-05 | **Roku-Roku HC 658-II** | Fanuc 31i-B5 | high-precision (graphite/hard-mill class); **NO post registered yet** — real gap |

---

## §1 — SPINDLE
The spindle is the runout + power + thermal source. Holder runout adds to **spindle runout**, not zero.

| Attribute | What it means | Rating axis | Feeds calc |
|-----------|---------------|-------------|-----------|
| **Bearing type** | Angular-contact ball (high RPM, lower load), cylindrical/tapered roller (high load, lower RPM), hybrid ceramic (highest RPM, low thermal growth) *(eng.)* | RPM ceiling vs stiffness vs thermal | safe-RPM clamp; deflection (spindle stiffness term) |
| **Taper interface** | CAT/BT/HSK/Capto at the spindle nose — single vs **dual contact** (see holder ref §1). The spindle's interface caps which holders mount. | rigidity, repeatability | depth-accuracy (pull-up), deflection |
| **Power / torque curve** | Constant-torque below base speed, constant-power above. Low-RPM torque limits heavy roughing; high-RPM power limits HSC. | available HP/torque vs RPM | **spindle-power gate** (cutting power ≤ installed HP − 20% headroom — [[feedback_foxtrot_spindle_power_headroom]]) |
| **Runout (TIR)** | Spindle nose true-running error, µm | accuracy | effective chip-load + tool-life derate (stacks with holder runout) |
| **Thermal growth** | Spindle grows on the Z axis as bearings heat → Z drifts microns over a run; precision work needs warm-up + comp *(eng.)* | accuracy over time | thermal-comp / first-vs-Nth-part accuracy |
| **Drawbar force** | Clamps the holder taper; low force → pull-out under heavy cut | grip | max-MRR clamp |

Interactions: a roller-bearing spindle (VF-2 class, UNVERIFIED) favors heavy low-RPM roughing; a high-RPM angular-contact/ceramic spindle (5-axis finishing class like M460V, UNVERIFIED) favors HSC + small tools. The **M460V-5AX runs iMachining** (cite: `jm-die-profile.ts:249`) — a constant-load adaptive strategy that exists precisely to keep spindle power/torque in the flat part of the curve.

## §2 — WAYS / GUIDES (the single biggest rigidity-vs-speed trade)
This is the machine's defining choice — and the operator's "guides."

| Way type | Damping | Stiffness / load | Speed (rapids/accel) | Stick-slip / fine motion | Wear | Best for |
|----------|---------|------------------|----------------------|---------------------------|------|----------|
| **Box / dovetail ways** (cast, hand-scraped, oil film) | **5 — high (large oil-film contact area)** | **5 — very high, large contact** | 2 — slow, high friction | 3 — can stick-slip | self-bedding, long life if lubed | **heavy roughing, hard milling, chatter-prone cuts** |
| **Linear roller/ball rails** (THK/NSK type) | 2 — low (point/line contact) | 3–4 (rating + preload dependent) | **5 — fast, low friction, high accel** | **5 — smooth, repeatable** | needs clean rails; finite L10 life | **HSC, 5-axis, fine finishing, fast toolpaths** |
| **Hybrid (roller + damper / hydrostatic)** | 4 | 4–5 | 4 | 5 | — | high-precision + speed (jig-mill class, e.g. Roku-Roku) |

Rule *(eng.)*: **box ways damp chatter, linear rails enable speed.** A trochoidal/HSM toolpath needs the *acceleration* of linear rails; a full-width hog in 4340 wants the *damping* of box ways. The way type shifts the chatter stability boundary as much as the holder does — a linear-rail machine taking a heavy cut chatters where a box-way machine would not.

## §3 — TABLE & work envelope
| Attribute | Effect | Feeds calc |
|-----------|--------|-----------|
| **Table mass / rigidity** | More mass = more vibration absorption + thermal inertia; sets how much the cut "rings" *(eng.)* | chatter/SLD (damped mass term) |
| **T-slot pattern / size** | Sets fixturing options + max clamp force the table can react | workholding-force limit |
| **Travels (X/Y/Z)** | Caps part size + reach; long-Z = more spindle overhang = lower rigidity at full extension | deflection (overhang), part-fit |
| **Trunnion / rotary (5-axis)** | The M460V trunnion adds B/C (or A/C) — rigidity drops vs a 3-axis bed; tilt changes the gravity + force vector on the part *(eng.)* | 5-axis deflection + collision/RTCP (singularity gate, see mill/CLAUDE.md §gotcha 6) |

## §4 — MACHINE FRAME / KINEMATICS
| Attribute | Effect | Feeds calc |
|-----------|--------|-----------|
| **Frame material** | Cast iron (good damping), polymer/mineral concrete (better damping + thermal stability), weldment (stiff, less damping) *(eng.)* | chatter/SLD, thermal stability |
| **Kinematic config** | C-frame VMC (the JM VMCs) vs bridge/gantry vs box-in-box — sets the structural loop stiffness from tool to table | deflection (structural loop), accuracy |
| **Thermal symmetry** | Asymmetric heat (one ballscrew, one motor) → the frame bows → position drift over a shift *(eng.)* | thermal-comp, accuracy-over-time |
| **Structural loop** | The full force path tool→holder→spindle→column→base→table→fixture→part. The **weakest link** sets the real deflection — a perfect holder on a flexible column still deflects | the deflection budget is a SERIES sum, not just the tool cantilever |

## §5 — THE STACK AS A SERIES SYSTEM (why this feeds calculations)
Cutting force flows through a **series of springs**: tool → holder → spindle → ways → table → fixture → part. Compliances **add**; the **stiffest link does not save a flexible one** *(eng.)*. So:
- **Deflection** isn't just `toolDeflection()` (the tool cantilever) — it's the series sum of tool + holder + spindle + structural-loop compliance. A complete calc takes a machine-stiffness term, not infinity.
- **Chatter / stability lobe** depends on the **whole loop's** dominant mode + damping — box-way + cast frame + hydraulic holder all raise the stable depth; linear-rail + weldment + shrink holder lower it. The future SLD calc needs a machine-damping + way-type input, not a tool-only FRF.
- **Spindle-power gate** uses the real HP curve at the actual RPM, not a flat rating ([[feedback_foxtrot_spindle_power_headroom]]).
- **Accuracy** degrades with thermal growth (spindle + frame) over a run — a first-part-vs-Nth-part calc needs a thermal term.

**Doctrine (the operator's intent):** every rating in §1–§4 is a real, measurable machine parameter. Capturing them per-machine (the JM fleet) turns each PRISM physics calc from *nominal* (perfect machine) to *true* (this machine, this day). The next builds: populate per-VMC spindle/way/rigidity/thermal terms (from `ShopConfigurationEngine.ts` + manufacturer specs) so the speed/feed + deflection + chatter calcs can read them.

## Source data (cite)
`jm-die-profile.ts:238-257` (the real machine fleet + controllers). Comparative engineering: textbook machine-tool design *(eng.)*. Holder counterpart: [[mill-toolholder-connection-style-reference]]. Per-machine mechanical specs: **NOT yet in a single data file** — open gap (populate from `ShopConfigurationEngine.ts` + manufacturer datasheets). Full data surface: [[mill-data-contents-inventory]] §5.
