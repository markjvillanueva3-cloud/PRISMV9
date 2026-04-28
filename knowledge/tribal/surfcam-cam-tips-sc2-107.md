---
id: "sc2-107"
title: "Parametric Programming for Family-of-Parts"
source: "web:surfcam-parametric"
confidence: 85
category: "automation"
tags: ["parametric", "family-of-parts", "variables", "auto-regeneration"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.127Z
---

# Parametric Programming for Family-of-Parts

SURFCAM supports parametric part families where the geometry dimensions are driven by variables. Changing a variable (e.g., pocket_width = 50mm → 75mm) regenerates the geometry and all associated toolpaths automatically. Use this for production families where the basic shape is constant but dimensions vary by part number. Define key dimensions as parameters and link them to the toolpath definitions (e.g., step-down = pocket_depth / 4).

**Category:** automation
**Confidence:** 85
**Source:** web:surfcam-parametric
**Operations:** setup

## Related
- [[edgecam-cam-tips-ec-079|Macro Output for Parametric Programs]]
- [[esprit-cam-tips-esp-090|Parametric Programming for Family-of-Parts]]
- [[esprit-cam-tips-esp-077|Macro Support for Parametric Operations]]
- [[esprit-cam-tips-esp-178|Knowledge Base Template Parts for Family-of-Parts Programming]]
- [[bobcad-cam-tips-bc-142|BobCAM for Rhino Grasshopper Integration for Parametric CAM]]
