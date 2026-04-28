---
id: "wnc-003"
title: "Smooth Tool-Axis Transitions Prevent Jerky Motion"
source: "web:worknc-smooth"
confidence: 92
category: "cam_strategy"
tags: ["auto-5", "smooth-transition", "angular-rate", "motion"]
_source: "worknc-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.623Z
---

# Smooth Tool-Axis Transitions Prevent Jerky Motion

WorkNC Auto 5 generates smooth tool-axis transitions between adjacent toolpath segments to prevent sudden rotary-axis movements. The smoothing algorithm limits the maximum angular change per linear step to a user-defined value (typically 2-5 degrees per step). Tighter limits produce smoother motion but may require more aggressive tilting in advance of an obstacle. Set the angular rate limit based on your machine's rotary-axis acceleration capability.

**Category:** cam_strategy
**Confidence:** 92
**Source:** web:worknc-smooth
**Operations:** 5_axis

## Related
- [[worknc-cam-tips-wnc-001|Auto 5 Converts 3-Axis Toolpaths to Collision-Free 5-Axis]]
- [[worknc-cam-tips-wnc-002|Automatic Tool-Axis Calculation Avoids Manual Orientation]]
- [[worknc-cam-tips-wnc-004|Automatic Tilting Accesses Deep Cavities with Short Tools]]
- [[worknc-cam-tips-wnc-005|3-to-5 Axis Conversion Preserves Original Toolpath Quality]]
- [[worknc-cam-tips-wnc-006|Auto-Indexed vs Continuous 5-Axis Mode Selection]]
