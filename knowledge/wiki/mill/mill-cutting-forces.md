---
title: Mill Cutting Forces — Kienzle, components, power, deflection (calc-feed)
type: reference
domain: mill
tags: [mill, cutting-force, kienzle, kc11, specific-cutting-force, power, deflection, g-force, balance, calculation-feed]
status: living
created: 2026-06-12
author: slot:bravo
related: [mill-foundations, mill-chip-thinning, mill-machine-stack-reference, mill-toolholder-connection-style-reference, feedback_foxtrot_spindle_power_headroom, mill-data-contents-inventory]
---

# Mill Cutting Forces

> Operator ask 2026-06-12: *"g forces, cutting physics."* The cutting force is the **root input** to almost every other calc — power, deflection, chatter, workholding, and the safety gate all start here. PRISM models it with **Kienzle**; the constants are canonical in `mcp-server/src/physics/constants.ts` (**never inline — import**; this page documents + cites them).

## §1 — The Kienzle model (cite: `constants.ts:34-40`, `:878`)
> **Fc = kc1.1 · ap · fz^(1 − mc)**   (Kienzle 1957; `kienzleForce()` `constants.ts:878`)

where `kc1.1` = specific cutting force at 1 mm chip thickness [N/mm²], `ap` = axial depth, `fz` = feed/tooth, `mc` = chip-thickness exponent. The `^(1−mc)` makes force **sub-linear in feed** — doubling feed less-than-doubles force (the chip gets more *efficient* per mm³ as it thickens; this is *why* a heavier chip can be more economical). `CANONICAL_KIENZLE` per ISO group (Sandvik Coromant / ISO 3685):

| ISO | kc1.1 [N/mm²] | mc | Materials |
|-----|---------------|-----|-----------|
| **N** | **700** | 0.22 | aluminium, copper, brass (lowest force) |
| **K** | 1100 | 0.28 | gray/nodular iron, CGI |
| **P** | 1800 | 0.25 | carbon/alloy steel |
| **M** | 2100 | 0.25 | austenitic/duplex/PH stainless |
| **S** | 2800 | 0.27 | Inconel, Ti-6Al-4V, Waspaloy |
| **H** | **3200** | 0.30 | hardened tool steel HRC 45-65 (highest) |

kc1.1 spans **4.6×** (Al 700 → hardened 3200) — the single biggest force driver is *which material*. (Same ordering as machinability + Taylor life: high kc1.1 = hard to cut = short life = low SFM.)

## §2 — The three force components *(eng., standard decomposition)*
The resultant splits into:
- **Tangential `Fc`** (main cutting force, the Kienzle value) — sets **power + torque**.
- **Radial `Fp`** (perpendicular, pushes the tool *away* from the wall) — drives **deflection + wall taper + chatter**. Climb vs conventional flips its direction; a high lead angle adds to it.
- **Axial `Ff`** (feed direction; up the spindle for a high helix) — sets **pull-out demand on the holder** and is the *good* direction for thin-wall (high-feed mills steer force here).

## §3 — Force → power → the safety gate
> **Pc = Fc · Vc / η**   (cutting power; `cuttingPower()` in `constants.ts`)

This is **physics gate #3**: cutting power must stay ≤ **installed spindle HP − 20% headroom**, else `prism_safety:validate_physics` rejects the param set ([[feedback_foxtrot_spindle_power_headroom]]). Low-RPM heavy roughing is **torque**-limited (Fc × tool radius); high-RPM HSC is **power**-limited.

## §4 — Force → deflection
The **radial** `Fp` bends the tool as an L³/D⁴ cantilever (`toolDeflection()`; [[mill-toolholder-connection-style-reference]] §6, [[mill-cutting-tool-reference]] §2). More force OR more overhang OR thinner core → more deflection → wall taper + mismatch + chatter. A complete deflection calc is `Fp` × the **series** stack stiffness (tool+holder+spindle+frame, [[mill-machine-stack-reference]] §5), not just the tool.

## §5 — What changes the force
| Lever | Effect on Fc |
|-------|--------------|
| **Material (kc1.1)** | dominant — 4.6× across ISO groups (cite §1) |
| **ap (axial DOC)** | linear (×2 DOC → ×2 force) |
| **fz (feed/tooth)** | sub-linear, `^(1−mc)` (×2 feed → ~×1.8 force) |
| **Radial engagement (ae)** | sets how many teeth cut at once + the *average* force; below 50% ae the **chip-thins** ([[mill-chip-thinning]]) — the compensated higher feed raises peak force |
| **Rake / lead angle** | positive rake + sharp edge → lower force; negative rake → higher force, more stable |
| **Tool wear** | a worn (rounded) edge **raises** force + heat ([[mill-surface-finish-tool-wear]] §3) |

## §6 — Dynamic / "g" forces
Beyond the *cutting* force, the rotating assembly throws **inertial force F = m·e·ω²** — it grows with **RPM²**, so above ~8k RPM a holder's balance grade (G2.5) caps the safe speed ([[mill-toolholder-connection-style-reference]] §3). Axis **acceleration** on a fast toolpath (trochoidal direction changes) loads the ways/servos — the way type (box vs linear rail) sets how much accel is safe ([[mill-machine-stack-reference]] §2). These are the "g-forces" the *machine* must survive, distinct from the cutting force the *edge* must survive — both gate the recommendation.

## §7 — Feeds the calculations (the central one)
`Fc` (Kienzle) is the **input** the rest consume:
- → **power gate** (Pc = Fc·Vc/η ≤ HP − 20%) — the hard safety clamp.
- → **deflection** (radial `Fp` × series stiffness) — accuracy + chatter.
- → **torque** (Fc × radius) — the low-RPM roughing limit.
- → **workholding** (the cut's sliding/lifting force the fixture must beat, [[mill-workholding-reference]] §3).
- Doctrine: get kc1.1 right (the real material) and the chip-thinning factor right ([[mill-chip-thinning]]), and the *whole* downstream chain (power, deflection, finish, life, hold-down) is grounded. That's why this page is the root — **never inline kc1.1; import from `constants.ts` so every calc shares one truth.**

## Shop-floor tips (tribal)
- Force scales with material first (kc1.1 4.6× span), DOC second (linear), feed third (sub-linear) — to cut force, drop DOC before feed. (src: `constants.ts:34-40`)
- Radial force (not tangential) is what bends the tool and tapers the wall — finishing fights `Fp`, not `Fc`. (eng.)
- Heavy roughing is torque-limited at low RPM; HSC is power-limited at high RPM — different machine constraint, same Fc. (eng.)
- A worn edge raises cutting force — rising spindle load mid-job is a tool-wear signal, not just "harder material." (src: wear coupling)

## Source data (cite)
`constants.ts:34-40` (CANONICAL_KIENZLE kc1.1/mc per ISO, Sandvik/ISO 3685) · `:878` (`kienzleForce` Fc=kc1.1·ap·fz^(1−mc)) · `cuttingPower`/`toolDeflection`. Model structure: [[mill-foundations]]. Downstream: [[mill-chip-thinning]] · [[mill-machine-stack-reference]] · [[mill-toolholder-connection-style-reference]] · [[feedback_foxtrot_spindle_power_headroom]]. Full surface: [[mill-data-contents-inventory]].
