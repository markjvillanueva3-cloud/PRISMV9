---
id: "ts-034"
title: "3+2 Indexed Machining Maximizes Rigidity"
source: "web:topsolid-indexed"
confidence: 93
category: "cam_strategy"
tags: ["3+2", "indexed", "rigidity", "work-planes"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.413Z
---

# 3+2 Indexed Machining Maximizes Rigidity

TopSolid's 3+2 (indexed) machining locks the rotary axes at fixed orientations and performs 3-axis toolpaths in each orientation. This provides maximum rigidity and allows use of shorter tools compared to simultaneous 5-axis. Define work planes at critical angles and use the 'Best fit orientation' tool to find the minimum number of setups needed to reach all features. Typically 3-5 orientations cover 90% of features on complex aerospace brackets.

**Category:** cam_strategy
**Confidence:** 93
**Source:** web:topsolid-indexed
**Operations:** 5_axis, 3d_milling

## Related
- [[surfcam-cam-tips-sc2-036|Indexed 3+2 Axis for Accessible Multi-Face Machining]]
- [[bobcad-cam-tips-bc-034|Indexed 3+2 Machining for Multi-Face Prismatic Parts]]
- [[camworks-cam-tips-cw-046|3+2 Indexed Machining — Fixed Orientation for Rigidity and Accuracy]]
- [[edgecam-cam-tips-ec-027|Indexed 3+2 Machining for Multi-Face Parts]]
- [[controller-knowledge-tips-ctrl-066|CYCLE800 Swivel Plane for 3+2 Axis Positioning]]
