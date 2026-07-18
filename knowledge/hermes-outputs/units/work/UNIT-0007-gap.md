# UNIT-0007 -- Work Hardening and Dynamic Strain Aging -- GAP ANALYSIS
_Analyst: oscar (speed-feed domain expert) - 2026-07-02 - evidence-cited per R12. This is the ONE genuine new-code gap in Domain-1 (see UNIT-0002-DOMAIN1-WIRING-MAP.md)._

## Existing coverage
- **Work hardening (behavioral)**: `work_hardening_tendency` graded none->severe per material profile in `UltimateSpeedFeedEngine.ts`, driving concrete recommendations (e.g. 304 SS "NEVER dwell -- work hardens"; austenitic-stainless minimum-feed guidance). Surfaced as SFC warnings.
- **Strain hardening (constitutive)**: the JC strain term `[A + B*eps^n]` for 60+ alloys -- `JohnsonCookEngine.ts:151` (+ Inconel_718 added this session, U-OSC-JC-INCONEL718-CONSOLIDATE). This is monotonic strain hardening, NOT the anomalous DSA regime.
- **Strain-rate sensitivity (normal, C>0)**: JC rate term `[1 + C*ln(edot/edot0)]`, positive C everywhere.

## Real gaps
1. **Dynamic Strain Aging (DSA / Portevin-Le Chatelier / blue brittleness) is GENUINELY UNMODELED.** `strain.?aging | portevin | dynamic.?strain | blue.?brittle` = **0 matches across all mcp-server/src** (verified twice this session). DSA is a real, physically-distinct regime, NOT captured by the standard JC model:
   - **Negative strain-rate sensitivity** in the DSA window (flow stress can RISE as strain rate falls -- opposite of JC's C>0), driving serrated (PLC) flow, poor surface finish, and higher-than-JC-predicted cutting force.
   - **Anomalous flow-stress plateau/peak with temperature** (thermal HARDENING, not softening) inside the window.
   - **Windows**: carbon/low-alloy steels ~200-400 C (blue brittleness); austenitic 300-series SS ~250-600 C. These are exactly JM's common materials.
2. **No DSA-window advisory** on the SFC surface -- an operator running 1045/4140 or 304/316 in the DSA speed-band (which sets the cutting-zone temperature into the window) gets no warning about the force/finish anomaly.

## Verdict
**build** (the only Domain-1 build; everything else 0002-0006/0008 is extend/wire)

## Recommended next action
Build a compact, PHYSICS-REVIEWER-GATED DSA correction (oscar refuse-list: skipping-physics-reviewer-on-force-or-stability-formula):
1. A `DynamicStrainAgingEngine` returning (a) a boolean in_dsa_window from material + estimated cutting-zone temperature (reuse the existing shear-zone-temp path), and (b) a bounded flow-stress correction delta_sigma_DSA that peaks in the window, WITH uncertainty. Source the per-material window bounds + peak magnitude from published DSA studies (do NOT fabricate -- if a value is unsourceable, mark the material UNSUPPORTED rather than guess; R12 + refuse-list). Candidate sources: Rodriguez 1984 (PLC); DSA in machining -- Ti/steel/Ni papers.
2. Wire a DSA-window ADVISORY into the SFC path (warning string only first -- does not change force until physics-reviewer signs off on delta_sigma_DSA), mirroring the existing chip-thinning advisory pattern (ProductEngine ~1133).
3. Reference-value + monotonicity tests (correction is 0 outside the window, peaks inside, carries uncertainty). Validate against the tri-vendor + proven-S/F substrate (no measured DSA-force dataset in-repo -- declare blocked).

## ROI
**5/10** -- a real, physically-distinct accuracy gap for JM's most common materials (carbon steel + 300-series SS), but material-specific window parameters need careful sourcing and the force-changing part is physics-reviewer-gated, so ship the advisory first, the force correction second.
