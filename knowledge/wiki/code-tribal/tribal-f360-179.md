---
name: tribal-f360-179
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["fusion360", "generative-design", "t-spline", "brep", "conversion"]
confidence: 0
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-179.md
promoted_at: 2026-06-09T22:31:16.295Z
---

# T-Spline to BRep Conversion for Generative CAM

Generative design results are stored as mesh/T-Spline bodies that must be converted to BRep (boundary representation) for CAM operations. In Fusion, right-click the generative body and select 'Convert to BRep'. The conversion quality depends on the face count — higher face counts produce smoother surfaces but larger files and longer toolpath computation. For mold-quality surfaces, use the 'Adaptive' conversion with a tolerance of 0.005-0.01mm. For structural parts, 0.02-0.05mm tolerance is sufficient. After conversion, inspect the BRep body for degenerate faces (area < 0.001mm²) that cause toolpath failures — use the Repair Body tool to fix these.

**Category:** cam_strategy
**Confidence:** 0.82
**Source:** web:fusion360-docs
**Operations:** general

## Related
- [[fusion360-cam-tips-ext-f360-172|API-Driven Tool Selection Based on Feature Analysis]]
- [[fusion360-cam-tips-ext-f360-176|Generative Design Manufacturing Constraints for CNC]]
- [[fusion360-cam-tips-ext-f360-177|Programming Organic Generative Shapes with Adaptive Clearing]]
- [[fusion360-cam-tips-ext-f360-178|Generative Design with Combined Additive and Subtractive]]
- [[fusion360-cam-tips-ext-f360-180|Fixturing Strategy for Generative Design Parts]]
