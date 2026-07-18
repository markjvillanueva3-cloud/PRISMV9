---
name: tribal-f360-043
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["fusion360", "adaptive-clearing", "stock-to-leave", "radial", "axial"]
confidence: 89
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-043.md
promoted_at: 2026-06-09T22:31:16.262Z
---

# Separate Radial and Axial Stock-to-Leave for Adaptive

Always specify different radial and axial stock-to-leave values in Adaptive Clearing rather than using a single uniform value. Set radial stock at 0.3-0.5mm for wall finishing and axial stock at 0.15-0.25mm for floor finishing. Walls typically need more remaining material because side-cutting generates more deflection than face-cutting, and the finishing pass must remove enough to get below any work-hardened layer.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:fusion360-docs
**Operations:** 3d_adaptive, 2d_adaptive

## Related
- [[mastercam-cam-tips-mc-050|Area Rough stock-to-leave should match finishing tool radius for best results]]
- [[fusion360-cam-tips-ext-f360-040|Fine-Tune Optimal Load by Material Hardness]]
- [[fusion360-cam-tips-ext-f360-041|Multi-Depth Adaptive with Progressive Stepdown]]
- [[fusion360-cam-tips-ext-f360-042|Rest Machining Adaptive with Tight Tolerance Overlap]]
- [[fusion360-cam-tips-ext-f360-044|Control Entry Position to Avoid Thin Walls]]
