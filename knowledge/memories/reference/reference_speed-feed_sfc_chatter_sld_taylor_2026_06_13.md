---
name: reference_speed-feed_sfc_chatter_sld_taylor_2026_06_13
description: "SFC (speed-feed/oscar) Phase-2 deep-research anchor — canonical external citations for chatter/stability-lobe + tool-life. Altintas-Budak 1995 CIRP SLD (zero-order + multi-frequency), regenerative-chatter eigenvalue solution, rightmost-lobe MRR-max strategy, low-speed process-damping zone; Taylor VTⁿ=C exponent n by tool material (HSS 0.1-0.2 / carbide 0.2-0.4 / ceramic 0.4-0.6 / CBN-diamond 0.7-0.9) + extended VTⁿfᵖdᵠ=C (V>f>d). Written 2026-06-13 slot:zulu as the FLEET-KNOWLEDGE-MAX-ROADMAP Phase-2 proof pass."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.210Z
aliases: reference_speed-feed_sfc_chatter_sld_taylor_2026_06_13
---


**Context:** Phase-2 deep-research proof pass for the speed-feed galaxy (the saleable SFC product), per the
operator's 2026-06-13 knowledge-max `/goal`. Internal data is exhausted via the durable galaxy miner; THIS is
the external-source layer that pushes SFC toward world-leading-expert depth. Claims below are **attributed to
published sources** (NOT PRISM-verified physics — R12); they are the citation backbone a world-leading SFC must
ground its chatter + tool-life models on. Spec: `state/shared/specs/FLEET-KNOWLEDGE-MAX-ROADMAP-2026-06-13.md`.

## Regenerative chatter + Stability Lobe Diagrams (SLD)
- **Canonical source:** Altintas, Y. & Budak, E., *Analytical prediction of stability lobes in milling*, CIRP
  Annals 44(1), 1995, 357–362 — the landmark analytical SLD method. Builds on Tobias & Fishwick (1958)
  regenerative-chatter theory; Tlusty/Tobias 1-D theories are the predecessors.
- **Mechanism:** instability is **surface regeneration** — the engaged tooth cuts the wavy surface left by the
  preceding tooth → delay differential equation. SLD = 2-D plot (spindle speed × axial depth) whose boundary
  is the max stable depth-of-cut `a_lim` per rpm; below = stable, above = chatter.
- **Two solutions (Budak-Altintas):** (1) **zero-order** — averages directional factors, linearizes the
  time-periodic delay to time-invariant, critical stability from the characteristic equation (eigenvalue
  problem); cheap + accurate for common milling. (2) **multi-frequency** — includes harmonics; needed for
  **low-immersion / highly intermittent** milling.
- **Critical-depth form (structure, consult 1995 paper for full derivation):** `a_lim = -2πΛ_R(1+κ²)/(N·K_t)`
  where Λ_R = real part of the eigenvalue, κ = imaginary/real ratio, N = teeth, K_t = tangential cutting-force
  coefficient. Spindle speed from phase: `ε = π - 2ψ`, `T = (ε + 2kπ)/ω_c`, `n = 60/(N·T)` (k = lobe number).
- **Rightmost-lobe MRR-max strategy:** pick rpm so the **tooth-passing frequency aligns with the dominant
  structural natural frequency** (and integer fractions) → operate in the highest (rightmost) lobe = highest
  stable depth = highest MRR. This drove aerospace HSM (>95% material removed from Al monolithic parts).
- **Low-speed process-damping zone:** as rpm drops relative to natural frequency, stability INCREASES (process
  damping) → a second favorable zone exists besides the high-speed lobes (e.g. ~700 rpm stable, 5000 stable,
  8000 unstable for one published case). SFC should expose BOTH zones, not just high-speed lobes.

## Taylor tool-life law (VTⁿ = C)
- **Form:** `V·Tⁿ = C` (V = cutting speed, T = tool life min). Exponent **n depends on TOOL material**:
  HSS 0.1–0.2 · **carbide 0.2–0.4** (common default n≈0.25) · ceramic/cermet 0.4–0.6 · CBN/diamond 0.7–0.9.
- **Constant C** depends on workpiece + anneal state + feed + the flank-wear criterion (VB 0.3/0.4/0.6 mm) —
  per ISO 3685 tool-life testing; tabulated in *Machinery's Handbook* / Metcut *Machining Data Handbook*, or
  fit per tool-work pair by test.
- **Extended (Kronenberg/modified):** `V·Tⁿ·fᵖ·dᵠ = C` — influence order on tool life **V > f > d** (speed
  dominates, then feed, then depth). This is why SFC trades speed last when extending tool life.

## SFC integration notes (for oscar)
- PRISM already has Kienzle/Taylor/Merchant + an Altintas SLD reference in the 9-axis core + `constants.ts`
  (kc1.1 per ISO group P/M/K/N/S/H). This memo is the **citation + frontier-completeness layer**: verify the
  PRISM Taylor-n defaults sit in the carbide 0.2–0.4 band per tool material, expose the low-speed
  process-damping zone (not just high-speed lobes), and surface the multi-frequency solution for low-immersion
  cuts. Frontier gaps to research next (per roadmap): tool-wear physics (Usui/diffusion/Archard), Colding
  unified tool-life, FRF/tap-test acquisition for per-machine SLD.
- **Deep-research sources to ingest next:** Altintas *Manufacturing Automation* (2nd ed); Shaw *Metal Cutting
  Principles*; Boothroyd *Fundamentals of Machining & Machine Tools*; ISO 3685; Sandvik Coromant technical
  guide. See FLEET-KNOWLEDGE-MAX-ROADMAP §oscar.

Sources: [Altintas-Budak SLD (MIT CBA chatter.pdf)](https://academy.cba.mit.edu/classes/computer_machining/chatter.pdf) · [Chatter Stability of Machining Operations (UTk MTRC)](https://mtrc.utk.edu/wp-content/uploads/sites/45/2020/08/manu_142_11_110801.pdf) · [Synthesis of Stability Lobe Diagrams (Springer)](https://link.springer.com/chapter/10.1007/978-3-642-32448-2_10) · Taylor exponent ranges (Machinery's Handbook / Machining Data Handbook, per multiple machining references).
