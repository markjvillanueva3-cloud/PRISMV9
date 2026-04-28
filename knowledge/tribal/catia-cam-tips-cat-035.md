---
id: "cat-035"
title: "Lathe Roughing Strategy Selection Based on Material Hardness"
source: "web:catia-docs"
confidence: 88
category: "cam_strategy"
tags: ["catia", "lathe", "roughing", "longitudinal", "turning"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.828Z
---

# Lathe Roughing Strategy Selection Based on Material Hardness

In CATIA Lathe Machining, choose between longitudinal roughing (parallel to Z-axis) for long slender parts and face roughing (parallel to X-axis) for short wide parts. For hardened materials (>45 HRC), use the Contour Roughing strategy which follows the part profile at each depth of cut, maintaining more consistent engagement than linear passes. Set the depth of cut to 0.5-1.5mm for carbide inserts and 0.1-0.3mm for ceramic inserts.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:catia-docs
**Operations:** rough_turning

## Related
- [[catia-cam-tips-cat-036|Lathe Finish Turning Nose Radius Compensation Critical]]
- [[catia-cam-tips-cat-037|Groove Turning Insert Width Must Match or Undersize Groove]]
- [[catia-cam-tips-cat-038|Thread Turning Infeed Strategy Affects Thread Quality]]
- [[catia-cam-tips-cat-039|Face Turning Constant Surface Speed for Uniform Finish]]
- [[catia-cam-tips-cat-040|Bore Turning Requires Minimum Bore Diameter for Tool Clearance]]
