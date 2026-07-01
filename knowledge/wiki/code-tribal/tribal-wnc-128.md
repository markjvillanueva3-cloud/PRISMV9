---
name: tribal-wnc-128
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["auto-5", "multi-pass", "consistency", "tilt", "witness-marks"]
confidence: 89
source: "web:worknc-docs"
promoted_from: knowledge/tribal/worknc-cam-tips-wnc-128.md
promoted_at: 2026-06-09T22:31:16.817Z
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
