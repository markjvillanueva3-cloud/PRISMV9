---
name: tribal-f360-041
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["fusion360", "adaptive-clearing", "multiple-depths", "stepdown", "roughing"]
confidence: 87
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-041.md
promoted_at: 2026-06-09T22:31:16.262Z
---

# Multi-Depth Adaptive with Progressive Stepdown

When using 3D Adaptive Clearing with Multiple Depths, set the Maximum Stepdown to 1-2x tool diameter for roughing aluminum and 0.5-1x for steel. Enable the Use Even Stepdowns option so Fusion distributes passes evenly rather than leaving a thin final slice that chatters. A thin last pass (under 0.2mm) generates poor chip formation and can cause rubbing instead of cutting.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:fusion360-docs
**Operations:** 3d_adaptive

## Related
- [[fusion360-cam-tips-ext-f360-040|Fine-Tune Optimal Load by Material Hardness]]
- [[fusion360-cam-tips-ext-f360-042|Rest Machining Adaptive with Tight Tolerance Overlap]]
- [[fusion360-cam-tips-ext-f360-043|Separate Radial and Axial Stock-to-Leave for Adaptive]]
- [[fusion360-cam-tips-ext-f360-044|Control Entry Position to Avoid Thin Walls]]
- [[fusion360-cam-tips-ext-f360-045|Chip Load vs DOC Relationship in Adaptive Clearing]]
