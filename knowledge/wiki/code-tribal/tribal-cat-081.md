---
name: tribal-cat-081
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "surface-inspection", "freeform", "deviation", "quality"]
confidence: 86
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-081.md
promoted_at: 2026-06-09T22:31:16.048Z
---

# Surface Inspection Points for Free-Form Geometry Validation

For free-form surface validation on the CNC machine, define inspection point arrays in CATIA that sample the surface at critical locations (high-curvature regions, blend transitions, parting line areas). CATIA generates probing tool paths that touch each point and record the deviation from nominal. Space inspection points at intervals of 5-10x the machining tolerance to provide meaningful coverage. Export the results as a deviation report for comparison with CMM data and AS9102 First Article documentation.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:catia-docs
**Operations:** probing

## Related
- [[catia-cam-tips-cat-021|Offset Surface Strategy for Constant Stock on Freeform Parts]]
- [[catia-cam-tips-cat-080|On-Machine Verification Probing Reduces Setup Iterations]]
- [[catia-cam-tips-cat-082|Dimensional Control Feedback Loop for Process Stability]]
- [[catia-cam-tips-cat-083|CMM Program Generation from CATIA Manufacturing Data]]
- [[catia-cam-tips-cat-162|STL to NURBS Conversion for Higher Quality CATIA Machining]]
