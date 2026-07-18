---
name: tribal-ec-186
category: code-tribal
subdomain: simulation
domain: tribal-knowledge
tags: ["simulator", "collision-zones", "atc", "safety"]
confidence: 0
source: "web:edgecam-docs"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-186.md
promoted_at: 2026-06-09T22:31:16.205Z
---

# Simulator Collision Zone Definition for ATC and Doors

Define collision zones in the simulator for components that move independently of CNC axes: automatic tool changer arm, chip conveyor, machine doors, and pallet changer mechanisms. Create simplified STL envelopes for each zone and mark them as 'collision body' in the simulator setup. Set collision priority: tool-to-part (critical), holder-to-fixture (critical), spindle-to-clamp (warning), tool-to-machine (critical). Configure different clearance values per zone type.

**Category:** simulation
**Confidence:** 0.84
**Source:** web:edgecam-docs
**Operations:** all

## Related
- [[gibbscam-cam-tips-gc-144|MTM collision zone definitions prevent crashes between turrets and chucks]]
- [[edgecam-cam-tips-ec-139|Tombstone Collision Avoidance with Fixture Definition]]
- [[edgecam-cam-tips-ec-185|Custom Machine Kinematic Model for Simulator Accuracy]]
- [[edgecam-cam-tips-ec-187|Simulator Material Removal Visualization Resolution]]
- [[edgecam-cam-tips-ec-188|Simulator Cycle Time Analysis with Axis Acceleration]]
