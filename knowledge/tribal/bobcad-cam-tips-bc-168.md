---
id: "bc-168"
title: "BobCAD Swiss-Type Gang Tooling Layout Optimization"
source: "web:bobcad-docs"
confidence: 0.85
category: "setup"
tags: ["swiss-type", "gang-tooling", "layout", "slide-travel", "cycle-time"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.588Z
---

# BobCAD Swiss-Type Gang Tooling Layout Optimization

Swiss-type machines use gang tooling where multiple tools are mounted on a single slide. BobCAD's gang tooling layout defines each tool's position relative to the slide origin. Optimize the layout to minimize slide travel between tools — group tools used in sequence adjacent to each other. Typical gang slides hold 5-8 turning tools and 3-5 live tools. BobCAD calculates the slide travel time between tools and reports it in the cycle time estimate. For high-volume production, the 0.1-0.3 second savings per tool change (vs turret machines) compounds significantly across thousands of parts.

**Category:** setup
**Confidence:** 0.85
**Source:** web:bobcad-docs
**Operations:** turning

## Related
- [[bobcad-cam-tips-bc-172|BobCAD Swiss-Type Overlapping Operations for Cycle Reduction]]
- [[esprit-cam-tips-esp-041|Swiss-Type Multi-Spindle Synchronization Reduces Cycle Time]]
- [[esprit-cam-tips-esp-044|Gang Tooling Optimization for Fast Indexing]]
- [[esprit-cam-tips-esp-132|Swiss-Type Overlapped Operations for Cycle Time Reduction]]
- [[bobcad-cam-tips-bc-167|BobCAD Swiss-Type Lathe Programming with Guide Bushing]]
