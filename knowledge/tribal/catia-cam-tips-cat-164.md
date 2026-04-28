---
id: "cat-164"
title: "DMU Kinematic Machine Simulation for Collision Detection"
source: "web:catia-docs"
confidence: 0.88
category: "cam_strategy"
tags: ["catia", "dmu", "kinematics", "machine-simulation", "collision"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.944Z
---

# DMU Kinematic Machine Simulation for Collision Detection

CATIA DMU (Digital Mock-Up) Kinematics integrates with the machining workbench for full machine-tool simulation including spindle head, table, axes, tool changer, and enclosure. Define the machine kinematics in the 'Machine Tool Builder' workbench with accurate axis limits, joint types (revolute/prismatic), and home positions. During simulation, DMU checks collisions between: tool assembly vs fixture, spindle head vs workpiece, table vs tool changer arm, and any user-defined collision zones. Set 'Minimum Distance' to 2-5mm for near-miss detection. Export collision reports as XML for traceability in quality systems.

**Category:** cam_strategy
**Confidence:** 0.88
**Source:** web:catia-docs
**Operations:** simulation

## Related
- [[cimatron-cam-tips-cim-057|Machine Simulation with Full Kinematic Model]]
- [[powermill-cam-tips-pm-025|Machine Simulation Validates Full Kinematic Chain]]
- [[powermill-cam-tips-pm-037|Machine Tool Simulation with Full Kinematic Model]]
- [[tebis-cam-tips-teb-065|Machine Simulation with Full Kinematic Model]]
- [[catia-cam-tips-cat-051|NC Machine Simulation Requires Complete Machine Model]]
