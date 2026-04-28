---
id: "wnc-122"
title: "Auto5 Tilt Angle Limits — Machine-Specific Constraints"
source: "web:worknc-docs"
confidence: 91
category: "cam_strategy"
tags: ["auto-5", "tilt-limits", "machine-definition", "rotary-axis"]
_source: "worknc-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.715Z
---

# Auto5 Tilt Angle Limits — Machine-Specific Constraints

WorkNC Auto5 respects machine-specific rotary axis limits during 3-to-5 axis conversion. Define the A/B/C axis travel ranges in the machine definition (e.g., A: -120° to +30°, C: -360° to +360°). Auto5 will not tilt beyond these limits even if collision avoidance requests it. If the required tilt exceeds the machine limits, Auto5 flags the region as unreachable. For table-table machines with limited tilt (±30°), Auto5 is most effective on parts with shallow undercuts; deep undercuts require manual 5-axis programming or re-fixturing.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:worknc-docs
**Operations:** 5_axis

## Related
- [[worknc-cam-tips-wnc-127|Auto5 Singularity Management — Handling Vertical Tool Orientation]]
- [[worknc-cam-tips-wnc-001|Auto 5 Converts 3-Axis Toolpaths to Collision-Free 5-Axis]]
- [[worknc-cam-tips-wnc-002|Automatic Tool-Axis Calculation Avoids Manual Orientation]]
- [[worknc-cam-tips-wnc-003|Smooth Tool-Axis Transitions Prevent Jerky Motion]]
- [[worknc-cam-tips-wnc-004|Automatic Tilting Accesses Deep Cavities with Short Tools]]
