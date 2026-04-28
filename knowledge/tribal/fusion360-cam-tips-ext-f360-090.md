---
id: "f360-090"
title: "Stock Model Updates Between Operations"
source: "web:fusion360-docs"
confidence: 86
category: "cam_strategy"
tags: ["fusion360", "stock-model", "operation-order", "update", "simulation"]
_source: "fusion360-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:42.698Z
---

# Stock Model Updates Between Operations

Fusion automatically updates the in-process stock model between operations, but only if operations are in the correct order in the browser tree. If you reorder operations after generating toolpaths, right-click and select Update Stock to recalculate the remaining material. Failing to update stock after reordering can cause the simulator to show false collisions (tool hitting stock that was already removed) or miss real ones (tool missing stock that should still be there).

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:fusion360-docs
**Operations:** simulation

## Related
- [[fusion360-cam-tips-ext-f360-081|Machine Configuration Ties Post to Kinematic Model]]
- [[fusion360-cam-tips-ext-f360-086|In-App Simulation Resolution for Detecting Small Gouges]]
- [[fusion360-cam-tips-ext-f360-130|Turning Face Operation Stock Recognition]]
- [[fusion360-cam-tips-ext-f360-159|Simulation Speed Control for Collision Investigation]]
- [[fusion360-cam-tips-ext-f360-160|Cycle Time Estimation from Simulation]]
