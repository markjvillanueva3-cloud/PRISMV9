---
name: tribal-esp-142
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["robot-machining", "external-axis", "rotary-table", "linear-track", "aerospace"]
confidence: 0
source: "web:esprit-docs"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-142.md
promoted_at: 2026-06-09T22:31:16.245Z
---

# Robot External Axis Coordination for Large Workpieces

For workpieces larger than the robot's reach, ESPRIT coordinates the robot with external axes: a rotary table (7th axis), linear track (8th axis), or both. Define external axes under Machine → Robot → External Axes with travel limits and gear ratios. ESPRIT treats the combined system as 7-8 DOF and optimizes the redundancy to maximize stiffness, avoid singularities, and minimize cycle time. For aerospace fuselage panels, mount the robot on a 10m+ linear track with the panel on a rotary positioner — ESPRIT plans the combined motion for continuous trimming.

**Category:** cam_strategy
**Confidence:** 0.8
**Source:** web:esprit-docs
**Operations:** trimming, drilling, 5axis_contouring

## Related
- [[esprit-cam-tips-esp-139|Robot Machining Path Planning with ESPRIT]]
- [[esprit-cam-tips-esp-140|Robot Machining Stiffness Compensation for Accurate Cutting]]
- [[esprit-cam-tips-esp-143|Robot Deburring with Force-Controlled End Effector]]
- [[esprit-cam-tips-esp-144|Robot Machining Calibration and TCP Accuracy]]
- [[esprit-cam-tips-esp-145|Robot Offline Programming with Virtual Teach Pendant]]
