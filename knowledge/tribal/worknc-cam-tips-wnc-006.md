---
id: "wnc-006"
title: "Auto-Indexed vs Continuous 5-Axis Mode Selection"
source: "web:worknc-indexed"
confidence: 92
category: "cam_strategy"
tags: ["auto-5", "indexed", "continuous", "mode-selection"]
_source: "worknc-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.626Z
---

# Auto-Indexed vs Continuous 5-Axis Mode Selection

WorkNC Auto 5 can generate either continuous (simultaneous) 5-axis or auto-indexed (3+2) toolpaths. Use auto-indexed mode when the geometry can be reached from a limited number of fixed orientations for maximum rigidity. Use continuous mode for complex freeform surfaces where smooth tool-axis transitions are needed. The auto-indexed mode is also preferred for machines with lower rotary-axis accuracy or slower rotary-axis response.

**Category:** cam_strategy
**Confidence:** 92
**Source:** web:worknc-indexed
**Operations:** 5_axis

## Related
- [[worknc-cam-tips-wnc-001|Auto 5 Converts 3-Axis Toolpaths to Collision-Free 5-Axis]]
- [[worknc-cam-tips-wnc-002|Automatic Tool-Axis Calculation Avoids Manual Orientation]]
- [[worknc-cam-tips-wnc-003|Smooth Tool-Axis Transitions Prevent Jerky Motion]]
- [[worknc-cam-tips-wnc-004|Automatic Tilting Accesses Deep Cavities with Short Tools]]
- [[worknc-cam-tips-wnc-005|3-to-5 Axis Conversion Preserves Original Toolpath Quality]]
