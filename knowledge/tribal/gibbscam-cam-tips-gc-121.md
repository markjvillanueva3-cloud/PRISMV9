---
id: "gc-121"
title: "GibbsCAM 14 Solid Machining uses B-rep kernels for direct solid feature recognition"
source: "web:gibbscam-docs"
confidence: 82
category: "cam_strategy"
tags: ["gibbscam", "v14", "solid-machining", "brep", "feature-recognition"]
_source: "gibbscam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.926Z
---

# GibbsCAM 14 Solid Machining uses B-rep kernels for direct solid feature recognition

GibbsCAM 14 introduced enhanced Solid Machining with direct B-rep (Boundary Representation) kernel integration. Rather than converting imported CAD solids to faceted meshes, the system reads NURBS surfaces directly. This preserves true curvature data for toolpath generation, eliminating chord-error artifacts that plagued earlier versions. When importing STEP or Parasolid files, ensure 'Use Native Geometry' is enabled in Import Settings. The result is tighter surface tolerance matching — toolpaths respect the exact mathematical surface definition rather than an approximation, reducing finish-pass scallop variation by 20-40%.

**Category:** cam_strategy
**Confidence:** 82
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-091|Automatic Feature Recognition identifies holes with minimal user input]]
- [[gibbscam-cam-tips-gc-122|GibbsCAM 14 multi-body part management simplifies tombstone and multi-part programming]]
- [[gibbscam-cam-tips-gc-123|GibbsCAM 14 Part Compare detects model changes and highlights affected toolpaths]]
- [[gibbscam-cam-tips-gc-124|GibbsCAM 14 High-Efficiency Roughing with morphing stepover reduces radial engagement spikes]]
- [[gibbscam-cam-tips-gc-125|GibbsCAM 14 Tool Holder Visualization in simulation prevents costly collisions]]
