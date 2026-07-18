---
name: tribal-cw-003
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "ifr", "manual-features", "complex-geometry"]
confidence: 88
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-003.md
promoted_at: 2026-06-09T22:31:15.987Z
---

# Interactive Feature Definition — Manual Override for Complex Shapes

For features AFR cannot detect (blended surfaces, freeform pockets, multi-level cavities), use Interactive Feature Recognition (IFR). Select the bottom face and bounding faces to define the machinable volume. IFR is especially important for cast or forged parts where the stock shape differs significantly from the final part — AFR assumes prismatic stock and may miss features that only exist relative to a cast blank.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:camworks-docs
**Operations:** milling, 3d_roughing

## Related
- [[camworks-cam-tips-cw-002|Custom Feature Templates — Teach AFR to Recognize Shop-Specific Geometry]]
- [[camworks-cam-tips-cw-001|AFR Machinable Feature Detection — Let CAMWorks Analyze the Solid Model]]
- [[camworks-cam-tips-cw-004|Multi-Axis Feature Recognition — Detect Features Across Index Angles]]
- [[camworks-cam-tips-cw-005|Turned Feature Recognition — Automatic Detection of Lathe Geometry]]
- [[camworks-cam-tips-cw-006|Hole Pattern Recognition — Group Identical Holes for Batch Operations]]
