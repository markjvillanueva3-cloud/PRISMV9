---
name: tribal-f360-180
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["fusion360", "generative-design", "fixturing", "soft-jaws", "conformal-fixture"]
confidence: 0
source: "web:autodesk-forum"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-180.md
promoted_at: 2026-06-09T22:31:16.295Z
---

# Fixturing Strategy for Generative Design Parts

Generative parts have irregular shapes that do not sit in standard vises. Design fixture strategies early: identify the flattest surface from the generative output and designate it as the primary datum (extend it if necessary with a sacrificial pad that is machined off in Op2). Use soft jaws CNC-machined to match the part's organic contour for Op2. In Fusion, model the soft jaw profile by offsetting the part's clamping surface by 0.1mm and cutting that shape into a jaw blank. For production quantities, consider 3D-printed conformal fixtures (polymer or metal) that cradle the entire part. Include the fixture body in the Fusion setup for collision simulation.

**Category:** setup
**Confidence:** 0.83
**Source:** web:autodesk-forum
**Operations:** general

## Related
- [[fusion360-cam-tips-ext-f360-176|Generative Design Manufacturing Constraints for CNC]]
- [[fusion360-cam-tips-ext-f360-177|Programming Organic Generative Shapes with Adaptive Clearing]]
- [[fusion360-cam-tips-ext-f360-178|Generative Design with Combined Additive and Subtractive]]
- [[fusion360-cam-tips-ext-f360-179|T-Spline to BRep Conversion for Generative CAM]]
- [[fusion360-cam-tips-ext-f360-040|Fine-Tune Optimal Load by Material Hardness]]
