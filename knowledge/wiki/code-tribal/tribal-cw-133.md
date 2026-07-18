---
name: tribal-cw-133
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "volumill", "multi-pocket", "sequencing", "optimization"]
confidence: 89
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-133.md
promoted_at: 2026-06-09T22:31:16.015Z
---

# VoluMill Multi-Pocket Sequencing — Minimize Non-Cutting Travel

When roughing parts with multiple pockets, VoluMill's sequencing algorithm optimizes the order of pocket machining to minimize rapid traverse distance. In CAMWorks, use 'Optimize Pocket Order' to let VoluMill calculate the shortest-path sequence. For parts with 10+ pockets, this can save 5-15% of total cycle time. The algorithm also considers which pockets share walls — adjacent pockets are machined sequentially to avoid re-entry moves across already-machined regions.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:camworks-docs
**Operations:** milling, roughing

## Related
- [[camworks-cam-tips-cw-023|VoluMill High-Efficiency Roughing — Constant Engagement for Maximum MRR]]
- [[camworks-cam-tips-cw-024|VoluMill Morphing Toolpath — Smooth Transitions Between Geometric Zones]]
- [[camworks-cam-tips-cw-025|VoluMill Multi-Level Roughing — Full-Depth Helical Entry for Maximum Efficiency]]
- [[camworks-cam-tips-cw-026|Rest from VoluMill — Chain Multiple Tool Sizes for Complete Roughing]]
- [[camworks-cam-tips-cw-027|VoluMill Chip Thinning Compensation — Correct Feed for Radial Engagement]]
