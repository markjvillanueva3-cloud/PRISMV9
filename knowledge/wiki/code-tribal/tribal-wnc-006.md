---
name: tribal-wnc-006
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["auto-5", "indexed", "continuous", "mode-selection"]
confidence: 92
source: "web:worknc-indexed"
promoted_from: knowledge/tribal/worknc-cam-tips-wnc-006.md
promoted_at: 2026-05-26T16:07:21.363Z
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
