---
name: reference_speed-feed_phase3_mechanistic_probabilistic_sld_2026_06_13
description: "Speed-feed (oscar) Phase-3 deeper anchor — Hermes-planned (tempered, R12). Three citable increments past the Kienzle/Taylor/Merchant/Altintas-SLD baseline: (1) mechanistic DUAL-coefficient force model Ft=Ktc·h·b+Kte·b (edge+shear separation) replacing single-kc; (2) microstructure/flow-stress kc correction (Johnson-Cook × Hall-Petch grain-size × Oxley shear-plane temperature) for dynamic kc/n; (3) PROCESS-DAMPING SLD extension (Eynian-Altintas) for the low-speed <80 m/min regime the regenerative-only SLD misses. Highest-ROI = PROBABILISTIC stability margin: Monte-Carlo-propagate coefficient ±σ through SLD+force → prism_safety derates MRR by a chatter-free PROBABILITY margin not a deterministic worst-case. Written 2026-06-13 slot:zulu Hermes-loop."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.209Z
aliases: reference_speed-feed_phase3_mechanistic_probabilistic_sld_2026_06_13
---


**Context:** Phase-3 speed-feed anchor — **Hermes-planned**, tempered (R12: Hermes' "CutPro 2023
180-material database", "Sandvik internal whitepaper coefficients 2021", "GPU-accelerated", and the
"11–19% MRR gain" number are uncitable/unvalidated hype — kept the citable, real engineering increments;
the MRR figures are HYPOTHESES to measure, not results). Closes the Phase-3 gap so all 14 named galaxies
have a deep-research recipe. Deepens [[reference_speed-feed_sfc_chatter_sld_taylor_2026_06_13]] +
[[reference_speed-feed_toolwear_models_2026_06_13]] (Phase-2) + [[reference_oscar_knowledge_max_2026_06_13]].
Spec §oscar.

## The realistic deeper increments
- **Mechanistic dual-coefficient force model (edge + shear separation).** Replace the single specific-force
  lookup (kc1.1·h^-mc) with the linear-edge decomposition: tangential `Ft = Ktc·h·b + Kte·b`, radial
  `Fr = Krc·h·b + Kre·b`, axial `Fa = Kac·h·b + Kae·b` — where `Ktc/Krc/Kac` (shear/cutting) and `Kte/Kre/Kae`
  (edge/ploughing) are separated. This is the standard mechanistic identification (Altintas *Manufacturing
  Automation*): edge coefficients dominate at small chip thickness (where Kienzle over/under-predicts),
  shear coefficients at large h. Coefficients come from **calibrated cutting tests** (linear regression of
  measured force vs feed per ISO-group) — NOT a proprietary DB we don't have. Wires INTO
  `UltimateSpeedFeedEngine` ahead of the Merchant/Usui layers; back-compatible (single-kc stays the fallback
  when no calibrated coefficient set exists for the material/tool pair).
- **Microstructure / flow-stress kc correction.** Modulate the specific force by a flow-stress term:
  **Johnson-Cook** σ = [A + B·εⁿ][1 + C·ln(ε̇*)][1 − T*ᵐ] (published per-material JC params — do NOT fabricate
  proprietary coefficients) × **Hall-Petch** grain-size term (σ ∝ d^-½) × **Oxley predictive-machining-theory**
  shear-plane temperature. Output = a dynamic kc/Taylor-n correction factor routed to `prism_calc`. Honest
  scope: a correction LAYER on the mechanistic coefficients for hardness/heat-treat variation, not a full FE
  chip model.
- **Process-damping SLD extension (the low-speed gap).** The current Altintas-Budak SLD is the frequency-domain
  zero-order REGENERATIVE model — accurate at high speed, but at low cutting speed (<~80 m/min, exactly the
  Ti/Ni-alloy + large-tool regime) **process damping** from flank-face/wave interference raises the real
  stability limit well above the regenerative prediction. Add the **Eynian-Altintas indentation/process-damping
  force model** (+ Budak-Tunç) using a process-damping coefficient tied to the flank-wear land width. Without
  it the SLD is needlessly conservative at low speed (leaves MRR on the table) — adding it is a pure-gain,
  safe-direction refinement.
- **Probabilistic stability margin (HIGHEST-ROI — the genuine world-leading increment).** Today the safety
  derate is deterministic worst-case. Instead: propagate coefficient uncertainty (±σ from material-batch /
  tool-runout / dynamics variation) through the SLD + force model via Monte-Carlo (a few hundred samples) →
  `prism_safety` derates MRR by a **probabilistic chatter-free margin** (e.g. "ap that is stable at 95%
  confidence") rather than a single brittle worst-case line. This is honest engineering on assets we already
  have (SLD + mechanistic force), and it is the differentiator vs HSMAdvisor/G-Wizard (deterministic). MRR
  improvement is a hypothesis to MEASURE against the gauntlet, never reported as a result until validated.

## Wiring / consumers (R15)
- GALAXY: `engines/speed-feed/` (oscar). CONSUMERS: `UltimateSpeedFeedEngine` (force core),
  `SpeedFeedNineAxisOrchestratorEngine` (the 3-mode orchestrator — feeds clamps/spindle-power from forces),
  `prism_calc` (physics), `prism_safety:validate_physics` (the probabilistic derate gate). DOMAIN: speed-feed,
  consumed by mill/lathe/cam/wedm whenever they need feeds & speeds.
- **NEVER inline constants** — import `src/physics/constants.ts` (kc1.1 per ISO group, Taylor C/n). Coefficient
  sets live in a calibrated data table, not hard-coded. **Safety path stays on Claude + prism_safety** (never
  route the cutting→derate decision to a local model). UNITS-FIRST (inch/mm 25.4× trap) at every entry.

## Next (Phase-4, per Hermes — oscar's build, honestly scoped)
Build the dual-coefficient mechanistic force model first (Ktc/Kte separation, back-compatible single-kc
fallback) — it is the foundation the other three layers attach to (R13 logical order). Then the process-damping
SLD term, then the Monte-Carlo probabilistic margin into `prism_safety`. Validate each through the 401-assert
SFC gauntlet + ≥3 spanning ISO groups (P/M/K + S for Ti/Ni). Do NOT ship the JC/microstructure layer with
fabricated proprietary coefficients — published JC params or measured calibration only. Measure MRR delta vs
the deterministic baseline; report the number only after the gauntlet confirms safety is preserved.

Sources: Altintas, *Manufacturing Automation* 2nd ed (mechanistic force identification, SLD); Budak & Altintas
1998 (analytical stability lobes); Eynian & Altintas 2009/2010 (process damping); Budak & Tunç 2022; Oxley 1989
(predictive machining theory); Johnson & Cook 1983 (flow stress); Hall-Petch. Planner: Hermes (xAI Grok, :8645),
claims tempered to verifiable scope per R12.
