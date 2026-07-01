---
name: tribal-sc2-219
category: code-tribal
subdomain: verification
domain: tribal-knowledge
tags: ["axis-limits", "5-axis", "rotary-travel", "simulation", "singularity"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-219.md
promoted_at: 2026-06-09T22:31:16.707Z
---

# SURFCAM Simulation Axis Limit Checking for 5-Axis Programs

SURFCAM machine simulation verifies that all axis positions remain within the machine's physical travel limits. For 5-axis programs, rotary axis limits are critical — the A-axis on a trunnion typically has ±120° range, and B-axis ±110°. The simulation checks every toolpath point and flags positions where any axis exceeds its limit. When a limit is hit, solutions include: reorienting the part setup, splitting the operation at the singularity point, or using an alternative rotary axis solution (CW vs CCW approach). Enable 'axis limit near-miss' warnings at 95% of travel.

**Category:** verification
**Confidence:** 0.88
**Source:** web:surfcam-docs
**Operations:** 5_axis

## Related
- [[mastercam-cam-tips-mc-299|Mastercam machine definition accuracy settings must match actual machine capability for reliable simulation]]
- [[surfcam-cam-tips-sc2-068|Machine Simulation with Full Kinematic Model]]
- [[topsolid-cam-tips-ts-065|Machine Kinematics Validation Prevents Axis Limit Violations]]
- [[edgecam-cam-tips-ec-034|5-Axis Smooth Rotary Motion Limits]]
- [[esprit-cam-tips-esp-038|5-Axis Simultaneous with Smooth Axis Motion]]
