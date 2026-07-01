---
name: tribal-esp-148
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mill-turn", "spindle-sync", "part-transfer", "sub-spindle", "collet"]
confidence: 0
source: "web:esprit-docs"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-148.md
promoted_at: 2026-06-09T22:31:16.247Z
---

# Mill-Turn Spindle Synchronization for Part Transfer

Part transfer between main and sub-spindle on mill-turn machines requires precise speed synchronization. In ESPRIT SyncChart: (1) both spindles ramp to identical RPM (sync point), (2) sub-spindle advances to grip position (programmed Z with 0.1mm overtravel for positive grip), (3) sub-spindle collet clamp (M-code), (4) dwell 0.5s for hydraulic pressure build, (5) main spindle collet open, (6) sub-spindle retract. Program a 2mm facing pass on the sub-spindle side to clean up the collet witness mark. For eccentric parts, add C-axis orientation sync before transfer.

**Category:** cam_strategy
**Confidence:** 0.89
**Source:** web:esprit-docs
**Operations:** turning_cutoff

## Related
- [[fusion360-cam-tips-ext-f360-079|Part Transfer Between Main and Sub Spindle]]
- [[fusion360-cam-tips-ext-f360-133|Sub-Spindle Transfer and Back Working]]
- [[bobcad-cam-tips-bc-145|BobCAD Mill-Turn Dual-Spindle Part Transfer Programming]]
- [[mastercam-cam-tips-mc-085|Sub-spindle transfer in Sync Manager requires precise handoff timing]]
- [[nx-cam-tips-nx-031|Mill-Turn Dual Spindle IPW Transfer]]
