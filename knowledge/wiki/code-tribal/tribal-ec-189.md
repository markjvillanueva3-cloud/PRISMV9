---
name: tribal-ec-189
category: code-tribal
subdomain: simulation
domain: tribal-knowledge
tags: ["simulator", "g-code-verification", "post-validation", "nc-reader"]
confidence: 0
source: "web:edgecam-docs"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-189.md
promoted_at: 2026-06-09T22:31:16.205Z
---

# Simulator G-Code Verification Mode for Post Validation

Use the simulator's G-code verification mode to validate posted NC code directly (not just the internal toolpath). Import the generated G-code file into the simulator's NC reader. The simulator interprets the G-code exactly as the CNC controller would, catching post processor errors: wrong axis assignments, missing decimal points, incorrect arc formats (IJK vs R), and coordinate system issues. This second-level verification catches errors that toolpath-level simulation misses.

**Category:** simulation
**Confidence:** 0.87
**Source:** web:edgecam-docs
**Operations:** all

## Related
- [[edgecam-cam-tips-ec-139|Tombstone Collision Avoidance with Fixture Definition]]
- [[edgecam-cam-tips-ec-185|Custom Machine Kinematic Model for Simulator Accuracy]]
- [[edgecam-cam-tips-ec-186|Simulator Collision Zone Definition for ATC and Doors]]
- [[edgecam-cam-tips-ec-187|Simulator Material Removal Visualization Resolution]]
- [[edgecam-cam-tips-ec-188|Simulator Cycle Time Analysis with Axis Acceleration]]
