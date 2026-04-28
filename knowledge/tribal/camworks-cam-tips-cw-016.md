---
id: "cw-016"
title: "Feed/Speed Defaults — Material-Specific Cutting Data in TechDB"
source: "web:camworks-docs"
confidence: 90
category: "cam_strategy"
tags: ["camworks", "techdb", "feeds-speeds", "cutting-data", "materials"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.642Z
---

# Feed/Speed Defaults — Material-Specific Cutting Data in TechDB

Store feed and speed values per material-tool combination in TechDB. Organize by material group (ISO P/M/K/N/S/H) and tool type (HSS, carbide, ceramic, CBN). Key parameters: surface speed (Vc), feed per tooth (fz), axial depth of cut (ap), radial depth of cut (ae). For each entry, include both roughing and finishing values. Always validate TechDB speeds against tool manufacturer catalogs — defaults shipped with CAMWorks are conservative and may leave 20-40% performance on the table.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:camworks-docs
**Operations:** milling, turning

## Related
- [[camworks-cam-tips-cw-022|TechDB Material-Specific Settings — Hardness-Dependent Cutting Parameters]]
- [[camworks-cam-tips-cw-013|TechDB Knowledge-Based Machining — Capture Best Practices for Reuse]]
- [[camworks-cam-tips-cw-014|Operation Mapping Rules — Link Feature Types to Machining Strategies]]
- [[camworks-cam-tips-cw-015|Tool Selection Rules in TechDB — Automate Tool Choice by Feature Size]]
- [[camworks-cam-tips-cw-017|Strategy Templates — Save Complete Operation Plans for Part Families]]
