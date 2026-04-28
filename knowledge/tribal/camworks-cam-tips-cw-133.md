---
id: "cw-133"
title: "VoluMill Multi-Pocket Sequencing — Minimize Non-Cutting Travel"
source: "web:camworks-docs"
confidence: 89
category: "cam_strategy"
tags: ["camworks", "volumill", "multi-pocket", "sequencing", "optimization"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.748Z
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
