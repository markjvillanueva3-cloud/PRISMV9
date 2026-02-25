---
name: mfg-formulas-materials
description: Material constitutive model formulas including Johnson-Cook, Zerilli-Armstrong, and Cowper-Symonds
---

# Material Constitutive Model Formulas

## When To Use
- Need material flow stress models under machining conditions
- Johnson-Cook parameters for FEA or analytical cutting models
- Strain rate sensitivity and thermal softening behavior
- Comparing constitutive models for simulation accuracy
- NOT for material properties lookup — use mfg-material-lookup
- NOT for material substitution — use mfg-material-substitute

## How To Use
```
prism_data action=formula_get params={ category: "material_models" }
prism_calc action=flow_stress params={
  model: "johnson_cook",
  material: "ti6al4v",
  strain: 1.5,
  strain_rate: 10000,
  temperature: 600
}
```

## What It Returns
- `formulas`: ~30 formulas covering J-C, Zerilli-Armstrong, Cowper-Symonds, Power-Law
- `flow_stress`: sigma = (A + B*eps^n)(1 + C*ln(eps_dot*))(1 - T*^m)
- `jc_constants`: A, B, n, C, m for the material
- `strain_rate_sensitivity`: C coefficient and rate-dependent behavior
- `thermal_softening`: Homologous temperature effect (T* = (T-Tr)/(Tm-Tr))

## Examples
- **J-C for Ti-6Al-4V**: A=1098, B=1092, n=0.93, C=0.014, m=1.1
- **J-C for AISI 1045**: A=553, B=601, n=0.234, C=0.0134, m=1.0
- **Strain rate effect**: At eps_dot=10^4 /s, flow stress increases ~30% over quasi-static
- **Zerilli-Armstrong**: Better for BCC metals (steels) at high strain rates
