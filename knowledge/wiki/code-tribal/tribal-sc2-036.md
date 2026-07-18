---
name: tribal-sc2-036
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["3+2", "indexed", "multi-face", "work-planes", "rigidity"]
confidence: 90
source: "web:surfcam-5axis-indexed"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-036.md
promoted_at: 2026-05-26T16:07:20.523Z
---

# Indexed 3+2 Axis for Accessible Multi-Face Machining

SURFCAM indexed 3+2 machining locks the rotary axes at fixed positions and machines with 3-axis toolpaths. This is more rigid than simultaneous 5-axis and preferred for prismatic features on multiple faces. Define work planes for each indexed position. Set the rotary axis lock tolerance to 0.001° for precision work. Plan the sequence to minimize the number of index rotations — group all features on each face into a single index position where possible.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:surfcam-5axis-indexed
**Operations:** 5_axis, 3_plus_2

## Related
- [[bobcad-cam-tips-bc-034|Indexed 3+2 Machining for Multi-Face Prismatic Parts]]
- [[edgecam-cam-tips-ec-027|Indexed 3+2 Machining for Multi-Face Parts]]
- [[topsolid-cam-tips-ts-034|3+2 Indexed Machining Maximizes Rigidity]]
- [[camworks-cam-tips-cw-046|3+2 Indexed Machining — Fixed Orientation for Rigidity and Accuracy]]
- [[esprit-cam-tips-esp-037|Indexed 3+2 Machining for Multi-Face Parts]]
