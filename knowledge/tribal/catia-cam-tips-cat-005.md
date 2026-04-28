---
id: "cat-005"
title: "Groove Machining With Controlled Plunge and Retract"
source: "web:catia-docs"
confidence: 86
category: "cam_strategy"
tags: ["catia", "groove", "plunge", "retract", "prismatic"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.804Z
---

# Groove Machining With Controlled Plunge and Retract

For groove machining in CATIA Prismatic, define the groove as a closed contour and use Profile Contouring with Multiple Depths enabled. Set the plunge mode to Helical or Ramp to avoid plunging directly into material. Configure the retract plane 2-3mm above the stock top to minimize air cutting between passes. For narrow grooves where helical entry does not fit, switch to Zigzag plunge with reduced feedrate (30-40% of machining feed).

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:catia-docs
**Operations:** profile_contouring

## Related
- [[catia-cam-tips-cat-001|Pocketing Spiral vs Zigzag Tool Path Style Selection]]
- [[catia-cam-tips-cat-002|Facing Operation Overlap Percentage for Full Coverage]]
- [[catia-cam-tips-cat-003|Profile Contouring Compensation Mode Selection]]
- [[catia-cam-tips-cat-004|T-Slot Machining Requires Two-Stage Approach]]
- [[catia-cam-tips-cat-006|Channel Milling Stepdown Strategy for Deep Features]]
