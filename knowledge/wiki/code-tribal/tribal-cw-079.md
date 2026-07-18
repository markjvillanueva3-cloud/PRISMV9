---
name: tribal-cw-079
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "simulation", "machine", "kinematic", "verification"]
confidence: 92
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-079.md
promoted_at: 2026-05-26T16:07:19.900Z
---

# Machine Simulation — Full Kinematic Verification Before First Part

CAMWorks machine simulation uses the full kinematic model of your CNC machine (spindle, table, rotary axes, tool changer) to verify toolpaths in the machine's actual workspace. Load the correct machine definition file matching your shop floor machine. Run simulation at 1:1 time scale for the first article of any 5-axis part — rapid-motion collisions are often invisible at fast simulation speeds. Pay special attention to tool change positions and B/C axis homing moves.

**Category:** cam_strategy
**Confidence:** 92
**Source:** web:camworks-docs
**Operations:** milling, 5_axis

## Related
- [[camworks-cam-tips-cw-084|Toolpath Verification — Step Through Individual Points for Debugging]]
- [[camworks-cam-tips-cw-185|Machine Simulation with Full Kinematic Model — Crash Prevention]]
- [[edgecam-cam-tips-ec-068|Full Machine Simulation with Kinematic Model]]
- [[worknc-cam-tips-wnc-053|Full Machine Simulation Validates Complete Programs]]
- [[camworks-cam-tips-cw-080|Collision Detection — Check Tool, Holder, and Spindle Against Part]]
