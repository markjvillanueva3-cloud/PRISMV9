---
id: "cw-187"
title: "G-Code Verification — Back-Plot and Solid Verify Differences"
source: "web:camworks-docs"
confidence: 91
category: "cam_strategy"
tags: ["camworks", "verification", "backplot", "solid-verify", "gcode"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.790Z
---

# G-Code Verification — Back-Plot and Solid Verify Differences

CAMWorks offers two verification levels: Back-Plot (wireframe toolpath replay — fast, shows path geometry and rapid/feed distinction) and Solid Verify (material removal simulation — slower, shows actual stock shape). Use Back-Plot for quick path review and Solid Verify for final verification before posting. Solid Verify catches errors that Back-Plot misses: thin walls left by toolpath gaps, insufficient stock for finishing, and interference between operations. Always run Solid Verify on new programs — it catches 15-25% more issues than Back-Plot alone.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:camworks-docs
**Operations:** general

## Related
- [[camworks-cam-tips-cw-191|Virtual Commissioning — Test NC Programs on Digital Machine Before Real Cuts]]
- [[camworks-cam-tips-cw-079|Machine Simulation — Full Kinematic Verification Before First Part]]
- [[camworks-cam-tips-cw-084|Toolpath Verification — Step Through Individual Points for Debugging]]
- [[camworks-cam-tips-cw-116|Tool Measurement Probing — Verify Tool Length and Diameter On-Machine]]
- [[camworks-cam-tips-cw-119|Verification Probing — Final Part Inspection On-Machine]]
