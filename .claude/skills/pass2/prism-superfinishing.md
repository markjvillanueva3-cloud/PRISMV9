---
name: prism-superfinishing
description: 'Superfinishing guide. Use when the user needs microfinishing for bearing surfaces, rollers, raceways, or any component requiring Ra <0.1 μm with controlled lay pattern.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  tier: PASS2
  scrutiny_id: M114
  process: superfinishing
---

# Superfinishing (Microfinishing)

## When to Use
- Bearing raceway and roller superfinishing
- Achieving Ra <0.1 μm on cylindrical or flat surfaces
- Removing grinding amorphous layer while preserving geometry
- Improving fatigue life through compressive residual stress

## How It Works
1. Define surface requirements (Ra, Rz, waviness, form tolerance)
2. Select superfinishing method (stone, tape, through-feed)
3. Configure parameters via oscillation frequency, stone pressure, speed
4. Plan abrasive progression (typically 2-4 stages)
5. Verify via surface profilometer (Ra, Rk, Rpk, Rvk)

## Returns
- Process parameters (stone grit, oscillation, pressure, speed)
- Expected surface finish progression per stage
- Material removal estimate (typically 1-5 μm total)
- Bearing life improvement factor (L10 multiplier)

## Example
**Input:** "Superfinish bearing inner raceway, 52100 steel HRC 62, target Ra 0.05μm"
**Output:** 2-stage: (1) 600-grit alumina stone, 30Hz oscillation, 2mm amplitude, 0.3 MPa pressure, 20 m/min workpiece speed, 15 sec — Ra 0.12→0.08μm, removes amorphous grinding layer (2μm). (2) 1000-grit stone, 25Hz, 1.5mm amp, 0.2 MPa, 10 sec — Ra 0.08→0.04μm. Total removal: 3μm. Surface: plateau profile with low Rpk (0.02μm). Expected L10 improvement: 2-3× vs. ground-only surface.
