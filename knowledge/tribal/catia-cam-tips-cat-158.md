---
id: "cat-158"
title: "CATIA Lathe Profiling with Minimum Radius Check"
source: "web:catia-docs"
confidence: 0.86
category: "cam_strategy"
tags: ["catia", "lathe", "profiling", "minimum-radius", "interference-check"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.939Z
---

# CATIA Lathe Profiling with Minimum Radius Check

CATIA Lathe Machining includes a 'Minimum Radius Check' in the Profile Finishing operation that prevents programming internal radii smaller than the insert nose radius. When the part geometry contains concave radii smaller than the tool nose radius, CATIA either: (1) warns and skips the feature, or (2) machines to the closest achievable geometry if 'Allow Overcut' is disabled. Always run the 'Tool-Part Interference' check before posting — CATIA highlights in red any profile segments where the insert geometry cannot reach. Select a smaller nose radius insert or use a dedicated groove tool for tight-radius features.

**Category:** cam_strategy
**Confidence:** 0.86
**Source:** web:catia-docs
**Operations:** turning

## Related
- [[catia-cam-tips-cat-035|Lathe Roughing Strategy Selection Based on Material Hardness]]
- [[catia-cam-tips-cat-036|Lathe Finish Turning Nose Radius Compensation Critical]]
- [[catia-cam-tips-cat-037|Groove Turning Insert Width Must Match or Undersize Groove]]
- [[catia-cam-tips-cat-038|Thread Turning Infeed Strategy Affects Thread Quality]]
- [[catia-cam-tips-cat-039|Face Turning Constant Surface Speed for Uniform Finish]]
