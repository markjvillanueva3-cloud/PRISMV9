---
name: Manufacturing Decision Tree
description: Manufacturing decision trees for tool, insert, coolant, workholding, and strategy selection
---

## When To Use
- When selecting the right tool type for a feature (endmill vs insert vs indexable)
- When choosing insert grade and geometry for a given material
- When deciding between coolant types (flood, mist, MQL, dry)
- When selecting workholding method (vise, fixture, vacuum, chuck)
- When picking machining strategy (conventional vs climb, HSM vs trochoidal)
- NOT for specific parameter values — use mfg-speed-feed after deciding the approach

## How To Use
```
prism_intelligence action=decision_tree params={
  tree: "tool_selection",
  inputs: {
    operation: "pocket_milling",
    material: "304SS",
    depth: 15,
    width: 40,
    tolerance: "±0.02"
  }
}
```

Available trees: tool_selection, insert_selection, coolant_selection, workholding_selection, strategy_selection, approach_selection

## What It Returns
- Recommended selection with confidence score
- Decision path showing which criteria drove the choice
- Alternative options ranked by suitability
- Warnings for edge cases or unusual combinations
- Links to related skills for next steps

## Examples
- Input: `decision_tree params={tree: "coolant_selection", inputs: {material: "Ti-6Al-4V", operation: "drilling", depth_ratio: 8}}`
- Output: Through-spindle coolant recommended (95% confidence), high-pressure 70 bar, flood backup

- Input: `decision_tree params={tree: "workholding_selection", inputs: {part_shape: "thin_plate", material: "6061", thickness: 3}}`
- Output: Vacuum fixture recommended, avoid vise (deformation risk), double-sided tape as alternative
