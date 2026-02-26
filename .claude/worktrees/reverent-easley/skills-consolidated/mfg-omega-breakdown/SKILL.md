---
name: Omega Score Breakdown
description: Break down omega score into component scores with improvement suggestions
---

## When To Use
- When you have an omega score and need to understand what is driving it
- When looking for the highest-impact area to improve quality
- When preparing quality review reports with actionable recommendations
- When comparing component scores across different jobs or periods
- NOT for computing the score — use mfg-omega-compute first

## How To Use
```
prism_omega action=breakdown params={
  R: 0.85,
  C: 0.78,
  P: 0.90,
  S: 0.72,
  L: 0.80
}
```

## What It Returns
- Component-by-component weighted contribution to omega
- Ranking of components from weakest to strongest
- Improvement suggestions for the lowest-scoring components
- Sensitivity analysis: how much omega improves per 0.05 increase in each component
- Historical trend if previous scores are available

## Examples
- Input: `breakdown params={R: 0.85, C: 0.60, P: 0.90, S: 0.75, L: 0.80}`
- Output: Completeness (C=0.60) is weakest, +0.05 on C raises omega by +0.010, suggest adding missing docs

- Input: `breakdown params={R: 0.70, C: 0.70, P: 0.70, S: 0.70, L: 0.70}`
- Output: All components equal at 0.70, omega=0.700, safety is most impactful lever (0.30 weight)
