---
id: "cat-002"
title: "Facing Operation Overlap Percentage for Full Coverage"
source: "web:catia-docs"
confidence: 90
category: "cam_strategy"
tags: ["catia", "facing", "overlap", "stepover", "prismatic"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.802Z
---

# Facing Operation Overlap Percentage for Full Coverage

When defining a Facing operation in CATIA, set the tool overlap (stepover) to at least 10-15% of the face mill diameter to prevent witness marks between passes. In the Machining tab, configure the Offset on Contour to a negative value (e.g., -2mm) so the cutter extends past the stock boundary, ensuring the full surface is cleaned without leaving an unmachined lip at the edges.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:catia-docs
**Operations:** facing

## Related
- [[catia-cam-tips-cat-001|Pocketing Spiral vs Zigzag Tool Path Style Selection]]
- [[catia-cam-tips-cat-003|Profile Contouring Compensation Mode Selection]]
- [[catia-cam-tips-cat-004|T-Slot Machining Requires Two-Stage Approach]]
- [[catia-cam-tips-cat-005|Groove Machining With Controlled Plunge and Retract]]
- [[catia-cam-tips-cat-006|Channel Milling Stepdown Strategy for Deep Features]]
