---
name: mfg-sustain-energy
description: Analyze energy consumption per operation and identify savings
---

# Energy Analysis Engine

## When To Use
- Measuring energy consumption of specific machining operations
- Comparing energy efficiency across different process strategies
- Identifying energy-intensive operations that can be optimized
- Benchmarking machine energy usage against industry standards

## How To Use
```
prism_intelligence action=sustain_energy params={machine_id: "DMG-5X-01", operation: "roughing", material: "steel_4140", duration_min: 45}
```

## What It Returns
- `energy_kwh` — total energy consumed for the operation in kilowatt-hours
- `power_profile` — breakdown of power by phase (cutting, rapid, idle, spindle-up)
- `efficiency_ratio` — ratio of useful cutting energy to total energy consumed
- `benchmark` — comparison against typical industry values for similar operations
- `savings_opportunities` — specific recommendations to reduce energy consumption

## Examples
- Analyze roughing energy: `sustain_energy params={machine_id: "DMG-5X-01", operation: "roughing", material: "steel_4140", duration_min: 45}` — returns 8.7 kWh total, 62% cutting / 18% rapid / 20% idle, efficiency ratio 0.58
- Compare two strategies: `sustain_energy params={machine_id: "HAAS-VF2-03", operation: "pocketing", compare: ["conventional", "trochoidal"]}` — trochoidal uses 15% less energy despite 8% longer cycle due to lower peak loads
- Monthly machine audit: `sustain_energy params={machine_id: "MORI-NLX-02", period: "last_month"}` — returns 342 kWh total, 28% idle time identified, potential savings of 96 kWh/month by reducing warmup cycles
