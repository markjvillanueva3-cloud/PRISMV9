---
id: "cat-137"
title: "Isoparametric vs Isocrest Surface Machining Path Strategy"
source: "web:catia-docs"
confidence: 0.88
category: "cam_strategy"
tags: ["catia", "surface", "isoparametric", "isocrest", "strategy"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.921Z
---

# Isoparametric vs Isocrest Surface Machining Path Strategy

CATIA Surface Machining offers Isoparametric (follows UV surface direction) and Isocrest (follows constant-height contours) strategies. Use Isoparametric on surfaces with consistent UV flow (ruled surfaces, sweeps) — it produces smooth, predictable tool paths. Use Isocrest on steep-walled surfaces where constant-Z cutting maintains consistent chip load. Switch at 45-degree wall angle: below 45° use Isoparametric for the floor, above 45° use Isocrest for the walls. Combine both in a single Manufacturing Program using the 'Limiting Contour' to split the machining domain by wall angle.

**Category:** cam_strategy
**Confidence:** 0.88
**Source:** web:catia-docs
**Operations:** finishing

## Related
- [[catia-cam-tips-cat-016|Isoparametric Machining Aligns Tool Path to UV Flow]]
- [[catia-cam-tips-cat-138|Surface Machining Pencil Tracing for Fillet Cleanup]]
- [[catia-cam-tips-cat-139|Spiral Surface Machining for Circular Part Geometries]]
- [[catia-cam-tips-cat-140|Surface Machining Guide Curve Strategy for Flow-Shaped Parts]]
- [[catia-cam-tips-cat-141|Surface Machining Scallop Height Control with Variable Stepover]]
