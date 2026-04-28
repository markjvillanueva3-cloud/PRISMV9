---
id: "cat-136"
title: "Prismatic Multi-Axis Pocket with Tilted Tool Access"
source: "web:catia-docs"
confidence: 0.85
category: "cam_strategy"
tags: ["catia", "prismatic", "multi-axis-pocket", "tilted", "3plus2"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.920Z
---

# Prismatic Multi-Axis Pocket with Tilted Tool Access

When a prismatic pocket has vertical walls that are not normal to the machine Z-axis (e.g., angled mounting pads), use CATIA's 'Multi-Axis Pocket' operation instead of standard Pocketing. This operation tilts the tool axis to align with the pocket normal while maintaining prismatic-style XY tool paths. Set the tool axis to 'Normal to Bottom' and specify the pocket bottom face. CATIA computes 3+2 axis positions (indexed tilts) for each Z-level. This avoids the need for full 5-axis surface machining for features that are geometrically prismatic but spatially tilted.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:catia-docs
**Operations:** pocketing

## Related
- [[catia-cam-tips-cat-001|Pocketing Spiral vs Zigzag Tool Path Style Selection]]
- [[catia-cam-tips-cat-002|Facing Operation Overlap Percentage for Full Coverage]]
- [[catia-cam-tips-cat-003|Profile Contouring Compensation Mode Selection]]
- [[catia-cam-tips-cat-004|T-Slot Machining Requires Two-Stage Approach]]
- [[catia-cam-tips-cat-005|Groove Machining With Controlled Plunge and Retract]]
