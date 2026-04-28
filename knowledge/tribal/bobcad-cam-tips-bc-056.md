---
id: "bc-056"
title: "Sub-Spindle Transfer for Complete Part Machining"
source: "web:bobcad-sub-spindle"
confidence: 89
category: "cam_strategy"
tags: ["sub-spindle", "transfer", "back-end", "synchronization"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.501Z
---

# Sub-Spindle Transfer for Complete Part Machining

BobCAD sub-spindle programming handles part transfer from main spindle to sub-spindle for back-end operations. Program the pick-up sequence: sub-spindle advance, synchronize spindle speeds, grip part, cut off, sub-spindle retract. Set the overlap between main and sub-spindle grips to 3-5mm for secure transfer. After transfer, the sub-spindle operations machine the previously chucked end. BobCAD synchronizes the transfer in the posted NC code with proper M-code sequencing.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:bobcad-sub-spindle
**Operations:** mill_turn

## Related
- [[gibbscam-cam-tips-gc-046|Sub-spindle transfer requires precise sync and clamp force control]]
- [[sprutcam-cam-tips-spr-005|Mill-Turn Synchronization for Sub-Spindle Transfer]]
- [[esprit-cam-tips-esp-043|Sub-Spindle Transfer Sequence Critical for Part Quality]]
- [[esprit-cam-tips-esp-131|Swiss-Type Sub-Spindle Pickup and Cutoff Sequencing]]
- [[fusion360-cam-tips-ext-f360-079|Part Transfer Between Main and Sub Spindle]]
