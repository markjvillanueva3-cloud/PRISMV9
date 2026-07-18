---
name: tribal-ts-065
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["kinematics", "axis-limits", "singularity", "validation"]
confidence: 92
source: "web:topsolid-kinematics"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-065.md
promoted_at: 2026-05-26T16:07:20.770Z
---

# Machine Kinematics Validation Prevents Axis Limit Violations

TopSolid validates all axis positions against the machine's kinematic model during simulation, detecting: axis travel limits exceeded, rotary axis wrap-around issues, singularity positions (e.g., B=0 on trunnion machines), and acceleration/jerk violations. For trunnion-style machines, watch for the A-axis passing through 0° where a 360° B-axis rotation may be required. Set the 'axis limit warning zone' to 5° or 5 mm from the physical limits to provide a safety margin.

**Category:** cam_strategy
**Confidence:** 92
**Source:** web:topsolid-kinematics
**Operations:** 5_axis

## Related
- [[surfcam-cam-tips-sc2-068|Machine Simulation with Full Kinematic Model]]
- [[surfcam-cam-tips-sc2-219|SURFCAM Simulation Axis Limit Checking for 5-Axis Programs]]
- [[catia-cam-tips-cat-164|DMU Kinematic Machine Simulation for Collision Detection]]
- [[cimatron-cam-tips-cim-057|Machine Simulation with Full Kinematic Model]]
- [[esprit-cam-tips-esp-141|Hexapod Machine Tool Programming in ESPRIT]]
