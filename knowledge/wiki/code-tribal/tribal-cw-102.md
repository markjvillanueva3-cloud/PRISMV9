---
name: tribal-cw-102
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "drilling", "reaming", "precision", "tolerance"]
confidence: 89
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-102.md
promoted_at: 2026-06-09T22:31:16.009Z
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
