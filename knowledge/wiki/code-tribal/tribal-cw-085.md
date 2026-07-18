---
name: tribal-cw-085
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "post-processor", "customization", "g-code", "controller"]
confidence: 90
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-085.md
promoted_at: 2026-05-26T16:07:19.925Z
---

# Post Customization — Modify Output Format for Your Controller

CAMWorks posts are written in a macro-based language that maps internal toolpath data to G-code. Customize the post to match your controller's requirements: block numbering format (N10, N20 vs. N1, N2), decimal precision (3 vs. 4 places for mm), coordinate format (absolute G90 vs. incremental G91), and tool change sequence (pre-call vs. post-call coolant off). Never edit the master post file — copy it and customize the copy. Document all customizations in the post header comments.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:camworks-docs
**Operations:** milling, turning

## Related
- [[topsolid-cam-tips-ts-067|Post Processor Customization Matches Controller Requirements]]
- [[camworks-cam-tips-cw-087|Canned Cycle Output — Map Operations to Controller Drill Cycles]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
- [[catia-cam-tips-cat-070|Post-Processor Table Customization for Controller Compatibility]]
- [[cimatron-cam-tips-cim-021|Post Processor Customization for Machine Controllers]]
