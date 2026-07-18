---
name: tribal-sc2-132
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["stock-model", "in-process", "rest-machining", "auto-update"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-132.md
promoted_at: 2026-06-09T22:31:16.688Z
---

# SURFCAM 2023 Stock Model Carries Accurate In-Process Geometry

SURFCAM 2023's stock model updates after each operation, providing an accurate in-process shape for rest machining and collision checking. Traditional SURFCAM required manual stock definition per operation or relied on simplified bounding-box approximations. Enable 'Auto Update Stock' in the Operation Manager so each subsequent operation sees the true remaining material. This dramatically improves rest machining efficiency — without it, the tool re-cuts already-cleared areas.

**Category:** cam_strategy
**Confidence:** 0.89
**Source:** web:surfcam-docs
**Operations:** roughing, finishing

## Related
- [[mastercam-cam-tips-mc-178|Stock model generation from previous operations provides accurate rest material boundaries]]
- [[surfcam-cam-tips-sc2-065|Stock Model Tracking Across Multiple Operations]]
- [[bobcad-cam-tips-bc-027|3D Rest Machining from Stock Model]]
- [[bobcad-cam-tips-bc-083|Stock Model Tracking Across Operations]]
- [[bobcad-cam-tips-bc-132|BobCAD V36 Rest Machining with Stock Model Tracking]]
