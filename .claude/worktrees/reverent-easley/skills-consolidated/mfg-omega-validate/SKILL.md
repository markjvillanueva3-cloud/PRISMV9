---
name: Omega Quality Gate Validator
description: "Validate quality gate compliance — S(x) >= 0.70 hard constraint"
---

## When To Use
- Before releasing any manufacturing output to production or customer
- When checking if a process change still passes quality gates
- When enforcing the safety hard constraint S(x) >= 0.70
- When validating batch quality before shipment approval
- NOT for score computation — use mfg-omega-compute first

## How To Use
```
prism_omega action=validate params={
  R: 0.85,
  C: 0.78,
  P: 0.90,
  S: 0.72,
  L: 0.80,
  gate: "RELEASE"
}
```

Gate thresholds: RELEASE >= 0.70, ACCEPTABLE >= 0.65, WARNING >= 0.50, BLOCKED < 0.40

## What It Returns
- PASS or FAIL with the specific gate level achieved
- Safety constraint check: S(x) >= 0.70 (hard block if failed)
- List of any components below their individual thresholds
- Required improvements to reach the next gate level
- Audit-ready validation record with timestamp

## Examples
- Input: `validate params={R: 0.85, C: 0.78, P: 0.90, S: 0.72, L: 0.80, gate: "RELEASE"}`
- Output: PASS — omega=0.806, RELEASE gate cleared, safety S=0.72 passes hard constraint

- Input: `validate params={R: 0.80, C: 0.75, P: 0.85, S: 0.68, L: 0.70, gate: "RELEASE"}`
- Output: FAIL — BLOCKED by safety hard constraint S=0.68 < 0.70, omega=0.760 would pass otherwise
