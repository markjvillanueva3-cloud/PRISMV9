---
name: tribal-sc-061
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["solidcam", "hsm", "spiral-finishing", "direction", "surface-finish"]
confidence: 85
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-061.md
promoted_at: 2026-06-09T22:31:16.585Z
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
