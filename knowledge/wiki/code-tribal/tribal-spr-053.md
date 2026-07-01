---
name: tribal-spr-053
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["contour-turning", "nose-radius", "compensation", "g41"]
confidence: 0
source: "web:sprutcam-tutorials"
promoted_from: knowledge/tribal/sprutcam-cam-tips-spr-053.md
promoted_at: 2026-06-09T22:31:16.631Z
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
