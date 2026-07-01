---
name: tribal-cw-140
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "tbm", "holes", "tolerance", "boring", "reaming"]
confidence: 92
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-140.md
promoted_at: 2026-05-26T16:07:19.983Z
---

# TBM Hole Tolerance Routing — Drill vs Ream vs Bore Decision

TBM automatically routes hole operations based on tolerance: H11 or wider → drill only; H8-H10 → drill + ream; H7 or tighter → drill + bore. Positional tolerances of ±0.05mm or tighter trigger a boring cycle instead of reaming. The routing rules are configurable in the TechDB under 'Hole Tolerance Rules'. This prevents the common mistake of reaming holes that need boring (position accuracy) or boring holes that could be reamed (faster cycle time).

**Category:** cam_strategy
**Confidence:** 92
**Source:** web:camworks-docs
**Operations:** drilling, boring

## Related
- [[camworks-cam-tips-cw-061|Tolerance-Based Machining — Read PMI for Automatic Strategy Selection]]
- [[camworks-cam-tips-cw-102|Reaming — Slow Speed Precision Finishing for Tight-Tolerance Holes]]
- [[camworks-cam-tips-cw-138|TBM Reads PMI to Auto-Assign Machining Parameters]]
- [[camworks-cam-tips-cw-142|TBM Automatic Stock Allowance from Tolerance Analysis]]
- [[camworks-cam-tips-cw-006|Hole Pattern Recognition — Group Identical Holes for Batch Operations]]
