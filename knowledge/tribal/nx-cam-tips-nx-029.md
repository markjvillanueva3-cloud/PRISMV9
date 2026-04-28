---
id: "nx-029"
title: "Simulating External G-Code Files in NX"
source: "web:siemens-community"
confidence: 80
category: "safety"
tags: ["nx", "isv", "external-gcode", "simulation", "verification"]
_source: "nx-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.516Z
---

# Simulating External G-Code Files in NX

NX CAM can simulate any G-code file, not just code generated from NX operations. Import an externally generated NC file and run it through ISV with your machine model to check for collisions and over-travels. This is valuable when inheriting programs from other CAM systems or when hand-editing G-code for special operations.

**Category:** safety
**Confidence:** 80
**Source:** web:siemens-community
**Operations:** simulation

## Related
- [[nx-cam-tips-nx-027|ISV G-Code Driven Simulation vs Internal Simulation]]
- [[nx-cam-tips-nx-015|5-Axis Collision Avoidance with Holder Checking]]
- [[nx-cam-tips-nx-028|Machine Tool Builder for ISV Setup]]
- [[camworks-cam-tips-cw-079|Machine Simulation — Full Kinematic Verification Before First Part]]
- [[camworks-cam-tips-cw-084|Toolpath Verification — Step Through Individual Points for Debugging]]
