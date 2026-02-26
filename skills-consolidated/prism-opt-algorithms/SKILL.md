---
name: prism-opt-algorithms
description: |
  Optimization algorithms from MIT 6.251J/15.099. Gradient descent (vanilla/momentum/Nesterov/Adam), Newton with backtracking, BFGS quasi-Newton.

  MIT 6.251J, MIT 15.099, MIT 18.433, Stanford AA222, CMU 10-725
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "gradient descent", "optimization", "Newton method", "BFGS", "Adam optimizer", "momentum", "Nesterov", "quasi-Newton", "line search"
- Source: `C:/PRISM/extracted/algorithms/PRISM_OPTIMIZATION_ALGORITHMS.js`
- Category: optimization

### How To Use
1. Load skill: `prism_skill_script->skill_content(id="prism-opt-algorithms")`
2. Functions available: gradientDescent, newtonMethod, bfgs
3. Cross-reference with dispatchers:
   - prism_calc
   - prism_knowledge

### What It Returns
- **Format**: Structured computation results with parameters and formulas
- **Location**: Loaded into context via skill_content
- **Source Code**: `C:/PRISM/extracted/algorithms/PRISM_OPTIMIZATION_ALGORITHMS.js`

### Examples
**Example 1**: Direct function call
-> Load skill -> Apply gradientDescent() with parameters -> Return result

**Example 2**: Auto-triggered by context
-> User mentions keyword -> Skill auto-loads -> Relevant functions available

# Prism Opt Algorithms

## Source
**MIT 6.251J, MIT 15.099, MIT 18.433, Stanford AA222, CMU 10-725**

## Functions
gradientDescent, newtonMethod, bfgs

## Integration
- Extracted from: `PRISM_OPTIMIZATION_ALGORITHMS.js`
- Mapped engines: See ALGORITHM_REGISTRY.json
- Auto-load triggers: gradient descent, optimization, Newton method, BFGS, Adam optimizer
