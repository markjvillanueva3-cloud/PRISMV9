---
name: mfg-formulas-wear
description: Tool wear mechanism formulas including flank, crater, diffusion, and adhesion models
---

# Tool Wear Mechanism Formulas

## When To Use
- Need wear rate prediction for specific mechanisms (flank, crater, notch)
- Wear mechanism identification from cutting conditions
- Diffusion, adhesion, abrasion, and oxidation wear models
- Coating effectiveness and wear resistance factors
- NOT for tool life prediction (Taylor) — use mfg-formulas-tool-life
- NOT for real-time wear monitoring — use mfg-tool-wear-monitor

## How To Use
```
prism_calc action=wear_prediction params={
  material: "ti6al4v",
  tool: "carbide_pvd_tialn",
  cutting_speed: 60,
  feed: 0.15,
  depth_of_cut: 2.0,
  cutting_time: 15
}
```

## What It Returns
- `formulas`: ~15 formulas covering 3-zone VB, Usui crater, Archard, diffusion
- `flank_wear_vb`: VB progression through break-in, steady, and rapid zones
- `crater_wear_kt`: Usui model crater depth on rake face
- `wear_mechanism`: Dominant mechanism at given speed/temperature
- `coating_factor`: Wear reduction multiplier for coating type

## Examples
- **3-zone flank wear**: Break-in VB=0.05 (2min), steady 0.008mm/min, rapid after VB=0.3mm
- **Crater wear in Ti**: Diffusion-dominated above 800C, Usui KT rate = A*exp(-B/T)*sigma*Vs
- **Mechanism map**: Low speed = adhesion, medium = abrasion, high = diffusion/oxidation
- **Coating effect**: TiAlN reduces flank wear rate 40-60% vs uncoated in steel
