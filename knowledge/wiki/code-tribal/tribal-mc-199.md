---
name: tribal-mc-199
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "drive-curve", "multiaxis", "check-surface", "point-sort", "flow-line"]
confidence: 85
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-199.md
promoted_at: 2026-06-09T22:31:16.444Z
---

# Point and drive curve selection for multiaxis toolpaths must align with tool contact intent

In Mastercam Multiaxis toolpaths, Drive Curves define the path the tool follows, and Check Surfaces define the surfaces the tool must not gouge. Selecting the correct drive curve is critical: for flow-line machining, drive curves run along the surface in the intended cutting direction; for Morph between two curves, the selected curves define the boundary between which the tool interpolates; for Curve-5axis, the curve IS the toolpath center. Always verify drive curve direction — the start-to-end direction determines the cutting direction and affects surface finish quality (climbing up vs. cutting down). For point-based multiaxis operations (Drill-5axis, Swarf), the drive points define tool positions and the point order defines the sequence. Reorder points using Mastercam's Point Sort function to minimize repositioning moves between points.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:community
**Operations:** 5_axis, multiaxis

## Related
- [[mastercam-cam-tips-mc-233|5-axis deburring follows complex 3D edges that are inaccessible from a single tool orientation]]
- [[mastercam-cam-tips-mc-244|Swarf milling uses the full side of the tool to finish ruled surfaces in a single pass per strip]]
- [[mastercam-cam-tips-mc-246|Blending distance control in multiaxis toolpaths smooths feed rate transitions at zone boundaries]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
