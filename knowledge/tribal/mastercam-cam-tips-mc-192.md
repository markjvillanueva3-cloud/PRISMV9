---
id: "mc-192"
title: "Chain direction determines climb vs conventional milling and compensation side"
source: "web:mastercam-docs"
confidence: 87
category: "cam_strategy"
tags: ["mastercam", "chain-direction", "climb-milling", "compensation", "clockwise", "reverse"]
_source: "mastercam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.273Z
---

# Chain direction determines climb vs conventional milling and compensation side

In Mastercam, the chain direction (clockwise or counterclockwise) directly controls whether the toolpath produces climb or conventional milling. When you click on geometry to start a chain, Mastercam chains in the direction determined by which side of the entity midpoint you click. For consistent results: chain outside profiles clockwise for climb milling with Left compensation, and inside profiles counterclockwise for climb milling. If the chain direction is wrong, use the Reverse button in the Chaining Manager rather than re-selecting geometry. The chain start point also matters — it defines where the lead-in begins, so place it at a non-critical location. A reversed chain with the wrong compensation direction will cut on the wrong side of the geometry, producing parts that are oversized or undersized by twice the tool radius.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:mastercam-docs
**Operations:** contouring, pocketing

## Related
- [[mastercam-cam-tips-mc-189|Compensation direction selection depends on climb vs conventional and inside vs outside cuts]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[mastercam-cam-tips-mc-172|Small tool compensation in Mastercam must account for tool runout exceeding 10% of feature size]]
- [[mastercam-cam-tips-mc-177|Micro-burr avoidance requires climb milling with sharp tools and controlled exit angles]]
- [[mastercam-cam-tips-mc-228|Stainless steel work-hardening avoidance demands consistent chip load and no dwelling]]
