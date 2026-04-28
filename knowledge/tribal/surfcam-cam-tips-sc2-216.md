---
id: "sc2-216"
title: "SURFCAM Fixture Modeling for Collision Avoidance Simulation"
source: "web:surfcam-docs"
confidence: 0.86
category: "verification"
tags: ["fixture-modeling", "collision-avoidance", "stl", "simulation", "safety"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.217Z
---

# SURFCAM Fixture Modeling for Collision Avoidance Simulation

Model fixtures as STL files and import them into SURFCAM's machine simulation environment. Position the fixture model relative to the machine table using the same WCS origin as the machining program. Include vise jaws, clamps, parallels, and any protrusions that could interfere with the tool or spindle. Set collision clearance to 2-5mm to account for fixture tolerance and machine positioning error. For tombstone/pallet fixtures, create a master fixture model and instance it for each face. Update fixture models when physical fixtures are modified — out-of-date fixture models cause missed collisions.

**Category:** verification
**Confidence:** 0.86
**Source:** web:surfcam-docs
**Operations:** roughing, finishing, drilling

## Related
- [[controller-knowledge-tips-ctrl-083|TNC 640 Dynamic Collision Monitoring (DCM)]]
- [[controller-knowledge-tips-ctrl-096|Okuma Collision Avoidance System (CAS) — real-time 3D protection]]
- [[esprit-cam-tips-esp-138|Swiss-Type Collision Avoidance with Multi-Turret Simulation]]
- [[nx-cam-tips-nx-015|5-Axis Collision Avoidance with Holder Checking]]
- [[surfcam-cam-tips-sc2-042|Collision Avoidance with Holder and Spindle Clearance]]
