---
id: "cat-130"
title: "Prismatic T-Slot Machining Using Multi-Tool Sequencing"
source: "web:catia-docs"
confidence: 0.85
category: "cam_strategy"
tags: ["catia", "prismatic", "t-slot", "multi-tool", "sequencing"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.902Z
---

# Prismatic T-Slot Machining Using Multi-Tool Sequencing

T-slot machining in CATIA Prismatic requires a three-step sequence: (1) rough the vertical slot with an end mill using a Profile Pocketing operation, (2) rough the horizontal undercut with a T-slot cutter using a dedicated T-Slot operation from the Prismatic machining toolbar, (3) finish both surfaces. Define the T-slot cutter geometry accurately in the tool editor — specify both the shank diameter and the cutting head diameter/width. Set the 'Max Cut Depth' per pass to 2mm for the T-slot cutter to avoid overloading. CATIA computes the undercut geometry by subtracting the vertical slot from the T-slot profile.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:catia-docs
**Operations:** slotting

## Related
- [[catia-cam-tips-cat-004|T-Slot Machining Requires Two-Stage Approach]]
- [[catia-cam-tips-cat-001|Pocketing Spiral vs Zigzag Tool Path Style Selection]]
- [[catia-cam-tips-cat-002|Facing Operation Overlap Percentage for Full Coverage]]
- [[catia-cam-tips-cat-003|Profile Contouring Compensation Mode Selection]]
- [[catia-cam-tips-cat-005|Groove Machining With Controlled Plunge and Retract]]
