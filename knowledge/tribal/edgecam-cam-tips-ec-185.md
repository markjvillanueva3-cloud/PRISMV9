---
id: "ec-185"
title: "Custom Machine Kinematic Model for Simulator Accuracy"
source: "web:edgecam-docs"
confidence: 0.85
category: "simulation"
tags: ["simulator", "kinematic-model", "machine-model", "axis-limits"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.410Z
---

# Custom Machine Kinematic Model for Simulator Accuracy

Build accurate machine kinematic models in Edgecam Simulator by defining each axis's travel limits, home positions, and joint hierarchy. Import 3D models (STL/Parasolid) for each machine component: base, column, spindle head, table, rotary axes, tailstock, turret. Assign components to their parent axis in the kinematic tree. Define tool change position, clearance height, and fixture reference point. Verify by homing all axes and checking that the model matches the physical machine's home position.

**Category:** simulation
**Confidence:** 0.85
**Source:** web:edgecam-docs
**Operations:** all

## Related
- [[fusion360-cam-tips-ext-f360-156|Machine Simulation Setup with Kinematic Model]]
- [[edgecam-cam-tips-ec-139|Tombstone Collision Avoidance with Fixture Definition]]
- [[edgecam-cam-tips-ec-186|Simulator Collision Zone Definition for ATC and Doors]]
- [[edgecam-cam-tips-ec-187|Simulator Material Removal Visualization Resolution]]
- [[edgecam-cam-tips-ec-188|Simulator Cycle Time Analysis with Axis Acceleration]]
