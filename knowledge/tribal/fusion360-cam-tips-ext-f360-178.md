---
id: "f360-178"
title: "Generative Design with Combined Additive and Subtractive"
source: "web:fusion360-docs"
confidence: 0.8
category: "cam_strategy"
tags: ["fusion360", "generative-design", "hybrid-manufacturing", "additive-subtractive", "near-net"]
_source: "fusion360-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:42.769Z
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
