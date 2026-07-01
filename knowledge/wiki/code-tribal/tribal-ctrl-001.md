---
name: tribal-ctrl-001
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["fanuc", "31i-b5", "ai-contour", "5-axis", "surface-finish", "g05.1"]
confidence: 90
source: "controller:fanuc_31i_manual"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-001.md
promoted_at: 2026-05-26T16:07:20.102Z
---

# Fanuc AI Contour Control for 5-axis surface finish

On Fanuc 31i-B5, enable AI Contour Control II (G05.1 Q1) for 5-axis simultaneous machining. This enables the look-ahead buffer (up to 200 blocks) and smooths axis transitions. Combined with Nano Smoothing (G05.1 Q2), it can reduce cycle time 10-15% while improving surface finish by filtering micro-segments from CAM output. Always pair with AICC tolerance parameter #8019.

**Category:** programming
**Confidence:** 90
**Source:** controller:fanuc_31i_manual

## Related
- [[controller-knowledge-tips-ctrl-007|Fanuc 0i-MF vs 31i-B5: key capability differences]]
- [[controller-knowledge-tips-ctrl-008|Fanuc tool center point control for 5-axis]]
- [[cimatron-cam-tips-cim-053|Lead/Lean Angle Control for Ball-End Finishing]]
- [[esprit-cam-tips-esp-184|FreeForm 5-Axis Geodesic Machining for Non-Planar Surfaces]]
- [[fusion360-cam-tips-ext-f360-138|Tool Orientation Smoothing for 5-Axis Finishing]]
