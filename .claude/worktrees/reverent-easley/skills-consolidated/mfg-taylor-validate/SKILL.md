---
name: mfg-taylor-validate
description: Validate Taylor tool life equation constants (C, n) for sanity and physical plausibility
---

## When To Use
- User enters or imports Taylor constants and wants to verify them
- Checking if C and n values make physical sense for a material/tool combination
- Debugging unexpected tool life predictions
- NOT for validating Kienzle coefficients (use mfg-kienzle-validate)
- NOT for predicting tool life (use mfg-tool-life)

## How To Use
### Validate Taylor Constants
```
prism_validate action=taylor params={
  material: "4140_steel",
  C: 300,
  n: 0.25
}
```

### With Tool Material Context
```
prism_validate action=taylor params={
  material: "Ti-6Al-4V",
  C: 80,
  n: 0.20,
  tool_material: "carbide",
  coating: "TiAlN"
}
```

## What It Returns
```json
{
  "valid": true,
  "C": 300,
  "n": 0.25,
  "expected_C_range": [200, 450],
  "expected_n_range": [0.15, 0.40],
  "C_in_range": true,
  "n_in_range": true,
  "checks": {
    "C_physical_range": "PASS",
    "n_physical_range": "PASS",
    "C_material_consistency": "PASS",
    "n_tool_material_consistency": "PASS",
    "implied_life_check": "PASS"
  },
  "implied_tool_life": {
    "at_100_m_min": 81,
    "at_200_m_min": 13.5,
    "at_300_m_min": 4.0
  },
  "confidence": "high",
  "reference_values": {
    "C_textbook": 300,
    "n_textbook": 0.25,
    "source": "Machining Data Handbook"
  },
  "warnings": []
}
```

## Examples
### Validate Standard Steel/Carbide Constants
- Input: `prism_validate action=taylor params={material: "4140_steel", C: 300, n: 0.25}`
- Output: PASS — C=300, n=0.25 are classic textbook values for steel with uncoated carbide
- Edge case: Coated carbide tools have higher C (350-500) than uncoated; specify coating if known

### Suspicious Titanium Constants
- Input: `prism_validate action=taylor params={material: "Ti-6Al-4V", C: 500, n: 0.20}`
- Output: FAIL — C=500 too high for titanium (expected 50-120); implies unrealistic tool life at high speeds
- Edge case: n < 0.15 implies tool is very speed-sensitive; common for ceramic tools in hard materials
