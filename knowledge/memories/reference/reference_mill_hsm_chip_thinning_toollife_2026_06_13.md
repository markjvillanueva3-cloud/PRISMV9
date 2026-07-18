---
name: reference_mill_hsm_chip_thinning_toollife_2026_06_13
description: "Mill (foxtrot) Phase-2 deep-research anchor — radial chip-thinning (RCTF) + HSM/HEM feed compensation + tool-life. RCTF = 1/sqrt(1-(1-2ae/D)^2) = D/(2·sqrt(ae(D-ae))) for ae<D/2; effective fz = fz·RCTF; HEM = low radial (5-15%D) + high axial (1.5-2×D) engagement so chip-thinning comp is MANDATORY not optional. Axial chip-thinning (ball/button) is a SEPARATE effect on ap. Cap at mfr max fz; verify CAM not already compensating. Written 2026-06-13 slot:zulu, FLEET-KNOWLEDGE-MAX Phase-2."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.658Z
aliases: reference_mill_hsm_chip_thinning_toollife_2026_06_13
---


**Context:** Phase-2 external-knowledge anchor for the mill galaxy (Milling Wizard / foxtrot), per the
2026-06-13 knowledge-max `/goal`. Canonical machining theory (well-established; not a single paper) — the
citation + completeness backbone for world-leading mill speed/feed. Spec: `FLEET-KNOWLEDGE-MAX-ROADMAP-2026-06-13.md`.

## Radial chip thinning (the load-bearing HSM correction)
- **Effect:** when radial depth `ae` (stepover/WOC) < D/2, each tooth's engagement arc shortens → actual max
  chip thickness < programmed feed-per-tooth `fz`. Uncompensated → chips too thin → **rubbing, work-hardening,
  heat, premature wear**. Counterintuitively, too-light a chip kills a tool faster than a heavy one.
- **Radial Chip Thinning Factor (two equivalent forms):**
  `RCTF = 1 / sqrt(1 - (1 - 2·ae/D)^2)`  ==  `RCTF = D / (2·sqrt(ae·(D - ae)))`  (valid ae < D/2; RCTF=1 for ae≥D/2).
- **Feed compensation:** effective chip load `fz_eff = fz · RCTF`; table feed `F = RPM · Z · fz · RCTF`.
- **Worked check:** D=0.500", ae=0.050" (10%D), fz=0.003"/tooth, Z=4, 8000 rpm →
  RCTF = 0.5/(2·sqrt(0.05·0.45)) = 0.5/0.30 = **1.667** → fz_eff=0.005" → F = 8000·4·0.005 = **160 ipm**
  (vs 96 ipm uncompensated — the tool would rub at the lower feed).

## HSM / HEM / trochoidal regime
- Deliberately use **small radial stepover (5-15% D) + large axial depth (1.5-2× D / full flute)** → spreads
  wear+heat over the flute, low constant engagement angle, high feed + MRR. Because ae is tiny, **chip-thinning
  compensation is MANDATORY, not optional** — the light radial engagement that enables HEM is exactly what makes
  the correction required.

## Caveats (R12 — don't over-apply)
1. **Axial chip thinning** is a SEPARATE effect for round-insert/button + ball-nose cutters, keyed on axial
   depth `ap` and tool radius (`hex = fz·sin(acos(1-2·ap_immersion))` family — peaks at centerline) — do NOT
   conflate with radial. (PRISM oscar fixed a hex_mm full-slot force-collapse here 2026-06-10.)
2. **Cap fz_eff at the manufacturer's max** recommended chip load — RCTF suggests very high feeds at tiny ae;
   machine dynamics + spindle power + chatter (see SLD memo) still govern.
3. **Verify the CAM is not already compensating** (Fusion/Mastercam/hyperMILL + Harvey/Helical/Kennametal
   calculators apply RCTF when given WOC) — do not stack a manual correction on top.

## Tool-life pairing (with [[reference_speed-feed_sfc_chatter_sld_taylor_2026_06_13]])
- Taylor `V·Tⁿ=C` (carbide n≈0.2-0.4) + extended `V·Tⁿ·fᵖ·dᵠ=C` (influence V>f>d) — extend life by trimming
  speed last, feed second. Kc1.1 per ISO 513 group (P/M/K/N/S/H) drives force/power; canonical in `constants.ts`.

## SFC integration notes (foxtrot)
- Confirm the mill speed/feed path applies RCTF on radial engagement (not just ap), exposes both the chip-thinning
  feed boost AND the mfr-max cap, and shares the Taylor/Kienzle core with oscar (speed-feed). Next deep-research
  (roadmap §foxtrot): ingest Sandvik milling application guide + Machinery's Handbook milling chapter for
  per-ISO-grade fz/vc tables; cross-link the SLD chatter memo for the rpm-selection layer.

Sources: radial chip-thinning RCTF is canonical machining theory documented by tooling makers' speed/feed
calculators — Sandvik Coromant Technical Guide, Harvey Tool / Helical Solutions ("In The Loupe" HEM guides),
Kennametal/Seco milling catalogs, and *Machinery's Handbook* (milling). Formula verified algebraically (two
forms equivalent). Live web confirmation was rate-limited this pass — flagged for re-verify against a specific
Sandvik guide page on the next Phase-2 mill pass.
