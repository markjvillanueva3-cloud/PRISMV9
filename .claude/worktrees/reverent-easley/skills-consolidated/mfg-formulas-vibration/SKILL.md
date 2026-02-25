---
name: mfg-formulas-vibration
description: Vibration and chatter formulas including stability lobe diagrams and FRF analysis
---

# Vibration & Chatter Formulas

## When To Use
- Need stability lobe diagram calculations (critical depth of cut vs spindle speed)
- Frequency response function analysis for tool/workpiece
- Chatter frequency prediction and avoidance strategies
- Natural frequency and damping ratio estimation
- NOT for tool deflection — use mfg-formulas-deflection
- NOT for surface finish from vibration — use mfg-formulas-surface

## How To Use
```
prism_data action=formula_get params={ category: "vibration" }
prism_calc action=stability params={
  natural_frequency: 850,
  damping_ratio: 0.03,
  stiffness: 1.5e7,
  specific_force: 2000,
  num_teeth: 4,
  radial_immersion: 0.5
}
```

## What It Returns
- `formulas`: ~25 formulas covering SLD, FRF, natural frequency, damping
- `critical_depth`: a_lim = -1 / (2 * Ks * Re[G(jw)]) at each speed
- `stability_lobes`: Array of [RPM, a_lim] pairs for the stability boundary
- `chatter_frequency`: Predicted chatter frequency from FRF peaks
- `optimal_speeds`: Spindle speeds at stability lobe peaks (maximum stable depth)

## Examples
- **SLD for aluminum**: fn=850Hz, zeta=0.03, k=15MN/m gives sweet spots at 12750/6375 RPM
- **Chatter frequency**: Tooth passing frequency near fn produces worst-case instability
- **Damping effect**: Doubling zeta from 0.03 to 0.06 roughly doubles stable depth
- **Regenerative chatter**: Phase between current and previous tooth cuts drives instability
