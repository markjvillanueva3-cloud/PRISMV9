---
name: reference-bravo-chip-thinning-direction-2026-06-12
description: Chip-thinning failure DIRECTION — skipping it UNDER-feeds (rub), not over-feeds. feedback_foxtrot_chip_thinning_mandatory states the snap direction backwards; oscar's memory + the cited RCTF formula are correct.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.483Z
aliases: reference_bravo_chip_thinning_direction_2026_06_12
---


**Finding (slot:bravo, 2026-06-12, authoring [[mill-chip-thinning]] from cited formulas):** two domain memories contradict each other on the chip-thinning failure DIRECTION, and one is physically wrong.

**The physics (textbook, grounded):** in milling, instantaneous chip thickness `h(φ) = fz·sin(φ)`. For radial engagement `ae < D/2` the tooth exits at `φ_exit` where `cos(φ_exit) = 1 − 2·ae/D`, so `h_max = fz·√(1−(1−2·ae/D)²) < fz`. **The actual chip is THINNER than the programmed fz at low radial engagement.** At ae/D=0.1, h_max = 0.6·fz (RCTF = 1.67). To restore the rated chip you FEED UP by the radial chip-thinning factor (RCTF) — cited: Ingersoll MAXline `milling-pdf-cited-tips.ts:345` (`1/√(1−(1−2ae/D)²)`), Sandvik/DAPRA `:615` (`fz×√(D/ae)`, small-ae approx — over-compensates; the two cited forms diverge, default to the geometric).

**The contradiction:**
- `feedback_oscar_chip_thinning_mandatory` — CORRECT: "actual chip is THINNER than programmed fz... multiply fz UP by the radial chip-thinning factor." Matches the physics + my page.
- `feedback_foxtrot_chip_thinning_mandatory` — **WRONG direction**: "the bare table chip-load UNDER-states the actual chip thickness... Skipping it **over-feeds** the cut → tool snap." The premise (table under-states actual) and the conclusion (skip→over-feed→snap) are both backwards. **Skipping chip-thinning UNDER-feeds** the effective chip → the tool RUBS (heat, work-hardening, premature wear), it does not snap. The SNAP risk is the OPPOSITE error: OVER-compensating (feeding up too much) or running a thinning-compensated feed at high engagement.

**Why it matters:** the operator wants the calc engines sharpened; a speed/feed engine that takes the foxtrot framing literally would mis-attribute the failure mode and could de-rate (lower feed) below 50% ae — the exact opposite of the required RCTF feed-UP — making low-ae HSM rub instead of cut. **Action for foxtrot (mill owner):** reconcile `feedback_foxtrot_chip_thinning_mandatory` to the oscar/standard direction (skip → under-feed/rub; over-compensate → snap). I did not edit foxtrot's domain memory (cross-slot courtesy). Verified against the cited RCTF formula + `AdvancedMillingStrategiesEngine` canonical factor (mill/CLAUDE.md §gotcha 1).
