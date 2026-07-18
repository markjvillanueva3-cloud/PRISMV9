---
name: reference_oscar_sfc_axis_impact_gap_2026_06_08
description: "VERIFIED SFC capability gap — PRISM speed/feed physics responds ONLY to material-ISO-group, diameter, flutes, cut-type, strategy, mode. It IGNORES tool material, coolant, holder, machine, spindle, controller, workholding, insert (all inert — passing them changes nothing)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.695Z
aliases: reference_oscar_sfc_axis_impact_gap_2026_06_08
---


# SFC axis-impact gap — what actually moves the speed/feed number (2026-06-08, slot:oscar)

Operator challenged the "all potential inputs" sweep claim: "did you run every combination of
machines, spindles, controllers, materials, workholding, tool-holder connection+mechanism
(balance/maxspeed/rigidity/damping/accuracy), tooling+insert, coolant, toolpath, cutting params?"
Honest answer: NO. Probing the orchestrator one-axis-at-a-time exposed a deeper gap.

## VERIFIED by one-axis-at-a-time probe (AISI 4140, Ø12, 4FL, flood, conventional, prism_optimized)
**Axes that MOVE the output (modeled):**
- material ISO GROUP (6 distinct: P/M/K/N/S/H) · tool diameter · flutes · cut_type
- toolpath strategy (conventional Vc=140 → adaptive Vc=196) · optimization mode

**Axes that are INERT — passing them changes NOTHING (verified identical Vc/feed):**
- tool material: carbide ≡ HSS ≡ ceramic ALL Vc=140 (HSS should be ~3× slower — NOT modeled)
- coolant type: flood ≡ mist ≡ dry all Vc=140 (NOT modeled at Vc level)
- tool holder type: cat40 ≡ hsk63 ≡ er32 all Vc=140
- material within ISO group: 6061≡7075, 304≡316, D2≡A2≡WC-Co
- machine (rigidity stays 1 even "rigid VMC") · spindle (taper/power/maxrpm) · controller (Fanuc)
- workholding (feasibility flag only) · holder balance/maxspeed/rigidity/damping/accuracy · insert

## Why this matters (it's the saleable product)
`NineAxisInput` HAS slots for machine/spindle/controller/workholding/tool_holder — they're
ACCEPTED but the physics ignores them. For a "Speed & Feed Calculator", ignoring tool material
and coolant is a fundamental gap (both are first-order in Taylor VT^n=C and Vc selection). The
69,120-cell "full sweep" only had ~6 effective output-changing axes; coolant + holder + within-
group-material were inert padding. The "all potential inputs" framing was OVERSTATED.

## Real path forward (BLOCKED on physics, not sweep size)
A genuine "every combination" sweep is pointless until the SFC MODELS these axes. Order of
fundamentality: (1) tool material → Taylor C/n + Vc differentiation (carbide/HSS/ceramic/cermet);
(2) coolant → thermal/speed factor; (3) holder+machine+spindle rigidity → deflection/chatter Vc
caps; (4) insert geometry → fz. Each: wire + real-reference test + live-validate, THEN sweep.
SAFETY: these change recommended cutting speeds (scrap/tool-crash risk) → S(x)≥0.98 gated,
operator-signoff before shipping. Awaiting operator go-ahead on starting with tool material.

Siblings: [[reference_oscar_sfc_full_input_sweep_2026_06_08]] (the sweep this audits),
[[reference_oscar_sfc_closed_loop_training_2026_06_08]]. Pre-existing related: task #52
prism_calc:speed_feed cross-ISO same-Vc (different code path).
