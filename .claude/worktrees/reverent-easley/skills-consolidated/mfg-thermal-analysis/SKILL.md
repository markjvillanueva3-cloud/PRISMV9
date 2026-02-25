---
name: mfg-thermal-analysis
description: Calculate cutting zone temperature and heat partition between chip, tool, and workpiece
---

## When To Use
- User asks about cutting temperature or heat generation
- Evaluating thermal damage risk to workpiece or tool coating
- Selecting coolant strategy based on thermal load
- NOT for machine thermal compensation (use mfg-thermal-compensate)
- NOT for surface integrity effects of heat (use mfg-surface-integrity)

## How To Use
### Calculate Cutting Temperature
```
prism_calc action=thermal params={
  material: "4140_steel",
  Vc: 200,
  f: 0.15,
  ap: 2.0
}
```

### With Coolant Effects
```
prism_calc action=thermal params={
  material: "Ti-6Al-4V",
  Vc: 60,
  f: 0.12,
  ap: 1.5,
  coolant: "high_pressure",
  coolant_pressure_bar: 70
}
```

## What It Returns
```json
{
  "cutting_temperature_C": 685,
  "tool_face_temperature_C": 720,
  "heat_partition": {
    "chip_percent": 75,
    "tool_percent": 15,
    "workpiece_percent": 8,
    "coolant_percent": 2
  },
  "cutting_power_W": 4800,
  "specific_energy_J_mm3": 3.2,
  "thermal_damage_risk": "low",
  "model": "shaw_analytical",
  "warnings": []
}
```

## Examples
### Steel Milling at Moderate Speed
- Input: `prism_calc action=thermal params={material: "4140_steel", Vc: 200, f: 0.15, ap: 2.0}`
- Output: 685C cutting temp, 75% heat to chip, 15% to tool — normal for steel
- Edge case: Above 800C, carbide tool softening begins; consider speed reduction

### Dry Machining Titanium
- Input: `prism_calc action=thermal params={material: "Ti-6Al-4V", Vc: 80, f: 0.15, ap: 2.0, coolant: "dry"}`
- Output: 950C+ cutting temp, only 25% heat to chip (Ti low conductivity) — thermal damage risk HIGH
- Edge case: Titanium's low thermal conductivity means more heat enters tool and workpiece than steel
