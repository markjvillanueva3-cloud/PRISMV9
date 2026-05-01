---
name: prism-lapping-polishing
description: 'Lapping and polishing guide. Use when the user needs flat lapping, cylindrical lapping, optical polishing, or ultra-fine surface finishing parameters.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  tier: PASS2
  scrutiny_id: M113
  process: lapping
---

# Lapping & Polishing

## When to Use
- Flat lapping for gauge blocks, seal faces, or optical flats
- Cylindrical lapping for gage pins or valve spools
- Optical polishing for mirror finishes (Ra <0.01 μm)
- Selecting abrasive compounds and lapping plates

## How It Works
1. Define surface requirements (flatness, parallelism, finish)
2. Select lapping compound (alumina, SiC, diamond, cerium oxide)
3. Calculate process parameters (plate speed, pressure, compound feed)
4. Plan compound progression (coarse → fine → polish)
5. Verify with optical flat / interferometer

## Returns
- Compound selection and progression sequence
- Process parameters (pressure, speed, duration per stage)
- Expected flatness and surface finish per stage
- Verification method and acceptance criteria

## Example
**Input:** "Lap seal face to 1 helium light band flatness, Ra 0.025μm, hardened steel"
**Output:** 3-stage: (1) 15μm alumina on cast iron plate, 60 RPM, 3 PSI, 10 min — removes 0.01mm, flatness to 3 bands. (2) 5μm diamond on copper plate, 40 RPM, 2 PSI, 8 min — flatness to 1.5 bands, Ra 0.05μm. (3) 1μm diamond on tin plate, 30 RPM, 1 PSI, 5 min — flatness 0.5-1.0 band (0.15-0.29μm), Ra 0.02μm. Verify: optical flat + monochromatic light (sodium). 1 band = 0.29μm (He light = 0.28μm).
