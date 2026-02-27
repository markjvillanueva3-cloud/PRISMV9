---
name: sfc-quick-start
description: 'Speed & Feed Calculator quick start guide. Use when the user asks about calculating cutting parameters, speeds, feeds, chip thinning, or tool life for CNC milling and turning operations.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  product: SFC
---

# SFC Quick Start — Speed & Feed Calculator

## When to Use
- User asks "what speed/feed for [material] with [tool]?"
- Calculating cutting parameters for a new job setup
- Optimizing existing parameters for better tool life or MRR
- Checking chip load, power, torque, or deflection before running a program

## How It Works
1. Identify material (ISO P/M/K/N/S/H group) via `prism_data→material_search`
2. Match tooling from registry via `prism_data→tool_search`
3. Calculate base parameters via `prism_calc→speed_feed`
4. Apply chip thinning correction via `prism_calc→chip_thinning`
5. Validate safety via `prism_safety→validate_params`
6. Return optimized parameters with safety score

## Returns
- Cutting speed (Vc m/min), spindle RPM, feed rate (mm/min)
- Feed per tooth (fz), chip load, radial/axial DOC
- Power (kW), torque (Nm), cutting force (N)
- Tool life estimate (min), MRR (cm3/min)
- Safety score S(x) with pass/fail

## Example
**Input:** "12mm 4-flute carbide endmill in 4140 steel (28 HRC), 50% radial, 1xD axial"
**Output:** Vc=180 m/min, n=4775 RPM, fz=0.08 mm, Vf=1528 mm/min, Pc=3.2 kW, T=0.64 Nm, Tool life=45 min, MRR=18.3 cm3/min, S(x)=0.94 PASS
