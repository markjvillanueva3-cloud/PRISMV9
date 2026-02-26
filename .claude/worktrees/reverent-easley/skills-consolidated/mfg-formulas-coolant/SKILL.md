---
name: mfg-formulas-coolant
description: Coolant system formulas including flow rate, pressure, MQL, and cryogenic parameters
---

# Coolant System Formulas

## When To Use
- Need coolant flow rate and pressure calculations for flood or TSC
- Nozzle sizing and velocity calculations for effective chip evacuation
- MQL (minimum quantity lubrication) oil flow rate and air pressure
- Cryogenic coolant (CO2, LN2) consumption rate estimation
- NOT for thermal analysis of cutting zone — use mfg-formulas-thermal
- NOT for coolant type selection — use mfg-coolant-recommend

## How To Use
```
prism_calc action=coolant_strategy params={
  operation: "drilling",
  material: "ti6al4v",
  hole_diameter: 12,
  depth: 48,
  coolant_type: "through_spindle"
}
prism_safety action=validate_coolant_flow params={
  flow_rate: 20,
  pressure: 70,
  nozzle_diameter: 1.5
}
```

## What It Returns
- `formulas`: ~15 formulas covering flow rate, nozzle velocity, MQL, cryogenic
- `flow_rate`: Q = v * A (liters/min) through nozzle cross-section
- `nozzle_velocity`: v = sqrt(2 * P / rho) from Bernoulli equation
- `mql_flow`: Typical 5-50 ml/hr oil rate with 4-6 bar air pressure
- `cryo_consumption`: CO2 or LN2 kg/hr based on heat load

## Examples
- **TSC at 70 bar**: 1.5mm nozzle gives v=118 m/s, Q=12.5 L/min
- **Flood coolant**: 5% concentration, 20 L/min for face milling steel
- **MQL for titanium**: 30 ml/hr oil, 6 bar air, fatty ester base oil
- **CO2 cryogenic**: ~0.5 kg/min consumption for turning Ti-6Al-4V at 60 m/min
