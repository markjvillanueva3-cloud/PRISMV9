---
name: mfg-material-validate
description: Validate material data completeness and consistency — check for missing properties and data quality
---

## When To Use
- Verifying material data quality before using it in calculations
- Checking if a material entry has all required Kienzle/Taylor coefficients
- Auditing material registry for completeness
- NOT for looking up material properties (use mfg-material-lookup)
- NOT for validating specific coefficients (use mfg-kienzle-validate or mfg-taylor-validate)

## How To Use
### Validate Material Entry
```
prism_validate action=material params={
  id: "4140_steel"
}
```

### Validate with Strictness Level
```
prism_validate action=material params={
  id: "custom_alloy_X",
  strictness: "high"
}
```

## What It Returns
```json
{
  "id": "4140_steel",
  "valid": true,
  "completeness_score": 0.95,
  "completeness_pct": 95,
  "missing_fields": ["johnson_cook.epsilon_dot_0"],
  "present_fields": 38,
  "total_fields": 40,
  "consistency_checks": {
    "hardness_tensile_correlation": "PASS",
    "kienzle_range_check": "PASS",
    "taylor_range_check": "PASS",
    "thermal_conductivity_range": "PASS"
  },
  "data_quality": "high",
  "warnings": ["J-C reference strain rate not specified — default 1.0 assumed"]
}
```

## Examples
### Validate Well-Known Steel
- Input: `prism_validate action=material params={id: "4140_steel"}`
- Output: 95% complete, valid, 1 minor missing field (J-C epsilon_dot_0)
- Edge case: Even common materials may have gaps in specialized fields (J-C, FEM parameters)

### Validate Custom Material Entry
- Input: `prism_validate action=material params={id: "custom_alloy_X", strictness: "high"}`
- Output: May show 60% completeness, missing Kienzle and Taylor coefficients
- Edge case: Custom materials often lack cutting coefficients; use mfg-kienzle-validate after adding them
