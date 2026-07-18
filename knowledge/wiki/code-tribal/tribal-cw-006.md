---
name: tribal-cw-006
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "afr", "holes", "pattern-recognition", "drilling"]
confidence: 91
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-006.md
promoted_at: 2026-05-26T16:07:19.819Z
---

# Hole Pattern Recognition — Group Identical Holes for Batch Operations

AFR groups identical holes (same diameter, depth, and type) into patterns automatically. Verify pattern grouping in the feature tree — sometimes chamfered vs. non-chamfered holes get split into separate groups unnecessarily. Manually merge groups when the chamfer is handled by a separate countersink operation. Pattern recognition enables single-operation programming for dozens of identical holes, dramatically reducing toolpath count.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:camworks-docs
**Operations:** drilling

## Related
- [[camworks-cam-tips-cw-001|AFR Machinable Feature Detection — Let CAMWorks Analyze the Solid Model]]
- [[camworks-cam-tips-cw-002|Custom Feature Templates — Teach AFR to Recognize Shop-Specific Geometry]]
- [[camworks-cam-tips-cw-004|Multi-Axis Feature Recognition — Detect Features Across Index Angles]]
- [[camworks-cam-tips-cw-005|Turned Feature Recognition — Automatic Detection of Lathe Geometry]]
- [[camworks-cam-tips-cw-007|Pocket Recognition Depth Control — Verify Multi-Level Pocket Detection]]
