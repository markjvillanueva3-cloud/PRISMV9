---
id: "sc2-135"
title: "SURFCAM Traditional Verify vs 2023 Machine Simulation"
source: "web:surfcam-docs"
confidence: 0.9
category: "verification"
tags: ["verify", "machine-simulation", "collision-detection", "5-axis", "kinematics"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.154Z
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
