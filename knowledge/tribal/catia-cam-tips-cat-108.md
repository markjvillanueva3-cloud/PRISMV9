---
id: "cat-108"
title: "Multi-Tool Rest Machining for Progressive Corner Cleanup"
source: "web:catia-docs"
confidence: 88
category: "cam_strategy"
tags: ["catia", "multi-tool-rest", "progressive", "corner-cleanup", "rest"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.885Z
---

# Multi-Tool Rest Machining for Progressive Corner Cleanup

For progressive corner cleanup in CATIA, plan a rest machining sequence with 3-4 progressively smaller tools. Rule of thumb: each tool should be 50-60% of the previous tool's diameter. Example for a part with 2mm minimum fillet: 20mm rough → 12mm semi-finish → 6mm finish → 3mm corner rest → 2mm pencil trace. Each operation references all predecessors. This progressive approach produces better surface quality than jumping directly from a large roughing tool to a small finishing tool, because each tool removes a controlled amount of stock.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:catia-docs
**Operations:** rest_machining

## Related
- [[catia-cam-tips-cat-105|Re-Machining Detects Residual Stock from Previous Operations]]
- [[catia-cam-tips-cat-107|Automatic Rest Detection Threshold Settings]]
- [[catia-cam-tips-cat-109|Corner Rest Machining With Pencil Trace Combination]]
- [[catia-cam-tips-cat-194|Die Machining Draft Angle Strategy for Progressive Dies]]
- [[surfcam-cam-tips-sc2-121|Multi-Tool Rest Chain for Progressive Refinement]]
