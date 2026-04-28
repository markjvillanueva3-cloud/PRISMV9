---
id: "f360-087"
title: "Force-Based Feed Optimization to Reduce Cycle Time"
source: "web:fusion360-docs"
confidence: 87
category: "cam_strategy"
tags: ["fusion360", "feed-optimization", "corner-slowdown", "cycle-time", "tool-load"]
_source: "fusion360-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:42.695Z
---

# Force-Based Feed Optimization to Reduce Cycle Time

Fusion's Feed Optimization (found in the Passes tab) lets you reduce feed rates at corners where the tool engagement angle increases and boost feed rates on straight runs where engagement drops. Set the Maximum Directional Change parameter to 30-60 degrees and the Reduced Feed rate to 50-75% of the nominal feed. This prevents overloading at corners while maintaining full speed on straight sections, typically reducing overall cycle time by 5-15% compared to a single constant feed rate.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:fusion360-docs
**Operations:** 2d_contour, 2d_pocket, 2d_adaptive

## Related
- [[fusion360-cam-tips-ext-f360-108|Corner Slow-Down Based on Directional Change]]
- [[fusion360-cam-tips-ext-f360-047|Morphing Between Depths for Smooth Adaptive Transitions]]
- [[fusion360-cam-tips-ext-f360-084|Tool Change Optimization in Post Processor]]
- [[fusion360-cam-tips-ext-f360-109|Stock-Aware Linking Minimizes Air Cutting]]
- [[fusion360-cam-tips-ext-f360-110|Minimum Retract Height to Reduce Rapid Travel]]
