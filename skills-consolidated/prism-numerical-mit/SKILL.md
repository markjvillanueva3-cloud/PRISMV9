---
name: prism-numerical-mit
description: |
  Numerical methods from MIT courses (10.34, 18.086). Newton-Raphson, secant, bisection, Gauss elimination, LU/QR decomposition, interpolation.

  MIT 10.34 (Numerical Methods), MIT 18.086 (Computational Science)
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "newton-raphson", "root finding", "bisection", "secant method", "gauss elimination", "numerical method", "interpolation", "LU decomposition"
- Source: `C:/PRISM/extracted/algorithms/PRISM_NUMERICAL_METHODS_MIT.js`
- Category: numerical-methods

### How To Use
1. Load skill: `prism_skill_script->skill_content(id="prism-numerical-mit")`
2. Functions available: newtonRaphson, secantMethod, bisection, fixedPoint, gaussElimination, lagrangeInterpolation, goldenSection
3. Cross-reference with dispatchers:
   - prism_calc
   - prism_knowledge

### What It Returns
- **Format**: Structured computation results with parameters and formulas
- **Location**: Loaded into context via skill_content
- **Source Code**: `C:/PRISM/extracted/algorithms/PRISM_NUMERICAL_METHODS_MIT.js`

### Examples
**Example 1**: Direct function call
-> Load skill -> Apply newtonRaphson() with parameters -> Return result

**Example 2**: Auto-triggered by context
-> User mentions keyword -> Skill auto-loads -> Relevant functions available

# Prism Numerical Mit

## Source
**MIT 10.34 (Numerical Methods), MIT 18.086 (Computational Science)**

## Functions
newtonRaphson, secantMethod, bisection, fixedPoint, gaussElimination, lagrangeInterpolation, goldenSection

## Integration
- Extracted from: `PRISM_NUMERICAL_METHODS_MIT.js`
- Mapped engines: See ALGORITHM_REGISTRY.json
- Auto-load triggers: newton-raphson, root finding, bisection, secant method, gauss elimination
