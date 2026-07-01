---
name: tribal-bc-056
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["sub-spindle", "transfer", "back-end", "synchronization"]
confidence: 89
source: "web:bobcad-sub-spindle"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-056.md
promoted_at: 2026-06-09T22:31:15.945Z
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
