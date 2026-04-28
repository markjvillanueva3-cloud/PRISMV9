---
id: "cat-133"
title: "Prismatic Curve-Following Operation for Non-Standard Features"
source: "web:catia-docs"
confidence: 0.83
category: "cam_strategy"
tags: ["catia", "prismatic", "curve-following", "wireframe", "engraving"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.905Z
---

# Prismatic Curve-Following Operation for Non-Standard Features

When prismatic features don't match standard pocket/slot/hole recognition, use CATIA's 'Curve Following' operation. Project 2D or 3D wireframe curves onto the part and define them as the tool path guide. Set 'Offset Mode' to Left/Right/On for tool positioning relative to the curve. This operation handles open-profile machining (grooves, engravings, parting lines) that Profile Contouring cannot — it supports multiple Z-levels with automatic step-down and per-curve approach/retract macros. Link curves to design geometry for associative updates.

**Category:** cam_strategy
**Confidence:** 0.83
**Source:** web:catia-docs
**Operations:** profile_contouring

## Related
- [[catia-cam-tips-cat-001|Pocketing Spiral vs Zigzag Tool Path Style Selection]]
- [[catia-cam-tips-cat-002|Facing Operation Overlap Percentage for Full Coverage]]
- [[catia-cam-tips-cat-003|Profile Contouring Compensation Mode Selection]]
- [[catia-cam-tips-cat-004|T-Slot Machining Requires Two-Stage Approach]]
- [[catia-cam-tips-cat-005|Groove Machining With Controlled Plunge and Retract]]
