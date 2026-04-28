---
id: "esp-116"
title: "Alignment Probing for Castings and Forgings"
source: "web:esprit-probing"
confidence: 88
category: "quality"
tags: ["probing", "alignment", "casting", "forging", "stock-variation"]
_source: "esprit-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.532Z
---

# Alignment Probing for Castings and Forgings

For rough castings and forgings with variable stock, program ESPRIT's alignment probing to determine the part's actual position and orientation before machining. Probe 6+ points on datum surfaces, then use the controller's coordinate rotation and shift to align the work coordinates to the as-cast geometry. This ensures uniform stock removal and prevents air cutting on one side while gouging on the other. ESPRIT outputs the probing results to controller variables for automatic WCS adjustment.

**Category:** quality
**Confidence:** 88
**Source:** web:esprit-probing
**Operations:** probing

## Related
- [[edgecam-cam-tips-ec-110|Alignment Probing for Castings and Forgings]]
- [[surfcam-cam-tips-sc2-207|SURFCAM Best-Fit Alignment Probing for Castings]]
- [[worknc-cam-tips-wnc-118|Best-Fit Alignment for Castings and Forgings]]
- [[camworks-cam-tips-cw-118|Part Alignment Probing — Compensate for Misaligned Raw Stock]]
- [[camworks-cam-tips-cw-199|Fixture Probing — Work Coordinate System Alignment from Part Features]]
