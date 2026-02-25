---
name: mfg-kienzle-validate
description: Validate Kienzle specific cutting force coefficients (kc11, mc) for sanity and physical plausibility
---

## When To Use
- User enters or imports Kienzle coefficients and wants to verify them
- Checking if kc11 and mc values are within expected ranges for a material
- Debugging unexpected cutting force results
- NOT for validating Taylor constants (use mfg-taylor-validate)
- NOT for calculating forces (use mfg-cutting-force)

## How To Use
### Validate Kienzle Coefficients
```
prism_validate action=kienzle params={
  material: "4140_steel",
  kc11: 1780,
  mc: 0.25
}
```

### With Additional Context
```
prism_validate action=kienzle params={
  material: "aluminum_6061",
  kc11: 800,
  mc: 0.23,
  source: "measured",
  hardness_HB: 95
}
```

## What It Returns
```json
{
  "valid": true,
  "kc11": 1780,
  "mc": 0.25,
  "expected_kc11_range": [1500, 2200],
  "expected_mc_range": [0.18, 0.35],
  "kc11_in_range": true,
  "mc_in_range": true,
  "checks": {
    "kc11_physical_range": "PASS",
    "mc_physical_range": "PASS",
    "kc11_material_consistency": "PASS",
    "mc_material_consistency": "PASS",
    "ratio_check": "PASS"
  },
  "confidence": "high",
  "reference_values": {
    "kc11_textbook": 1780,
    "mc_textbook": 0.25,
    "source": "Sandvik Coromant / König"
  },
  "warnings": []
}
```

## Examples
### Validate Standard 4140 Steel Coefficients
- Input: `prism_validate action=kienzle params={material: "4140_steel", kc11: 1780, mc: 0.25}`
- Output: PASS on all checks, matches textbook values exactly
- Edge case: kc11 varies 15-20% between annealed and hardened states of same steel

### Suspicious Aluminum Values
- Input: `prism_validate action=kienzle params={material: "aluminum_6061", kc11: 2500, mc: 0.25}`
- Output: FAIL — kc11=2500 way too high for aluminum (expected 600-900); likely a data entry error
- Edge case: Cast aluminum alloys with high Si content can have kc11 up to 1100 due to abrasiveness
