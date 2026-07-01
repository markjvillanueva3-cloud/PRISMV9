---
name: tribal-esp-194
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gear", "worm-gear", "thread-milling", "worm-wheel", "conjugate"]
confidence: 0
source: "web:esprit-docs"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-194.md
promoted_at: 2026-06-09T22:31:16.258Z
---

# Worm and Worm Wheel Machining Strategies

ESPRIT programs worm gears using thread milling or turning operations (for the worm) and hobbing (for the worm wheel). For the worm shaft: program as a multi-start thread turning operation with trapezoidal or ZA/ZN tooth profile, specifying lead, number of starts, and root/tip diameters. For the worm wheel: use a fly cutter or hob that matches the worm's tooth profile. ESPRIT calculates the hob diameter to produce the correct conjugate tooth form on the wheel. Critical: the worm wheel hob must exactly match the worm's geometry — ESPRIT verifies this by comparing the hob profile to the worm definition and warning if mismatch exceeds 0.01mm.

**Category:** cam_strategy
**Confidence:** 0.8
**Source:** web:esprit-docs
**Operations:** gear_cutting, threading

## Related
- [[topsolid-cam-tips-ts-171|TopSolid Worm Gear Machining — Thread Milling and Turning Approaches]]
- [[esprit-cam-tips-esp-190|Gear Hobbing Cycle Programming in ESPRIT]]
- [[esprit-cam-tips-esp-191|Gear Shaping for Internal and External Gears]]
- [[esprit-cam-tips-esp-192|5-Axis Gear Milling with Standard Endmills]]
- [[esprit-cam-tips-esp-193|Bevel Gear Machining with Face Milling Method]]
