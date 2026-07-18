---
name: tribal-bc-196
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["helical-entry", "hardened-material", "pocket", "ramp", "pre-drill"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-196.md
promoted_at: 2026-06-09T22:31:15.980Z
---

# BobCAD Helical Entry for Hardened Material Pockets

In hardened materials (>45 HRC), plunge entry destroys cutting edges instantly. BobCAD's helical entry ramps the tool into the material at a controlled helix angle. For 50+ HRC steel, set the helix angle to 1-2° and the helix diameter to 1.5-2x tool diameter. The helical motion distributes the entry forces across the full tool circumference. Minimum pocket dimension for helical entry: 2.5x tool diameter. For smaller pockets, use a pre-drilled start hole. BobCAD also supports linear ramp entry (zigzag) at 1-3° for narrow slots that can't accommodate a helix.

**Category:** cam_strategy
**Confidence:** 0.9
**Source:** web:bobcad-docs
**Operations:** roughing, pocketing

## Related
- [[fusion360-cam-tips-f360-004|Helical and Ramp Entry for Adaptive Roughing]]
- [[surfcam-cam-tips-sc2-181|SURFCAM High-Speed Helical Entry for Hardened Pockets]]
- [[bobcad-cam-tips-bc-009|Adaptive Roughing Entry Methods: Helix, Ramp, Pre-Drill]]
- [[surfcam-cam-tips-sc2-010|TrueMill Entry Methods: Helix, Ramp, and Pre-Drill]]
- [[bobcad-cam-tips-bc-210|BobCAD Dynamic Machining Helical vs Ramp Entry Selection]]
