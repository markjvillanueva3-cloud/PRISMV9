---
id: "ec-044"
title: "Contouring with Nose Radius Compensation"
source: "web:edgecam-turning"
confidence: 89
category: "cam_strategy"
tags: ["contouring", "tnrc", "nose-radius", "compensation"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.286Z
---

# Contouring with Nose Radius Compensation

Edgecam automatically applies tool nose radius compensation (TNRC / G41/G42) for turning contours. The controller offsets the toolpath by the insert nose radius to produce the correct profile. Verify TNRC direction: G41 for OD profiling from right to left, G42 for left to right. Set the nose radius and imaginary tool tip position (T-value) accurately — a 0.01mm error in nose radius causes the same error across the entire contoured profile.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:edgecam-turning
**Operations:** turning_finishing

## Related
- [[catia-cam-tips-cat-003|Profile Contouring Compensation Mode Selection]]
- [[catia-cam-tips-cat-036|Lathe Finish Turning Nose Radius Compensation Critical]]
- [[sprutcam-cam-tips-spr-053|Contour Turning with Nose Radius Compensation]]
- [[controller-knowledge-tips-ctrl-032|Hurco WinMax UltiMotion for smooth contouring]]
- [[gibbscam-cam-tips-gc-006|Contour operations require lead-in/lead-out arcs to avoid witness marks]]
