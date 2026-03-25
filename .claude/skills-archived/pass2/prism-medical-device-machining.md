---
name: prism-medical-device-machining
description: 'Medical device machining guide. Use when the user manufactures implants or surgical instruments requiring FDA 21 CFR 820, biocompatible materials, and ultra-clean processing.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  tier: PASS2
  scrutiny_id: M104
  industry: medical
---

# Medical Device Machining

## When to Use
- Machining orthopedic implants (hip, knee, spinal, dental)
- Surgical instrument manufacturing
- FDA 21 CFR 820 QMS compliance
- Biocompatible material processing (Ti-6Al-4V ELI, CoCrMo, UHMWPE, PEEK)

## How It Works
1. Validate material biocompatibility per ISO 10993
2. Configure parameters for medical-grade surface finish
3. Apply clean manufacturing protocols (no silicone, chloride control)
4. Generate DHR (Device History Record) via `prism_compliance→gap_analysis`
5. Track lot genealogy through all manufacturing steps

## Returns
- Material biocompatibility verification (ISO 10993 matrix)
- Process parameters for medical-grade finish (Ra 0.2-0.8 um typical)
- Clean manufacturing protocol (coolant type, handling, packaging)
- DHR documentation package with lot traceability

## Example
**Input:** "Machine Ti-6Al-4V ELI hip stem, Ra 0.4 um finish, FDA Class III"
**Output:** Material: ASTM F136 (ELI grade), verify O2 <0.13%, Fe <0.25%. Roughing: carbide, flood coolant (no chlorinated oils). Finishing: Ra 0.4 um via 5-axis ball-nose, 0.05mm stepover, Vc=90m/min. Post: passivate per ASTM A967 (citric acid), verify no embedded particles via SEM. Clean room packaging. DHR: raw material cert → machining record → passivation cert → dimensional report → final release. Validation: IQ/OQ/PQ per 21 CFR 820.75.
