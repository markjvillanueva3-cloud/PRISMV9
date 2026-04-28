---
id: "nx-027"
title: "ISV G-Code Driven Simulation vs Internal Simulation"
source: "web:siemens-docs"
confidence: 88
category: "safety"
tags: ["nx", "isv", "simulation", "g-code", "verification"]
_source: "nx-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.515Z
---

# ISV G-Code Driven Simulation vs Internal Simulation

Always use NX ISV (Integrated Simulation and Verification) for final validation instead of basic Internal simulation. ISV runs the actual G-code through a virtual controller (Fanuc, Sinumerik, Heidenhain) and simulates the machine's interpretation of the posted output. Internal simulation only shows toolpath motion and misses post-processor errors, canned cycle issues, and controller-specific behavior.

**Category:** safety
**Confidence:** 88
**Source:** web:siemens-docs
**Operations:** simulation

## Related
- [[nx-cam-tips-nx-029|Simulating External G-Code Files in NX]]
- [[worknc-cam-tips-wnc-053|Full Machine Simulation Validates Complete Programs]]
- [[nx-cam-tips-nx-015|5-Axis Collision Avoidance with Holder Checking]]
- [[nx-cam-tips-nx-028|Machine Tool Builder for ISV Setup]]
- [[camworks-cam-tips-cw-079|Machine Simulation — Full Kinematic Verification Before First Part]]
