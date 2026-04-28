---
id: "cw-102"
title: "Reaming — Slow Speed Precision Finishing for Tight-Tolerance Holes"
source: "web:camworks-docs"
confidence: 89
category: "cam_strategy"
tags: ["camworks", "drilling", "reaming", "precision", "tolerance"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.723Z
---

# Reaming — Slow Speed Precision Finishing for Tight-Tolerance Holes

Program reaming at 50-70% of drilling surface speed with feed rate 2-3x higher than drilling feed. The reamer must follow the existing hole — never ream without a pre-drilled hole. Leave 0.1-0.2mm stock on diameter for the reamer to remove. CAMWorks sequences drill → ream automatically when TechDB detects a tolerance tighter than ±0.025mm on a hole feature. Use G85 (boring cycle with controlled retract) for reaming to prevent withdrawal marks that damage the finished surface.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:camworks-docs
**Operations:** drilling

## Related
- [[camworks-cam-tips-cw-103|Boring — Single-Point Precision for Interpolated Holes]]
- [[camworks-cam-tips-cw-140|TBM Hole Tolerance Routing — Drill vs Ream vs Bore Decision]]
- [[topsolid-cam-tips-ts-089|Reaming with Controlled Feed and Speed]]
- [[worknc-cam-tips-wnc-085|Reaming with Controlled Feed and Speed]]
- [[camworks-cam-tips-cw-006|Hole Pattern Recognition — Group Identical Holes for Batch Operations]]
