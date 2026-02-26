---
name: mfg-adaptive-thermal
description: Compensate for thermal growth during extended machining
---

# Adaptive Thermal Compensation

## When To Use
- Compensating for spindle thermal growth during long production runs
- Adjusting offsets as machine structure warms up over the shift
- Monitoring temperature gradients that affect part dimensions
- Maintaining tight tolerances during thermal transients (startup, load changes)

## How To Use
```
prism_intelligence action=adaptive_thermal params={machine: "DMG_DMU50", spindle_temp: 42.3, ambient_temp: 22.0, run_time_min: 120}
```

## What It Returns
- `thermal_offset` — compensation values for X, Y, Z axes in microns
- `spindle_growth` — estimated axial spindle growth in microns
- `structure_drift` — estimated machine structure thermal drift
- `stabilization_pct` — how close the machine is to thermal equilibrium (0-100%)
- `recommendation` — warm-up complete, continue monitoring, or re-probe needed

## Examples
- `adaptive_thermal params={machine: "DMG_DMU50", spindle_temp: 42.3, ambient_temp: 22.0, run_time_min: 120}` — get compensation after 2hr run
- `adaptive_thermal params={mode: "warmup_check", machine: "Haas_VF2", spindle_temp: 35.0}` — check if warm-up is sufficient
- `adaptive_thermal params={mode: "predict", target_time_min: 480, ambient_temp: 24.0}` — predict thermal state for full shift
