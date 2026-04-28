---
id: "esp-071"
title: "Post-Verified Simulation vs. Toolpath Simulation"
source: "web:esprit-digital-twin"
confidence: 91
category: "cam_strategy"
tags: ["digital-twin", "post-verified", "g-code", "simulation"]
_source: "esprit-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.495Z
---

# Post-Verified Simulation vs. Toolpath Simulation

ESPRIT offers two simulation levels: toolpath simulation (fast, based on CL data) and post-verified simulation (slower, based on actual G-code output). Always use post-verified simulation for production programs — it catches post processor errors, machine-specific code issues, and controller interpretation differences that toolpath simulation misses. Post-verified simulation reads the G-code back through a virtual controller that emulates the actual machine's CNC, including canned cycle expansion and macro execution.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:esprit-digital-twin
**Operations:** simulation

## Related
- [[bobcad-cam-tips-bc-216|BobCAD Stock Model Export for Digital Twin Initialization]]
- [[camworks-cam-tips-cw-184|Digital Twin of CNC Process — Real-Time Model Synchronization]]
- [[catia-cam-tips-cat-077|Digital Twin Machining Simulation on 3DEXPERIENCE]]
- [[controller-knowledge-tips-ctrl-015|Siemens SINUMERIK ONE digital twin advantage]]
- [[esprit-cam-tips-esp-064|Full Machine Simulation with Digital Twin Validation]]
