---
name: tribal-cat-050
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "plunge-roughing", "deep-slot", "axial-force", "stability"]
confidence: 86
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-050.md
promoted_at: 2026-06-09T22:31:16.042Z
---

# Plunge Roughing for Extreme Depth-to-Width Ratio Features

For deep narrow slots and features where the depth-to-width ratio exceeds 5:1, use CATIA plunge roughing (Z-axis drilling motion with lateral stepping). The cutting forces are directed axially into the spindle rather than radially against the tool shank, dramatically improving stability. Set the lateral step to 50-70% of tool diameter and the plunge feedrate to 50% of the normal drilling feed. Plunge roughing can be 2-3x more productive than side milling in extreme L/D situations.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:catia-docs
**Operations:** roughing

## Related
- [[catia-cam-tips-cat-091|Constant Engagement Angle Control for Stable Cutting]]
- [[catia-cam-tips-cat-150|Multi-Axis Plunge Roughing for Deep Cavities]]
- [[tebis-cam-tips-teb-022|Plunge Roughing Removes Deep Pocket Material Efficiently]]
- [[catia-cam-tips-cat-001|Pocketing Spiral vs Zigzag Tool Path Style Selection]]
- [[catia-cam-tips-cat-002|Facing Operation Overlap Percentage for Full Coverage]]
