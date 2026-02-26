---
name: Operation Sequencer
description: Generate and sequence machining operations for recognized features
---

## When To Use
- When converting recognized features into ordered machining operations
- When determining roughing/finishing sequence for a feature set
- When assigning operations to setups in optimal order
- NOT for full plan generation — use mfg-genplan instead
- NOT for individual speed/feed — use mfg-speed-feed instead

## How To Use
```
prism_intelligence action=genplan_operations params={
  part_id: "bracket-001",
  features: [
    { id: "pocket-1", type: "pocket", depth: 25, width: 80 },
    { id: "hole-1", type: "hole", diameter: 10, tolerance: "H7" }
  ],
  material: "6061-T6",
  setup: 1
}
```

## What It Returns
- Ordered operation list with roughing and finishing passes
- Tool assignment per operation
- Cutting strategy per operation (conventional, climb, trochoidal)
- Estimated time per operation
- Dependencies and constraints between operations

## Examples
- Input: `genplan_operations params={part_id: "plate-G7", features: [{type:"pocket",depth:30},{type:"holes",count:8}], material: "304SS"}`
- Output: 6 operations — face mill, rough pocket, finish pocket walls, finish pocket floor, drill, ream. Total 22 min

- Input: `genplan_operations params={part_id: "block-H8", features: [{type:"profile"},{type:"slot",depth:15}], material: "Ti-6Al-4V"}`
- Output: 5 operations — rough profile (trochoidal), finish profile, rough slot, finish slot, deburr pass. 35 min
