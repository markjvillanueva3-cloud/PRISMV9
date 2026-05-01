---
name: prism-aerospace-requirements
description: 'Aerospace manufacturing requirements guide. Use when the user machines parts for aerospace (AS9100, NADCAP, BAC specs) and needs compliance with FPI/MPI, material traceability, or special process requirements.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  tier: PASS2
  scrutiny_id: M103
  industry: aerospace
---

# Aerospace Manufacturing Requirements

## When to Use
- Machining parts to AS9100 or NADCAP requirements
- Boeing BAC, Airbus AIMS, or Lockheed CPS spec compliance
- First article inspection (FAI) per AS9102
- Special process callouts: FPI, MPI, anodize, heat treat, shot peen

## How It Works
1. Identify applicable specs from drawing callouts
2. Validate material cert via `prism_compliance→gap_analysis` against AMS/ASTM/UNS
3. Build process plan with mandatory inspection points
4. Generate FAI per AS9102 Form 1/2/3 via `prism_export→render_pdf`
5. Track special process vendor certs via supplier quality system

## Returns
- Spec compliance matrix (drawing callout → applicable spec → status)
- Material traceability chain (heat lot → cert → part serial)
- FAI balloon drawing with characteristic accountability
- Special process routing with NADCAP-certified vendor assignments

## Example
**Input:** "Machine Ti-6Al-4V turbine bracket per BAC 5673 Class 3, FPI required"
**Output:** Material: AMS 4911 Ti-6Al-4V, verify cert for chemistry + mechanical. Machining: no grinding burn (etch inspect per BAC 5751). Surface finish: 63 Ra max per drawing. FPI per ASTM E1417, Method A (water washable), accept/reject per AMS 2647. FAI: 47 characteristics, 12 critical. Post-machine: stress relieve 900°F/1h if residual stress concern. Traceability: mill cert → raw stock serial → part serial → FPI record.
