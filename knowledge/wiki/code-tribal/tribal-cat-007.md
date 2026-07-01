---
name: tribal-cat-007
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "step", "multi-level", "prismatic"]
confidence: 85
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-007.md
promoted_at: 2026-06-09T22:31:16.032Z
---

# Step Machining Using Multi-Level Prismatic Operations

To machine stepped features in CATIA, define each step level as a separate machining zone within a single Pocketing operation using the multi-level capability. Set the Bottom type to 'Flat' and reference each step floor individually. This is more efficient than creating separate operations per level because CATIA optimizes the approach and retract motions between levels, reducing air time by 20-30%.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:catia-docs
**Operations:** pocketing

## Related
- [[catia-cam-tips-cat-010|Multi-Level Pocket Depth Ordering for Chip Evacuation]]
- [[catia-cam-tips-cat-001|Pocketing Spiral vs Zigzag Tool Path Style Selection]]
- [[catia-cam-tips-cat-002|Facing Operation Overlap Percentage for Full Coverage]]
- [[catia-cam-tips-cat-003|Profile Contouring Compensation Mode Selection]]
- [[catia-cam-tips-cat-004|T-Slot Machining Requires Two-Stage Approach]]
