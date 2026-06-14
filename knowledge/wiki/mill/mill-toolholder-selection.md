---
title: Mill Tool-Holder Selection
type: reference
domain: mill
tags: [mill, toolholder, holder, shrink-fit, hydraulic, collet, HSK, BT, CAT, runout, balance]
status: living
created: 2026-06-12
author: slot:bravo
related: [mill-data-contents-inventory, mill-insert-grade-coating-selection, tooling-selection-geometry-coating-stickout, mill-foundations]
---

# Mill Tool-Holder Selection

> Grounded in PRISM's tool-holder catalogs (2,322 lines across 6 vendors) — a surface that had **zero** wiki coverage before 2026-06-12. Every numeric spec here cites the data file it came from; general holder-engineering principles are textbook and marked as such. The cutting tool only matters if the holder transmits it accurately — holder runout adds *directly* to the tool's effective TIR, and a 10 µm runout halves insert life and doubles surface-finish scatter.

## Holder data on hand (cite)
`big-daishowa-holders.ts` (458 ln) · `tungaloy-holder-catalog.ts` (522) · `haimer-holder-catalog.ts` (508) · `seco-toolholders-catalog.ts` (502) · `regofix-holder-catalog.ts` (292) · `guhring-holder-catalog.ts` (40) · plus `kennametal-tooling-systems-catalog.ts`, `tooling-systems-extracted.json`. Type/spec coverage across them (grep counts): shrink-fit ×548, ER/collet ×468, **runout spec ×466**, balance(incl. G2.5) ×583, HSK-A63 ×318, BT40 ×161, BT30 ×108, HSK-A100 ×90, Weldon ×76, CAT40 ×69, HSK-A125 ×63, BT50 ×62, CAT50 ×51, hydraulic ×49, side-lock ×29, HSK-E ×23.

`ToolholderSpec` schema (src: `big-daishowa-holders.ts:20`): `model, type(shrink_fit|hydraulic|milling_chuck|collet_chuck|power_chuck|side_lock), taper, bore_range_mm, gauge_length_mm, max_rpm, runout_um, balance_grade, clamping_torque_nm?, weight_kg?`.

## §1 — Spindle-interface (taper) standards present in the corpus

| Interface | What it is | When | In data |
|-----------|-----------|------|---------|
| **CAT40 / CAT50** (ANSI/ASME B5.50) | Solid V-flange, single taper contact, retention knob. US standard. | General 3-axis VMCs; CAT40 = the JM Haas/Hurco class | CAT40 ×69, CAT50 ×51 |
| **BT30 / BT40 / BT50** (JIS / MAS-403) | Symmetric flange (better balance than CAT), single taper | Higher-RPM, Asian machine standard | BT40 ×161, BT30 ×108, BT50 ×62 |
| **BIG-PLUS (BBT/BCV)** | Dual contact — **simultaneous taper + flange face** fit; near-zero Z pull-up at speed | High-RPM precision on BIG-PLUS spindles | src: `big-daishowa-holders.ts:16` |
| **HSK-A40…A125** (DIN 69893) | Hollow-taper, **dual contact**, spring-collet drawbar; very high stiffness + repeatability | HSC / 5-axis / high-RPM finishing | HSK-A63 ×318 (dominant), A100 ×90, A125 ×63, A40 ×32 |
| **HSK-E / HSK-F** | Symmetric (no drive slots) — best balance, lower torque | Ultra-high-RPM, light cuts | HSK-E ×23 |

Rule: dual-contact interfaces (BIG-PLUS, HSK) hold Z-position and stiffness at RPM where single-taper CAT/BT pull up and lose flange contact — that pull-up is a hidden source of depth-of-cut error in high-speed finishing.

## §2 — Holder TYPE → runout / rigidity / RPM (textbook trade-off, numbers cited)

