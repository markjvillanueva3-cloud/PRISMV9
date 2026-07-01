---
name: tribal-ec-130
category: code-tribal
subdomain: automation
domain: tribal-knowledge
tags: ["afr", "exclusion-zones", "non-machinable", "optimization"]
confidence: 0
source: "web:edgecam-forum"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-130.md
promoted_at: 2026-06-09T22:31:16.191Z
---

# AFR Exclusion Zones for Non-Machinable Features

Mark regions as AFR exclusion zones to prevent feature recognition on surfaces that should not be machined (cast-in features, reference datums, pre-machined surfaces from prior setups). Select faces and assign them to the 'Do Not Machine' layer. This reduces AFR processing time on complex parts by 30-50% and prevents erroneous toolpath generation on surfaces that are already at final dimension.

**Category:** automation
**Confidence:** 0.81
**Source:** web:edgecam-forum
**Operations:** all

## Related
- [[bobcad-cam-tips-bc-131|BobCAD V37 Automatic Feature Recognition for Hole Patterns]]
- [[camworks-cam-tips-cw-001|AFR Machinable Feature Detection — Let CAMWorks Analyze the Solid Model]]
- [[camworks-cam-tips-cw-002|Custom Feature Templates — Teach AFR to Recognize Shop-Specific Geometry]]
- [[camworks-cam-tips-cw-004|Multi-Axis Feature Recognition — Detect Features Across Index Angles]]
- [[camworks-cam-tips-cw-005|Turned Feature Recognition — Automatic Detection of Lathe Geometry]]
