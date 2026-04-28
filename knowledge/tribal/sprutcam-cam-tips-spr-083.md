---
id: "spr-083"
title: "Robot Positioner (Rotary Table) Integration"
source: "web:sprutcam-tutorials"
confidence: 0.8
category: "cam_strategy"
tags: ["positioner", "rotary-table", "robot", "7-axis"]
_source: "sprutcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.942Z
---

# Robot Positioner (Rotary Table) Integration

SprutCAM Robot supports external rotary positioners (1 or 2 axis) for part orientation. Define the positioner kinematics and link to the robot program. The positioner indexes between operations to present different part faces to the robot. Synchronize positioner moves with robot safe positions. This effectively creates a 7-8 axis system. Verify reachability at each positioner angle in simulation.

**Category:** cam_strategy
**Confidence:** 0.8
**Source:** web:sprutcam-tutorials
**Operations:** specialty

## Related
- [[esprit-cam-tips-esp-142|Robot External Axis Coordination for Large Workpieces]]
- [[powermill-cam-tips-pm-053|PowerMill Robot for 6-Axis Robotic Machining]]
- [[powermill-cam-tips-pm-146|Robot Polishing with Force Control]]
- [[powermill-cam-tips-pm-178|Robot Force-Controlled Grinding]]
- [[powermill-cam-tips-pm-179|Robot Drilling for Large Structures]]
