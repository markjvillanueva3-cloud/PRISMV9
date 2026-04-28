---
id: "sc2-116"
title: "Part Alignment Probing for Castings and Forgings"
source: "web:surfcam-alignment-probing"
confidence: 86
category: "probing"
tags: ["alignment-probing", "castings", "best-fit", "coordinate-rotation", "g68"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.134Z
---

# Part Alignment Probing for Castings and Forgings

For irregularly shaped stock (castings, forgings), program a multi-point probing routine that measures key datum features and computes the best-fit alignment. The probe measures 6+ points on datum surfaces and calculates the optimal work offset and rotation to align the part to the programmed coordinate system. This eliminates the manual indicate-and-adjust process that can take 30-60 minutes per setup. Output the computed rotation as a G68 coordinate rotation.

**Category:** probing
**Confidence:** 86
**Source:** web:surfcam-alignment-probing
**Operations:** probing

## Related
- [[bobcad-cam-tips-bc-120|Part Alignment Probing for Irregular Stock]]
- [[surfcam-cam-tips-sc2-112|Part Alignment with Best-Fit and Datum Features]]
- [[bobcad-cam-tips-bc-005|Rest Machining with Adaptive Toolpath for Uneven Stock]]
- [[bobcad-cam-tips-bc-105|Air Cut Reduction with Stock Model Awareness]]
- [[camworks-cam-tips-cw-118|Part Alignment Probing — Compensate for Misaligned Raw Stock]]
