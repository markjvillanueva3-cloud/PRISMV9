---
id: "wnc-128"
title: "Auto5 Multi-Pass Consistency — Same Tilt Across Roughing and Finishing"
source: "web:worknc-docs"
confidence: 89
category: "cam_strategy"
tags: ["auto-5", "multi-pass", "consistency", "tilt", "witness-marks"]
_source: "worknc-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.720Z
---

# Auto5 Multi-Pass Consistency — Same Tilt Across Roughing and Finishing

When using Auto5 for both roughing and finishing passes, ensure consistent tool orientation across passes to prevent witness marks at transitions between different tilt zones. Use 'Copy Tilt from Reference Operation' to force the finishing pass to use the same tool axis orientation as the roughing pass. This is especially important for rest-machining operations where the smaller finishing tool must follow the same approach direction as the roughing tool to avoid leaving material in areas where the tilt changes.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:worknc-docs
**Operations:** 5_axis, finishing

## Related
- [[worknc-cam-tips-wnc-001|Auto 5 Converts 3-Axis Toolpaths to Collision-Free 5-Axis]]
- [[worknc-cam-tips-wnc-002|Automatic Tool-Axis Calculation Avoids Manual Orientation]]
- [[worknc-cam-tips-wnc-003|Smooth Tool-Axis Transitions Prevent Jerky Motion]]
- [[worknc-cam-tips-wnc-004|Automatic Tilting Accesses Deep Cavities with Short Tools]]
- [[worknc-cam-tips-wnc-005|3-to-5 Axis Conversion Preserves Original Toolpath Quality]]
