---
name: tribal-esp-149
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mill-turn", "simultaneous", "milling-turning", "overlap", "cycle-time"]
confidence: 0
source: "web:esprit-docs"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-149.md
promoted_at: 2026-06-09T22:31:16.247Z
---

# Mill-Turn Simultaneous Milling and Turning

ESPRIT can program simultaneous milling and turning on mill-turn machines: while the lower turret performs OD turning, the upper turret with a live tool mills flats, pockets, or cross-holes. The SyncChart ensures no collision between the two turrets and manages spindle RPM conflicts (turning needs constant surface speed, milling needs a specific RPM). Solution: use CSS for turning and override the spindle to a fixed RPM only when the milling operation is active, returning to CSS when milling completes. This overlap typically saves 15-30% cycle time on complex parts.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:esprit-docs
**Operations:** turning_roughing, milling

## Related
- [[gibbscam-cam-tips-gc-148|Swiss-type overlap machining runs main and sub-spindle operations simultaneously]]
- [[bobcad-cam-tips-bc-151|BobCAD Mill-Turn Simultaneous Milling During Turning]]
- [[esprit-cam-tips-esp-153|Mill-Turn Automatic Channel Assignment Optimization]]
- [[mastercam-cam-tips-mc-265|Mill-turn synchronization manager controls spindle handoff timing to eliminate idle wait states]]
- [[mastercam-cam-tips-mc-154|Overlapping operations in Swiss Sync Manager maximize spindle utilization]]
