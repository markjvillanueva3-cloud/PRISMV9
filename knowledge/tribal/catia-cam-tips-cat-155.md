---
id: "cat-155"
title: "CATIA Lathe Live Tooling for Cross-Drilling and Milling"
source: "web:catia-docs"
confidence: 0.86
category: "cam_strategy"
tags: ["catia", "lathe", "live-tooling", "c-axis", "cross-drilling"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.937Z
---

# CATIA Lathe Live Tooling for Cross-Drilling and Milling

CATIA Lathe Machining supports live (driven) tool operations for cross-drilling, milling flats, and off-center features without transferring to a mill. Define the live tool in the tool catalog with the 'Driven Tool' flag enabled. In the machine definition, specify which turret stations support driven tools and their orientation (axial or radial). Program C-axis positioning to orient the part, then use Prismatic-type operations (Drilling, Pocketing, Contouring) with the tool axis set perpendicular to the lathe spindle axis. CATIA generates the correct G-code structure (C-axis lock, live tool start, milling cycle, return to turning mode).

**Category:** cam_strategy
**Confidence:** 0.86
**Source:** web:catia-docs
**Operations:** turning, drilling

## Related
- [[surfcam-cam-tips-sc2-157|SURFCAM Swiss-Type Live Tooling Cross-Drilling]]
- [[catia-cam-tips-cat-035|Lathe Roughing Strategy Selection Based on Material Hardness]]
- [[catia-cam-tips-cat-036|Lathe Finish Turning Nose Radius Compensation Critical]]
- [[catia-cam-tips-cat-037|Groove Turning Insert Width Must Match or Undersize Groove]]
- [[catia-cam-tips-cat-038|Thread Turning Infeed Strategy Affects Thread Quality]]
