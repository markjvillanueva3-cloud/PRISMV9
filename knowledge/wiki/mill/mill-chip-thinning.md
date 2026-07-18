---
title: Mill Chip Thinning — radial & axial feed compensation (formulas + calc-feed)
type: reference
domain: mill
tags: [mill, chip-thinning, RCTF, AFPT, feed-compensation, radial-engagement, lead-angle, HSM, speed-feed, calculation-feed]
status: living
created: 2026-06-12
author: slot:bravo
related: [mill-cutting-tool-reference, mill-tooling-corpus-index, mill-foundations, mill-data-contents-inventory]
---

# Mill Chip Thinning

> Operator ask 2026-06-12: *"chip thinning."* This is the single most impactful speed/feed correction and mill **physics gate #1** (mill/CLAUDE.md: *chip-thinning compensation is NON-OPTIONAL when radial engagement < 50% of cutter diameter*). Skip it and you **under-feed** the cut — the chip runs thinner than the insert's rated band, so it **rubs instead of cuts → work-hardening, heat, premature wear, and lost MRR**. Every formula below is cited to a real source in `mcp-server/src/data/tribal-tips/milling-pdf-cited-tips.ts`.

## §1 — Why it happens
The per-tooth feed `fz` you program is the *arc* advance, but the **actual chip thickness** is the *radial* bite, which shrinks as radial engagement (`ae`/WOC) drops below half the diameter — the tooth enters and exits the cut over a shorter arc, peeling a thinner chip *(eng.)*. Full-width slotting (`ae = D`) has **no thinning**; HSM/adaptive (`ae = 5-15% D`) has a lot.

## §2 — RADIAL chip thinning (the two cited formulas — and they diverge)
**Exact geometric (Ingersoll MAXline, `:345`):** when `ae < 50% D`, the chip-thinning factor (multiply programmed `fz`/chip to compensate) is
> **RCTF = 1 / √(1 − (1 − 2·ae/D)²)**   ≡ 1/sin(arccos(1 − 2·ae/D))

**Simplified small-ae (DAPRA/Sandvik, `:615`/`:616`):**
> **fz_comp = fz × √(D / ae)**   (Sandvik form: `fhz = fz × √(D/ae)`; DAPRA AFPT: `IPM × √(D/WOC)`)

**They disagree — surface it, don't average (R7):** the two cited sources give different factors, so know which to use:

| ae/D | RCTF (exact, Ingersoll) | √(D/ae) (approx, DAPRA/Sandvik) |
|------|--------------------------|----------------------------------|
| 50% | **1.00** (no thinning) | 1.41 |
| 25% | 1.15 | 2.00 |
| 10% | **1.67** | 3.16 |
| 5% | 2.29 | 4.47 |

(Numbers are arithmetic from the cited formulas.) The **exact geometric RCTF is correct at the boundary** (factor = 1.0 at 50% immersion, where peak chip = `fz`); the `√(D/ae)` form **over-compensates and should only be used at small ae** (it's a convenient HSM approximation, not exact) *(eng.)*. **Default to the geometric RCTF; treat `√(D/ae)` as the aggressive HSM shortcut.**

## §3 — AXIAL (lead/entering-angle) chip thinning (cited `:285`)
A lead angle `KAPR < 90°` (45° face mills, ball noses, chamfer mills) spreads the same feed over a longer edge → thinner chip:
> **effective fz = programmed fz × sin(KAPR)**  → compensate feed by **1/sin(KAPR)**

(45° lead: sin45°≈0.707 → effective chip 0.707×, compensate ×1.41.) Ball-nose at shallow DOC has a continuously varying effective lead — the thinning is severe near the tip.

## §4 — Regime guide (cited)
| Operation | ae regime | Action | Cite |
|-----------|-----------|--------|------|
| **Slotting (full width)** | ae = D | **NO thinning — reduce feed 30-50% vs side-milling** | `:127` |
| **Face milling (optimal)** | ae = 60-75% D | mild thinning; near the sweet spot | `:85` |
| **HSM / adaptive / trochoidal** | ae = 5-15% D, full axial DOC (1-2×D) | **heavy radial comp (RCTF ~1.5-2.3) → 2-3× faster, longer life** | `:141` |
| **45° face mill** | — | axial comp ×1.41 (sin45°) | `:285` |

Both compensations **stack** (radial × axial) when a low-lead cutter runs at low immersion.

## §5 — Feeds the calculations (operator intent)
- **RCTF (or √(D/ae)) × `fz`** → the **compensated feed** the speed/feed solver must emit below 50% radial engagement — otherwise the recommendation under-feeds and the "MRR" is a fiction (the *effective* MRR is lower than `ae·ap·vf`, `:600`).
- **The compensation also restores tool life** — running the rated chip keeps the edge cutting (not rubbing), so the Taylor calc holds.
- This is a **hard gate, not advisory**: `AdvancedMillingStrategiesEngine` owns the canonical factor — never re-derive it inline; mill/CLAUDE.md §gotcha 1. A solver that emits a sub-50%-ae param set without RCTF is wrong by construction.
- Doctrine: chip thinning is the bridge between the *toolpath strategy* (which sets `ae`) and the *feed* — wiring RCTF into the speed/feed engine is exactly the "expand the calculations" the operator wants; the data (formulas + regimes) is now all here.

## Shop-floor tips (tribal)
- Below 50% radial engagement, **feed UP** by the RCTF or the tool rubs and burns — the #1 silent HSM mistake. (src: `:345`)
- At 10% engagement the exact factor is **1.67×**, not the 3.16× the `√(D/ae)` shortcut suggests — the shortcut over-feeds at very low ae. (src: `:345` vs `:615`)
- Slotting is the opposite — full width = no thinning, **reduce** feed 30-50%. (src: `:127`)
- A 45° face mill already thins the chip ×0.707 from the lead angle alone — compensate even at high radial engagement. (src: `:285`)

## Source data (cite)
`milling-pdf-cited-tips.ts` chip-thinning tips: `:85` (face ae), `:127` (slotting), `:141` (HSM), `:285` (lead-angle/KAPR), `:345` (Ingersoll RCTF), `:600`/`:615`/`:616` (DAPRA/Sandvik AFPT). Canonical factor owner: `AdvancedMillingStrategiesEngine` (mill/CLAUDE.md §gotcha 1). Full surface: [[mill-data-contents-inventory]] §7/§9.
