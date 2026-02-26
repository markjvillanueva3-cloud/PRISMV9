---
name: mfg-mrr
description: Calculate material removal rate in cm3/min from cutting parameters for productivity analysis
---

## When To Use
- User asks about productivity, cycle time, or how fast material is being removed
- Comparing roughing strategies by volumetric efficiency
- Estimating machining time for a known volume of material
- NOT for cycle time estimation with rapids/tool changes (use prism_calc cycle_time)
- NOT for cost optimization (use prism_calc cost_optimize)

## How To Use
### Calculate MRR
```
prism_calc action=mrr params={
  Vc: 200,
  fz: 0.15,
  ap: 3,
  ae: 25,
  z: 4,
  D: 50
}
```

### Turning MRR
```
prism_calc action=mrr params={
  Vc: 250,
  f: 0.2,
  ap: 3,
  operation: "turning"
}
```

## What It Returns
```json
{
  "MRR_cm3_min": 22.5,
  "MRR_mm3_min": 22500,
  "Vf_mm_min": 1500,
  "n_rpm": 1273,
  "Q_prime_cm3_min_per_mm": 7.5,
  "time_for_100cm3_min": 4.44,
  "model": "geometric",
  "warnings": []
}
```

## Examples
### Milling Steel with 50mm Endmill
- Input: `prism_calc action=mrr params={Vc: 200, fz: 0.15, ap: 3, ae: 25, z: 4, D: 50}`
- Output: MRR=22.5 cm3/min, feed rate=1500 mm/min
- Edge case: Actual MRR in trochoidal paths is lower than calculated due to non-cutting air moves

### High-Speed Aluminum Roughing
- Input: `prism_calc action=mrr params={Vc: 800, fz: 0.12, ap: 10, ae: 6, z: 3, D: 20}`
- Output: MRR=86.4 cm3/min — aluminum allows aggressive volumetric rates
- Edge case: Chip evacuation, not cutting force, often limits MRR in deep pockets
