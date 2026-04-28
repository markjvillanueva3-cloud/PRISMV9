---
id: "mc-085"
title: "Sub-spindle transfer in Sync Manager requires precise handoff timing"
source: "web:mastercam-docs"
confidence: 87
category: "safety"
tags: ["mastercam", "sub-spindle", "sync-manager", "handoff", "pickoff", "mill-turn"]
_source: "mastercam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.175Z
---

# Sub-spindle transfer in Sync Manager requires precise handoff timing

Mastercam Mill-Turn Sync Manager coordinates the handoff of a partially machined part from the main spindle to the sub-spindle. Use the built-in Pickoff operation which sequences: sub-spindle advance, collet close, main spindle collet open, sub-spindle retract, and cutoff. The synchronization between spindles must be exact — set sync points before and after the handoff to prevent collisions. Always run Machine Simulation of the transfer sequence; a timing error during handoff is the most common mill-turn crash scenario.

**Category:** safety
**Confidence:** 87
**Source:** web:mastercam-docs
**Operations:** turning, mill_turn

## Related
- [[mastercam-cam-tips-mc-083|C-axis milling on lathes requires accurate spindle orient and live tool offset]]
- [[mastercam-cam-tips-mc-084|Y-axis operations enable off-center milling for complex turned parts]]
- [[mastercam-cam-tips-mc-149|Sub-spindle synchronization in Mastercam enables back-side machining after part-off]]
- [[mastercam-cam-tips-mc-154|Overlapping operations in Swiss Sync Manager maximize spindle utilization]]
- [[mastercam-cam-tips-mc-253|Mastercam 2025 B-axis contour turning enables complex profile turning with live tooling on mill-turn]]
