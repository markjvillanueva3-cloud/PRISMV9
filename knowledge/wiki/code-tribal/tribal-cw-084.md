---
name: tribal-cw-084
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "simulation", "verification", "debugging", "step-through"]
confidence: 88
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-084.md
promoted_at: 2026-06-09T22:31:16.005Z
---

# Toolpath Verification — Step Through Individual Points for Debugging

When simulation reveals a problem, use step-through mode to advance the tool point-by-point through the suspicious region. This reveals the exact toolpath point causing a collision, gouge, or unexpected motion. Check the feed rate display at each point — sudden feed spikes indicate missing arc-fit smoothing or incorrect rapid/feed transitions. For 5-axis operations, also verify the rotary axis angles at each point to ensure no sudden axis reversals that would cause surface marks.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:camworks-docs
**Operations:** milling, 5_axis

## Related
- [[camworks-cam-tips-cw-079|Machine Simulation — Full Kinematic Verification Before First Part]]
- [[camworks-cam-tips-cw-080|Collision Detection — Check Tool, Holder, and Spindle Against Part]]
- [[camworks-cam-tips-cw-081|Material Removal Simulation — Visual Stock Verification at Each Operation]]
- [[camworks-cam-tips-cw-082|Stock Comparison — Quantitative Analysis of Remaining Material]]
- [[camworks-cam-tips-cw-083|Gouge Checking — Detect Overcutting Before Shop Floor]]
