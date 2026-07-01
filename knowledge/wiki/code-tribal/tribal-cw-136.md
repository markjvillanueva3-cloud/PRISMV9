---
name: tribal-cw-136
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "volumill", "retract", "clearance", "cycle-time"]
confidence: 88
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-136.md
promoted_at: 2026-06-09T22:31:16.015Z
---

# VoluMill Retract Optimization — Minimum Lift Between Passes

VoluMill minimizes retract heights between passes to reduce non-cutting time. In CAMWorks, the 'Clearance' parameter controls the retract distance above the stock. Set it to the minimum safe value (typically 1-3mm above the actual stock surface, not the bounding box). For operations with updated stock models, VoluMill retracts just above the actual remaining material rather than the original stock top. This saves significant time on deep-pocket parts where the traditional retract-to-clearance adds seconds per pass.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:camworks-docs
**Operations:** milling, roughing

## Related
- [[camworks-cam-tips-cw-030|VoluMill Air Cut Reduction — Minimize Non-Cutting Travel Time]]
- [[camworks-cam-tips-cw-130|VoluMill Stock Awareness — Rest Material Tracking Between Passes]]
- [[camworks-cam-tips-cw-023|VoluMill High-Efficiency Roughing — Constant Engagement for Maximum MRR]]
- [[camworks-cam-tips-cw-024|VoluMill Morphing Toolpath — Smooth Transitions Between Geometric Zones]]
- [[camworks-cam-tips-cw-025|VoluMill Multi-Level Roughing — Full-Depth Helical Entry for Maximum Efficiency]]
