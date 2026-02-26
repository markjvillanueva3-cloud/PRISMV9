---
name: mfg-johnson-cook-validate
description: Validate Johnson-Cook constitutive model parameters (A, B, n, C, m) for physical plausibility
---

## When To Use
- User enters J-C parameters for FEM simulation and wants to verify them
- Checking if A, B, n, C, m values are self-consistent and within expected ranges
- Validating J-C constants from literature before using in flow stress calculations
- NOT for calculating flow stress (use mfg-flow-stress)
- NOT for validating Kienzle or Taylor coefficients (use respective validators)

## How To Use
### Validate J-C Parameters
```
prism_validate action=johnson_cook params={
  material: "Ti-6Al-4V",
  A: 997,
  B: 653,
  n: 0.45,
  C: 0.0198,
  m: 0.7
}
```

### With Reference Conditions
```
prism_validate action=johnson_cook params={
  material: "4140_steel",
  A: 595,
  B: 580,
  n: 0.133,
  C: 0.023,
  m: 1.03,
  T_melt: 1793,
  T_ref: 25,
  epsilon_dot_0: 1.0
}
```

## What It Returns
```json
{
  "valid": true,
  "parameters": {
    "A": 997,
    "B": 653,
    "n": 0.45,
    "C": 0.0198,
    "m": 0.7
  },
  "checks": {
    "A_yield_consistency": "PASS",
    "B_hardening_range": "PASS",
    "n_exponent_range": "PASS",
    "C_rate_sensitivity": "PASS",
    "m_thermal_softening": "PASS",
    "A_B_ratio": "PASS",
    "implied_UTS_check": "PASS"
  },
  "implied_properties": {
    "quasi_static_yield_MPa": 997,
    "implied_UTS_MPa": 1420,
    "thermal_sensitivity": "moderate",
    "rate_sensitivity": "low"
  },
  "expected_ranges": {
    "A": [800, 1200],
    "B": [400, 900],
    "n": [0.2, 0.6],
    "C": [0.01, 0.05],
    "m": [0.5, 1.2]
  },
  "confidence": "high",
  "reference_source": "Lee & Lin (1998), Lesuer (2000)",
  "warnings": []
}
```

## Examples
### Validate Ti-6Al-4V J-C Parameters
- Input: `prism_validate action=johnson_cook params={material: "Ti-6Al-4V", A: 997, B: 653, n: 0.45, C: 0.0198, m: 0.7}`
- Output: PASS — well-known Lee & Lin parameters, widely validated in literature
- Edge case: Multiple J-C parameter sets exist for Ti-6Al-4V (10+ published); they give different results at extreme conditions

### Suspicious Steel Parameters
- Input: `prism_validate action=johnson_cook params={material: "4140_steel", A: 50, B: 580, n: 0.133, C: 0.023, m: 1.03}`
- Output: FAIL — A=50 MPa implies yield stress of 50 MPa, impossibly low for 4140 steel (should be ~595)
- Edge case: J-C parameters are strain-rate and temperature dependent; constants fitted at different conditions give different A values
