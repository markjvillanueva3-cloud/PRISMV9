---
name: tribal-spr-050
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["parting", "chip-control", "pecking", "separation"]
confidence: 0
source: "web:sprutcam-tutorials"
promoted_from: knowledge/tribal/sprutcam-cam-tips-spr-050.md
promoted_at: 2026-06-09T22:31:16.630Z
---

# Parting Off with Chip Control

For parting operations in SprutCAM: set feed rate 50-70% of turning feed, enable coolant (through-tool or directed), and use pecking for diameters >30mm to manage chip length. Set 'Retract' between pecks to 0.1mm for chip breaking. For CNC Swiss machines, synchronize the bar feed with the sub-spindle catch to prevent part drop. Program G-code dwell (0.5s) at final diameter for clean separation.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:sprutcam-tutorials
**Operations:** turning

## Related
- [[camworks-cam-tips-cw-070|Cut-Off Operation — Part Separation with Chip Control]]
- [[mastercam-cam-tips-mc-082|Grooving toolpath pecking depth prevents chip packing in deep grooves]]
- [[bobcad-cam-tips-bc-052|Cut-Off with Feed Reduction and Part Catcher Support]]
- [[cimatron-cam-tips-cim-069|Core/Cavity Parting Surface Generation]]
- [[cimatron-cam-tips-cim-169|Facing with Wiper Inserts for Plate Flatness]]
