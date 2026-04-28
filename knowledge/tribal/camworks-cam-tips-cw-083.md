---
id: "cw-083"
title: "Gouge Checking — Detect Overcutting Before Shop Floor"
source: "web:camworks-docs"
confidence: 91
category: "cam_strategy"
tags: ["camworks", "simulation", "gouge", "overcutting", "quality"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.708Z
---

# Gouge Checking — Detect Overcutting Before Shop Floor

Run gouge checking on all finishing operations before posting. Gouges occur when the tool cuts below the target surface — causes include: tool radius smaller than surface curvature (concavity gouge), holder interference tilting the tool, or incorrect tool length offset. CAMWorks gouge checking analyzes every toolpath point against the target surface. Set gouge tolerance to 50% of part tolerance — a 0.01mm tolerance part should flag gouges > 0.005mm for investigation.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:camworks-docs
**Operations:** milling, 3d_finishing

## Related
- [[camworks-cam-tips-cw-082|Stock Comparison — Quantitative Analysis of Remaining Material]]
- [[camworks-cam-tips-cw-079|Machine Simulation — Full Kinematic Verification Before First Part]]
- [[camworks-cam-tips-cw-080|Collision Detection — Check Tool, Holder, and Spindle Against Part]]
- [[camworks-cam-tips-cw-081|Material Removal Simulation — Visual Stock Verification at Each Operation]]
- [[camworks-cam-tips-cw-084|Toolpath Verification — Step Through Individual Points for Debugging]]
