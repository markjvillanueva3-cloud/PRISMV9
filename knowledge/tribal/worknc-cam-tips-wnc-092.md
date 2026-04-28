---
id: "wnc-092"
title: "Point Distribution Prevents Controller Starvation"
source: "web:worknc-points"
confidence: 90
category: "cam_strategy"
tags: ["point-distribution", "controller", "look-ahead", "starvation"]
_source: "worknc-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.692Z
---

# Point Distribution Prevents Controller Starvation

WorkNC's point distribution controls density and spacing of toolpath points. Use 'Chord error' mode for curvature-adaptive distribution. Set maximum segment length to 0.5-2 mm for finishing to keep the controller's look-ahead buffer full. Avoid extremely short segments (<0.01 mm) that cause controller starvation on HSM machines. The optimal segment length depends on feed rate and controller block processing speed.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:worknc-points
**Operations:** finishing

## Related
- [[topsolid-cam-tips-ts-096|Point Distribution Controls Toolpath Segment Length]]
- [[bobcad-cam-tips-bc-102|Point Distribution for Consistent Machine Motion]]
- [[edgecam-cam-tips-ec-090|Point Distribution Based on Surface Curvature]]
- [[esprit-cam-tips-esp-099|Point Distribution for Smooth CNC Motion]]
- [[surfcam-cam-tips-sc2-085|Point Distribution Control for Consistent Machine Motion]]
