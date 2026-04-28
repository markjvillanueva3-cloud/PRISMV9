---
id: "cw-191"
title: "Virtual Commissioning — Test NC Programs on Digital Machine Before Real Cuts"
source: "web:camworks-docs"
confidence: 84
category: "cam_strategy"
tags: ["camworks", "virtual-commissioning", "digital-twin", "gcode", "verification"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.793Z
---

# Virtual Commissioning — Test NC Programs on Digital Machine Before Real Cuts

Before running a new program on a physical CNC machine, execute it on the digital twin. The virtual machine runs the actual G-code through a simulated controller, including macro programs, work offsets, and tool tables. This catches controller-specific issues that CAM simulation misses: canned cycle parameter errors, coordinate system mistakes (G54 vs G55), and macro variable conflicts. Virtual commissioning is especially valuable for 5-axis programs and multi-axis turning centers where the cost of a crash is $10K-100K+ in spindle repairs.

**Category:** cam_strategy
**Confidence:** 84
**Source:** web:camworks-docs
**Operations:** general

## Related
- [[camworks-cam-tips-cw-187|G-Code Verification — Back-Plot and Solid Verify Differences]]
- [[camworks-cam-tips-cw-079|Machine Simulation — Full Kinematic Verification Before First Part]]
- [[camworks-cam-tips-cw-084|Toolpath Verification — Step Through Individual Points for Debugging]]
- [[camworks-cam-tips-cw-116|Tool Measurement Probing — Verify Tool Length and Diameter On-Machine]]
- [[camworks-cam-tips-cw-119|Verification Probing — Final Part Inspection On-Machine]]
