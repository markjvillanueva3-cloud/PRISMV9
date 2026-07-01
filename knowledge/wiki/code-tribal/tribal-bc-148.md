---
name: tribal-bc-148
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["mill-turn", "synchronization", "timeline", "gantt", "concurrent"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-148.md
promoted_at: 2026-06-09T22:31:15.968Z
---

# BobCAD Mill-Turn Synchronization Timeline for Overlapping Operations

BobCAD's Synchronization Timeline displays all operations on a Gantt-chart-like view, showing which operations run concurrently on different channels. Drag operations to overlap: main spindle OD turning concurrent with sub-spindle back-facing. Add sync points where operations must wait for each other (e.g., sub-spindle must wait for main spindle roughing before transfer). The timeline calculates total cycle time accounting for overlaps — typically 25-40% shorter than sequential execution. Color-coded channels show utilization: green = cutting, yellow = positioning, red = waiting.

**Category:** setup
**Confidence:** 0.87
**Source:** web:bobcad-docs
**Operations:** turning, milling

## Related
- [[bobcad-cam-tips-bc-145|BobCAD Mill-Turn Dual-Spindle Part Transfer Programming]]
- [[controller-knowledge-tips-ctrl-076|Multi-Channel Programming and Channel Synchronization]]
- [[edgecam-cam-tips-ec-145|Code Wizard Multi-Channel Output for Mill-Turn]]
- [[esprit-cam-tips-esp-146|Mill-Turn Balanced Roughing with Dual Turrets]]
- [[esprit-cam-tips-esp-147|Mill-Turn Pinch Turning for Slender Shafts]]
