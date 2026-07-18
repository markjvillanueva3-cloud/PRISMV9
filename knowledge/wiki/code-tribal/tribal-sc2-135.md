---
name: tribal-sc2-135
category: code-tribal
subdomain: verification
domain: tribal-knowledge
tags: ["verify", "machine-simulation", "collision-detection", "5-axis", "kinematics"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-135.md
promoted_at: 2026-06-09T22:31:16.689Z
---

# SURFCAM Traditional Verify vs 2023 Machine Simulation

SURFCAM Traditional's Verify module provides basic material-removal simulation with gouge detection. SURFCAM 2023 adds full machine simulation with kinematic models of specific CNC machines, including head/table collisions, axis limits, and rotary axis motion. Always run machine simulation for 5-axis programs — Verify alone cannot detect head-to-fixture collisions. Import your machine's kinematic model from Hexagon's library or build a custom one using the Machine Configuration tool.

**Category:** verification
**Confidence:** 0.9
**Source:** web:surfcam-docs
**Operations:** 5_axis, 3_axis

## Related
- [[cimatron-cam-tips-cim-057|Machine Simulation with Full Kinematic Model]]
- [[fusion360-cam-tips-f360-024|Machine Simulation with Full Kinematic Model]]
- [[powermill-cam-tips-pm-025|Machine Simulation Validates Full Kinematic Chain]]
- [[powermill-cam-tips-pm-037|Machine Tool Simulation with Full Kinematic Model]]
- [[mastercam-cam-tips-mc-092|Machine Simulation detects axis over-travel that Verify completely misses]]
