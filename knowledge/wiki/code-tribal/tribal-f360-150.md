---
name: tribal-f360-150
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["fusion360", "peck-drilling", "deep-hole", "chip-evacuation", "g83"]
confidence: 0
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-150.md
promoted_at: 2026-06-09T22:31:16.289Z
---

# Peck Drilling Depth-to-Diameter Guidelines

For holes deeper than 3x diameter, switch from standard drilling to peck drilling (G83). Set the initial peck depth to 1.0-1.5x drill diameter and reduce subsequent pecks by 10-20% per step as depth increases. Reason: chip evacuation becomes harder as depth increases and the flute volume is consumed by previously cut chips. In Fusion, set the Peck type to 'Full Retract' for depths 3-8x diameter and 'Chip Break' (partial retract of 0.5-1mm) for shallower holes to save cycle time. Beyond 8x diameter, consider gun drills or BTA drills instead of twist drills with peck cycles.

**Category:** cam_strategy
**Confidence:** 0.9
**Source:** web:fusion360-docs
**Operations:** drilling

## Related
- [[topsolid-cam-tips-ts-086|Peck Drilling with Optimized Retract Heights]]
- [[worknc-cam-tips-wnc-082|Peck Drilling with Optimized Retract Strategy]]
- [[fusion360-cam-tips-ext-f360-076|Grooving with Peck Cycle for Deep Narrow Slots]]
- [[fusion360-cam-tips-ext-f360-148|Thread Milling Entry and Exit Strategy]]
- [[fusion360-cam-tips-ext-f360-155|Gun Drill Programming in Fusion 360]]
