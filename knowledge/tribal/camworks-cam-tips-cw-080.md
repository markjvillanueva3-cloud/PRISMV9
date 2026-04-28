---
id: "cw-080"
title: "Collision Detection — Check Tool, Holder, and Spindle Against Part"
source: "web:camworks-docs"
confidence: 91
category: "cam_strategy"
tags: ["camworks", "simulation", "collision", "holder", "spindle"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.706Z
---

# Collision Detection — Check Tool, Holder, and Spindle Against Part

Enable collision detection for tool body, holder, and spindle nose. A common mistake is checking only the cutting tool and missing a holder collision on a deep pocket. Define your tool assemblies with accurate holder geometry — generic cylindrical holders in the tool library may not represent actual holder profiles (e.g., ER collet holders have wider grip sections than the shank). Update tool assemblies to match physical tools for reliable collision detection.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:camworks-docs
**Operations:** milling, 5_axis

## Related
- [[camworks-cam-tips-cw-185|Machine Simulation with Full Kinematic Model — Crash Prevention]]
- [[worknc-cam-tips-wnc-124|Auto5 Collision Body Definition — Tool, Holder, and Spindle]]
- [[camworks-cam-tips-cw-053|5-Axis Collision Avoidance — Automatic Tool Tilting Around Obstacles]]
- [[camworks-cam-tips-cw-079|Machine Simulation — Full Kinematic Verification Before First Part]]
- [[camworks-cam-tips-cw-081|Material Removal Simulation — Visual Stock Verification at Each Operation]]
