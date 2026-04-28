---
id: "cw-172"
title: "Swiss-Type Chip Management — Coolant and Air Blast for Micro-Parts"
source: "web:camworks-docs"
confidence: 88
category: "cam_strategy"
tags: ["camworks", "swiss-type", "chips", "coolant", "air-blast"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.779Z
---

# Swiss-Type Chip Management — Coolant and Air Blast for Micro-Parts

Chip management on Swiss machines is critical because chips wrap around small-diameter workpieces and cause scratching or tool breakage. Program air blast between operations to clear chips from the cutting zone. Use high-pressure coolant (40-70 bar) directed at the cutting edge. For aluminum, which generates stringy chips, program chip-breaking turning cycles with interrupted cuts (G75-style pecking in OD turning). CAMWorks supports custom chip-break parameters in the turning operation settings — set break distance to 0.5-2mm for reliable chip fragmentation.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:camworks-docs
**Operations:** turning

## Related
- [[camworks-cam-tips-cw-121|Titanium Machining — Controlled Engagement with Through-Tool Coolant]]
- [[camworks-cam-tips-cw-165|Swiss-Type Lathe Programming — Guide Bushing and Bar Feeder Control]]
- [[camworks-cam-tips-cw-166|Swiss-Type Simultaneous Operations — Overlapped Milling and Turning]]
- [[camworks-cam-tips-cw-167|Swiss-Type Sub-Spindle Operations — Back-Working and Part-Off]]
- [[camworks-cam-tips-cw-168|Swiss-Type Micro-Drilling — Deep Holes in Small Diameters]]
