---
artifact: hermes-gap-research-cam-wedm
source: Hermes proxy :8645 -> xAI Grok (grok-4.20-0309-reasoning), authenticated OAuth
generated_by: slot:zulu 2026-06-29 (operator: "hermes is up, utilize hermes agents to the max")
status: ADVISORY -- specialist verify-then-fire (mike=wedm, kilo=cam). NOT auto-wired as verified.
closes: the 8 exported gaps in WEDM_UNVERIFIED_GAPS (wedm-approach-knowledge.mjs) + CAM_UNVERIFIED_GAPS (cam-approach-knowledge.mjs)
---

# Hermes (Grok) research brief -- CAM + WEDM approach-firing gap closure

The auto-firing approach-knowledge layer (lathe/mill/post/wedm/cam/cad) exported 8 gates as
UNVERIFIED because they needed domain physics zulu won't fabricate. With Hermes (Grok-reasoning)
now live, each gap was researched against authoritative sources. **R12 boundary:** Grok is an LLM
-- the FORMULAS below are independently verified by zulu (standard textbook physics, two match
PRISM's own engines); the THRESHOLDS are cited engineering conventions the SPECIALIST must confirm
against the named source + their domain BEFORE promoting from the `*_UNVERIFIED_GAPS` export to a
fired `GATES` entry. Do not fire a shop-floor safety gate on LLM assertion alone.

## CAM gaps (kilo) -- cam-approach-knowledge.mjs CAM_UNVERIFIED_GAPS

1. **rest_machining trigger** -- RULE: trigger rest-machining when leftover cusp/uncut-stock exceeds
   finish allowance + a safety multiple of part tolerance. FORMULA (ball-nose cusp): `h = R - sqrt(R^2 - (ae/2)^2)`
   (R=tool radius, ae=stepover). THRESHOLD: `h > ~3x finish tolerance` (or uncut > finish-stock + 3x tol band).
   SOURCE: Machinery's Handbook 31e p.1124-1126; Stephenson & Agapiou *Metal Cutting Theory & Practice* 3e Sec10.4.2; Mastercam/NX rest-roughing docs.
   **zulu-verify:** FORMULA CONFIRMED -- it is the exact form of PRISM's `RestMachiningEngine.ts` approximation `h=ae^2/(8R)` (small-ae Taylor expansion). Threshold "3x tol" is a convention -> kilo confirm vs the part tolerance class.

2. **5-axis singularity** -- RULE: gimbal-lock when the tool vector aligns with a rotary axis (lose 1 DOF).
   THRESHOLD: guard cone **+/-10deg to +/-15deg** from the singular orientation (tool axis parallel to the table/head rotary axis); NX default 12deg.
   SOURCE: hyperMILL 2023 5-Axis Tech Manual Sec4.2; Mori et al. CIRP Annals 2001; NX CAM 5-axis docs.
   **zulu-verify:** physically sound (singularity at tool-axis || rotary-axis). The +/-12deg guard is a CAM-default convention -> kilo confirm vs `cam_multiaxis_recommend` / the M460V kinematics.

3. **cross-vendor holder clearance** -- RULE: on a CAM->CAM transfer (Mastercam->hyperMILL etc.) re-model
   holder/shank/collet + re-collision-check in the receiving system (representations differ). THRESHOLD: NO universal value
   (tool/holder/machine/material dependent); conservative min ~**0.5mm (0.020in)** dynamic, aerospace ~**1.0mm**.
   SOURCE: Smid *CNC Programming Handbook* 3e p.378-382; OPEN MIND hyperMILL Tool-DB transfer doc; Boeing D6-56202.
   **zulu-verify:** Grok correctly says no universal number -> keep as an advisory re-validate-clearance gate, not a fixed mm.

4. **Fusion 360 rest stock-source** -- RULE: Fusion rest machining REQUIRES explicit stock source
   ("From previous operation(s)" or a linked Setup/Stock). FAILURE if unset/stale: falls back to INITIAL stock ->
   air-cutting, missed rest in corners, wrong engagement, possible gouge/overload where stock was assumed present.
   SOURCE: Autodesk Fusion 360 Mfg Reference 2024 "Rest Machining"; help "Specify stock for rest machining" (2023.2).
   **zulu-verify:** matches delta's Fusion-live knowledge (stale-model failure class). kilo confirm the exact UI selection on the live :18361 CAM seat.

5. **hyperMILL blade/blisk roughing tilt** -- RULE: blade roughing uses HIGHER side-tilt than generic 5-axis;
   collision-avoidance (clear adjacent blades + shank) takes precedence, engagement optimized within the safe band.
   THRESHOLD: generic 5-8deg lead/tilt vs blade **10-20deg side tilt** at ~35-55% radial engagement; solver-driven (Automatic Tilt), not a fixed formula.
   SOURCE: OPEN MIND hyperMILL 2023.2 "5-Axis Blade/Blisk Roughing" manual Sec5.3-5.4; OPEN MIND 2021 blisk paper.
   **zulu-verify:** consistent with the cam galaxy's hyperMILL-v31 doctrine -> kilo confirm vs `cam_hypermill_strategy_kb_for_geometry`.

## WEDM gaps (mike) -- wedm-approach-knowledge.mjs WEDM_UNVERIFIED_GAPS

1. **taper wire-deflection compensation** -- RULE: wire bows toward the discharge zone under distributed load;
   program the upper guide STEEPER than the desired part angle (add bow for external taper, subtract for internal).
   FORMULA: `delta = q*L^2/(8*T)` (q=N/m distributed load, L=guide span, T=tension); bow angle `theta ~= q*L/(2*T) ~= 4*delta/L` rad; `programmed = desired +/- theta_bow`.
   SOURCE: Sommer *Wire EDM Handbook* (Reliable EDM) 4e p.112-118; Kunieda CIRP Annals 1989 38/1 p.179-182. No universal "deg/amp" (depends on tension 8-25N, discharge energy, wire dia, guide span).
   **zulu-verify:** FORMULA CONFIRMED -- same `delta=F*L^2/8T` tensioned-beam form as `wedm-kb-015` / `WEDM_TAPER_SPEC.wire_bow_per_deg_taper_um`. mike wire the theta->programmed-angle correction (the algorithm the gap named) into `WEDMTaperErrorBudgetEngine`.

2. **no-core / skim sequencing** -- RULE: with a retained slug (micro-tab "no-core"), every skim must re-enter/exit
   at the EXACT rough-cut lead-in/out point; locate the tab ~90-180deg from the approach so all skims finish before
   the final pass severs the tab. Re-entry deviation > ~0.01mm leaves micro-tabs / witness lines / wire-break risk.
   SOURCE: Mitsubishi Wire-EDM Prog/Op Manual Sec5.4 "Slug Retention & Skim Sequencing"; Sodick LN2/LQ No-Core supplement; Sommer p.145-152.
   **zulu-verify:** path-logic rule (not a physics constant). mike author as a `no_core_cut_sequence` gate -> the `WEDMNoCoreCutSequencerEngine` the gap said was missing.

3. **gap voltage vs open-circuit** -- RULE: servo mean gap voltage Vg < set open-circuit Voc (Vg is time-averaged over
   ignition-delay/discharge/off; servo modulates feed to hold the ignition-delay ratio).
   FORMULA: `Vg = (td*Voc + te*Ve)/(td+te+to)` (Ve~20-25V discharge, td=ignition delay, te=discharge, to=off-time).
   BAND: for brass/DI-water at Voc=80-100V, stable Vg **35-55V**; <~30V short-circuits, >~65-70V excessive open-time/low MRR.
   SOURCE: Klocke *Manufacturing Processes 4* (Springer 2013) Sec4.2.3 p.98-102; Kunieda CIRP Annals 2005 54/1 p.143-146; Mitsubishi FA SVU tables. Band is machine/dielectric-specific.
   **zulu-verify:** physically sound time-average. The 35-55V band aligns with `WEDMSafetyEnvelopeEngine` gap-voltage 20-80V envelope -> mike confirm vs the FA-10S SVU param + tighten the working-gap advisory.

## Next action (specialist)
- **kilo:** verify items 1-5 vs the cited sources + the cam engines named; promote confirmed ones from `CAM_UNVERIFIED_GAPS` to fired `GATES` (with the source cite + a real test).
- **mike:** verify items 1-3 vs the cited sources + the WEDM engines named; promote from `WEDM_UNVERIFIED_GAPS` to fired `GATES`.
- Hermes is the research lane for this (`node scripts/ask-hermes.mjs ask "<q>"` or mcp `hermes_ask`), free + out-of-context; deepen per-source before firing.
