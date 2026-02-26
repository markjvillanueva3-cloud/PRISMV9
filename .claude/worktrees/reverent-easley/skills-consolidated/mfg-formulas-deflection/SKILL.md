---
name: mfg-formulas-deflection
description: Beam deflection and tool cantilever formulas for machining rigidity analysis
---

# Deflection & Rigidity Formulas

## When To Use
- Need tool deflection prediction for long-reach or slender tools
- Part deflection under cutting forces (thin walls, slender shafts)
- Stiffness calculations for tool assemblies (holder + extension + tool)
- L/D ratio guidelines and maximum allowable deflection
- NOT for chatter/vibration analysis — use mfg-formulas-vibration
- NOT for fixture clamping forces — use mfg-clamp-force

## How To Use
```
prism_calc action=deflection params={
  tool_diameter: 12,
  overhang_length: 60,
  cutting_force: 500,
  tool_material: "carbide",
  beam_type: "cantilever"
}
```

## What It Returns
- `formulas`: ~15 formulas covering cantilever, simply supported, tapered, composite beams
- `deflection`: delta = F * L^3 / (3 * E * I) for cantilever end-load
- `stiffness`: k = 3 * E * I / L^3 (N/mm) for the tool assembly
- `moment_of_inertia`: I = pi * d^4 / 64 for solid round section
- `max_stress`: sigma = M * c / I at the fixed end

## Examples
- **Carbide endmill L/D=5**: d=12mm, L=60mm, F=500N gives delta=0.018mm
- **HSS vs carbide**: E_carbide=620 GPa vs E_hss=210 GPa, carbide 3x stiffer
- **Thin wall deflection**: 2mm wall, 50mm tall, 200N force gives delta=0.08mm
- **Rule of thumb**: Keep deflection < 10% of tolerance, L/D < 4 for finishing
