---
id: "cat-012"
title: "Bottom Finishing Feedrate Reduction at Pocket Corners"
source: "web:catia-docs"
confidence: 90
category: "cam_strategy"
tags: ["catia", "bottom-finishing", "corner-feedrate", "prismatic"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.810Z
---

# Bottom Finishing Feedrate Reduction at Pocket Corners

In CATIA Prismatic Machining, enable corner feedrate reduction in the Feeds and Speeds tab for bottom finishing passes. Set the Corner Reduction Rate to 40-60%, the Maximum Radius threshold to 2x tool radius, and the Minimum Angle to 60 degrees. Configure the Before/After distance to 1.5x tool diameter so the deceleration is smooth. This prevents tool overload at sharp internal corners where full-width engagement spikes cutting forces.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:catia-docs
**Operations:** pocketing, profile_contouring

## Related
- [[catia-cam-tips-cat-001|Pocketing Spiral vs Zigzag Tool Path Style Selection]]
- [[catia-cam-tips-cat-002|Facing Operation Overlap Percentage for Full Coverage]]
- [[catia-cam-tips-cat-003|Profile Contouring Compensation Mode Selection]]
- [[catia-cam-tips-cat-004|T-Slot Machining Requires Two-Stage Approach]]
- [[catia-cam-tips-cat-005|Groove Machining With Controlled Plunge and Retract]]
