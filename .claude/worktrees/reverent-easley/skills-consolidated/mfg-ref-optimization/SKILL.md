---
name: mfg-ref-optimization
description: Optimization algorithms reference from MIT 6.231, 6.251J, 6.252J, 6.079
---

# MIT Optimization Algorithms Reference for Manufacturing

## When To Use
- Need optimization theory for cutting parameter selection
- Applying multi-objective optimization to cost-quality-time tradeoffs
- Designing scheduling algorithms for job shop or flow shop
- Understanding LP, QP, convex optimization for process constraints

## How To Use
```
prism_knowledge action=search params={
  query: "linear programming convex optimization Pareto multi-objective scheduling",
  registries: ["formulas", "courses"]
}
```

## What It Returns
- LP/QP formulations mapped to prism_calc cost_optimize constraint setup
- Multi-objective Pareto methods for prism_calc multi_optimize
- Dynamic programming strategies for prism_intelligence optimize_sequence
- Gradient-based methods for prism_calc optimize_parameters convergence

## Key Course Mappings
- **MIT 6.231** (Dynamic Programming): Bellman equation, value iteration -> optimize_sequence, multi_pass
- **MIT 6.251J** (Intro Optimization): LP, simplex, duality -> cost_optimize, shop_schedule
- **MIT 6.252J** (Nonlinear Optimization): Gradient, Newton, KKT -> optimize_parameters
- **MIT 6.079** (Convex Optimization): SDP, SOCP, relaxation -> multi_optimize feasibility

## Examples
- **Speed-feed optimization**: Use 6.252J gradient descent via prism_calc optimize_parameters for Vc/fz
- **Multi-objective**: Apply 6.079 Pareto frontier via prism_calc multi_optimize for cost vs quality
- **Job scheduling**: Use 6.231 DP for sequencing via prism_intelligence shop_schedule
- **Constraint handling**: Apply 6.251J duality for machine capacity limits in prism_calc cost_optimize
