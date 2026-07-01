---
name: tribal-sc2-146
category: code-tribal
subdomain: verification
domain: tribal-knowledge
tags: ["collision-checking", "holder-assembly", "spindle-nose", "5-axis", "safety"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-146.md
promoted_at: 2026-06-09T22:31:16.691Z
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
