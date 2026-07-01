---
name: tribal-f360-090
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["fusion360", "stock-model", "operation-order", "update", "simulation"]
confidence: 86
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-090.md
promoted_at: 2026-06-09T22:31:16.274Z
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
