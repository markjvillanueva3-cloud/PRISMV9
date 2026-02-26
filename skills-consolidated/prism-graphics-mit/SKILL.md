---
name: prism-graphics-mit
description: |
  Computer graphics from MIT 6.837. Ray-triangle/sphere/AABB intersection, Blinn-Phong shading, Cook-Torrance PBR, projection matrices.

  MIT 6.837 (Computer Graphics), MIT 18.06
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "ray tracing", "intersection test", "Blinn-Phong", "Cook-Torrance", "BRDF", "shading", "projection matrix", "ray-triangle"
- Source: `C:/PRISM/extracted/algorithms/PRISM_GRAPHICS_MIT.js`
- Category: graphics

### How To Use
1. Load skill: `prism_skill_script->skill_content(id="prism-graphics-mit")`
2. Functions available: rayTriangleIntersect, raySphereIntersect, rayAABBIntersect, blinnPhongShade, cookTorranceBRDF, createPerspectiveMatrix, createLookAtMatrix
3. Cross-reference with dispatchers:
   - prism_geometry
   - prism_render

### What It Returns
- **Format**: Structured computation results with parameters and formulas
- **Location**: Loaded into context via skill_content
- **Source Code**: `C:/PRISM/extracted/algorithms/PRISM_GRAPHICS_MIT.js`

### Examples
**Example 1**: Direct function call
-> Load skill -> Apply rayTriangleIntersect() with parameters -> Return result

**Example 2**: Auto-triggered by context
-> User mentions keyword -> Skill auto-loads -> Relevant functions available

# Prism Graphics Mit

## Source
**MIT 6.837 (Computer Graphics), MIT 18.06**

## Functions
rayTriangleIntersect, raySphereIntersect, rayAABBIntersect, blinnPhongShade, cookTorranceBRDF, createPerspectiveMatrix, createLookAtMatrix

## Integration
- Extracted from: `PRISM_GRAPHICS_MIT.js`
- Mapped engines: See ALGORITHM_REGISTRY.json
- Auto-load triggers: ray tracing, intersection test, Blinn-Phong, Cook-Torrance, BRDF
