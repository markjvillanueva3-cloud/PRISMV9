---
id: "bc-034"
title: "Indexed 3+2 Machining for Multi-Face Prismatic Parts"
source: "web:bobcad-indexed"
confidence: 90
category: "cam_strategy"
tags: ["3+2", "indexed", "multi-face", "work-planes", "cam-tree"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.471Z
---

# Indexed 3+2 Machining for Multi-Face Prismatic Parts

BobCAD indexed 3+2 locks rotary axes at fixed positions for 3-axis machining on multiple faces. This is more rigid than simultaneous 5-axis and preferred for prismatic features. Define work planes for each position. Group all features on each face into a single index position to minimize rotary axis movements. BobCAD's CAM Tree makes it easy to organize operations by index position and verify the sequence before posting.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:bobcad-indexed
**Operations:** 5_axis, 3_plus_2

## Related
- [[surfcam-cam-tips-sc2-036|Indexed 3+2 Axis for Accessible Multi-Face Machining]]
- [[edgecam-cam-tips-ec-027|Indexed 3+2 Machining for Multi-Face Parts]]
- [[esprit-cam-tips-esp-037|Indexed 3+2 Machining for Multi-Face Parts]]
- [[topsolid-cam-tips-ts-034|3+2 Indexed Machining Maximizes Rigidity]]
- [[camworks-cam-tips-cw-046|3+2 Indexed Machining — Fixed Orientation for Rigidity and Accuracy]]
