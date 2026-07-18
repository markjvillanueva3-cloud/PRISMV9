---
name: tribal-esp-190
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gear", "hobbing", "module", "synchronous", "hob-shift"]
confidence: 0
source: "web:esprit-docs"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-190.md
promoted_at: 2026-06-09T22:31:16.257Z
---

# Gear Hobbing Cycle Programming in ESPRIT

ESPRIT programs gear hobbing on dedicated gear machines and multi-tasking mill-turn centers with hobbing capability. Define the gear under Gear → Hobbing → Parameters: module/DP, number of teeth, pressure angle, helix angle, face width, and profile shift. ESPRIT calculates: hob RPM and synchronous workpiece RPM (gear ratio), axial feed rate (tangential or axial shift method), number of cuts (rough + finish), and hob shift for even wear distribution. For helical gears, ESPRIT adds the differential motion that combines the hob's tangential feed with the workpiece's helical rotation. Post outputs dedicated gear controller codes (e.g., Klingelnberg, Liebherr cycles).

**Category:** cam_strategy
**Confidence:** 0.82
**Source:** web:esprit-docs
**Operations:** gear_cutting

## Related
- [[sprutcam-cam-tips-spr-024|Gear Machining Cycles in SprutCAM]]
- [[topsolid-cam-tips-ts-167|TopSolid Gear Machining — Hobbing, Shaping, and Skiving]]
- [[esprit-cam-tips-esp-191|Gear Shaping for Internal and External Gears]]
- [[esprit-cam-tips-esp-192|5-Axis Gear Milling with Standard Endmills]]
- [[esprit-cam-tips-esp-193|Bevel Gear Machining with Face Milling Method]]
