---
name: Algorithm Selector
description: Select optimal algorithm for a given manufacturing computation task
---

## When To Use
- When you need to choose between Kienzle, Merchant, or FEM for force calculation
- When selecting between Taylor, Colding, or empirical models for tool life
- When deciding which surface finish model to use for a given operation
- When choosing optimization method (analytical vs genetic vs gradient)
- NOT for running the computation — use the specific calculation skill after selecting

## How To Use
```
prism_intelligence action=algorithm_select params={
  task: "cutting_force",
  context: {
    material: "Ti-6Al-4V",
    operation: "turning",
    accuracy_needed: "high",
    data_available: ["Kienzle_coefficients", "flow_stress_curves"]
  }
}
```

## What It Returns
- Recommended algorithm with suitability score
- Required input data and whether it is available
- Expected accuracy range for the given context
- Computational cost estimate (fast/moderate/slow)
- Alternative algorithms ranked with trade-off notes

## Examples
- Input: `algorithm_select params={task: "tool_life", context: {material: "4140", operation: "turning"}}`
- Output: Taylor extended model recommended (85% fit), needs n/C constants, falls back to empirical if missing

- Input: `algorithm_select params={task: "optimization", context: {variables: 6, constraints: 12, objective: "multi"}}`
- Output: NSGA-II multi-objective recommended, 500 generations, Pareto front with 3 objectives supported
