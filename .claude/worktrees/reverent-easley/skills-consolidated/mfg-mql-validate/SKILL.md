---
name: mfg-mql-validate
description: Validate Minimum Quantity Lubrication parameters for mist quality and coverage
---

## When To Use
- When setting up MQL system for near-dry machining
- When optimizing MQL parameters for a new material or operation
- When troubleshooting poor surface finish or short tool life with MQL
- NOT for flood coolant or through-spindle coolant (use mfg-coolant-flow or mfg-tsc)

## How To Use
### Validate MQL Parameters
```
prism_safety action=validate_mql_parameters params={
  oil_flow_ml_hr: 50,
  air_pressure_bar: 6,
  nozzle_distance_mm: 30
}
```

### Validate With Operation Context
```
prism_safety action=validate_mql_parameters params={
  oil_flow_ml_hr: 40,
  air_pressure_bar: 5,
  nozzle_distance_mm: 25,
  material: "aluminum_6061",
  operation: "milling",
  Vc: 300,
  nozzle_count: 2,
  oil_type: "ester_based"
}
```

## What It Returns
```json
{
  "mql_adequate": true,
  "mist_quality": "good",
  "droplet_size_um": 1.5,
  "coverage_area_mm2": 120,
  "oil_film_thickness_um": 0.8,
  "lubricity_rating": 0.85,
  "cooling_effectiveness": 0.45,
  "warnings": ["Cooling limited with MQL -- monitor tool temperature in extended cuts"],
  "recommendation": "MQL adequate for aluminum milling. Ester oil provides good lubricity. Position nozzle at rake face entry."
}
```

## Examples
### Aluminum High-Speed Milling With MQL
- Input: `prism_safety action=validate_mql_parameters params={oil_flow_ml_hr: 50, air_pressure_bar: 6, nozzle_distance_mm: 30, material: "aluminum_6061", Vc: 300}`
- Output: MQL adequate. Good mist quality at 6 bar. 50 ml/hr sufficient for aluminum. Nozzle at 30mm provides adequate coverage.
- Edge case: At Vc>400 m/min, MQL mist may not reach cutting zone due to air boundary layer -- use nozzle closer to cut

### Steel Machining With MQL
- Input: `prism_safety action=validate_mql_parameters params={oil_flow_ml_hr: 80, air_pressure_bar: 7, nozzle_distance_mm: 20, material: "4140_steel", Vc: 150}`
- Output: WARNING -- MQL cooling insufficient for 4140 steel at 150 m/min in heavy cuts. Adequate for finishing passes only. Use flood coolant for roughing.
- Edge case: MQL works better with coated carbide tools (TiAlN) that handle higher temperatures -- uncoated tools fail faster with MQL
