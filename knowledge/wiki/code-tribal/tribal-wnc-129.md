---
name: tribal-wnc-129
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["auto-5", "re-machining", "rest-material", "3-axis", "hybrid"]
confidence: 91
source: "web:worknc-docs"
promoted_from: knowledge/tribal/worknc-cam-tips-wnc-129.md
promoted_at: 2026-05-26T16:07:21.589Z
---

# Auto5 for Re-Machining — Reaching Material Missed by 3-Axis

Auto5 excels at re-machining material left behind by 3-axis roughing in deep pockets and undercuts. The workflow: (1) rough the part with standard 3-axis toolpaths, (2) calculate remaining stock, (3) apply Auto5 to the rest material regions only. Auto5 tilts the tool to reach undercuts and deep corners that the vertical 3-axis tool couldn't access. This hybrid approach is faster than full 5-axis roughing because 80% of material removal uses simple 3-axis (higher MRR), and Auto5 handles only the remaining 20% of difficult geometry.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:worknc-docs
**Operations:** 5_axis, roughing

## Related
- [[worknc-cam-tips-wnc-132|Auto5 Cycle Time Impact — When 5-Axis is Slower Than 3-Axis]]
- [[worknc-cam-tips-wnc-152|WorkNC Advanced Re-Machining — Automatic Rest Material Detection]]
- [[worknc-cam-tips-wnc-001|Auto 5 Converts 3-Axis Toolpaths to Collision-Free 5-Axis]]
- [[worknc-cam-tips-wnc-002|Automatic Tool-Axis Calculation Avoids Manual Orientation]]
- [[worknc-cam-tips-wnc-003|Smooth Tool-Axis Transitions Prevent Jerky Motion]]