| Type | Runout (TIR) | Grip / rigidity | Best for | Watch-outs |
|------|-------------|-----------------|----------|-----------|
| **Shrink-fit** | Best — ~3 µm or better at 4×D; depends on tool shank h6 (src: `big-daishowa-holders.ts:15`) | High, symmetric, slim nose | High-RPM finishing, 5-axis, deep pockets (slim profile clears walls) | Needs induction heater; fixed bore per holder; h6 shanks only |
| **Hydraulic** | <3 µm at 4×D standard; **1 µm** "Super Slim UP" (src: `big-daishowa-holders.ts:13`) | High + **vibration damping** (oil film) | Reaming, boring, finish where chatter is the enemy | Lower max torque/RPM than shrink; temperature-sensitive |
| **Milling / power chuck** | <2 µm at tool edge, HMC series (src: `big-daishowa-holders.ts:14`) | **Highest grip torque** | Heavy roughing, full-slot, high MRR | Bulkier nose; higher runout than shrink |
| **ER / collet chuck** | ~3 µm at 4×D, AA-grade collets (src: `big-daishowa-holders.ts:11,17`) | Moderate (collet + nut dependent) | Versatile/economical, drilling, general; wide bore range per holder (e.g. 0.45–8.05 mm, src: `big-daishowa-holders.ts:78`) | Runout = holder + collet + nut stack; re-check after every collet swap |
| **Side-lock / Weldon** | Poor (offset set-screw) | Positive anti-pull-out drive | Indexable cutters, U-drills, high-torque where pull-out is the risk | Bad balance + runout → roughing only, low RPM |

## §3 — Selection decision (operation × constraint → holder)

- **Finishing, high RPM (≥12k), 5-axis** → shrink-fit or hydraulic on HSK-A63 (the dominant 5-axis interface in the corpus). Slim shrink nose clears tilted walls.
- **Heavy roughing / full-slot** → milling/power chuck (max torque) on BT/CAT40; accept the runout — finish is a later op.
- **Reaming / boring / chatter-prone** → hydraulic (oil-film damping).
- **Drilling / general / mixed shank sizes** → ER collet (one holder, many shanks). Re-indicate runout per collet.
- **Indexable cutter or pull-out risk** → side-lock/Weldon, low RPM.
- **Balance:** above ~8,000 RPM, balance grade matters (imbalance force ∝ RPM²). The corpus carries G2.5 balance ×583; BIG DAISHOWA balances per **ISO 16084** and specifies a per-model max RPM instead of a G-grade (src: `big-daishowa-holders.ts:6`). Honor the holder's catalog `max_rpm` — e.g. MEGA MICRO CHUCK is rated 50,000 RPM (src: `big-daishowa-holders.ts:79`).

## §4 — JM Die fleet mapping
- **VMC-02 Okuma M460V-5AX (5-axis, high-RPM)** → HSK-A63 shrink-fit for finishing; HSK is the only corpus interface with the dual-contact stiffness 5-axis tilted cuts need. *(inference from holder physics + the M460V 5-axis spindle; verify the actual spindle interface in `jm-die-profile.ts` before ordering — UNVERIFIED which taper the M460V spindle accepts.)*
- **VMC-01/03/04 (Hurco VM30i, Haas VF-2/OM-2, 3-axis)** → CAT40/BT40; milling chuck for roughing, shrink/hydraulic for finish.

## Shop-floor tips (tribal)
- Holder runout adds **directly** to tool TIR — a 5 µm holder + 5 µm tool concentricity ≠ 5 µm; budget the stack. (general)
- Shrink-fit is the slimmest nose → reach into deep/narrow pockets a chuck body can't. (src: big-daishowa shrink family)
- After every ER collet change, sweep the bore — collet + nut torque dominate the runout. (src: big-daishowa AA-collet note)
- Hydraulic's oil film damps chatter — reach for it on reaming/boring before changing RPM. (src: big-daishowa hydraulic spec)
- Above 8k RPM, an unbalanced holder throws force ∝ RPM² — match the holder's catalog `max_rpm`, never exceed it. (src: big-daishowa ISO 16084 note)
- `toolholder_selection` / `five_axis_toolholding` cited tips live in `mcp-server/src/data/tribal-tips/milling-pdf-cited-tips.ts` (~20 tips) — query that operation bucket for vendor-specific guidance.

## Source data (cite)
`big-daishowa-holders.ts` (458) · `tungaloy-holder-catalog.ts` (522) · `haimer-holder-catalog.ts` (508) · `seco-toolholders-catalog.ts` (502) · `regofix-holder-catalog.ts` (292) · `guhring-holder-catalog.ts` (40) · `tribal-tips/milling-pdf-cited-tips.ts` (toolholder bucket). Full surface: [[mill-data-contents-inventory]] §2.
