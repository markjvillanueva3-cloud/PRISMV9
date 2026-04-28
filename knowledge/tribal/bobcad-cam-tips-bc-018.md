---
id: "bc-018"
title: "Step Milling for Multi-Level Features with Step Reduction"
source: "web:bobcad-step-reduction"
confidence: 89
category: "cam_strategy"
tags: ["step-reduction", "multi-level", "depth-redistribution", "thin-pass"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.458Z
---

# Step Milling for Multi-Level Features with Step Reduction

BobCAD V36 'Step Reduction' technology prevents thin, unproductive last passes by redistributing depth of cut evenly. When the remaining material for the last pass would be less than 30% of the programmed step-down, the system recalculates all passes to produce equal-depth cuts. This prevents the chatter, poor surface finish, and accelerated wear that occur when cutting a thin last slice. Enable Step Reduction for all multi-level 2.5D operations.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:bobcad-step-reduction
**Operations:** 2.5d_milling, roughing

## Related
- [[bobcad-cam-tips-bc-014|Slot Milling with Ramp Entry and Full-Width Control]]
- [[bobcad-cam-tips-bc-004|Multi-Level Adaptive Roughing with Automatic Step-Down]]
- [[bobcad-cam-tips-bc-020|Island Machining with Automatic Detection and Multi-Level]]
- [[camworks-cam-tips-cw-007|Pocket Recognition Depth Control — Verify Multi-Level Pocket Detection]]
- [[camworks-cam-tips-cw-025|VoluMill Multi-Level Roughing — Full-Depth Helical Entry for Maximum Efficiency]]
