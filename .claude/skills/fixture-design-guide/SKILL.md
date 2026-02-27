---
name: fixture-design-guide
description: 'Fixture design and workholding guide. Use when the user needs workholding solutions, fixture design principles, clamping force calculations, or multi-op setup planning.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  product: Fixturing
---

# Fixture Design & Workholding Guide

## When to Use
- Selecting workholding for a given part geometry and operation
- Calculating clamping forces to resist cutting loads
- Designing multi-operation fixture strategies (OP10/OP20/OP30)
- Evaluating soft jaws, vacuum, magnetic, or custom fixture options

## How It Works
1. Analyze part geometry and cutting forces
2. Select workholding via decision tree (vise, chuck, fixture plate, vacuum, magnetic)
3. Calculate clamping force via `prism_calc→clamping_force`
4. Verify deflection and accessibility
5. Generate fixture drawing notes and setup sheet

## Returns
- Workholding recommendation with rationale
- Clamping force calculation (force × safety factor vs. cutting loads)
- Deflection estimate at critical features
- Multi-op setup sequence with datum transfer strategy

## Example
**Input:** "Workholding for thin-wall aluminum bracket 200x150x3mm, pocket both sides"
**Output:** OP10: Vacuum fixture on tooling plate (12 suction zones, 85% vacuum area), rough + finish top pockets. OP20: Flip onto OP10 machined features, dowel-locate in 2 tooling holes from OP10, vacuum hold, machine bottom pockets. Clamping: 420N vacuum hold vs. 180N max cutting force (2.3:1 safety factor). Max deflection: 0.015mm at thin wall center — within 0.05mm tolerance.
