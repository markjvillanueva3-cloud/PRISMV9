---
id: "f360-109"
title: "Stock-Aware Linking Minimizes Air Cutting"
source: "web:fusion360-docs"
confidence: 86
category: "cam_strategy"
tags: ["fusion360", "keep-tool-down", "linking", "air-cutting", "cycle-time"]
_source: "fusion360-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:42.713Z
---

# Stock-Aware Linking Minimizes Air Cutting

Enable the Keep Tool Down option in the Linking tab to force the tool to stay at cutting depth between passes instead of retracting to clearance height. Combined with Stock simulation, Fusion routes the tool through already-cleared areas rather than lifting and repositioning. This eliminates 30-50% of non-cutting rapid moves on complex pocket geometries. Verify in simulation that the low-level transit moves do not clip remaining stock — if they do, increase the Stay Down Level offset by 1-2mm above the cutting plane.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:fusion360-docs
**Operations:** 2d_pocket, 2d_adaptive, 3d_adaptive

## Related
- [[fusion360-cam-tips-ext-f360-047|Morphing Between Depths for Smooth Adaptive Transitions]]
- [[fusion360-cam-tips-ext-f360-084|Tool Change Optimization in Post Processor]]
- [[fusion360-cam-tips-ext-f360-087|Force-Based Feed Optimization to Reduce Cycle Time]]
- [[fusion360-cam-tips-ext-f360-110|Minimum Retract Height to Reduce Rapid Travel]]
- [[fusion360-cam-tips-ext-f360-140|Barrel Cutter Selection for Large Stepovers]]
