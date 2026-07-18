---
title: Mill Surface Finish & Tool Wear (formulas, modes, calc-feed)
type: reference
domain: mill
tags: [mill, surface-finish, Ra, cusp, scallop, tool-wear, taylor, flank-wear, BUE, tool-life, calculation-feed]
status: living
created: 2026-06-12
author: slot:bravo
related: [mill-cutting-tool-reference, mill-thermal-heat-management, mill-chip-thinning, mill-foundations, mill-data-contents-inventory]
---

# Mill Surface Finish & Tool Wear

> Operator ask 2026-06-12: *"surface finshes… tool wear."* Coupled on purpose — **a worn tool makes a worse finish** (the edge rounds, rubs, and tears), so the two share a page. Surface-finish formulas are cited/derivable; tool-life is grounded in the Taylor constants in `mcp-server/src/physics/constants.ts`.

## §1 — Surface finish — the geometry decides it
Finish is mostly **geometric** (feed + corner/step-over), not RPM-magic *(eng. + cited)*.

**Peripheral / face (flat floors & walls):** theoretical roughness
> **Ra ≈ fz² / (32 · r_corner)**  (Brammertz form — `predictedRa()` in `constants.ts`)

→ halve the feed-per-tooth or double the corner radius to cut Ra ~4×/2×. (Bigger corner radius also strengthens the edge — but raises radial force.)

**3D contour (ball-nose, the cusp/scallop between passes):**
> **cusp height h ≈ stepover² / (8 · r_tool)**  (cite: `milling-pdf-cited-tips.ts:4278`, PT Solutions)

Step-over bands (cite `:4277`): **3-5% Ø = mirror/fine · 6-8% = good visible-fine · 10%+ = scallops you can feel.** Trade-off: smaller step-over = better finish, longer cycle — *no way around it; step-over matters more than RPM* (`:4278`).

**Ball-nose trap (cite `:4230`):** SFM at the tip = 0 (radius→0). Programming SFM from the *full* diameter under-speeds the actual contact → **rubbing → smeared/burnt finish on the right material.** Fix: compute the **effective cutting diameter** at the real DOC and raise RPM to bring effective SFM to spec.

**Process levers:** climb milling (surface + tool life both win, cite `:3110`); low holder runout — **shrink-fit for finishing** because runout drives finish (cite `:1750`); a dedicated **finish pass** at low DOC + low ae after roughing leaves 0.010-0.030″ and semi-finish restores datums (cite `:3462`).

## §2 — Tool wear — modes + Taylor life
**Taylor tool life:** `V · Tⁿ = C` (cite: `constants.ts` CANONICAL_TAYLOR / `_RAW_MATERIAL_DB taylor_C/taylor_n`). Higher cutting speed `V` → sharply shorter life `T`. The constants tell the story per material:

| Material | taylor_C | taylor_n | Life behavior |
|----------|----------|----------|---------------|
| 6061/7075 Al, Cu, brass (N) | **600** | 0.40 | long life, speed-tolerant |
| 1018/1045/4140 steel (P) | 350 | 0.25 | moderate |
| gray iron (K) | 250 | 0.25 | moderate (abrasive) |
| 304/316 stainless (M) | 200 | 0.20 | short (work-hardens) |
| **Ti-6Al-4V / Inconel (S)** | **150** | 0.18 | **short — heat at edge** ([[mill-thermal-heat-management]]) |
| D2/A2/WC (H) | 120 | 0.15 | shortest (hardness) |

(The low-C materials are exactly the low-k ones — heat at the edge IS the wear driver; see thermal page §2.)

**Wear MODES (read the worn edge to know what to change)** *(eng., standard taxonomy):**
| Mode | Looks like | Cause | Fix |
|------|-----------|-------|-----|
| **Flank wear (VB)** | even land on the relief face | normal abrasion; too-high speed | lower Vc; harder grade |
| **Crater wear** | dish on the rake face | diffusion at high temp (steel) | CVD/Al₂O₃ coating; lower speed |
| **Built-up edge (BUE)** | metal welded to the edge, torn finish | too-LOW speed, gummy/aluminium | RAISE speed; sharp/uncoated; coolant |
| **Chipping** | small fractures on the edge | interrupted cut, vibration, too-tough load | tougher grade; reduce shock; check rigidity |
| **Thermal cracking** | comb cracks ⟂ to edge | thermal cycling (interrupted + coolant) | dry on interrupted iron; steadier temp |
| **Notching** | wear at the DOC line | hard skin / work-hardened layer (stainless, superalloy) | vary DOC; tougher edge |

## §3 — The coupling (worn tool → worse finish)
As flank wear grows, the edge rounds → it rubs/ploughs instead of shearing → **finish degrades, cutting force + heat rise, the part can grow from the extra heat.** So the finish spec sets a *hidden* tool-life limit: change the tool when finish drifts, not just when it's "dull." Conversely, BUE is a *low-speed* finish-killer — the fix is faster, not slower.

## §4 — Feeds the calculations (operator intent)
- **`predictedRa(fz, r)`** → does this param set meet the print's Ra callout? If not, the solver must drop `fz`, raise `r`, or add a finish pass — a real constraint, not an afterthought.
- **Cusp `stepover²/(8r)`** → the step-over the 3D finish needs → cycle-time (more passes) — the finish↔cycle-time trade quantified.
- **Taylor `V·Tⁿ=C`** → tool-change interval → **cost-per-part** (`tool_price / parts_per_tool`), the ROI axis in [[mill-tooling-corpus-index]].
- **Wear mode → which knob:** BUE→speed up; crater→coating/speed-down; chipping→rigidity/grade. A self-improving SFC should classify the wear it observes and adjust, not just count minutes.
- Doctrine: finish + wear are *outputs* the calc should predict and gate on — wiring `predictedRa`, the cusp formula, and Taylor into the recommendation closes the loop between "params" and "does the part pass + how long does the tool last."

## Shop-floor tips (tribal)
- Finish is feed + corner radius + step-over — **not RPM**. Chasing finish with RPM tweaks is the rookie move. (src: `:4278`)
- Ball-nose smeared finish = SFM-from-full-diameter trap; use effective diameter + raise RPM. (src: `:4230`)
- Torn finish + welded edge = BUE = too SLOW → speed UP (opposite of intuition). (eng. + wear table)
- Shrink-fit (lowest runout) for finishing; runout directly prints into the surface. (src: `:1750`)
- 3-5% Ø step-over = mirror; every % of step-over you add trades finish for cycle time. (src: `:4277`)

## Source data (cite)
`constants.ts` (`predictedRa` Brammertz, CANONICAL_TAYLOR + `_RAW_MATERIAL_DB taylor_C/n`). Cited tips `milling-pdf-cited-tips.ts`: `:3110` (climb), `:3462` (finish pass), `:4230` (ball-nose effective dia), `:4277`/`:4278` (cusp step-over), `:1750` (shrink for finish). Thermal driver: [[mill-thermal-heat-management]]. ROI: [[mill-tooling-corpus-index]]. Full surface: [[mill-data-contents-inventory]].
