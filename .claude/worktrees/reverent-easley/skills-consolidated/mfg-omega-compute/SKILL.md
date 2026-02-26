---
name: Omega Quality Score
description: "Compute quality equation: omega = 0.25R + 0.20C + 0.15P + 0.30S + 0.10L"
---

## When To Use
- When assessing overall quality score of a manufacturing output or process
- When comparing quality across different jobs, parts, or time periods
- When checking if output meets the release threshold (omega >= 0.70)
- When tracking quality trends over time
- NOT for individual component analysis — use mfg-omega-breakdown for that

## How To Use
```
prism_omega action=compute params={
  R: 0.85,
  C: 0.78,
  P: 0.90,
  S: 0.72,
  L: 0.80
}
```

Component weights: R=Reliability(0.25), C=Completeness(0.20), P=Performance(0.15), S=Safety(0.30), L=Learnability(0.10)

## What It Returns
- Overall omega score (0.0 to 1.0)
- Weighted component contributions
- Gate status: RELEASE (>=0.70), ACCEPTABLE (>=0.65), WARNING (>=0.50), BLOCKED (<0.40)
- Safety hard constraint check: S(x) >= 0.70 required
- Distance to next threshold

## Examples
- Input: `compute params={R: 0.85, C: 0.78, P: 0.90, S: 0.72, L: 0.80}`
- Output: omega=0.806, RELEASE gate, all components pass, safety margin +0.02

- Input: `compute params={R: 0.70, C: 0.60, P: 0.50, S: 0.65, L: 0.40}`
- Output: omega=0.615, BLOCKED — safety S=0.65 below hard constraint 0.70, must fix before release
