---
name: mfg-sustain-carbon
description: Calculate carbon footprint of manufacturing processes
---

# Carbon Footprint Calculator

## When To Use
- Calculating CO2 equivalent emissions for a machining job or operation
- Comparing carbon footprint of different manufacturing approaches
- Reporting emissions data for environmental compliance or ESG reports
- Evaluating the carbon cost of material choices and process alternatives

## How To Use
```
prism_intelligence action=sustain_carbon params={material: "steel_4140", weight_kg: 25, operations: ["turning", "milling", "grinding"], machine_id: "DMG-5X-01"}
```

## What It Returns
- `total_co2_kg` — total carbon dioxide equivalent in kilograms
- `breakdown` — emissions by category (material production, machining energy, coolant, transport)
- `per_part` — carbon footprint per finished part
- `material_ratio` — buy-to-fly ratio and associated material waste emissions
- `reduction_suggestions` — specific actions to reduce carbon footprint

## Examples
- Calculate job carbon footprint: `sustain_carbon params={material: "steel_4140", weight_kg: 25, operations: ["turning", "milling"]}` — returns 18.4 kg CO2e total: 12.1 material + 4.8 energy + 1.5 coolant/waste
- Compare material choices: `sustain_carbon params={compare: [{material: "aluminum_7075", weight_kg: 5}, {material: "titanium_Ti6Al4V", weight_kg: 3}]}` — aluminum 8.2 kg CO2e vs. titanium 24.6 kg CO2e despite lower weight
- Monthly shop footprint: `sustain_carbon params={shop_id: "SHOP-01", period: "2026-01"}` — returns 2,340 kg CO2e for 186 jobs, 12.6 kg average per job, 15% reduction from previous month
