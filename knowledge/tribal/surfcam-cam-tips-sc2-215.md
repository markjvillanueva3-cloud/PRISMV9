---
id: "sc2-215"
title: "SURFCAM Machine Simulation Kinematic Chain Setup"
source: "web:surfcam-docs"
confidence: 0.87
category: "verification"
tags: ["machine-simulation", "kinematic-chain", "axis-definition", "collision", "5-axis"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.216Z
---

# SURFCAM Machine Simulation Kinematic Chain Setup

SURFCAM machine simulation requires a kinematic chain definition that describes the physical axis relationships. For a typical VMC: World→Column(Y)→Spindle(Z)→Tool, World→Table(X)→Part. For a 5-axis with trunnion: World→Column(Y)→Spindle(Z)→Tool, World→Table(X)→Trunnion(A)→Rotary(C)→Part. Define each axis with its travel limits, home position, and direction vector. Import machine component STL files for visual representation. Incorrect kinematic chains produce false collision warnings or miss real collisions — verify by jogging each axis individually in simulation.

**Category:** verification
**Confidence:** 0.87
**Source:** web:surfcam-docs
**Operations:** 5_axis, 3_axis

## Related
- [[cimatron-cam-tips-cim-057|Machine Simulation with Full Kinematic Model]]
- [[powermill-cam-tips-pm-025|Machine Simulation Validates Full Kinematic Chain]]
- [[powermill-cam-tips-pm-037|Machine Tool Simulation with Full Kinematic Model]]
- [[catia-cam-tips-cat-164|DMU Kinematic Machine Simulation for Collision Detection]]
- [[mastercam-cam-tips-mc-092|Machine Simulation detects axis over-travel that Verify completely misses]]
