---
name: prism-inverse-solver
version: 1.0.0
description: |
  Inverse problem solving skill for specifying desired outcomes and getting
  optimal machining parameters. Leverages the InverseSolverEngine to work
  backwards from targets (surface finish, cycle time, tool life) to inputs.

  Modules Covered:
  - InverseSolverEngine (inverse_solve, inverse_multi, inverse_feasibility, inverse_sensitivity)

  Gateway Routes: prism_intelligence → inverse_*
  R10 Revolution: Rev 2 — Inverse Problem Solving
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "inverse", "target", "achieve", "I need Ra", "I want tool life", "desired outcome"
- User specifies a desired result and wants to know what parameters achieve it
- User asks "what speed/feed gives me X surface finish?" or "how do I get Y tool life?"

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-inverse-solver")`
2. Identify the user's target outcome (Ra, tool life, MRR, cycle time, etc.)
3. Use inverse actions via the intelligence dispatcher:
   - `prism_intelligence→inverse_solve` — Single-target inverse: specify one outcome, get parameters
   - `prism_intelligence→inverse_multi` — Multi-target inverse: balance competing objectives
   - `prism_intelligence→inverse_feasibility` — Check if a target is physically achievable
   - `prism_intelligence→inverse_sensitivity` — How sensitive is the outcome to each parameter?

### What It Returns
- **Format**: Structured JSON with parameter sets, feasibility analysis, sensitivity maps
- **Success**: Optimal parameter set achieving the target within constraints
- **Failure**: Target infeasible → returns closest achievable + explanation of limiting physics

### Examples
**Example 1**: "I need Ra 0.4 μm on 316 stainless"
→ `inverse_solve(target: {ra: 0.4}, material: "316SS", operation: "finishing")` → Returns Vc, fz, ap, ae with tool recommendations

**Example 2**: "Maximize MRR while keeping Ra < 1.6 and tool life > 30 min"
→ `inverse_multi(targets: [{mrr: "max"}, {ra: "<1.6"}, {tool_life: ">30"}])` → Returns Pareto-optimal parameter sets

# INVERSE PROBLEM SOLVER

## The Inverse Approach
Traditional machining: Choose parameters → Calculate outcomes
Inverse machining: Specify outcomes → Derive parameters

## Supported Target Types
| Target | Unit | Typical Range | Constraint Types |
|--------|------|---------------|-----------------|
| Surface roughness (Ra) | μm | 0.1 – 12.5 | exact, max, range |
| Tool life | min | 5 – 120 | exact, min, range |
| Material removal rate | cm³/min | 0.5 – 500 | exact, min, max |
| Cycle time | sec | 10 – 3600 | exact, max, range |
| Cutting force | N | 50 – 5000 | max |
| Power consumption | kW | 0.5 – 50 | max |
| Temperature | °C | 100 – 1200 | max |

## Algorithm
1. Parse target specification and constraints
2. Identify relevant physics models (Taylor, Kienzle, surface roughness)
3. Set up inverse optimization problem
4. Solve using bracketed search with physics-informed bounds
5. Validate solution against machine capability limits
6. Apply safety margins and return ranked solutions

## Multi-Objective Balancing
When targets conflict (e.g., low Ra vs high MRR):
- Generates Pareto frontier of non-dominated solutions
- Ranks by user-specified priority weights
- Highlights trade-off regions where small parameter changes have large impact
