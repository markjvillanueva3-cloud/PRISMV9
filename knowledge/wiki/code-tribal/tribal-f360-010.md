---
name: tribal-f360-010
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["steep-and-shallow", "machining-priority", "mold", "strategy-selection"]
confidence: 82
source: "web:autodesk-community"
promoted_from: knowledge/tribal/fusion360-cam-tips-f360-010.md
promoted_at: 2026-06-09T22:31:16.302Z
---

# Steep First vs Top First Machining Priority

In Steep and Shallow, choose machining priority carefully: Top First machines upper shallow regions before steep walls (good for preventing chip re-cutting on horizontal faces), while Steep First machines walls before flats (better when wall accuracy matters most, like on injection mold shut-off surfaces). Default to Steep First for mold work to protect critical parting-line surfaces.

**Category:** cam_strategy
**Confidence:** 82
**Source:** web:autodesk-community
**Operations:** steep_and_shallow

## Related
- [[fusion360-cam-tips-f360-008|Steep and Shallow Continuous Spiral Eliminates Step Marks]]
- [[fusion360-cam-tips-ext-f360-048|Steep and Shallow Threshold Angle Fine-Tuning]]
- [[fusion360-cam-tips-ext-f360-097|Steep and Shallow Remove Cusps at Junctions]]
- [[fusion360-cam-tips-ext-f360-100|Overlap Distance for Steep-Shallow Boundary Blending]]
- [[fusion360-cam-tips-f360-007|Steep and Shallow Combines Two Strategies Automatically]]
