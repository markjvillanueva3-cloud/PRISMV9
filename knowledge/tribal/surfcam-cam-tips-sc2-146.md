---
id: "sc2-146"
title: "SURFCAM Multi-Axis Collision Checking with Holder Assembly"
source: "web:surfcam-docs"
confidence: 0.91
category: "verification"
tags: ["collision-checking", "holder-assembly", "spindle-nose", "5-axis", "safety"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.163Z
---

# SURFCAM Multi-Axis Collision Checking with Holder Assembly

SURFCAM's multi-axis collision checker validates the entire tool assembly (cutter, holder, spindle nose) against the part, fixture, and machine structure at every toolpath point. Define the complete holder assembly with accurate dimensions — a missing holder definition means collisions go undetected. For tapered holders (CAT/BT/HSK), model the full taper profile including the retention knob. Set collision check resolution to 0.5mm for finishing and 2mm for roughing to balance accuracy against computation time.

**Category:** verification
**Confidence:** 0.91
**Source:** web:surfcam-docs
**Operations:** 5_axis

## Related
- [[camworks-cam-tips-cw-053|5-Axis Collision Avoidance — Automatic Tool Tilting Around Obstacles]]
- [[powermill-cam-tips-pm-025|Machine Simulation Validates Full Kinematic Chain]]
- [[surfcam-cam-tips-sc2-042|Collision Avoidance with Holder and Spindle Clearance]]
- [[topsolid-cam-tips-ts-041|5-Axis Collision Avoidance with Automatic Tool Tilting]]
- [[fusion360-cam-tips-ext-f360-114|Setup from Manufacturing Model with Fixture Bodies]]
