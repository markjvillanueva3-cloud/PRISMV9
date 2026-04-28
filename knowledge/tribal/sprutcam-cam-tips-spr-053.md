---
id: "spr-053"
title: "Contour Turning with Nose Radius Compensation"
source: "web:sprutcam-tutorials"
confidence: 0.87
category: "cam_strategy"
tags: ["contour-turning", "nose-radius", "compensation", "g41"]
_source: "sprutcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.919Z
---

# Contour Turning with Nose Radius Compensation

For complex OD/ID contours, enable nose radius compensation (G41/G42) in SprutCAM. The controller offsets the tool path by the insert nose radius. Set TNR (Tool Nose Radius) precisely in the tool definition — errors cause dimensional inaccuracies on tapered and curved surfaces. For CNMG inserts: TNR = 0.4, 0.8, or 1.2mm. Larger TNR gives better finish but can't machine tight internal corners.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:sprutcam-tutorials
**Operations:** turning

## Related
- [[catia-cam-tips-cat-036|Lathe Finish Turning Nose Radius Compensation Critical]]
- [[edgecam-cam-tips-ec-044|Contouring with Nose Radius Compensation]]
- [[bobcad-cam-tips-bc-051|Contour Turning with Automatic Retract Planning]]
- [[mastercam-cam-tips-mc-253|Mastercam 2025 B-axis contour turning enables complex profile turning with live tooling on mill-turn]]
- [[surfcam-cam-tips-sc2-053|Contour Turning with Automatic Retract Planning]]
