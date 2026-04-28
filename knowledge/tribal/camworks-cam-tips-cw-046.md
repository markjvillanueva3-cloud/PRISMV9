---
id: "cw-046"
title: "3+2 Indexed Machining — Fixed Orientation for Rigidity and Accuracy"
source: "web:camworks-docs"
confidence: 92
category: "cam_strategy"
tags: ["camworks", "5-axis", "3+2", "indexed", "rigidity"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.666Z
---

# 3+2 Indexed Machining — Fixed Orientation for Rigidity and Accuracy

3+2 (indexed) machining locks the rotary axes at a fixed orientation, then machines using 3-axis toolpaths. This provides better rigidity than simultaneous 5-axis and allows use of shorter tools. Use 3+2 for planar features accessible from angled orientations — bolt holes on inclined faces, pockets on angled surfaces. CAMWorks AFR with multi-axis enabled automatically identifies features that benefit from 3+2 approach and assigns the optimal index angle.

**Category:** cam_strategy
**Confidence:** 92
**Source:** web:camworks-docs
**Operations:** 5_axis, milling

## Related
- [[controller-knowledge-tips-ctrl-066|CYCLE800 Swivel Plane for 3+2 Axis Positioning]]
- [[gibbscam-cam-tips-gc-037|Indexed 5-axis (3+2) avoids simultaneous motion for simpler programming]]
- [[edgecam-cam-tips-ec-027|Indexed 3+2 Machining for Multi-Face Parts]]
- [[surfcam-cam-tips-sc2-036|Indexed 3+2 Axis for Accessible Multi-Face Machining]]
- [[topsolid-cam-tips-ts-034|3+2 Indexed Machining Maximizes Rigidity]]
