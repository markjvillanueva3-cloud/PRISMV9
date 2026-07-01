---
name: tribal-esp-106
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["air-cutting", "stock-tracking", "rest-machining", "efficiency"]
confidence: 89
source: "web:esprit-optimization"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-106.md
promoted_at: 2026-06-09T22:31:16.237Z
---

# Air Cut Reduction with In-Process Stock Tracking

ESPRIT's in-process stock tracking maintains a volumetric model of the workpiece that updates after each operation. Subsequent operations use this model to skip passes where no material remains. This is critical for rest machining and multi-stage roughing — without stock tracking, the tool makes full passes over already-machined areas. Enable stock tracking for all operations in the sequence and verify that the stock model updates correctly by reviewing the material removal simulation.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:esprit-optimization
**Operations:** roughing, rest_machining

## Related
- [[edgecam-cam-tips-ec-093|Air Cut Reduction with Stock Model Tracking]]
- [[solidcam-cam-tips-sc-176-2|Progressive Rest Machining]]
- [[bobcad-cam-tips-bc-132|BobCAD V36 Rest Machining with Stock Model Tracking]]
- [[esprit-cam-tips-esp-006|ProfitMilling Rest Machining from Previous Stock]]
- [[wedm-knowledge-tips-wedm-mcam-008|Maximum leadout shortens travel from contour end to cut point]]
