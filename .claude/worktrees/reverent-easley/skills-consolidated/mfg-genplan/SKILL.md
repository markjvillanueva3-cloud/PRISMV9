---
name: Generative Process Planner
description: Auto-generate complete machining plan from part geometry and requirements
---

## When To Use
- When you have part geometry and need a full machining process plan
- When starting from scratch with a new part design
- When you want an AI-generated plan as a baseline for refinement
- NOT for individual feature recognition — use mfg-genplan-features instead
- NOT for optimizing an existing plan — use mfg-genplan-optimize instead

## How To Use
```
prism_intelligence action=genplan_plan params={
  part_id: "bracket-001",
  material: "6061-T6",
  geometry: { type: "prismatic", envelope: [200, 150, 50] },
  tolerances: { general: "±0.05", critical: ["bore-H7"] },
  quantity: 500
}
```

## What It Returns
- Complete process plan with setup sequence
- Feature-to-operation mapping
- Tool list with recommended cutting parameters
- Estimated cycle time and cost breakdown
- Risk flags for critical features and tight tolerances

## Examples
- Input: `genplan_plan params={part_id: "housing-A1", material: "304SS", geometry: {type: "prismatic", envelope: [300,200,100]}}`
- Output: 3-setup plan, 14 operations, 6 tools, 52 min cycle, 2 risk flags on thin wall and deep pocket

- Input: `genplan_plan params={part_id: "flange-B2", material: "4140", geometry: {type: "rotational", od: 150, length: 80}}`
- Output: 2-setup turning plan, 8 operations, 4 tools, 18 min cycle, thread tolerance flagged
