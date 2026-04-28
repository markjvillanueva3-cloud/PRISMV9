---
id: "sc-060"
title: "HSM Linear Finishing — Optimal Angle for Surface Quality"
source: "web:solidcam-docs"
confidence: 86
category: "cam_strategy"
tags: ["solidcam", "hsm", "linear-finishing", "raster", "cutting-angle"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.710Z
---

# HSM Linear Finishing — Optimal Angle for Surface Quality

In HSM Linear (raster) finishing, the cutting angle relative to the part geometry significantly impacts surface quality. Set the linear angle perpendicular to the longest surface dimension for minimum scallop height. For doubly-curved surfaces, use the Automatic Angle option which calculates the optimal direction per region. Avoid angles that create long straight passes across shallow areas — these amplify tool deflection marks. A 15-degree offset from the principal curvature direction often provides the best compromise.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:solidcam-docs
**Operations:** finishing, surface_machining

## Related
- [[solidcam-cam-tips-sc-146-2|Cpk Prediction from Error Budget Analysis]]
- [[solidcam-cam-tips-sc-172-2|HSR/HSM 3D Finishing Strategies]]
- [[solidcam-cam-tips-sc-175-2|Constant Scallop Height Finishing]]
- [[solidcam-cam-tips-sc-059|HSM Constant Z with Spiral Transition — Eliminate Z-Step Witness Lines]]
- [[solidcam-cam-tips-sc-061|HSM Spiral Finishing — Center-Out for Convex, Outside-In for Concave]]
