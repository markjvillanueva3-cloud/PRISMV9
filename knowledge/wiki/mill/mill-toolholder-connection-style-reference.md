---
title: Mill Tool-Holder Connection & Style Reference (ratings + interactions)
type: reference
domain: mill
tags: [mill, toolholder, connection, taper, HSK, BIG-PLUS, shrink-fit, hydraulic, collet, runout, balance, damping, deflection, calculation-feed]
status: living
created: 2026-06-12
author: slot:bravo
related: [mill-toolholder-selection, mill-data-contents-inventory, mill-machine-stack-reference, mill-foundations, feedback_foxtrot_spindle_power_headroom]
---

# Mill Tool-Holder Connection & Style Reference

> Deep comparative reference (operator directive 2026-06-12): every **connection type** (spindle interface) and **holder style**, with **ratings** (accuracy, repeatability/tolerancing, vibration damping, grip/holding pressure, balance limit) and how each **interacts** with the spindle contact point, machine, table, tooling, cutting parameters, material, and toolpath. **Purpose: feed the calculation engines** — §6 maps every rating to the PRISM calculation it sharpens. Numbers cite the catalog they came from; comparative ratings are anchored to those real numbers + established holder engineering (marked *(eng.)*).

The holder is a **two-axis choice**: the **CONNECTION** (how it mates the spindle) and the **STYLE** (how it clamps the tool). They are independent — a CAT40 *shrink-fit*, a CAT40 *ER collet*, an HSK-A63 *shrink-fit* all exist.

---

## §1 — CONNECTION (spindle interface) types

| Interface | Contact | Stiffness | Repeatability | RPM ceiling | Pull-out resistance | In corpus / notes |
|-----------|---------|-----------|---------------|-------------|---------------------|-------------------|
| **CAT** (ASME B5.50) | Single — 7/24 taper only | Good | Good | Moderate; pulls up at high RPM *(eng.)* | Retention knob | CAT40 ×69, CAT50 ×51; the JM Haas/Hurco class |
| **BT** (JIS B6339 / MAS-403) | Single — 7/24 taper, symmetric flange | Good | Good (better balance than CAT) | Moderate–High | Retention knob | BT40 ×161, BT30 ×108, BT50 ×62 |
| **SK / DIN** (DIN 69871) | Single — 7/24 taper | Good | Good | Moderate | Retention knob | Haimer carries SK30/40/50 (src: `haimer-holder-catalog.ts:3`) |
| **BIG-PLUS** (BBT/BCV) | **Dual — taper + flange face simultaneously** | High | High; ~zero Z pull-up at speed | High | Retention knob | src: `big-daishowa-holders.ts:16` |
| **HSK-A** (DIN 69893) | **Dual — hollow short taper + face**, spring-collet drawbar | Very high | Very high (face datum) | **Very high — but FALLS with size**: HSK-A32 60k → A40 45k → A50 36k → **A63 25k** RPM (src: `regofix-holder-catalog.ts:27-51`) | Internal expanding segments — excellent | A63 ×318 (dominant), A100 ×90, A125 ×63 |
| **HSK-E / -F** | Dual, symmetric (no drive slots) | High | Very high | Highest (best balance) | Lighter drive | HSK-E ×23 |
| **PSC / Capto** (ISO 26623, polygon) | **Dual — polygon taper + face** | Very high | Very high | High | Polygon self-centering | Haimer carries PSC (src: `haimer-holder-catalog.ts:3`) |

Key facts: (1) **Dual-contact (BIG-PLUS/HSK/Capto) hold Z-position and stiffness at RPM where single-taper CAT/BT pull up** — that pull-up is a hidden depth-of-cut error in high-speed finishing *(eng.)*. (2) **HSK max RPM drops as the taper grows** — confirmed in the data (A32 60k → A63 25k, src: regofix) — because rim speed and drawbar dynamics scale with size; never assume "HSK = high RPM" without the size.

## §2 — STYLE (clamping method) — RATINGS

