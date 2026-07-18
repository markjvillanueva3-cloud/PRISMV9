---
name: chatter-solver-sld
description: Stability lobe diagram (SLD) physics in depth — regenerative chatter as a delayed-feedback loop, the oriented FRF, the absolute (unconditional) stability limit, and the Altintas-Budak zero-order approximation (ZOA) that turns a measured tap-test FRF into analytical lobes. PHYSICS-SAFE (symbolic only). slot:oscar.
metadata:
  node_type: wiki
  type: architecture
  galaxy: speed-feed
  physicsSafe: true
---

# Chatter & the stability lobe diagram (SLD) — from the regeneration loop to analytical lobes

> **PHYSICS-SAFE.** Method and theory only; no numeric machine/material constants. Deepens the qualitative chatter coverage in [[speed-feed-advanced-techniques]] with the **named** absolute-stability limit and the **ZOA derivation** (the step from a measured FRF to the lobes), which the existing entries name but do not derive.

## 1 — Regenerative chatter is a delayed-feedback loop

The dominant self-excited vibration in milling/turning is **regenerative**: each tooth cuts a surface left wavy by the *previous* tooth (or previous revolution). The instantaneous chip thickness is therefore not just the commanded feed but the commanded feed plus the difference between the current and one-period-delayed tool displacement:

```
h(t) = h_static + [ y(t − T) − y(t) ]
```

- **T** — the regeneration delay = the tooth-passing period (= 60 / (n · z) for spindle speed n and z teeth).
- **y(t)** — tool/workpiece relative vibration normal to the cut.

The term `y(t − T)` is the *regeneration* term — it makes the governing equation a **delay differential equation (DDE)**. The phase **ε** between the inner (current) and outer (previous) surface waves decides everything: when successive waves are nearly out of phase, chip-thickness modulation is maximal and energy is pumped into the vibration → **chatter**. When they are in phase (the "lobe pocket" speeds), the regeneration cancels and a much deeper cut is stable.

## 2 — The oriented FRF and the characteristic equation

Linearising the cutting force about the chip thickness (`dFc ∝ Kt · ap · dh`, with Kt the tangential cutting-force coefficient — an owner-gated quantity in `src/physics/constants.ts`, not inlined here) and closing the loop through the structural **frequency response function** Φ(iω) (the tool-tip compliance, measured by tap test) yields the closed-loop characteristic equation. Chatter onset is the marginal-stability boundary where a pole sits on the imaginary axis at the **chatter frequency ω_c**. The boundary depends only on the **real part** of the *oriented* FRF, Λ_R(ω) = Re[Φ_oriented(iω)] — "oriented" meaning the FRF projected through the directional cutting-force factors onto the chip-thickness direction.

## 3 — The absolute (unconditional) stability limit

Below a certain axial depth the cut is stable at **every** spindle speed — there is no lobe pocket you need to hit. This **absolute stability limit** is set by the *most negative* real part of the oriented FRF:

```
b_lim,abs  ∝  −1 / ( Kt · Λ_R,min )
```

(with a directional/averaging factor from §4). It is the flat floor under all the lobes. Distinguish it from the **per-lobe ceiling** b_lim(n), which rises into pockets at the favourable speeds and is what HSM exploits to take deep cuts at high rpm. The existing entries describe the pockets qualitatively; the absolute limit is the conservative depth a shop can run *without* tuning rpm to a lobe.

## 4 — The Altintas–Budak zero-order approximation (ZOA)

Milling's directional force coefficients are **time-periodic** (they switch as teeth enter/exit the cut), so the exact problem is a periodic DDE. The **ZOA** makes it analytically solvable: average the directional dynamic-milling-force coefficient matrix [A(t)] over one tooth period to its **zeroth Fourier term** [A_0]. That makes the system time-invariant, so the characteristic equation becomes an **eigenvalue problem** in the oriented FRF. Sweeping the chatter frequency ω_c across the dominant FRF mode then yields, in closed form, paired **(spindle speed, limiting axial depth)** points — trace them and you have the **stability lobe diagram**. The chain is:

```
tap test → measured tool-tip FRF Φ(iω)  →  orient through [A_0]  →  eigenvalue sweep over ω_c  →  SLD (n, b_lim)
```

For low radial immersion (the pocket-milling / HSM regime) the zeroth term loses fidelity and higher-order (multi-frequency) or semi-discretization / DDE time-domain methods are required — the frontier the verified-foundations entry points at.

## 5 — Measuring the input: the FRF

The SLD is only as good as the FRF. It is obtained by an **impact (tap) test**: an instrumented hammer excites the tool tip, an accelerometer measures the response, and Φ(iω) = (output displacement) / (input force) is computed per axis. The poles give the natural frequencies and the residues the modal stiffness/damping — exactly the data the eigenvalue sweep in §4 consumes. **The FRF is tool-, holder-, and stickout-specific**: change the assembly and the lobes move. This is why the SLD must be regenerated per setup, never reused from a different tool stack-up.

## 6 — How PRISM consumes this

- `ChatterStabilityLobeEngine` is the SLD generator in the chatter/stability engine family. **R12 landmine:** there is a known regression where it can return **0 lobes** — always verify a non-empty lobe set before trusting an SLD result ([[reference_chatter_engine_regression_2026_05_24]]). A `b_lim` that silently collapses to the absolute floor (or to zero) is the failure mode to guard against.
- Stability constants (Kt, modal data) are owner-gated / measured inputs — never inline a numeric cutting-force coefficient in an engine or here.
- The SLD feeds rpm selection: prefer a spindle speed inside a lobe pocket to take a deeper stable cut, but the **absolute limit (§3) is the safe default** when FRF data is stale or unavailable.

## 7 — Sources
- **Altintas, Y. & Budak, E.** (1995) — *Analytical Prediction of Stability Lobes in Milling*, CIRP Annals — the ZOA method (§4).
- **Altintas, Y.** — *Manufacturing Automation* (Cambridge UP, 2nd ed.) — the full regenerative-chatter + SLD treatment.
- **Tobias, S. A. & Tlusty, J.** — the foundational regenerative-chatter theory (the delayed-feedback mechanism of §1).
- ASME JMSE chatter-stability review (DOI 10.1115/1.4047391) — surveys single- vs multi-frequency methods and process damping (see [[speed-feed-foundations-verified-2026-06-14]]).

## Cross-refs
- Qualitative SLD intro: [[speed-feed-advanced-techniques]] (chatter pockets, tap test)
- Verified foundations / ZOA pointer: [[speed-feed-foundations-verified-2026-06-14]]
- Force model that supplies Kt: [[kienzle-force-depth]]
- Engine regression landmine: [[reference_chatter_engine_regression_2026_05_24]]
