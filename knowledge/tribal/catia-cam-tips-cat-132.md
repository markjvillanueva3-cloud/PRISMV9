---
id: "cat-132"
title: "Prismatic Chamfering with Automatic Edge Detection"
source: "web:catia-docs"
confidence: 0.84
category: "cam_strategy"
tags: ["catia", "prismatic", "chamfering", "edge-detection", "automation"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.904Z
---

# Prismatic Chamfering with Automatic Edge Detection

Use CATIA's 'Chamfering' operation in Prismatic Machining for automatic edge chamfering. Select the edges to chamfer (or use 'All Edges' mode for batch processing), then specify the chamfer width and angle. CATIA calculates the chamfer tool path considering: tool tip angle vs chamfer angle, depth of cut based on chamfer width, and 2D tool radius compensation. For variable-width chamfers along contoured edges, define a 'Chamfer Profile' that maps chamfer width to position along the edge. Use 90-degree chamfer mills for 45-degree chamfers — CATIA adjusts Z-depth to achieve the specified width.

**Category:** cam_strategy
**Confidence:** 0.84
**Source:** web:catia-docs
**Operations:** chamfering

## Related
- [[catia-cam-tips-cat-129|Prismatic Machining Multi-Pocket Recognition and Grouping]]
- [[catia-cam-tips-cat-001|Pocketing Spiral vs Zigzag Tool Path Style Selection]]
- [[catia-cam-tips-cat-002|Facing Operation Overlap Percentage for Full Coverage]]
- [[catia-cam-tips-cat-003|Profile Contouring Compensation Mode Selection]]
- [[catia-cam-tips-cat-004|T-Slot Machining Requires Two-Stage Approach]]