Ratings 1–5 (5 = best). Runout/balance/RPM columns are **real catalog values**; the 1–5 grades are comparative *(eng.)* anchored to them.

| Style | Accuracy (runout TIR) | Repeatability / tolerancing | Vibration damping | Grip / holding pressure | Balance limit (RPM) | Cited runout/RPM |
|-------|----------------------|------------------------------|-------------------|--------------------------|---------------------|------------------|
| **Shrink-fit** | 5 — ≤3 µm @4×D, shank-h6-limited | 5 (no moving parts) | 2 (rigid, little damping) | 4 (full-circumference interference) | 5 — e.g. 50k (src: `big-daishowa-holders.ts:15,79`) | ≤3 µm |
| **Hydraulic** | 5 — <3 µm; **1 µm** Super-Slim UP (src: `big-daishowa-holders.ts:13`) | 5 | **5 — oil-film damping** | 3 (lower torque than shrink) | 4 | <3 µm / 1 µm |
| **Milling / power chuck** | 3 — <2 µm at edge HMC (src: `big-daishowa-holders.ts:14`) | 4 | 4 | **5 — highest grip torque** | 3 (bulky nose) | <2 µm edge |
| **Precision collet (powRgrip/AA)** | 4 — 3 µm (src: `regofix-holder-catalog.ts:27`) | 4 | 3 | 3 | 4 — G2.5, e.g. 25–60k by taper (src: regofix) | 3 µm |
| **ER collet (standard)** | 3 — stack of holder+collet+nut *(eng.)* | 3 (re-set each swap) | 3 | 3 | 3 | catalog-dependent |
| **Shell-mill arbor** | 3 — 5 µm (src: `seco-toolholders-catalog.ts:42`) | 4 | 4 (large face-mill mass) | 5 (drive keys) | 3 — PB/G6.3 (src: seco) | 5 µm |
| **Side-lock / Weldon** | 1 — offset set-screw | 2 | 2 | **5 — positive anti-pull-out** | 1 (asymmetric) | — |

## §3 — Balance & runout, quantified
- **Balance grade** sets the safe RPM: imbalance force F = m·e·ω² grows with **RPM²** *(eng.)*. Corpus carries **G2.5** (precision, src: `regofix-holder-catalog.ts:27`) and **G6.3** (general, src: `seco-toolholders-catalog.ts:80`); BIG DAISHOWA uses **ISO 16084** with a per-model `max_rpm` instead of a G-grade (src: `big-daishowa-holders.ts:6`). Above ~8,000 RPM, balance is mandatory; honor the holder's catalog `max_rpm`.
- **Runout** adds **directly** to tool TIR and the effective chip load on the high side → uneven wear + finish scatter *(eng.)*. Finishing wants ≤3 µm (shrink/hydraulic/precision-collet); roughing tolerates 5–10 µm.

## §4 — Gauge length / projection (stiffness lever)
Holder + tool projection is a **cantilever**: deflection ∝ L³ *(eng.)*. The catalogs carry `gauge_length_mm` (e.g. Haimer 80/100/160/200 mm variants, src: `haimer-holder-catalog.ts:21,37,47`). **Always pick the shortest gauge length that clears the part** — a 200 mm slim shrink reaches deep pockets but trades ~2× the deflection of the 80 mm variant at the same load.

## §5 — INTERACTIONS (how the holder couples to the rest of the machine)

