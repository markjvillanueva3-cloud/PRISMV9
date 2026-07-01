---
name: reference_lathe_phase3_deflection_millturn_predictive_2026_06_13
description: "Lathe (whiskey) Phase-3 deeper anchor — Hermes-planned. (1) Dynamic tool deflection + turning chatter (boring-bar δ=FL³/3EI, L/D limits, Altintas-Tlusty SLD for turning); (2) mill-turn synchronized live-tool + sub-spindle (DMG MORI NT, part transfer, Y/B-axis) + Sandvik PrimeTurning all-directional turning; (3) PREDICTIVE machining models Oxley/Childs/Jaspers (flow-stress → force/temp, vs empirical Kienzle); (4) parametric macro roughing; (5) cryogenic/MQL surface integrity (Fraunhofer IPT, NIST AMO). Written 2026-06-13 slot:zulu Hermes-loop."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.639Z
aliases: reference_lathe_phase3_deflection_millturn_predictive_2026_06_13
---


**Context:** Phase-3 lathe anchor — planned by the **Hermes bridge** in the per-galaxy harnessed loop. Deepens
[[reference_lathe_threading_infeed_tnr_2026_06_13]] (Phase-2). Spec: `FLEET-KNOWLEDGE-MAX-ROADMAP-2026-06-13.md` §whiskey.

## 1. Dynamic deflection + turning chatter (the precision limiter)
- **Boring-bar / slender-part deflection** is the dominant turning accuracy problem: static tip deflection
  δ = F·L³/(3·E·I) (cantilever), I = πd⁴/64 → deflection ∝ (L/d)³ → the L/D overhang rule (steel bar ≤4:1,
  carbide/heavy-metal ≤6-8:1, tuned-mass dampers beyond). Drives boring-bar material + minimum-stickout selection.
- **Turning chatter / SLD:** Altintas + Tlusty regenerative-chatter applied to turning (plunge/boring) — the
  lathe analog of the milling SLD ([[reference_speed-feed_sfc_chatter_sld_taylor_2026_06_13]]); FRF tap-test of
  the bar → stable depth vs rpm. Deflection-compensated turning offsets the path by predicted δ.

## 2. Mill-turn (the modern lathe is a turning center)
- **Synchronized live-tooling + sub-spindle:** main↔sub spindle synchronized transfer (G-codes for spindle
  sync, part hand-off), C-axis (indexed/interpolated), Y-axis (off-center milling), B-axis (full 5-axis mill-turn).
  Reference: **DMG MORI NT-series** programming + done-in-one strategy.
- **Sandvik PrimeTurning** — all-directional turning (enter from the chuck end, trailing-edge cutting) → higher
  feed + tool life vs conventional; a genuine world-leading turning methodology.

## 3. PREDICTIVE machining models (beyond empirical)
- **Oxley** parallel-sided-shear-zone theory (strain, strain-rate, temperature-dependent flow stress → cutting
  force + shear angle from first principles), **Childs**, **Jaspers** material models. These PREDICT force/temp
  from the material's constitutive (Johnson-Cook) flow stress — vs PRISM's empirical Kienzle kc1.1. The path to
  material-physics-grounded SFC (validate Kienzle predictions against Oxley for new materials).

## 4. Parametric / macro high-efficiency roughing
- Heidenhain TNC cycles, Kennametal **NOVO**, Mitsubishi Machining **NAVI** — knowledge-based parametric
  roughing parameter selection. Pairs with adaptive/HEM (mill Phase-2).

## 5. Cryogenic + MQL (surface integrity + tool life)
- Cryogenic (LN2/CO2) + Minimum-Quantity-Lubrication effects on tool life, residual stress, white-layer / surface
  integrity — esp. titanium/Inconel/hardened. Reference Fraunhofer IPT + NIST AMO reports.

## Wiring / consumers (R15)
- GALAXY: `engines/lathe/` (whiskey). CONSUMERS: speed-feed/oscar (deflection + predictive force into the SFC),
  shop-floor (mill-turn done-in-one scheduling), quality (deflection → tolerance). DOMAIN: lathe + mill-turn;
  the Oxley predictive-model link is fleet-wide (validates Kienzle for all cutting galaxies).
- AUTO-INVOCATION: none (knowledge anchor); deflection-compensation + Oxley-predictor are whiskey+oscar build units.

## Next (Phase-4, per Hermes)
Implement boring-bar deflection compensation + a turning SLD from tap-test FRF; prototype an Oxley force predictor
to cross-check Kienzle. Pairs with oscar (SFC physics).

Sources (Hermes-planned): Altintas *Manufacturing Automation* + Tlusty (machining dynamics); NIST machining-
dynamics papers; Oxley *Mechanics of Machining* + Childs + Jaspers predictive models; DMG MORI NT programming;
Sandvik Coromant PrimeTurning; Heidenhain/Kennametal NOVO/Mitsubishi NAVI; Fraunhofer IPT + NIST AMO cryo/MQL.
Planner: Hermes (xAI Grok, :8645).
