---
name: reference_speed-feed_phase4_deep_2026_06_13
description: "Speed-feed (oscar) Phase-4 deep anchor — Hermes-planned, R12-tempered. Four deeper sub-domains past Phase-2/3 foundations: (1) Oxley full predictive shear-zone temperature (iterative thermo-mechanical coupling, adiabatic shear, Calamaz/Sima strain-softening JC, Zerilli-Armstrong at ε̇>10⁵ s⁻¹); (2) Semi-discretization + full-discretization multi-delay chatter (Insperger-Stépán SDM 2002/2011, Ding FDM 2010, 5-axis lead/lag SLD); (3) Minimum uncut chip thickness + ploughing transition (MUCT slip-line field with rounded edge, Waldorf 1998, size-effect via strain-gradient plasticity); (4) Polynomial Chaos Expansion probabilistic SLD (Hajdu et al., frontier UQ past Monte-Carlo). Written 2026-06-13 slot:zulu Hermes-loop."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.209Z
aliases: reference_speed-feed_phase4_deep_2026_06_13
---


## Context

Phase-4 anchor for the speed-feed galaxy (slot: oscar). Deepens the existing 2026-06-13 stack:
- [[reference_speed-feed_sfc_chatter_sld_taylor_2026_06_13]] — Phase-2a (SLD regenerative, Taylor VTⁿ=C)
- [[reference_speed-feed_toolwear_models_2026_06_13]] — Phase-2b (Archard/Usui/Takeyama-Murata/Colding)
- [[reference_speed-feed_phase3_mechanistic_probabilistic_sld_2026_06_13]] — Phase-3 (Ktc/Kte dual-coeff, JC×Hall-Petch kc correction, Eynian-Altintas process damping, Monte-Carlo probabilistic margin)

The four sub-domains below are the NEXT layer — each names the specific model/equation/standard/source
that is NOT yet in the earlier anchors. R12: all performance numbers below are labeled HYPOTHESIS unless
the cited paper provides the measurement; no fabricated proprietary coefficient sets.

---

## The deeper increments

### 1. Oxley full predictive shear-zone temperature (thermo-mechanical coupling, iterative)

**What Phase-3 covered:** JC flow stress as a modulation *factor* on kc — a correction layer, not a
predictive shear-plane solution.

**What this adds:** The complete Oxley predictive machining theory solves the PRIMARY shear zone
**iteratively** — strain ε, strain-rate ε̇, and temperature T_AB in the shear plane are ALL
interdependent (T depends on σ which depends on ε̇ which depends on T via strain-rate sensitivity).
Oxley's algorithm (1989, Ellis Horwood) converges the system at a given Vc/f, producing:

- Predicted chip thickness, shear angle φ, cutting forces — from **material constants + geometry alone**
  (no calibration force tests needed for prediction, though calibration improves accuracy).
- Shear-zone temperature via the Trigger-Chao analysis (heat partition at primary + secondary zones).
- The exit condition yields the **secondary shear zone temperature** (the rake-interface T that drives
  Usui diffusion/crater wear) — so Oxley + Usui crater-wear form a predictive chain:
  `Vc → T_rake → dW/dt` without the empirical VB→Taylor short-circuit.

**Critical extension — strain-softening JC (Calamaz et al. 2008; Sima & Özel 2010):** Standard JC
σ = [A + B·εⁿ][1 + C·ln(ε̇*)][1 − T*ᵐ] is monotonically hardening. At high T (Ti6Al4V, Inconel),
the material undergoes dynamic softening / adiabatic shear localization — the real σ DROPS past a
strain peak. Calamaz (Int. J. Machine Tools & Manufacture, 2008) added a softening term; Sima & Özel
(2010, IJMTM) proposed the modified JC with flow softening by a hyperbolic-tangent multiplier. Without
this, Oxley-JC OVER-predicts forces + under-predicts chip segmentation in Ti/Ni-alloys.

**Extreme strain-rate extension — Zerilli-Armstrong (1987, J. Appl. Phys.):** When ε̇ > ~10⁵ s⁻¹
(primary shear zone in high-speed hard-material cutting), the JC C·ln(ε̇*) term under-predicts
strain-rate sensitivity. Zerilli-Armstrong uses a dislocation-mechanics model (thermally-activated
glide), with separate BCC and FCC formulations. Relevant for hardened steels (BCC) at high Vc.

**Real data sources:** NIST high-strain-rate SHPB (Split-Hopkinson Pressure Bar) compression datasets
(published in NIST technical reports + journal papers); ASM Handbook Vol. 8 (mechanical testing at high
strain rates); DEFORM-2D/3D FEM validation studies (Özel group) use these as input — the FEM results
themselves are not independent data but the SHPB inputs are.

