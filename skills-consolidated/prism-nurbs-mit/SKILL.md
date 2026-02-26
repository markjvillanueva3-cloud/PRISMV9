---
name: prism-nurbs-mit
description: |
  NURBS/B-spline algorithms from MIT 2.158J. Cox-de Boor recursion, de Boor evaluation, knot insertion, surface evaluation.

  MIT 2.158J (Computational Geometry)
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "NURBS", "B-spline", "de Boor", "knot vector", "basis function", "knot insertion", "spline surface", "Cox-de Boor"
- Source: `C:/PRISM/extracted/algorithms/PRISM_NURBS_MIT.js`
- Category: geometry

### How To Use
1. Load skill: `prism_skill_script->skill_content(id="prism-nurbs-mit")`
2. Functions available: basisFunction, deBoor, evaluateNURBS, generateKnotVector, insertKnot
3. Cross-reference with dispatchers:
   - prism_geometry
   - prism_toolpath

### What It Returns
- **Format**: Structured computation results with parameters and formulas
- **Location**: Loaded into context via skill_content
- **Source Code**: `C:/PRISM/extracted/algorithms/PRISM_NURBS_MIT.js`

### Examples
**Example 1**: Direct function call
-> Load skill -> Apply basisFunction() with parameters -> Return result

**Example 2**: Auto-triggered by context
-> User mentions keyword -> Skill auto-loads -> Relevant functions available

# Prism Nurbs Mit

## Source
**MIT 2.158J (Computational Geometry)**

## Functions
basisFunction, deBoor, evaluateNURBS, generateKnotVector, insertKnot

## Integration
- Extracted from: `PRISM_NURBS_MIT.js`
- Mapped engines: See ALGORITHM_REGISTRY.json
- Auto-load triggers: NURBS, B-spline, de Boor, knot vector, basis function
