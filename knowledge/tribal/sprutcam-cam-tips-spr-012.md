---
id: "spr-012"
title: "Machine Simulation Collision Detection Setup"
source: "web:sprutcam-tutorials"
confidence: 0.9
category: "cam_strategy"
tags: ["simulation", "collision", "machine-model", "safety"]
_source: "sprutcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.855Z
---

# Machine Simulation Collision Detection Setup

For accurate collision detection in SprutCAM's simulation: (1) import the full machine model including sheet metal covers, (2) define all clamp/fixture bodies as collision objects, (3) set 'Near Miss Distance' to 2mm for early warnings, (4) enable 'Tool Holder Check' with actual holder geometry. Run simulation at 'Detailed' mode for finishing operations — 'Fast' mode may miss close-proximity situations.

**Category:** cam_strategy
**Confidence:** 0.9
**Source:** web:sprutcam-tutorials
**Operations:** setup

## Related
- [[catia-cam-tips-cat-051|NC Machine Simulation Requires Complete Machine Model]]
- [[cimatron-cam-tips-cim-018|Simulation Verification Before Post-Processing]]
- [[solidcam-cam-tips-sc-092|Machine Simulation Setup — Import Exact Machine STL Models]]
- [[camworks-cam-tips-cw-080|Collision Detection — Check Tool, Holder, and Spindle Against Part]]
- [[camworks-cam-tips-cw-185|Machine Simulation with Full Kinematic Model — Crash Prevention]]
