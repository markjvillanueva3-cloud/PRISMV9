---
name: CAM Strategy Recommender
description: Recommend CAM strategy and parameters for specific operations
---

## When To Use
- When selecting the best CAM strategy for a machining operation
- When configuring toolpath parameters for a specific feature
- When comparing adaptive vs conventional CAM approaches
- NOT for toolpath physics calculations — use mfg-strategy-select instead
- NOT for manual speed/feed lookup — use mfg-speed-feed instead

## How To Use
```
prism_intelligence action=cam_recommend params={
  operation: "pocket_roughing",
  material: "Ti-6Al-4V",
  feature: { type: "pocket", depth: 30, width: 80, length: 120 },
  tool: { diameter: 12, flutes: 4, type: "carbide_endmill" },
  machine: "DMG_MORI_DMU50"
}
```

## What It Returns
- Recommended CAM strategy name and type
- Toolpath parameters (stepover, stepdown, lead-in/out)
- Cutting parameters tuned for the strategy
- Strategy justification and alternatives ranked
- Estimated cycle time for the operation

## Examples
- Input: `cam_recommend params={operation: "pocket_roughing", material: "Inconel 718", feature: {type: "pocket", depth: 40}}`
- Output: Adaptive/trochoidal milling recommended, 10% radial engagement, full depth, 180 m/min Vc, est. 12 min

- Input: `cam_recommend params={operation: "finishing", material: "6061-T6", feature: {type: "surface", area: 200}}`
- Output: Parallel finishing at 0.15mm stepover, 300 m/min Vc, scallop height 0.002mm, est. 8 min