**SFC integration:** Oxley's iterative solver is the principled route to **adaptive kc with changing
Vc** (today's SFC holds kc1.1/mc constants from `src/physics/constants.ts` — correct at the
calibration Vc, increasingly wrong at 3× that speed). Honest scope: implementing the full Oxley loop is
FEM-territory complexity; a pragmatic increment is the Oxley **shear-angle prediction** (φ = f(α, β/2)
via minimum energy, where β is the friction angle) used as a correction to the Merchant angle, plus the
temperature prediction for Usui wear chaining. Full Oxley inversion = a research-mode feature, not a
production SFC call.

---

### 2. Semi-discretization + full-discretization multi-delay chatter (SDM / FDM)

**What Phase-2/3 covered:** Altintas-Budak analytical SLD — zero-order approximation + multi-frequency.
These are **frequency-domain** methods that linearize the time-periodic delay DDE into a
time-invariant eigenvalue problem (works well at full/half immersion where directional coefficients are
nearly constant).

**What this adds:** When immersion is LOW (slot milling, <30% radial engagement) the tool enters/exits
the cut per revolution — the cutting force coefficients are strongly time-varying (Floquet theory
territory). The analytical SLD fails here. Two complementary **time-domain numerical** methods dominate
the frontier:

**Semi-discretization method (SDM) — Insperger & Stépán (2002, Int. J. Num. Methods Eng.; 2011,
Springer Lecture Notes textbook):**
Discretizes the DELAY (not the full DDE) into piecewise-constant approximation per time step. Converts
the infinite-dimensional DDE into a finite-dimensional monodromy matrix; stability from its
eigenvalues (Floquet multipliers — stable iff |λ_max| ≤ 1). Convergence as step count increases.
Handles **multiple delays** (e.g. 5-axis cutter with variable pitch), **variable spindle speed**
milling (Seguy et al.), and **state-dependent delays** (run-out). The 2011 Springer book is the
canonical text.

**Full-discretization method (FDM) — Ding et al. (2010, J. Dyn. Sys. Meas. Ctrl.; 2011, Int. J.
Machine Tools & Manufacture):**
Discretizes BOTH the state AND the delay — uses polynomial interpolation of the state history within
each interval. Generally faster convergence than SDM (fewer intervals needed for same accuracy),
especially for low-immersion cases. The Ding 2010 JDSMC paper is the canonical FDM reference.

**5-axis SLD extensions (Ozturk & Budak; Altintas et al.):** In 5-axis, the tool axis tilt
(lead/lag angle) changes the instantaneous radial depth of cut and therefore the directional
cutting force coefficients as the tool orientation varies along the path. SLD in 5-axis requires
solving the stability problem at each programmed cutter location — the lobe diagram is
**path-position-dependent**, not a global constant.

**ISO 23167:** Vibration measurement and stability characterization standard (test methodology
framework, not a computational method). Provides the FRF measurement protocol for identifying the
modal parameters (ω_n, ζ, k) that feed into any SLD computation.

**SFC integration:** SDM/FDM close the low-immersion gap in PRISM's SLD. The PRISM analytical SLD
is the correct fast path for ≥50% radial engagement (full/half slot) — SDM/FDM switch-in for
slot milling / thin-wall / 5-axis. Implementation: the monodromy matrix eigenvalue solve is a
standard linear-algebra operation (numpy/LAPACK equivalent in TS) at the SLD computation point;
feasible as an SFC option flag `stabilitySolver: 'analytical'|'sdm'|'fdm'`.

---

### 3. Minimum uncut chip thickness (MUCT) + ploughing transition + size effects

**What Phase-3 covered:** Dual-coefficient mechanistic force model with edge coefficients Kte/Kre/Kae
— these lump the ploughing force into a linear-edge term. This is correct for production feeds above
the MUCT. Below the MUCT, the chip does not form at all — material only deforms elastically+plastically
and springs back (ploughing only).

**What this adds:**

**MUCT models:** The minimum chip thickness h_min below which chip formation stops. Key models:
- **Waldorf et al. (1998, J. Manuf. Sci. Eng.):** slip-line field with a rounded cutting edge radius r_e
  — derives the critical uncut chip thickness from the stagnation point on the rounded edge. This is
  the foundational MUCT model for edge-radius tools.
- **Son et al. (2005, Precision Engineering):** ratio h_min/r_e ≈ 0.2–0.4 (material-dependent,
  verified experimentally for steel, Al, Cu). A practical working ratio for SFC: if h < 0.25·r_e,
  ploughing dominates — flag as below-MUCT condition.
- **Altintas & Jin (2011, CIRP Annals):** MUCT in micro-milling, molecular-dynamics informed thresholds
  at sub-micron h. At production scale (h >> r_e) this is irrelevant; but SFC must flag the condition
  when a user programs very small fz (e.g. finishing pass at fz = 0.01 mm with a worn/large-edge-radius
  tool where r_e ~ 0.02–0.05 mm).

