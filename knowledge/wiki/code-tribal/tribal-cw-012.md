---
name: tribal-cw-012
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "afr", "fillets", "tool-selection", "corners"]
confidence: 88
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-012.md
promoted_at: 2026-06-09T22:31:15.990Z
---

# Fillet Recognition — Avoid Misclassification of Blended Internal Corners

AFR detects fillet radii on internal corners and adjusts tool selection to match or undercut the fillet radius. A common error is AFR selecting a tool with exactly the fillet radius, leaving zero clearance for tool deflection. Best practice: set a TechDB rule that selects tools with radius 0.1-0.2mm smaller than the fillet radius, then use a finishing pass with the exact-radius tool for the final blend. This prevents gouging from deflection during roughing.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:camworks-docs
**Operations:** milling, finishing

## Related
- [[camworks-cam-tips-cw-001|AFR Machinable Feature Detection — Let CAMWorks Analyze the Solid Model]]
- [[camworks-cam-tips-cw-002|Custom Feature Templates — Teach AFR to Recognize Shop-Specific Geometry]]
- [[camworks-cam-tips-cw-004|Multi-Axis Feature Recognition — Detect Features Across Index Angles]]
- [[camworks-cam-tips-cw-005|Turned Feature Recognition — Automatic Detection of Lathe Geometry]]
- [[camworks-cam-tips-cw-006|Hole Pattern Recognition — Group Identical Holes for Batch Operations]]
