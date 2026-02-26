---
name: Shaft/Hole Fit Analyzer
description: Shaft/hole fit analysis with clearance/interference calculation
---

## When To Use
- When designing or verifying shaft-in-hole fits (bearings, pins, bushings)
- When determining if a fit is clearance, transition, or interference
- When selecting ISO fit classes for a given functional requirement
- When calculating required press force for interference fits
- NOT for general tolerance stack-up — use mfg-tolerance instead

## How To Use
```
prism_calc action=fit_analysis params={
  nominal: 50,
  hole_tolerance: "H7",
  shaft_tolerance: "g6",
  units: "mm"
}
```

## What It Returns
- Fit type classification: clearance, transition, or interference
- Min and max clearance (or interference) in the assembly
- Actual hole limits: min/max diameter
- Actual shaft limits: min/max diameter
- Assembly force estimate for interference fits
- Recommended fit alternatives if current selection is marginal

## Examples
- Input: `fit_analysis params={nominal: 50, hole_tolerance: "H7", shaft_tolerance: "g6"}`
- Output: Clearance fit, min clearance +0.009mm, max clearance +0.050mm, sliding/running fit

- Input: `fit_analysis params={nominal: 25, hole_tolerance: "H7", shaft_tolerance: "p6"}`
- Output: Interference fit, min interference 0.005mm, max interference 0.035mm, press fit ~2.8 kN
