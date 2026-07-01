---
name: tribal-esp-191
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gear", "shaping", "internal-gear", "reciprocating", "ring-gear"]
confidence: 0
source: "web:esprit-docs"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-191.md
promoted_at: 2026-06-09T22:31:16.257Z
---

# Gear Shaping for Internal and External Gears

ESPRIT's gear shaping module programs reciprocating cutter motion for spur and helical gears. The shaping cutter strokes vertically (or at helix angle) while rotating synchronously with the workpiece. Configure under Gear → Shaping: number of strokes per minute (based on material and cutter life), radial infeed per revolution, number of roughing and finishing passes, and relief angle for the return stroke. ESPRIT calculates the cutter-to-workpiece RPM ratio from the tooth count ratio. For internal ring gears, verify that the minimum bore diameter accommodates the shaping cutter plus clearance for the reciprocating stroke. Shaping is preferred over hobbing when clearance prevents hob overtravel.

**Category:** cam_strategy
**Confidence:** 0.81
**Source:** web:esprit-docs
**Operations:** gear_cutting

## Related
- [[topsolid-cam-tips-ts-167|TopSolid Gear Machining — Hobbing, Shaping, and Skiving]]
- [[esprit-cam-tips-esp-190|Gear Hobbing Cycle Programming in ESPRIT]]
- [[esprit-cam-tips-esp-192|5-Axis Gear Milling with Standard Endmills]]
- [[esprit-cam-tips-esp-193|Bevel Gear Machining with Face Milling Method]]
- [[esprit-cam-tips-esp-194|Worm and Worm Wheel Machining Strategies]]
