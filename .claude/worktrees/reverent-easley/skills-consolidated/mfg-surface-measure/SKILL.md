---
name: Surface Roughness Measurement
description: Surface roughness measurement analysis and comparison to spec
---

## When To Use
- When analyzing surface roughness measurement data (Ra, Rz, Rq)
- When comparing measured surface finish against drawing requirements
- When tracking surface finish trends across a production run
- When correlating surface measurements with cutting parameters
- NOT for theoretical surface finish prediction — use mfg-surface-finish instead

## How To Use
```
prism_intelligence action=measure_surface params={
  part: "bracket-001",
  feature: "bore_1",
  measurements: {
    Ra: 0.8,
    Rz: 4.2,
    Rq: 1.0
  },
  spec: { Ra_max: 1.6 },
  units: "um"
}
```

## What It Returns
- Pass/fail against specification for each parameter
- Margin to spec limit (how close to failing)
- Statistical summary if multiple measurements provided
- Comparison to theoretical prediction from cutting parameters
- Surface texture classification (turned, ground, lapped, etc.)

## Examples
- Input: `measure_surface params={part: "shaft", feature: "journal", measurements: {Ra: 0.4, Rz: 2.1}, spec: {Ra_max: 0.8}}`
- Output: PASS — Ra=0.4 um (50% of limit), Rz=2.1 um, consistent with ground finish quality

- Input: `measure_surface params={part: "plate", feature: "top_face", measurements: {Ra: 2.5}, spec: {Ra_max: 1.6}}`
- Output: FAIL — Ra=2.5 um exceeds 1.6 limit by 56%, suggest additional finish pass or reduce feed
