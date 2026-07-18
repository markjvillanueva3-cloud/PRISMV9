---
name: tribal-wnc-125
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["auto-5", "zones", "tilt-strategy", "surface-groups"]
confidence: 89
source: "web:worknc-docs"
promoted_from: knowledge/tribal/worknc-cam-tips-wnc-125.md
promoted_at: 2026-06-09T22:31:16.817Z
---

# Auto5 Zone Control — Different Tilt Strategies per Region

WorkNC Auto5 supports zone-based control where different regions of the part can have different tilt strategies. For a mold cavity: flat bottom zone uses 3-axis (no tilt), vertical walls use fixed tilt (15-20° lead angle), and undercut regions use full Auto5 collision avoidance. Define zones by selecting surface groups and assigning tilt rules per zone. This produces better surface finish than applying full Auto5 everywhere because unnecessary axis motion is eliminated in regions that don't need it.

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
