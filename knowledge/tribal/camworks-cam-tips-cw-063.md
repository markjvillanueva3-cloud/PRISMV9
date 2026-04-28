---
id: "cw-063"
title: "Turn Roughing — Optimize Stock Removal with Proper Depth of Cut Sequence"
source: "web:camworks-docs"
confidence: 90
category: "cam_strategy"
tags: ["camworks", "turning", "roughing", "depth-of-cut", "stock-removal"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.679Z
---

# Turn Roughing — Optimize Stock Removal with Proper Depth of Cut Sequence

CAMWorks turning roughing supports constant depth, variable depth, and profile-following strategies. For cylindrical stock, use constant depth of cut (typically 2-4mm per side in steel) with the roughing cycle. For near-net-shape castings or forgings, use profile-following roughing that traces the finish contour at each depth level. Set the minimum cut depth to 0.5mm — passes thinner than this cause rubbing and poor chip formation on most materials.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:camworks-docs
**Operations:** turning

## Related
- [[edgecam-cam-tips-ec-036|Turning Roughing with Optimized Pass Distribution]]
- [[fusion360-cam-tips-ext-f360-074|Turning Roughing Profile with DOC Pattern Selection]]
- [[camworks-cam-tips-cw-005|Turned Feature Recognition — Automatic Detection of Lathe Geometry]]
- [[camworks-cam-tips-cw-010|Groove Detection in Turning — Automatic Width and Depth Classification]]
- [[camworks-cam-tips-cw-023|VoluMill High-Efficiency Roughing — Constant Engagement for Maximum MRR]]
