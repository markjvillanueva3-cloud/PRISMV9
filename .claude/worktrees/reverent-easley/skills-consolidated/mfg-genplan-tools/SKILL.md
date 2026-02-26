---
name: Auto Tool Selector
description: Automatic tool selection for planned operations from tool registry
---

## When To Use
- When assigning tools to operations in a process plan
- When finding optimal tools from available inventory
- When checking if current tool library covers all planned operations
- NOT for general tool search — use mfg-tool-search instead
- NOT for tool recommendation without a plan — use mfg-tool-recommend instead

## How To Use
```
prism_intelligence action=genplan_tools params={
  plan_id: "plan-bracket-001",
  operations: ["face_mill", "rough_pocket", "finish_pocket", "drill", "ream"],
  material: "6061-T6",
  tool_library: "shop-standard",
  prefer: "minimize_tool_changes"
}
```

## What It Returns
- Tool assignment per operation with tool ID and specs
- Tool change sequence optimized for minimum changes
- Missing tools flagged with purchase recommendations
- Alternative tool options ranked by suitability
- Estimated tool life per operation at planned parameters

## Examples
- Input: `genplan_tools params={plan_id: "plan-C3", operations: ["rough","finish","drill","tap"], material: "304SS"}`
- Output: 4 tools assigned from library, carbide end mill for rough/finish (1 tool change saved), cobalt drill, form tap

- Input: `genplan_tools params={plan_id: "plan-D4", material: "Ti-6Al-4V", tool_library: "aerospace-certified"}`
- Output: 6 tools assigned, 2 not in library (flagged for procurement), AlTiN-coated recommended for titanium ops
