---
id: "esp-037"
title: "Indexed 3+2 Machining for Multi-Face Parts"
source: "web:esprit-5axis"
confidence: 91
category: "cam_strategy"
tags: ["3+2", "indexed", "multi-face", "work-coordinates"]
_source: "esprit-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.469Z
---

# Indexed 3+2 Machining for Multi-Face Parts

ESPRIT's 3+2 (indexed) machining locks the rotary axes at fixed orientations to machine features on angled faces using standard 3-axis toolpaths. This is more rigid and accurate than simultaneous 5-axis for features like holes, pockets, and faces on tilted planes. Define work coordinates per face and enable 'automatic indexing' to let ESPRIT determine optimal orientations. Verify that all index angles are within the machine's rotary axis limits and don't cause collision with fixturing.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:esprit-5axis
**Operations:** 5axis_indexed, 3plus2

## Related
- [[bobcad-cam-tips-bc-034|Indexed 3+2 Machining for Multi-Face Prismatic Parts]]
- [[edgecam-cam-tips-ec-027|Indexed 3+2 Machining for Multi-Face Parts]]
- [[surfcam-cam-tips-sc2-036|Indexed 3+2 Axis for Accessible Multi-Face Machining]]
- [[camworks-cam-tips-cw-046|3+2 Indexed Machining — Fixed Orientation for Rigidity and Accuracy]]
- [[controller-knowledge-tips-ctrl-066|CYCLE800 Swivel Plane for 3+2 Axis Positioning]]
