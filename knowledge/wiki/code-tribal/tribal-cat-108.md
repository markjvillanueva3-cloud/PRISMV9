---
name: tribal-cat-108
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "multi-tool-rest", "progressive", "corner-cleanup", "rest"]
confidence: 88
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-108.md
promoted_at: 2026-06-09T22:31:16.055Z
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
