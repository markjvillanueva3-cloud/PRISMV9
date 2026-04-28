---
id: "sc-061"
title: "HSM Spiral Finishing — Center-Out for Convex, Outside-In for Concave"
source: "web:solidcam-docs"
confidence: 85
category: "cam_strategy"
tags: ["solidcam", "hsm", "spiral-finishing", "direction", "surface-finish"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.710Z
---

# HSM Spiral Finishing — Center-Out for Convex, Outside-In for Concave

For HSM Spiral finishing, select center-out spiral direction on convex surfaces (cores) and outside-in on concave surfaces (cavities). Center-out on convex surfaces ensures the tool always climbs away from the high point, maintaining consistent chip load. Outside-in on cavities keeps the tool engaged with the steepest walls first, preventing sudden full-engagement at the pocket bottom. This directional choice can improve surface finish by 0.1-0.3 Ra on free-form surfaces.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:solidcam-docs
**Operations:** finishing, surface_machining

## Related
- [[solidcam-cam-tips-sc-146-2|Cpk Prediction from Error Budget Analysis]]
- [[solidcam-cam-tips-sc-167-2|Chance-Constrained with iMachining Advantage]]
- [[solidcam-cam-tips-sc-172-2|HSR/HSM 3D Finishing Strategies]]
- [[solidcam-cam-tips-sc-175-2|Constant Scallop Height Finishing]]
- [[solidcam-cam-tips-sc-181-2|Feature Recognition for Drilling Automation]]
