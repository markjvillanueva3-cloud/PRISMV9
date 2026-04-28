---
id: "cat-003"
title: "Profile Contouring Compensation Mode Selection"
source: "web:catia-docs"
confidence: 92
category: "cam_strategy"
tags: ["catia", "profile", "contouring", "compensation", "prismatic"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.803Z
---

# Profile Contouring Compensation Mode Selection

In CATIA Profile Contouring, choose between Tool Center and Tool Contact compensation modes based on your post-processor capability. Use Tool Center mode when the CNC controller handles cutter compensation (G41/G42), and Tool Contact mode when you want CATIA to compute the offset path directly. Mixing these incorrectly causes double-compensation errors that gouge the part by one tool radius.

**Category:** cam_strategy
**Confidence:** 92
**Source:** web:catia-docs
**Operations:** profile_contouring

## Related
- [[catia-cam-tips-cat-001|Pocketing Spiral vs Zigzag Tool Path Style Selection]]
- [[catia-cam-tips-cat-002|Facing Operation Overlap Percentage for Full Coverage]]
- [[catia-cam-tips-cat-004|T-Slot Machining Requires Two-Stage Approach]]
- [[catia-cam-tips-cat-005|Groove Machining With Controlled Plunge and Retract]]
- [[catia-cam-tips-cat-006|Channel Milling Stepdown Strategy for Deep Features]]
