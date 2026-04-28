---
id: "mc-065"
title: "Multi-Surface 5-axis uses multiple drive surfaces for complex compound shapes"
source: "web:mastercam-docs"
confidence: 84
category: "cam_strategy"
tags: ["mastercam", "multi-surface", "msurf", "5-axis", "tool-axis-blend", "impeller"]
_source: "mastercam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.158Z
---

# Multi-Surface 5-axis uses multiple drive surfaces for complex compound shapes

Mastercam's Multi-Surface 5-axis toolpath (Msurf) projects the cut pattern across multiple selected surfaces simultaneously, maintaining smooth tool axis transitions between surface boundaries. Unlike single-surface toolpaths that cause abrupt tool axis changes at surface edges, Msurf blends the tool axis across the entire surface collection. Select all surfaces that form a continuous region and set blend tolerance to 0.01-0.05 mm for seamless transitions on impeller vanes and complex mold cores.

**Category:** cam_strategy
**Confidence:** 84
**Source:** web:mastercam-docs
**Operations:** multiaxis, 5_axis

## Related
- [[mastercam-cam-tips-mc-064|Swarf cutting uses the tool's side to machine ruled surfaces in one pass]]
- [[mastercam-cam-tips-mc-066|Flow 5-axis is the primary toolpath for impeller and turbine blade channels]]
- [[mastercam-cam-tips-mc-067|Port machining toolpath automates intake and exhaust port programming]]
- [[mastercam-cam-tips-mc-069|Multiaxis Drill enables angled hole drilling at compound angles]]
- [[mastercam-cam-tips-mc-070|Deburr 5-axis automatically traces part edges for chamfer and break operations]]
