---
name: tribal-cw-014
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "techdb", "operation-mapping", "feature-mapping"]
confidence: 90
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-014.md
promoted_at: 2026-05-26T16:07:19.823Z
---

# Operation Mapping Rules — Link Feature Types to Machining Strategies

TechDB operation mapping defines which operations are generated for each feature type. For example, a blind hole maps to: center drill → pilot drill → peck drill → chamfer. Customize these mappings per material — aluminum blind holes might skip center drilling for carbide drills, while stainless steel requires it. Review default mappings and remove unnecessary operations (e.g., spring passes on roughing-only features) to reduce cycle time.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:camworks-docs
**Operations:** milling, drilling

## Related
- [[camworks-cam-tips-cw-013|TechDB Knowledge-Based Machining — Capture Best Practices for Reuse]]
- [[camworks-cam-tips-cw-015|Tool Selection Rules in TechDB — Automate Tool Choice by Feature Size]]
- [[camworks-cam-tips-cw-016|Feed/Speed Defaults — Material-Specific Cutting Data in TechDB]]
- [[camworks-cam-tips-cw-017|Strategy Templates — Save Complete Operation Plans for Part Families]]
- [[camworks-cam-tips-cw-018|Machine-Specific TechDB — Different Parameters per Machine Tool]]
