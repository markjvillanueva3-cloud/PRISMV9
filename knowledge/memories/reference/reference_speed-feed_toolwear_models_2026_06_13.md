---
name: reference_speed-feed_toolwear_models_2026_06_13
description: "SFC (speed-feed/oscar) Phase-2 DEEPER anchor — tool-wear physics (the gap flagged in reference_speed-feed_sfc_chatter_sld_taylor). Mechanisms: abrasive/adhesive(BUE)/diffusion(crater)/oxidation/fatigue by speed-temp regime. Models: Archard V=K·W·L/H, Usui crater dW/dt=A·σ·vs·exp(-B/T), Takeyama-Murata (abrasive+diffusive), Colding unified tool-life. Measures: VB flank (ISO 3685 0.3mm avg/0.6 max), KT crater. Temperature is the master variable (diffusion/oxidation activated) -> why Vc dominates Taylor n. Coatings (TiAlN/AlCrN) raise the temp threshold. Written 2026-06-13 slot:zulu Phase-2 deeper."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.210Z
aliases: reference_speed-feed_toolwear_models_2026_06_13
---


**Context:** DEEPER Phase-2 anchor for speed-feed (oscar) — fills the "tool-wear physics (Usui/diffusion/
Archard)" gap flagged in [[reference_speed-feed_sfc_chatter_sld_taylor_2026_06_13]]. Canonical metal-cutting
tribology. Pairs with the Taylor/Kienzle core + chatter/SLD. Spec: `FLEET-KNOWLEDGE-MAX-ROADMAP-2026-06-13.md` §oscar.

## Wear MECHANISMS (which dominates by speed/temperature regime)
- **Abrasive** — hard particles (carbides in the work, fragments) plough the tool; dominant at LOW speed; ∝ sliding distance / hardness ratio.
- **Adhesive / built-up-edge (BUE)** — work material welds to the rake then tears off, plucking tool grains; dominant at LOW-MID speed + ductile/gummy materials (Al, low-C steel, stainless); the BUE also wrecks finish. Higher speed (above the BUE regime) often IMPROVES finish.
- **Diffusion** — atoms diffuse tool↔chip at the high-temp rake interface → **crater wear** (KT) on the rake; temperature-activated (Arrhenius) → dominant at HIGH speed. THE limiter for carbide cutting steel at speed.
- **Oxidation** — at high temp the tool oxidizes (notch wear at the depth-of-cut line where air reaches); temperature-activated.
- **Fatigue / chipping** — cyclic/interrupted cuts (milling) → mechanical + thermal fatigue cracking; favors tougher grades + edge prep (hone/chamfer).

## Wear-rate MODELS (the quantitative layer)
- **Archard (adhesive/abrasive):** `V = K · (W · L) / H` — worn volume ∝ normal load × sliding length / hardness; K = wear coefficient. The mechanical-wear baseline.
- **Usui (crater/diffusion — canonical):** `dW/dt = A · σ · v_s · exp(−B / T)` — wear rate ∝ normal stress σ × sliding velocity v_s × Arrhenius temperature term (T = interface temp, A/B material constants). The standard FEM crater-wear model; captures why crater wear explodes with speed (T rises).
- **Takeyama–Murata:** `dW/dt = G(V,f) + D·exp(−E/RT)` — explicitly SUMS an abrasive term (mechanical, speed/feed) + a diffusive term (Arrhenius). Good two-regime fit.
- **Colding unified tool-life** — an alternative to Taylor that models the full life surface over (cutting speed, feed/equivalent-chip-thickness) with a single equation set; better than Taylor far from the calibration point.

## Wear MEASURES + criteria (ISO 3685)
- **Flank wear VB** — the primary life criterion: `VB_avg = 0.3 mm` (uniform) or `VB_max = 0.6 mm` (localized) for carbide finishing; tighter for finish/tolerance work. **Crater wear KT** (rake depth). **Notch wear** (DOC line). Tool "dead" when any criterion is hit → that defines T in Taylor `V·Tⁿ=C` (so C depends on the chosen VB limit).

## Temperature — the master variable
- Cutting temperature ≈ shear-zone heat + rake-friction heat (Loewen-Shaw / Trigger); rises with `Vc^a · f^b` (speed dominates). Because diffusion + oxidation wear are Arrhenius (`exp(−E/RT)`), small temp rises → large wear-rate rise → **this is the physical reason cutting SPEED dominates tool life** (Taylor exponent order V > f > d, and carbide n≈0.2-0.4). SFC's speed selection is fundamentally a temperature/wear trade vs MRR.

## Coatings + edge prep (extend the limit)
- **TiN / TiCN / TiAlN / AlCrN / diamond(PCD for Al)/CBN(hardened steel)** — raise the oxidation/diffusion temperature threshold + lower friction → allow higher Vc before crater/oxidation wear runs away. AlTiN/AlCrN form a protective alumina layer at temp (best for high-speed steel cutting). Edge hone/chamfer trades sharpness for toughness (interrupted cuts).

## SFC integration (oscar)
- This closes the wear half of the speed/feed physics: Kienzle (force) + Taylor/Colding (life) + Usui/Takeyama (wear-rate mechanism) + SLD (chatter). SFC should pick Vc against the diffusion-wear temperature knee (not just Taylor extrapolation), select coating by material/temp regime, and flag the BUE speed band to avoid. Next deep-research: per-material activation energies (E) for the Arrhenius term; coating temp-thresholds; FEM crater-wear validation. Re-verify Usui constants against a published source on the next pass.

Sources (canonical): Archard 1953 (wear); Usui, Shirakashi & Kitagawa (crater-wear / diffusion model); Takeyama
& Murata (combined wear); Colding (unified tool-life); ISO 3685 (tool-life testing, VB/KT criteria); Shaw *Metal
Cutting Principles* + Boothroyd *Fundamentals of Machining* (temperature, wear mechanisms); Trent & Wright
*Metal Cutting*. Expertise-authored; Usui/Arrhenius constants flagged for source-page re-verification.
