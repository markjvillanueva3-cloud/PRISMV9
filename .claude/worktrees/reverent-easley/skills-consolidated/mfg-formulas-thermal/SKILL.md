---
name: mfg-formulas-thermal
description: Thermal and heat transfer formulas for machining including Jaeger and partition models
---

# Thermal & Heat Transfer Formulas

## When To Use
- Need temperature calculations at tool-chip interface or workpiece
- Heat partition ratios between chip, tool, and workpiece
- Thermal damage thresholds (white layer, phase transformation, residual stress)
- Coolant effectiveness and thermal modeling
- NOT for coolant flow/pressure sizing — use mfg-formulas-coolant
- NOT for spindle thermal growth — use prism_safety action=monitor_spindle_thermal

## How To Use
```
prism_data action=formula_get params={ category: "thermal" }
prism_calc action=thermal params={
  material: "ti6al4v",
  cutting_speed: 60,
  feed: 0.15,
  depth_of_cut: 2.0,
  tool_material: "carbide"
}
```

## What It Returns
- `formulas`: ~20 formulas covering Jaeger, Trigger, Loewen-Shaw, Komanduri-Hou
- `max_temperature`: Peak tool-chip interface temperature (deg C)
- `heat_partition`: Fraction of heat into chip vs tool vs workpiece
- `thermal_number`: Dimensionless Peclet number for regime classification
- `damage_risk`: Assessment against material-specific thermal thresholds

## Examples
- **Ti-6Al-4V at 60 m/min**: Peak temp ~950C, 75% heat into chip, damage risk moderate
- **Heat partition**: At high speed (Peclet > 10), >85% of heat leaves with chip
- **Thermal damage**: White layer forms in hardened steel above ~750C contact temp
- **Jaeger model**: Moving heat source on semi-infinite body, function of Vc and thermal diffusivity
