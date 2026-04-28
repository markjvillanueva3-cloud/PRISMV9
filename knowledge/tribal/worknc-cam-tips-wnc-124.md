---
id: "wnc-124"
title: "Auto5 Collision Body Definition — Tool, Holder, and Spindle"
source: "web:worknc-docs"
confidence: 91
category: "cam_strategy"
tags: ["auto-5", "collision", "holder", "spindle", "clearance"]
_source: "worknc-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.717Z
---

# Auto5 Collision Body Definition — Tool, Holder, and Spindle

Auto5 checks collisions against the complete tool assembly: cutting tool, holder, collet/chuck, and spindle nose. Define each component with accurate dimensions in the tool library. The most common collision during Auto5 conversion is between the holder and part walls — not the cutter itself. Set a safety clearance margin (1-3mm) between collision bodies and the part to account for machine positioning accuracy. For deep cavities, use ER collet holders instead of hydraulic chucks — the smaller profile provides 5-10mm more clearance.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:worknc-docs
**Operations:** 5_axis

## Related
- [[camworks-cam-tips-cw-080|Collision Detection — Check Tool, Holder, and Spindle Against Part]]
- [[topsolid-cam-tips-ts-062|Collision Detection Covers Full Tool Assembly]]
- [[catia-cam-tips-cat-059|Tool Holder Definition Enables Accurate Collision Checking]]
- [[cimatron-cam-tips-cim-010|Tool Assembly Collision Checking]]
- [[cimatron-cam-tips-cim-093|Collision Checking with Complete Tool Assembly]]
