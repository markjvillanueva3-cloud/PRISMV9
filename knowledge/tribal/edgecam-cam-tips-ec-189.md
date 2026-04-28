---
id: "ec-189"
title: "Simulator G-Code Verification Mode for Post Validation"
source: "web:edgecam-docs"
confidence: 0.87
category: "simulation"
tags: ["simulator", "g-code-verification", "post-validation", "nc-reader"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.414Z
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
