---
name: prism-lp-solvers
description: |
  Linear programming solvers from MIT 15.083J/15.084J. Revised simplex method for LP (min c'x, Ax<=b, x>=0).

  MIT 15.083J (Integer Programming), MIT 15.084J (Nonlinear Programming)
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "linear programming", "simplex", "LP solver", "optimization", "constraint", "feasibility", "dual simplex", "objective function"
- Source: `C:/PRISM/extracted/algorithms/PRISM_LP_SOLVERS.js`
- Category: optimization

### How To Use
1. Load skill: `prism_skill_script->skill_content(id="prism-lp-solvers")`
2. Functions available: revisedSimplex
3. Cross-reference with dispatchers:
   - prism_calc
   - prism_knowledge

### What It Returns
- **Format**: Structured computation results with parameters and formulas
- **Location**: Loaded into context via skill_content
- **Source Code**: `C:/PRISM/extracted/algorithms/PRISM_LP_SOLVERS.js`

### Examples
**Example 1**: Direct function call
-> Load skill -> Apply revisedSimplex() with parameters -> Return result

**Example 2**: Auto-triggered by context
-> User mentions keyword -> Skill auto-loads -> Relevant functions available

# Prism Lp Solvers

## Source
**MIT 15.083J (Integer Programming), MIT 15.084J (Nonlinear Programming)**

## Functions
revisedSimplex

## Integration
- Extracted from: `PRISM_LP_SOLVERS.js`
- Mapped engines: See ALGORITHM_REGISTRY.json
- Auto-load triggers: linear programming, simplex, LP solver, optimization, constraint
