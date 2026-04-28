---
id: "gc-082"
title: "Cut Part rendering reveals gouges and remaining stock with color coding"
source: "web:gibbscam-docs"
confidence: 89
category: "cam_strategy"
tags: ["gibbscam", "simulation", "cut-part-rendering", "gouge", "remaining-stock"]
_source: "gibbscam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.896Z
---

# Cut Part rendering reveals gouges and remaining stock with color coding

GibbsCAM's Cut Part rendering dynamically simulates material removal and displays remaining stock in red and gouges in blue on the rendered workpiece. Enable 'Auto-Diff' to compare the cut result against the design solid—any deviation deeper than the gouge tolerance (default 0.005mm) is highlighted. This visual verification catches toolpath errors before the machine runs. For best accuracy, set the rendering resolution to 'Fine' (0.02-0.05mm voxel size). Inspect the rendered part from multiple angles to catch gouges hidden in concave areas that are not visible from the default view.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-083|Machine simulation verifies clearances between all moving components]]
- [[gibbscam-cam-tips-gc-084|Collision detection settings must include tool holder and spindle nose geometry]]
- [[gibbscam-cam-tips-gc-085|Stock comparison overlay quantifies material deviation from design intent]]
- [[gibbscam-cam-tips-gc-086|Gouge detection sensitivity should match surface tolerance requirements]]
- [[gibbscam-cam-tips-gc-087|Toolpath verification with backplot reveals rapid moves and feed transitions]]
