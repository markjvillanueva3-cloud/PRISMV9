---
name: prism-bezier-mit
description: |
  Bezier curve algorithms from MIT 2.158J. Bernstein basis, de Casteljau evaluation, subdivision, derivatives.

  MIT 2.158J (Computational Geometry)
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "Bezier", "Bernstein", "de Casteljau", "curve evaluation", "subdivision", "parametric curve", "control points"
- Source: `C:/PRISM/extracted/algorithms/PRISM_BEZIER_MIT.js`
- Category: geometry

### How To Use
1. Load skill: `prism_skill_script->skill_content(id="prism-bezier-mit")`
2. Functions available: binomial, bernstein, evaluate, deCasteljau, derivative
3. Cross-reference with dispatchers:
   - prism_geometry
   - prism_toolpath

### What It Returns
- **Format**: Structured computation results with parameters and formulas
- **Location**: Loaded into context via skill_content
- **Source Code**: `C:/PRISM/extracted/algorithms/PRISM_BEZIER_MIT.js`

### Examples
**Example 1**: Direct function call
-> Load skill -> Apply binomial() with parameters -> Return result

**Example 2**: Auto-triggered by context
-> User mentions keyword -> Skill auto-loads -> Relevant functions available

# Prism Bezier Mit

## Source
**MIT 2.158J (Computational Geometry)**

## Functions
binomial, bernstein, evaluate, deCasteljau, derivative

## Integration
- Extracted from: `PRISM_BEZIER_MIT.js`
- Mapped engines: See ALGORITHM_REGISTRY.json
- Auto-load triggers: Bezier, Bernstein, de Casteljau, curve evaluation, subdivision
