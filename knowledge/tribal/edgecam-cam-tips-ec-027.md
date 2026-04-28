---
id: "ec-027"
title: "Indexed 3+2 Machining for Multi-Face Parts"
source: "web:edgecam-5axis"
confidence: 91
category: "cam_strategy"
tags: ["3+2", "indexed", "multi-face", "rigidity"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.273Z
---

# Indexed 3+2 Machining for Multi-Face Parts

Edgecam's 3+2 (indexed) machining locks rotary axes at fixed orientations to machine features on angled faces with standard 3-axis toolpaths. This is more rigid and accurate than full 5-axis for holes, pockets, and faces on tilted planes. Define a datum per face and verify all index angles are within machine travel limits. 3+2 also uses shorter tools than simultaneous 5-axis, improving surface finish and dimensional accuracy.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:edgecam-5axis
**Operations:** 5axis_indexed

## Related
- [[surfcam-cam-tips-sc2-036|Indexed 3+2 Axis for Accessible Multi-Face Machining]]
- [[bobcad-cam-tips-bc-034|Indexed 3+2 Machining for Multi-Face Prismatic Parts]]
- [[camworks-cam-tips-cw-046|3+2 Indexed Machining — Fixed Orientation for Rigidity and Accuracy]]
- [[esprit-cam-tips-esp-037|Indexed 3+2 Machining for Multi-Face Parts]]
- [[topsolid-cam-tips-ts-034|3+2 Indexed Machining Maximizes Rigidity]]
