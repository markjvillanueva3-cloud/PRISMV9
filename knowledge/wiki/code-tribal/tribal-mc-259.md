---
name: tribal-mc-259
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "equal-scallop", "spiral", "step-marks", "surface-finish", "continuous"]
confidence: 83
source: "web:mastercam-forum"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-259.md
promoted_at: 2026-06-09T22:31:16.459Z
---

# Equal Scallop spiral pattern eliminates step-marks by using continuous spiral motion instead of offset rows

In Equal Scallop toolpath parameters, select the 'Spiral' cut pattern instead of the default 'Offset' pattern. Spiral mode generates a continuous inward or outward spiral that maintains the target scallop height while eliminating the step-over marks between adjacent passes that the offset pattern creates at each row transition. This is particularly effective on convex surfaces (lens molds, spherical forms, bearing races) where any directional step-marks are visible in the final polished part. The spiral pattern also reduces the number of retract/approach moves, lowering cycle time by 5-10% compared to offset pattern on the same geometry. Set the spiral start to the outermost boundary edge and spiral inward for best chip evacuation.

**Category:** cam_strategy
**Confidence:** 83
**Source:** web:mastercam-forum
**Operations:** finishing

## Related
- [[mastercam-cam-tips-mc-256|Equal Scallop toolpath maintains constant cusp height across varying surface curvature for uniform finish]]
- [[mastercam-cam-tips-mc-257|Combining Equal Scallop with Steep/Shallow boundary yields optimal finish across mixed-angle surfaces]]
- [[wedm-knowledge-tips-wedm-mcam-005-2|No Core toolpath removes material without slugs — zigzag or spiral cutting]]
- [[mastercam-cam-tips-mc-056|Parallel finishing with 45-degree cut angle hides machining marks on flat surfaces]]
- [[mastercam-cam-tips-mc-061|Equal Scallop produces tighter surface tolerance than standard Scallop]]
