---
name: mfg-unified-machining
description: Coupled force+thermal+wear+deflection model — single call for complete machining physics analysis
---

## When To Use
- User wants a comprehensive analysis of cutting conditions
- Need to evaluate all physics simultaneously (force, heat, wear, deflection)
- Making go/no-go decision on machining parameters
- NOT for a single calculation (use specific mfg-cutting-force, mfg-thermal-analysis, etc.)
- NOT for parameter recommendation (use mfg-speed-feed)

## How To Use
### Full Unified Analysis
```
prism_calc action=unified_machining_model params={
  material: "4140_steel",
  operation: "milling",
  Vc: 200,
  fz: 0.15,
  ap: 3,
  ae: 25,
  D: 50,
  z: 4
}
```

### With Tool and Machine Context
```
prism_calc action=unified_machining_model params={
  material: "Ti-6Al-4V",
  operation: "milling",
  Vc: 60,
  fz: 0.08,
  ap: 2,
  ae: 10,
  D: 16,
  z: 4,
  tool_material: "carbide",
  coating: "TiAlN",
  overhang: 48,
  machine_power_kW: 22
}
```

## What It Returns
```json
{
  "forces": {
    "Fc_N": 1245.8,
    "Ft_N": 498.3,
    "Fr_N": 373.7
  },
  "thermal": {
    "cutting_temp_C": 685,
    "heat_to_chip_pct": 75,
    "heat_to_tool_pct": 15
  },
  "wear": {
    "predicted_VB_at_30min": 0.18,
    "tool_life_minutes": 51.6,
    "wear_zone": "steady_state"
  },
  "deflection": {
    "deflection_mm": 0.032,
    "L_over_D": null
  },
  "power": {
    "power_kW": 8.4,
    "spindle_load_pct": null
  },
  "surface_finish": {
    "Ra_um": 1.56
  },
  "MRR_cm3_min": 22.5,
  "overall_assessment": "PASS",
  "risk_factors": [],
  "coupling_effects": {
    "thermal_softening_on_force": -3.2,
    "wear_increase_on_force": 5.1,
    "deflection_on_surface": 0.008
  },
  "warnings": []
}
```

## Examples
### Complete Steel Milling Analysis
- Input: `prism_calc action=unified_machining_model params={material: "4140_steel", operation: "milling", Vc: 200, fz: 0.15, ap: 3, ae: 25, D: 50, z: 4}`
- Output: All physics coupled: Fc=1245N, 685C, 51min life, 0.032mm deflection, Ra=1.56um, 8.4kW, PASS
- Edge case: Coupling shows wear increases force by 5.1% at 30 min — thermal softening partially offsets

### Titanium with Constraints
- Input: `prism_calc action=unified_machining_model params={material: "Ti-6Al-4V", operation: "milling", Vc: 60, fz: 0.08, ap: 2, ae: 10, D: 16, z: 4, overhang: 48, machine_power_kW: 22}`
- Output: Comprehensive analysis with L/D=3 deflection, thermal risk assessment, tool life for Ti
- Edge case: Unified model captures that Ti's low conductivity means deflection worsens as tool wears (force increases)
