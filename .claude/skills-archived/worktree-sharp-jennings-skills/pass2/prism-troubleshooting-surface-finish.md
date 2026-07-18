---
name: prism-troubleshooting-surface-finish
description: 'Surface finish troubleshooting guide. Use when the user gets poor surface finish and needs to diagnose the cause — tool wear, parameters, vibration, or material issues.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  tier: PASS2
  scrutiny_id: M123
  category: operator-knowledge
---

# Troubleshooting Surface Finish

## When to Use
- Surface finish not meeting drawing requirements
- Diagnosing cause: tool wear, BUE, parameters, vibration, deflection
- Improving finish from current Ra to target Ra
- Material-specific finish optimization (aluminum BUE, stainless work hardening)

## How It Works
1. Measure current finish via profilometer (Ra, Rz, Rmax)
2. Analyze finish pattern (feed marks, chatter, tearing, smearing)
3. Diagnose via `prism_intelligence→troubleshoot_diagnose` with symptoms
4. Apply corrective parameters via `prism_calc→surface_finish_predict`
5. Verify improvement with test cut

## Returns
- Root cause diagnosis with probability ranking
- Parameter adjustments (feed, speed, nose radius, DOC)
- Tool recommendations (coating, geometry, edge prep)
- Material-specific tips (BUE prevention, work hardening avoidance)

## Example
**Input:** "Ra 1.6μm on 316SS turning, need Ra 0.8μm, using CNMG insert r=0.8mm"
**Output:** Current theoretical finish: Ra = f²/(32×r) = 0.15²/(32×0.8) = 0.88μm — close to theoretical, so feed marks dominate. To reach Ra 0.8μm theoretical, reduce feed to f=0.14mm/rev → theoretical Ra=0.77μm. BUT actual Ra=1.6 (2× theoretical) suggests: (1) BUE — 316SS at Vc<120 m/min forms BUE. Increase Vc to 160-180 m/min. (2) Insert wear — check flank wear (replace >0.2mm VB). (3) Try wiper insert (doubles effective nose radius, Ra drops 40-50% at same feed). Quick fix: Vc=170 m/min + wiper CNMG (r_eff=1.6mm) → predicted Ra 0.55μm.