**Size effect via strain-gradient plasticity:** At chip thickness h comparable to material grain size /
dislocation spacing, specific cutting energy rises anomalously ("size effect" — Backer et al. 1952 is
the classic; Dinesh et al. 2001 is a mechanistic account via strain-gradient plasticity). The Kte
term partially captures this, but the Kienzle/Taylor models (calibrated at production h = 0.05–0.3 mm)
do NOT extrapolate reliably to h < 0.01 mm. SFC should warn when fz drops below a size-effect
threshold for the material.

**Variable Ktc/Kte as f(h, r_e, α):** At production scale, Ktc is treated as constant (the Phase-3
mechanistic model). The deeper model allows Ktc, Kte to vary with uncut chip thickness h and rake angle
α (Bissacco et al. 2008, CIRP Annals — verified experimentally for micro-milling). At macro scale
this variation is small; at micro scale it is large. Awareness: SFC's mechanistic coefficients should
carry a validity domain annotation (h_min, h_max) beyond which the coefficient is extrapolated.

---

### 4. Polynomial Chaos Expansion (PCE) probabilistic SLD — frontier UQ past Monte-Carlo

**What Phase-3 covered:** Monte-Carlo propagation of coefficient ±σ through the SLD to get a
probabilistic chatter-free stability margin. This is correct and sufficient for a production SFC
feature.

**What this adds:** The frontier (CIRP Annals 2015–2024 papers from Altintas, Insperger, Hajdu groups)
uses **Polynomial Chaos Expansion** as the UQ method instead of Monte-Carlo:

**PCE mechanics (Hajdu et al., e.g., CIRP Annals 2017, 2022; Uhlmann et al. 2018–2023):**
Represent the output (e.g., critical depth a_lim or chatter frequency) as a polynomial in orthogonal
basis functions of the uncertain inputs (modal parameters ω_n, ζ, stiffness k; cutting coefficients
Ktc, Kte). The PCE coefficients are computed from a small number of **deterministic SLD evaluations**
(the "collocation points" or "quadrature nodes") — typically 50–200 evaluations for 5–10 uncertain
parameters, vs. 10,000+ for Monte-Carlo convergence.

Key advantage: once the PCE is fitted, computing mean/variance/PDF of a_lim is near-free (polynomial
evaluation). The PCE also naturally yields **Sobol sensitivity indices** — which uncertain input
contributes most to output variance (e.g., "Ktc uncertainty dominates over ζ uncertainty in this
regime") — enabling targeted measurement to most reduce stability prediction uncertainty.

**Gaussian Process (GP) regression on SLD:** Uhlmann et al. use GP surrogate + Bayesian updating
— as real cut results arrive (stable/chatter observation), the posterior over a_lim narrows. This is
the machine-learning-adjacent approach to the same problem. Honest scope for PRISM: GP Bayesian
updating is a research feature (requires online feedback from vibration/force sensors + a Bayesian
update loop); PCE is more immediately implementable given the analytical/numerical SLD we already have.

**Interval arithmetic approach (Rao et al.):** treats uncertain inputs as intervals rather than
probability distributions — yields worst-case bounds on stability (guaranteed stable region) rather
than a probability. Computationally cheap; conservative by construction. Useful as a fast
conservative fallback when no distribution data is available.

**SFC integration:** Phase-3's Monte-Carlo is the right *production* feature (simple, explainable,
accurate). PCE is the *research-mode* option for PRISM's AI-training layer (india galaxy) — when the
SFC is being trained on shop data, PCE gives a principled way to propagate calibration uncertainty
from measured cutting coefficients (with their regression variance) to the stability margin output,
with Sobol indices telling the model WHICH coefficient to prioritize measuring next. This is the
principled active-learning hook between speed-feed (oscar) and AI-training (india).

---

## Wiring / consumers (R15)

**Galaxy:** `mcp-server/src/engines/speed-feed/` (slot: oscar)

**Consuming engines / surfaces:**
- `UltimateSpeedFeedEngine` — primary integration point for MUCT guard (flag fz < 0.25·r_e) and
  Oxley shear-angle correction to Merchant φ; edge-coefficient validity-domain annotation.
- `SpeedFeedNineAxisOrchestratorEngine` — SDM/FDM solver switch-in for low-immersion detection
  (`radialEngagement < 0.3` threshold → route to `stabilitySolver: 'sdm'`).
- `prism_calc` — physics computation dispatcher; Oxley iterative T_shear → feeds Usui crater-wear
  chain (the thermo-mechanical coupling output). NEVER inline shear-zone temperature formula —
  import from `src/physics/constants.ts` for any cutting constants.
- `prism_safety:validate_physics` — probabilistic stability margin gate; PCE Sobol sensitivity
  indices feed back as "which coefficient has highest uncertainty → measure this next".
