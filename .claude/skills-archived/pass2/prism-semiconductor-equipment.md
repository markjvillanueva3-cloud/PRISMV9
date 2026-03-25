---
name: prism-semiconductor-equipment
description: 'Semiconductor equipment machining guide. Use when the user machines ultra-precision components for semiconductor fab equipment requiring sub-micron tolerances, ultra-clean surfaces, and exotic materials.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  tier: PASS2
  scrutiny_id: M109
  industry: semiconductor
---

# Semiconductor Equipment Machining

## When to Use
- Ultra-precision machining (sub-micron tolerances, nm-level surface finish)
- Semiconductor fab equipment components (chambers, chucks, stages)
- Exotic materials: silicon carbide, quartz, alumina, single-crystal silicon
- Cleanroom-compatible manufacturing and packaging

## How It Works
1. Analyze tolerance requirements (typical: ±1-5 μm flatness, ±2 μm position)
2. Select machine (ultra-precision lathe/mill, hydrostatic/aerostatic bearings)
3. Configure parameters for ultra-precision regime via `prism_calc→ultra_precision`
4. Plan metrology (CMM with sub-micron probes, interferometry, roundness)
5. Specify clean manufacturing and packaging protocols

## Returns
- Ultra-precision machining parameters (single-crystal diamond tooling, nm DOC)
- Metrology plan (interferometer, form Talysurf, CMM with 0.1μm uncertainty)
- Clean manufacturing protocol (particle count, handling, ESD)
- Thermal management strategy (temperature-controlled environment ±0.1°C)

## Example
**Input:** "Machine 6061-T6 wafer chuck, 300mm diameter, flatness <1μm, Ra <0.05μm"
**Output:** Single-point diamond turning on ultra-precision lathe (Precitech Nanoform or equiv). Tool: 0.5mm radius SCD, 0°rake. Parameters: 1000 RPM, 1mm/min feed, 2μm final DOC. Environment: ±0.1°C controlled. Flatness verification: Zygo interferometer. Expected: 0.3-0.5 μm flatness, Ra 0.01-0.03 μm. Post-machine: ultrasonic clean (IPA + DI water), class 100 cleanroom packaging. Lead time driver: diamond tool wear — relap at 50 parts.
