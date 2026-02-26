---
name: CAM Operation Analyzer
description: Analyze existing CAM operation for optimization opportunities
---

## When To Use
- When reviewing an existing CAM operation for improvement
- When diagnosing why a CAM operation produces poor results
- When comparing current CAM parameters against PRISM recommendations
- NOT for creating new CAM operations — use mfg-cam-recommend instead
- NOT for toolpath strategy selection — use mfg-strategy-select instead

## How To Use
```
prism_intelligence action=cam_analyze_op params={
  operation: {
    type: "adaptive_clearing",
    tool: { diameter: 12, flutes: 4 },
    params: { stepover: 3.6, stepdown: 24, speed: 8000, feed: 2400 }
  },
  material: "304SS",
  machine: "Haas_VF2"
}
```

## What It Returns
- Parameter-by-parameter analysis vs optimal values
- Optimization opportunities ranked by impact
- Risk flags for aggressive or conservative settings
- Estimated improvement in cycle time or tool life
- Specific parameter change recommendations

## Examples
- Input: `cam_analyze_op params={operation: {type: "pocket_rough", params: {stepover: 6, speed: 6000}}, material: "Ti-6Al-4V"}`
- Output: Stepover too aggressive for titanium (50% vs recommended 10-15%), speed 20% high. Risk: tool breakage. Suggest adaptive at 1.8mm stepover, 4800 RPM

- Input: `cam_analyze_op params={operation: {type: "finishing", params: {stepover: 0.5, feed: 1200}}, material: "6061-T6"}`
- Output: Settings conservative — stepover could increase to 0.8mm maintaining Ra 0.8. Cycle time reducible by 35%
