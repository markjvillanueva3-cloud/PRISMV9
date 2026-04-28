---
id: "teb-032"
title: "3D-Equidistant Finishing Covers Shallow Areas with Uniform Scallop"
source: "web:tebis-docs"
confidence: 92
category: "finishing"
tags: ["3d-equidistant", "shallow", "scallop", "curvature-adaptive"]
_source: "tebis-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.245Z
---

# 3D-Equidistant Finishing Covers Shallow Areas with Uniform Scallop

For surfaces less than 30-45° from horizontal, use Tebis 3D-equidistant finishing. The toolpath follows surface contours with constant scallop height regardless of surface curvature. Set the scallop height target (typically 0.003-0.010mm for mold finishing). The system automatically varies step-over distance based on local curvature — tighter step-over in areas of high curvature, wider in flat areas. This produces visually uniform surface finish without the banding seen with fixed step-over.

**Category:** finishing
**Confidence:** 92
**Source:** web:tebis-docs
**Operations:** finishing

## Related
- [[bobcad-cam-tips-bc-024|Scallop Machining with Constant Cusp Height]]
- [[bobcad-cam-tips-bc-161|BobCAD Barrel Cutter Support for Large-Step-Over Finishing]]
- [[camworks-cam-tips-cw-039|Scallop Finishing — Constant Cusp Height Across Variable Curvature]]
- [[camworks-cam-tips-cw-111|Scallop Height Control — Calculate Step-Over for Target Ra]]
- [[catia-cam-tips-cat-013|Sweeping Operation Stepover Linked to Scallop Height]]
