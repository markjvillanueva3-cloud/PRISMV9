---
name: tribal-f360-070
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["fusion360", "bore", "lead-to-center", "spring-pass", "h7-tolerance"]
confidence: 87
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-070.md
promoted_at: 2026-06-09T22:31:16.269Z
---

# Bore Operation Lead-to-Center for Precision Holes

In the Bore operation, enable Lead to Center in the Linking tab for holes larger than 1.5x the tool diameter. This ramps the tool to the center of the hole before beginning the helical bore motion, preventing a full-width plunge cut. For H7 tolerance bores, add a Spring Pass (set passes to 2 with 0mm offset on the final pass) to allow the tool to deflect back to its natural position, removing the material left by tool deflection on the first pass.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:fusion360-docs
**Operations:** bore

## Related
- [[fusion360-cam-tips-ext-f360-077|Single-Point Threading with Spring Passes]]
- [[fusion360-cam-tips-ext-f360-127|Threading Cycle with Spring Pass]]
- [[fusion360-cam-tips-ext-f360-153|Helical Bore Milling for Precision Holes]]
- [[fusion360-cam-tips-ext-f360-040|Fine-Tune Optimal Load by Material Hardness]]
- [[fusion360-cam-tips-ext-f360-041|Multi-Depth Adaptive with Progressive Stepdown]]
