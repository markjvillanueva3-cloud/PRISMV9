---
id: "cat-007"
title: "Step Machining Using Multi-Level Prismatic Operations"
source: "web:catia-docs"
confidence: 85
category: "cam_strategy"
tags: ["catia", "step", "multi-level", "prismatic"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.806Z
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
