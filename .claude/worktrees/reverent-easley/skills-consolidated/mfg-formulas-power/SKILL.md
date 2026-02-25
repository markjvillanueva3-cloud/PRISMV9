---
name: mfg-formulas-power
description: Spindle power, torque, and motor efficiency formulas
---

# Power & Torque Formulas

## When To Use
- Need spindle power requirement calculations for an operation
- Torque at the spindle for a given speed and power
- Motor efficiency curves and power-speed envelopes
- Verifying machine capability for heavy roughing cuts
- NOT for cutting force components — use mfg-formulas-cutting
- NOT for spindle bearing/thermal limits — use mfg-spindle-thermal

## How To Use
```
prism_calc action=power params={
  cutting_force: 2000,
  cutting_speed: 200,
  efficiency: 0.85
}
prism_calc action=torque params={
  power_kw: 11.0,
  spindle_speed: 8000
}
```

## What It Returns
- `formulas`: ~15 formulas covering power, torque, efficiency, specific energy
- `power_kw`: P = Fc * Vc / (60000 * eta) at the spindle
- `torque_nm`: T = P * 9549 / n (from power and RPM)
- `specific_energy`: u = P / MRR (kW per cm3/min)
- `motor_efficiency`: eta curve vs load percentage (typically 0.80-0.92)

## Examples
- **Roughing steel**: Fc=2000N, Vc=200 m/min, eta=0.85 gives P=7.8 kW
- **Torque at 8000 RPM**: 11 kW gives T=13.1 Nm (check vs constant-torque range)
- **Specific energy**: Steel ~2.5 W*s/mm3, aluminum ~0.8 W*s/mm3
- **Machine check**: 15 kW spindle at 80% load allows max Fc*Vc = 720,000 N*mm/s
