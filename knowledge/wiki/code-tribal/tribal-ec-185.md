---
name: tribal-ec-185
category: code-tribal
subdomain: simulation
domain: tribal-knowledge
tags: ["simulator", "kinematic-model", "machine-model", "axis-limits"]
confidence: 0
source: "web:edgecam-docs"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-185.md
promoted_at: 2026-06-09T22:31:16.205Z
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
