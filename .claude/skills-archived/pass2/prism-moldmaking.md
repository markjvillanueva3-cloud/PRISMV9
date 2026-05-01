---
name: prism-moldmaking
description: 'Moldmaking and EDM guide. Use when the user designs or machines injection molds, die cast dies, or stamp dies requiring electrode design, EDM parameters, or high-polish finishes.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  tier: PASS2
  scrutiny_id: M107
  industry: moldmaking
---

# Moldmaking & EDM

## When to Use
- Designing and machining injection mold cavities/cores
- Electrode design and sinker EDM parameter selection
- Wire EDM for die components
- Achieving SPI (A1/A2/A3, B1-B3, C1-C3, D1-D3) polish grades

## How It Works
1. Analyze mold geometry for machinability and EDM requirements
2. Design electrodes via feature extraction (core-out geometry)
3. Select EDM parameters via `prism_intelligence→edm_parameters`
4. Plan HSM finishing strategies for direct-machined surfaces
5. Specify polish grades and texturing (SPI or VDI) per face

## Returns
- Electrode design (graphite/copper, overburn values, number of electrodes)
- EDM parameters (rough/semi/finish, Ip, ton, toff, gap voltage)
- HSM finishing strategy (ball-nose, 0.01-0.05mm stepover for A1-A3)
- Polish sequence (stone grades, diamond paste progression)

## Example
**Input:** "Machine injection mold cavity, P20 steel, SPI A2 finish on core, B1 on walls"
**Output:** Core: HSM ball-nose finish R0.5mm, 0.02mm stepover, Vc=250m/min (P20), then polish: 320→600→1000 stone → 6μ→3μ→1μ diamond paste = A2 (Ra 0.025μm). Walls: HSM R1mm ball, 0.05mm stepover → 320→600 stone = B1 (Ra 0.05μm). Deep ribs >4xD: sinker EDM, graphite electrodes (EDM-200 grade), 3 electrodes per rib (rough/semi/finish), overburn 0.15/0.08/0.03mm. Wire EDM: slides and lifters from H13 hardened.
