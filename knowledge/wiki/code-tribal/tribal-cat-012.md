---
name: tribal-cat-012
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "bottom-finishing", "corner-feedrate", "prismatic"]
confidence: 90
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-012.md
promoted_at: 2026-05-26T16:07:20.026Z
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
