---
id: "bc-059"
title: "Part-Off with Sub-Spindle Catch for Finished Parts"
source: "web:bobcad-part-off-catch"
confidence: 88
category: "cam_strategy"
tags: ["part-off", "sub-spindle-catch", "finished-parts", "witness-marks"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.503Z
---

# Part-Off with Sub-Spindle Catch for Finished Parts

BobCAD programs part-off with sub-spindle catch to produce finished parts that don't require secondary handling. The sub-spindle grips the part before the cut-off tool completes the separation. Program the sub-spindle to advance at synchronized speed, grip at a set torque, then the cut-off completes the last 0.5mm while the sub-spindle supports the part. This prevents the part from falling into the chip conveyor and eliminates witness marks from the cut-off tool.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:bobcad-part-off-catch
**Operations:** mill_turn, parting

## Related
- [[camworks-cam-tips-cw-167|Swiss-Type Sub-Spindle Operations — Back-Working and Part-Off]]
- [[esprit-cam-tips-esp-050|Part-Off Strategy with Chip Management]]
- [[gibbscam-cam-tips-gc-046|Sub-spindle transfer requires precise sync and clamp force control]]
- [[gibbscam-cam-tips-gc-050|Part-off tool approach angle and feed rate prevent pip formation]]
- [[mastercam-cam-tips-mc-149|Sub-spindle synchronization in Mastercam enables back-side machining after part-off]]
