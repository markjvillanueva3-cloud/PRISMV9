---
name: tribal-sc2-010
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["truemill", "entry-method", "helix", "ramp", "pre-drill"]
confidence: 90
source: "web:surfcam-truemill-entry"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-010.md
promoted_at: 2026-05-26T16:07:20.495Z
---

# TrueMill Entry Methods: Helix, Ramp, and Pre-Drill

TrueMill supports three entry methods: helical interpolation (preferred for blind pockets), linear ramp (for open edges), and pre-drill entry (for hard materials or long tools). For helical entry, set the helix diameter to 2-3x tool diameter and the ramp angle to 2-5°. For pre-drill, use a drill point 0.5mm larger than the end mill to provide clearance. Always avoid plunge entry with TrueMill — the constant engagement algorithm requires a gradual entry to initialize the stock boundary.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:surfcam-truemill-entry
**Operations:** roughing, pocketing

## Related
- [[bobcad-cam-tips-bc-009|Adaptive Roughing Entry Methods: Helix, Ramp, Pre-Drill]]
- [[bobcad-cam-tips-bc-196|BobCAD Helical Entry for Hardened Material Pockets]]
- [[surfcam-cam-tips-sc2-001|TrueMill Constant Engagement Eliminates Corner Load Spikes]]
- [[surfcam-cam-tips-sc2-002|TrueMill High-Efficiency Roughing with Full Flute Depth]]
- [[surfcam-cam-tips-sc2-003|TrueMill Corner Strategy Uses Arc Transitions]]