| Couples to | Effect of the holder choice |
|------------|------------------------------|
| **Spindle contact point** | Single-taper (CAT/BT) seats on the 7/24 taper only → axial pull-up at RPM. Dual-contact (BIG-PLUS/HSK/Capto) adds the **face datum** → fixed Z + higher radial stiffness. A worn/dirty taper destroys *any* holder's runout — clean the taper, it is the real datum. |
| **The machine** | A BIG-PLUS holder only gives dual contact on a **BIG-PLUS-ready spindle**; on a standard spindle it acts as a normal single-taper holder. HSK needs an HSK spindle + drawbar. Match the holder interface to what the spindle actually has (verify per machine). Drawbar force sets real grip. |
| **The table / workpiece** | Holder Z pull-up shifts the real cutting depth vs the programmed Z — on a finishing pass referenced from a table-set datum, single-taper pull-up shows up as a depth error. Dual-contact removes it. |
| **The tooling attached** | Shrink-fit needs **h6 shanks**; a worn/undersized shank kills the interference grip (src: `big-daishowa-holders.ts:15`). Heavy/long tools demand grip (power chuck) + short gauge length. Tool mass + length shift the holder's balance and resonance. |
| **Cutting parameters** | High RPM → balance + runout dominate (HSC finishing) → shrink/hydraulic + G2.5. High MRR/torque (heavy roughing) → grip dominates → power chuck/side-lock, accept runout. DOC/feed set the radial force the holder+taper must resist without pull-out. |
| **The material** | Hardened steel / hard-milling → max rigidity (shrink + HSK) so the tool doesn't deflect into the cut. Aluminium HSC → balance + RPM (shrink/hydraulic, high G2.5 RPM). Superalloys/Ti → damping (hydraulic) to fight chatter at low SFM, plus rigidity. |
| **The toolpath type** | HSM/trochoidal = high RPM + constant light engagement → balance + runout (shrink/hydraulic). Heavy adaptive roughing = grip (power chuck). 5-axis = slim nose to clear tilt + dual contact (HSK shrink-fit). Reaming/boring = damping (hydraulic). |

## §6 — Feeds the calculations (why this matters)
Each rating is a **measurable input** to a PRISM physics calculation — capturing it makes the calc real instead of nominal:
- **Runout (µm)** → effective per-tooth chip load on the high-flute + a tool-life derate (a known runout halves life; see [[feedback_foxtrot_spindle_power_headroom]] sibling derates). Wire from the holder's catalog `runout_um`.
- **Stiffness / gauge length** → the L³ cantilever **deflection model** (`toolDeflection()` in `mcp-server/src/physics/constants.ts`) — holder stiffness + projection set the deflection at a given radial force.
- **Balance grade + max_rpm** → the **safe-RPM clamp**: never let the speed/feed solver recommend an RPM above the holder's catalog `max_rpm` (F ∝ RPM²).
- **Damping rating** → the **chatter / stability-lobe** model — a hydraulic holder shifts the stability boundary up vs a rigid shrink holder; a future SLD calc should take a holder-damping term.
- **Grip torque** → the **max-MRR clamp**: a side-lock vs power-chuck sets how much cutting torque can transmit before pull-out/slip.

Doctrine: a calculation that ignores the holder assumes a *perfect* holder (0 runout, infinite stiffness, infinite grip). Real holder ratings are how we replace that optimism with the truth — that is the operator's "the more we understand, the better the calculations."

## §7 — JM Die fleet mapping
- **VMC-02 Okuma M460V-5AX** (5-axis, high-RPM) → HSK-A63 shrink-fit for finishing (dual contact + slim nose); honor the A63 ~25k RPM ceiling (src: regofix). *(verify the M460V spindle interface in `jm-die-profile.ts` — UNVERIFIED which taper it accepts.)*
- **VMC-01/03/04** (Hurco VM30i, Haas VF-2/OM-2, 3-axis CAT40/BT40) → power chuck for roughing, shrink/hydraulic for finishing.

## Source data (cite)
`big-daishowa-holders.ts` (runout/ISO16084/types) · `haimer-holder-catalog.ts` (489 holders, 11 tapers, gauge lengths) · `regofix-holder-catalog.ts` (G2.5, runout 3µm, max_rpm-by-taper) · `seco-toolholders-catalog.ts` (shell-mill, 5µm, PB/G6.3) · `tungaloy-holder-catalog.ts` · `tribal-tips/milling-pdf-cited-tips.ts` (toolholder bucket). Decision summary: [[mill-toolholder-selection]]. Full data surface: [[mill-data-contents-inventory]] §2. Stack siblings: [[mill-machine-stack-reference]].
