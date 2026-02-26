---
name: prism-surface-geo
description: |
  Surface geometry from MIT 2.158J. B-spline surface evaluation, normal computation, Gaussian/mean/principal curvatures.

  MIT 2.158J (Computational Geometry)
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "surface geometry", "curvature", "surface normal", "Gaussian curvature", "mean curvature", "principal curvature", "fundamental form"
- Source: `C:/PRISM/extracted/algorithms/PRISM_SURFACE_GEOMETRY_MIT.js`
- Category: geometry

### How To Use
1. Load skill: `prism_skill_script->skill_content(id="prism-surface-geo")`
2. Functions available: evaluateBSplineSurface, computeNormal, computeCurvature
3. Cross-reference with dispatchers:
   - prism_geometry

### What It Returns
- **Format**: Structured computation results with parameters and formulas
- **Location**: Loaded into context via skill_content
- **Source Code**: `C:/PRISM/extracted/algorithms/PRISM_SURFACE_GEOMETRY_MIT.js`

### Examples
**Example 1**: Direct function call
-> Load skill -> Apply evaluateBSplineSurface() with parameters -> Return result

**Example 2**: Auto-triggered by context
-> User mentions keyword -> Skill auto-loads -> Relevant functions available

# Prism Surface Geo

## Source
**MIT 2.158J (Computational Geometry)**

## Functions
evaluateBSplineSurface, computeNormal, computeCurvature

## Integration
- Extracted from: `PRISM_SURFACE_GEOMETRY_MIT.js`
- Mapped engines: See ALGORITHM_REGISTRY.json
- Auto-load triggers: surface geometry, curvature, surface normal, Gaussian curvature, mean curvature
