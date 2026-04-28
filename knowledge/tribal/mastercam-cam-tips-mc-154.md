---
id: "mc-154"
title: "Overlapping operations in Swiss Sync Manager maximize spindle utilization"
source: "web:mastercam-docs"
confidence: 85
category: "cam_strategy"
tags: ["mastercam", "swiss", "sync-manager", "overlapping", "cycle-time", "simultaneous"]
_source: "mastercam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.230Z
---

# Overlapping operations in Swiss Sync Manager maximize spindle utilization

The Mastercam Sync Manager visualizes and controls the timing of simultaneous operations across main spindle, sub-spindle, and gang tool streams. Operations that do not share the same axes can run simultaneously — for example, main spindle OD turning can overlap with sub-spindle back-facing if they use independent tool slides. Drag operations in the Sync Manager timeline to overlap them, then insert sync points only where physical dependencies exist (e.g., part transfer requires both spindles stopped). Maximizing overlap can reduce cycle time by 30–50% compared to sequential execution. Always verify in simulation that overlapping operations do not cause axis conflicts or collisions. The Sync Manager also generates the synchronization codes (M-codes) required by the machine control automatically.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:mastercam-docs
**Operations:** turning, swiss, optimization

## Related
- [[gibbscam-cam-tips-gc-148|Swiss-type overlap machining runs main and sub-spindle operations simultaneously]]
- [[mastercam-cam-tips-mc-049|Core Rough targets island walls specifically for reduced cycle time]]
- [[mastercam-cam-tips-mc-085|Sub-spindle transfer in Sync Manager requires precise handoff timing]]
- [[mastercam-cam-tips-mc-113|Reduce air cutting by using stock-aware toolpaths and tight containment boundaries]]
- [[mastercam-cam-tips-mc-116|Depth-first ordering reduces tool changes; breadth-first reduces setup complexity]]
