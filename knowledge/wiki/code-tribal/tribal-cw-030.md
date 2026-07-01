---
name: tribal-cw-030
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "volumill", "air-cut", "linking", "cycle-time"]
confidence: 89
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-030.md
promoted_at: 2026-06-09T22:31:15.993Z
---

# VoluMill Air Cut Reduction — Minimize Non-Cutting Travel Time

VoluMill minimizes air cutting by maintaining the tool in the material whenever possible, using smooth connecting moves instead of retract-reposition-plunge sequences. For multi-pocket parts, enable cross-pocket linking to let VoluMill traverse between pockets at cutting depth rather than retracting to clearance plane. This can save 10-30% cycle time on multi-cavity mold plates and fixture plates with numerous pocket features.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:camworks-docs
**Operations:** roughing, 2d_pocket

## Related
- [[camworks-cam-tips-cw-130|VoluMill Stock Awareness — Rest Material Tracking Between Passes]]
- [[camworks-cam-tips-cw-136|VoluMill Retract Optimization — Minimum Lift Between Passes]]
- [[camworks-cam-tips-cw-023|VoluMill High-Efficiency Roughing — Constant Engagement for Maximum MRR]]
- [[camworks-cam-tips-cw-024|VoluMill Morphing Toolpath — Smooth Transitions Between Geometric Zones]]
- [[camworks-cam-tips-cw-025|VoluMill Multi-Level Roughing — Full-Depth Helical Entry for Maximum Efficiency]]
