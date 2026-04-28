---
id: "cat-010"
title: "Multi-Level Pocket Depth Ordering for Chip Evacuation"
source: "web:catia-docs"
confidence: 86
category: "cam_strategy"
tags: ["catia", "multi-level", "depth-ordering", "chip-evacuation", "prismatic"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.808Z
---

# Multi-Level Pocket Depth Ordering for Chip Evacuation

In CATIA multi-level pocketing, set the depth ordering to 'Top-Down by Level' rather than 'By Area' to ensure chips fall away from already-machined surfaces. For parts with varying pocket depths, the By Level strategy clears each Z-plane across all pockets before stepping down, preventing chip re-cutting and surface damage. Enable the 'Clean Between Levels' option to add a light finishing pass at each Z-level transition.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:catia-docs
**Operations:** pocketing

## Related
- [[catia-cam-tips-cat-007|Step Machining Using Multi-Level Prismatic Operations]]
- [[catia-cam-tips-cat-001|Pocketing Spiral vs Zigzag Tool Path Style Selection]]
- [[catia-cam-tips-cat-002|Facing Operation Overlap Percentage for Full Coverage]]
- [[catia-cam-tips-cat-003|Profile Contouring Compensation Mode Selection]]
- [[catia-cam-tips-cat-004|T-Slot Machining Requires Two-Stage Approach]]
