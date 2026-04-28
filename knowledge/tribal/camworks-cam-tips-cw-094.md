---
id: "cw-094"
title: "Rapid Planning — Optimize Rapid Traverse Height and Paths"
source: "web:camworks-docs"
confidence: 87
category: "cam_strategy"
tags: ["camworks", "optimization", "rapids", "clearance", "travel"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.717Z
---

# Rapid Planning — Optimize Rapid Traverse Height and Paths

Set rapid plane heights appropriately: clearance plane should be the minimum height needed to clear all clamps and part features (not the default 25mm above the top). For parts with varying heights (steps, bosses), use follow-part rapid mode that keeps the rapid height relative to the local surface rather than a fixed Z. This saves significant time on parts with large height variations — a 100mm-tall boss on a 10mm-thick plate causes 90mm of unnecessary rapid travel with fixed clearance.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:camworks-docs
**Operations:** milling

## Related
- [[camworks-cam-tips-cw-093|Air Cut Reduction — Eliminate Non-Productive Tool Travel]]
- [[camworks-cam-tips-cw-091|Feed Optimization — Post-Process Feed Rate Adjustment by Engagement]]
- [[camworks-cam-tips-cw-092|Linking Strategy — Optimize Retract and Transition Moves]]
- [[camworks-cam-tips-cw-095|Acceleration Control — Match Toolpath Density to Machine Dynamics]]
- [[camworks-cam-tips-cw-096|Smooth Flow — Arc Fitting and Linear-to-Arc Conversion]]
