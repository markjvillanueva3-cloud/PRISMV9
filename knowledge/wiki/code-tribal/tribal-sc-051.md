---
name: tribal-sc-051
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["solidcam", "imachining-3d", "morphing", "z-transition", "cycle-time"]
confidence: 87
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-051.md
promoted_at: 2026-06-09T22:31:16.583Z
---

# iMachining 3D Morphing Between Levels — Smooth Transitions on Complex Geometry

Enable Morphing Between Levels in iMachining 3D to create smooth Z-transitions between step-down depths. Without morphing, the tool retracts to clearance height between each Z-level, adding 5-15% cycle time on deep parts. Morphing creates a continuous helical descent that maintains tool engagement, but disable it when machining near thin floors (< 2mm) where the transition forces could deflect the workpiece.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:solidcam-docs
**Operations:** 3d_roughing

## Related
- [[solidcam-cam-tips-sc-143-2|Monte Carlo Cycle Time Estimation]]
- [[solidcam-cam-tips-sc-149-2|Thermal Compensation for Long Operations]]
- [[solidcam-cam-tips-sc-170-2|iMachining Material Level Calibration]]
- [[solidcam-cam-tips-sc-171-2|iMachining 2D vs 3D Strategy Selection]]
- [[solidcam-cam-tips-sc-050|iMachining 3D Rest Material — Use Previous Tool Reference for Accuracy]]
