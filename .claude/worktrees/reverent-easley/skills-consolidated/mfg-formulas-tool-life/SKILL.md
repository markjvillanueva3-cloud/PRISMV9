---
name: mfg-formulas-tool-life
description: Tool life formulas including Taylor, extended Taylor, and flank wear models
---

# Tool Life Formulas

## When To Use
- Need tool life equations (Taylor VT^n = C and variants)
- Looking up Taylor constants (n, C) for material-tool combinations
- Wear progression modeling: 3-zone flank wear, crater wear
- Economic tool life and optimal cutting speed
- NOT for wear mechanisms — use mfg-formulas-wear
- NOT for cost optimization — use mfg-formulas-economics

## How To Use
```
prism_data action=formula_get params={ category: "tool_life" }
prism_calc action=tool_life params={
  material: "steel_4140",
  tool: "carbide_coated",
  cutting_speed: 250,
  feed: 0.20,
  depth_of_cut: 2.0
}
```

## What It Returns
- `formulas`: ~30 formulas covering Taylor, extended Taylor, Colding, wear models
- `tool_life_minutes`: Predicted life via Taylor (T = (C/V)^(1/n))
- `taylor_constants`: n, C values for the material-tool pair
- `wear_progression`: 3-zone model (break-in, steady, accelerated)
- `economic_speed`: Speed for minimum cost (Vopt)

## Examples
- **Taylor for carbide on steel**: n=0.25, C=300, at V=200 gives T=31.6 min
- **Extended Taylor**: V * T^n * f^a * d^b = C with feed/depth exponents
- **3-zone wear**: Break-in (0-2min), steady (VB rate 0.01mm/min), rapid after VB=0.3mm
- **Economic life**: At $45/hr machine, $8/edge, tool change 2min gives Topt=18min