- `prism_ai` / india galaxy (AI-training) — PCE active-learning hook: coefficient calibration
  uncertainty → Sobol indices → prioritized measurement recommendations.

**Physics constants discipline:** All kc1.1, Taylor C/n, JC A/B/C/n/m, Zerilli-Armstrong parameters
MUST be imported from `src/physics/constants.ts` or a calibrated data table — NEVER hardcoded inline.
JC parameter sources: published SHPB data (ASM Handbook Vol. 8; Özel & Altan 2000 IJMTM Table 1 for
Ti6Al4V/Inconel 718). The Calamaz strain-softening modifier and Zerilli-Armstrong BCC/FCC constants
are material-specific published values — flag for source-verification before committing to constants.ts.

---

## Next (Phase-5, honestly scoped)

1. **Oxley shear-angle + temperature prediction** as a Vc-adaptive kc correction: implement the
   iterative φ-solver (converges in ~10 iterations from a Merchant seed) as an optional layer in
   `prism_calc` — output: corrected Ktc(Vc) curve rather than constant kc1.1.
2. **SDM stability solver** for low-immersion (<30% radial engagement) as a `stabilitySolver` flag
   in the SFC 9-axis orchestrator — uses the Insperger 2011 monodromy matrix method.
3. **MUCT guard** in `UltimateSpeedFeedEngine`: when fz < 0.25·r_e (r_e from tool geometry input),
   emit a ploughing-dominant warning + reduce predicted force confidence.
4. **PCE Sobol sensitivity output** from the probabilistic stability module — tells the AI-training
   layer which uncertain input to prioritize measuring. This closes the oscar↔india synergy loop.
5. **Validation gate** for all four: run the 401-assert gauntlet + ≥3 ISO groups (P/M/K + S for
   Ti/Ni where strain-softening matters most). MRR improvement vs deterministic baseline = hypothesis
   to measure, never asserted as a result until the gauntlet confirms safety is preserved.

---

## Sources

- P.L.B. Oxley, *Mechanics of Machining*, Ellis Horwood, 1989 — canonical full predictive machining
  theory (shear-zone T iteration, chip thickness, shear angle).
- Calamaz, M. et al., "A new material model for 2D numerical simulation of serrated chip formation
  when machining titanium alloy Ti–6Al–4V", *Int. J. Machine Tools & Manufacture*, 48(3–4), 2008 —
  strain-softening JC extension.
- Sima, M. & Özel, T., "Modified material constitutive models for serrated chip formation simulations
  and experimental validation in machining of titanium alloy Ti–6Al–4V", *IJMTM*, 50(11), 2010.
- Zerilli, F.J. & Armstrong, R.W., "Dislocation-mechanics-based constitutive relations for material
  dynamics calculations", *J. Appl. Phys.*, 61(5), 1987 — Zerilli-Armstrong constitutive model.
- Insperger, T. & Stépán, G., "Semi-discretization method for delayed systems", *Int. J. Num.
  Methods Eng.*, 55, 2002 + *Semi-Discretization for Time-Delay Systems*, Springer, 2011.
- Ding, Y. et al., "A full-discretization method for prediction of milling stability", *Int. J.
  Machine Tools & Manufacture*, 50(5), 2010.
- Waldorf, D.J. et al., "A slip-line field for ploughing during orthogonal cutting", *J. Manuf.
  Sci. Eng.*, 120(4), 1998 — MUCT + ploughing slip-line field with rounded edge.
- Son, S.M. et al., "Effects of the friction coefficient on the minimum cutting thickness in
  micro-cutting", *Precision Engineering*, 29(4), 2005 — h_min/r_e ≈ 0.2–0.4 ratio.
- Altintas, Y. & Jin, X., "Mechanics of micro-milling with round edge tools", *CIRP Annals*,
  60(1), 2011 — MUCT in micro-milling.
- Bissacco, G. et al., "Size effects on surface generation in micro milling of hardened tool
  steel", *CIRP Annals*, 57(1), 2008 — variable Ktc/Kte as f(h, r_e).
- Hajdu, D. et al., "Prediction of robust stability boundaries for milling operations with
  extended multi-frequency solution and structured singular values", *J. Manuf. Process.*,
  2017; and related PCE papers, *CIRP Annals* 2022.
- Altintas, Y., *Manufacturing Automation*, 2nd ed., Cambridge University Press, 2012 — chapters
  3 (mechanistic force) and 8 (chatter stability); the canonical SFC textbook.
- T.H.C. Childs, *Metal Machining — Theory and Applications*, Arnold, 2000.
- ISO 23167 — vibration stability characterization and testing protocol.
- Planner: Hermes (xAI Grok, :8645), tempered per R12 (hype/fabricated-DB claims stripped;
  all citations above are real published sources, flagged where constants need source-page
  re-verification before committing to constants.ts).
