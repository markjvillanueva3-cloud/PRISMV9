---
id: "ts-062"
title: "Collision Detection Covers Full Tool Assembly"
source: "web:topsolid-collision-detect"
confidence: 93
category: "cam_strategy"
tags: ["collision", "tool-assembly", "holder", "clearance"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.433Z
---

# Collision Detection Covers Full Tool Assembly

TopSolid's collision detection checks the complete tool assembly including the cutter, holder, collet/chuck, spindle nose, and any extension adapters. Define tool assemblies in the tool library with accurate 3D models of each component. The system reports collision severity: 'interference' (overlap with workpiece/fixture), 'near-miss' (within clearance threshold), and 'machine limit' (axis travel exceeded). Set the near-miss threshold to 2 mm for initial checks and 0.5 mm for final verification.

**Category:** cam_strategy
**Confidence:** 93
**Source:** web:topsolid-collision-detect
**Operations:** general

## Related
- [[cimatron-cam-tips-cim-010|Tool Assembly Collision Checking]]
- [[topsolid-cam-tips-ts-126|TopSolid'Cam 7 Tool Assembly Builder — 3D Tool and Holder Stacks]]
- [[worknc-cam-tips-wnc-054|Collision Detection Covers Full Tool Assembly]]
- [[worknc-cam-tips-wnc-124|Auto5 Collision Body Definition — Tool, Holder, and Spindle]]
- [[camworks-cam-tips-cw-080|Collision Detection — Check Tool, Holder, and Spindle Against Part]]
