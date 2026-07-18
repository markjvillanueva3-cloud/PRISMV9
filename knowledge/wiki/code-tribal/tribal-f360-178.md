---
name: tribal-f360-178
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["fusion360", "generative-design", "hybrid-manufacturing", "additive-subtractive", "near-net"]
confidence: 0
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-178.md
promoted_at: 2026-06-09T22:31:16.295Z
---

# Generative Design with Combined Additive and Subtractive

For generative outcomes that are not fully machinable from any orientation, use a combined additive + subtractive workflow. The generative study's Unrestricted manufacturing method produces the lightest structure but requires additive manufacturing for the base shape. In Fusion, first print the near-net shape (metal SLM/DMLS or MJF for polymer), then switch to the Manufacturing workspace and program subtractive operations for: datum surfaces (face milling to create flat references), mating interfaces (contour milling to tolerance), holes and threads (drilling and tapping), and surface finish requirements (ball-nose finishing on critical surfaces). The additive body provides the complex internal structure; the subtractive operations deliver precision where needed.

**Category:** cam_strategy
**Confidence:** 0.8
**Source:** web:fusion360-docs
**Operations:** general

## Related
- [[fusion360-cam-tips-ext-f360-176|Generative Design Manufacturing Constraints for CNC]]
- [[fusion360-cam-tips-ext-f360-177|Programming Organic Generative Shapes with Adaptive Clearing]]
- [[fusion360-cam-tips-ext-f360-179|T-Spline to BRep Conversion for Generative CAM]]
- [[fusion360-cam-tips-ext-f360-180|Fixturing Strategy for Generative Design Parts]]
- [[fusion360-cam-tips-ext-f360-040|Fine-Tune Optimal Load by Material Hardness]]
