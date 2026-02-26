---
name: mfg-tool-breakage
description: Predict tool breakage probability from cutting forces, tool geometry, stress, and fatigue life
---

## When To Use
- When using small-diameter tools under heavy load
- When long-overhang setups create high bending stress
- Before running aggressive parameters on expensive tools
- NOT for gradual tool wear prediction (use mfg-tool-life)

## How To Use
### Predict Tool Breakage
```
prism_safety action=predict_tool_breakage params={
  tool_diameter: 6,
  overhang: 40,
  Fc: 800,
  tool_material: "carbide"
}
```

### Full Stress Analysis
```
prism_safety action=calculate_tool_stress params={
  tool_diameter: 3,
  overhang: 25,
  Fc: 400,
  Ft: 150,
  tool_material: "carbide",
  helix_angle: 30,
  flute_count: 4
}
```

### Fatigue Life Estimation
```
prism_safety action=estimate_tool_fatigue params={
  tool_diameter: 6,
  overhang: 40,
  Fc: 800,
  tool_material: "carbide",
  rpm: 10000,
  engagement_percent: 50
}
```

## What It Returns
```json
{
  "breakage_probability": 0.12,
  "risk_level": "moderate",
  "bending_stress_MPa": 850,
  "yield_stress_MPa": 3500,
  "stress_ratio": 0.24,
  "deflection_mm": 0.045,
  "fatigue_life_cycles": 2500000,
  "fatigue_life_minutes": 250,
  "critical_failure_mode": "bending_fatigue",
  "warnings": ["6.67:1 overhang ratio -- deflection may cause chatter before breakage"],
  "recommendation": "Breakage risk moderate at 12%. Reduce overhang to 30mm or reduce radial engagement to lower bending moment."
}
```

## Examples
### Small Tool Long Overhang
- Input: `prism_safety action=predict_tool_breakage params={tool_diameter: 3, overhang: 25, Fc: 400, tool_material: "carbide"}`
- Output: HIGH RISK -- 3mm tool at 8.3:1 overhang with 400N force. Bending stress 2800 MPa approaches carbide fracture (3500 MPa). Breakage probability 35%. Reduce force by 50% or use 4mm tool.
- Edge case: Carbide fails catastrophically without warning -- unlike HSS which bends before breaking

### Moderate Risk Assessment
- Input: `prism_safety action=predict_tool_breakage params={tool_diameter: 6, overhang: 40, Fc: 800, tool_material: "carbide"}`
- Output: Moderate risk at 12%. Stress ratio 0.24 provides 4:1 safety factor on static strength. Fatigue life ~250 min. Monitor for chatter as early warning of excessive stress.
- Edge case: Interrupted cuts (crossing holes, slots) dramatically increase fatigue loading -- multiply force by 1.5-2x for interrupted cut assessment
