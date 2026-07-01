---
name: reference_mill_phase3_sld_taptest_2026_06_13
description: "Mill (foxtrot) Phase-3 deeper anchor — Hermes-planned. The full chatter Stability-Lobe-Diagram workflow: analytical (Budak-Altintas zero-order + multi-frequency low-immersion; semi-discretization Insperger-Stepan; full-discretization) + EXPERIMENTAL tap-test (impact hammer + accelerometer → tool-tip FRF → modal ωn/ζ/k → SLD), receptance coupling (predict tool-tip FRF per tool without re-tapping), integrated with PRISM's existing RCTF chip-thinning + Kienzle Kt/Kr force coeffs to pick a stable-lobe rpm AND chip-thinned feed together. Written 2026-06-13 slot:zulu Hermes-loop."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.659Z
aliases: reference_mill_phase3_sld_taptest_2026_06_13
---


**Context:** Phase-3 mill anchor — **Hermes-planned**. Deepens [[reference_mill_hsm_chip_thinning_toollife_2026_06_13]]
(Phase-2 RCTF) + cross-refs [[reference_speed-feed_sfc_chatter_sld_taylor_2026_06_13]] (SLD theory). Spec §foxtrot.

## Full SLD workflow (analytical + experimental + integrated)
- **Analytical:** Budak-Altintas zero-order (avg directional factors → eigenvalue → a_lim) + **multi-frequency**
  solution for low-immersion/highly-intermittent milling; **semi-discretization** (Insperger-Stépán) +
  full-discretization time-domain for accuracy where ZOA breaks (process damping, strong intermittency).
- **Experimental tap-test (the missing measured leg):** impact hammer + accelerometer at the tool tip →
  **FRF** → curve-fit modal parameters (natural freq ωn, damping ζ, stiffness k) → feed into the analytical SLD.
  Protocols: CutPro / MetalMax. **Receptance coupling** (RCSA) predicts the tool-tip FRF from a measured
  holder/spindle FRF + analytical tool model → SLD for ANY tool stickout WITHOUT re-tapping every tool (the
  scalability key — a shop can't tap-test 1000 tool/holder combos).
- **Integration with PRISM physics:** the SLD needs the cutting-force coefficients (Kt tangential, Kr radial)
  — already derivable from PRISM's Kienzle kc1.1. So: Kienzle → Kt/Kr → SLD a_lim(rpm); pick rpm at a stable
  lobe peak (rightmost-lobe MRR strategy) AND apply RCTF chip-thinning for the feed. One unified speed/feed/depth
  pick: stable + chip-thinned + force/power-clamped. This is the world-leading SFC mill output.

## Wiring / consumers (R15)
- GALAXY: `engines/mill/` (foxtrot) + speed-feed/oscar (the SLD belongs in the SFC orchestrator). CONSUMERS:
  SpeedFeedOrchestrator (rpm-at-lobe + RCTF feed), shop-floor (per-machine FRF library). DOMAIN: mill, but
  the SLD+RCSA method clones to lathe (turning chatter, lathe Phase-3) — same regenerative theory.
- AUTO-INVOCATION: none yet; the SLD engine + FRF library is a foxtrot+oscar build unit (needs tap-test data).

## Next (Phase-4, per Hermes)
Build the analytical SLD (Kt/Kr from Kienzle) + an FRF/modal store + RCSA tool-tip predictor; validate against a
real JM VMC tap-test. The genuine gap: PRISM has the SLD theory but no measured per-machine FRF data.

Sources (Hermes-planned): Altintas *Manufacturing Automation* 2nd ed; Budak & Altintas analytical-SLD papers
(1995-2015); Insperger & Stépán (semi-discretization); Schmitz & Smith *Machining Dynamics* (RCSA/tap-test);
CutPro/MetalMax tap-test protocols. Planner: Hermes (xAI Grok, :8645).
