---
name: mfg-cross-query
description: Power query crossing material + operation + machine to return complete parameter set (speed, feed, DOC, tool, forces)
---

## When To Use
- Need a complete set of machining parameters for a specific material, operation, and machine combination
- Setting up a new job and want all parameters in one query instead of multiple lookups
- Verifying that a parameter set is within machine capability limits
- Want tool recommendation, speeds/feeds, and force estimates in a single response
- NOT for individual lookups (use mfg-machine-lookup, mfg-tool-recommend, mfg-speed-feed separately)
- NOT for optimization across objectives (use mfg-multi-optimize)

## How To Use
### Cross-query material + operation + machine
```
prism_data action=cross_query params={
  material: "4140_steel",
  operation: "milling",
  machine: "haas_vf2"
}
```

### Cross-query with specific constraints
```
prism_data action=cross_query params={
  material: "inconel_718",
  operation: "turning_roughing",
  machine: "dmg_ctx_beta_1250",
  constraints: {
    surface_finish_Ra: 3.2,
    max_tool_cost: 10
  }
}
```

## What It Returns
```json
{
  "query": {
    "material": "4140_steel",
    "operation": "milling",
    "machine": "haas_vf2"
  },
  "parameters": {
    "tool": {
      "recommended": "345-050Q22-13M (Sandvik CoroMill 345)",
      "insert": "345R-1305E-PL GC4340",
      "diameter_mm": 50,
      "teeth": 5
    },
    "cutting": {
      "Vc_m_min": 280,
      "n_rpm": 1783,
      "fz_mm": 0.20,
      "Vf_mm_min": 1783,
      "ap_mm": 3.0,
      "ae_mm": 40
    },
    "forces": {
      "Fc_N": 1245,
      "power_kW": 5.8,
      "torque_Nm": 31.2
    },
    "machine_utilization": {
      "spindle_power_pct": 25.9,
      "spindle_torque_pct": 25.6,
      "spindle_speed_pct": 22.0,
      "within_envelope": true
    },
    "expected_results": {
      "MRR_cm3_min": 213.9,
      "surface_finish_Ra_um": 1.8,
      "tool_life_min": 45
    }
  },
  "warnings": [],
  "confidence": 0.92
}
```

## Examples
### Complete parameter set for milling 4140 on a Haas VF-2
- Input: `prism_data action=cross_query params={material: "4140_steel", operation: "milling", machine: "haas_vf2"}`
- Output: 50mm face mill at 280 m/min, 1783 RPM, 5.8 kW power (26% of spindle capacity), 45 min tool life
- Edge case: If machine cannot deliver required power or torque, parameters are de-rated and a warning is issued

### Cross-query for difficult material on specific machine
- Input: `prism_data action=cross_query params={material: "inconel_718", operation: "turning_roughing", machine: "dmg_ctx_beta_1250"}`
- Output: Ceramic insert recommended at 250 m/min for roughing, with force and thermal warnings for Inconel
- Edge case: Inconel queries include thermal management recommendations due to work-hardening sensitivity
