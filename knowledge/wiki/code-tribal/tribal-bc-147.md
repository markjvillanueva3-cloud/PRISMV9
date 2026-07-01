---
name: tribal-bc-147
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mill-turn", "y-axis", "cross-slide", "angled-holes", "contoured"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-147.md
promoted_at: 2026-06-09T22:31:15.968Z
---

# BobCAD Mill-Turn Y-Axis Milling for Complex Turned Parts

BobCAD supports Y-axis milling on mill-turn machines equipped with a Y-axis cross-slide. This enables true 3-axis milling (XYZ) on the turned part for features like angled holes, contoured pockets, and engraving. Define the Y-axis reference plane as a plane tangent to the part OD at the feature location. Program depths relative to this tangent plane. For features on small-diameter parts (<20mm), verify that the Y-axis travel range can reach the feature centerline. BobCAD's simulation shows the actual Y-axis motion envelope to confirm feasibility.

**Category:** cam_strategy
**Confidence:** 0.86
**Source:** web:bobcad-docs
**Operations:** milling, turning

## Related
- [[bobcad-cam-tips-bc-054|Y-Axis Milling for Off-Center Features]]
- [[camworks-cam-tips-cw-072|Y-Axis Operations — Off-Centerline Milling for Complex Mill-Turn Parts]]
- [[edgecam-cam-tips-ec-046|Y-Axis Operations for Off-Center Milling]]
- [[esprit-cam-tips-esp-150|Mill-Turn Y-Axis Off-Center Feature Machining]]
- [[fusion360-cam-tips-ext-f360-131|Y-Axis Mill-Turn for Off-Center Features]]
