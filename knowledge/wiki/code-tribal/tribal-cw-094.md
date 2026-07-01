---
name: tribal-cw-094
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "optimization", "rapids", "clearance", "travel"]
confidence: 87
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-094.md
promoted_at: 2026-06-09T22:31:16.008Z
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
