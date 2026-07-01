---
name: tribal-wnc-158
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["waveform", "hardened", "hrc", "roughing", "hard-machining"]
confidence: 90
source: "web:worknc-docs"
promoted_from: knowledge/tribal/worknc-cam-tips-wnc-158.md
promoted_at: 2026-05-26T16:07:21.674Z
---

# Waveform for Hard Materials — 50+ HRC Roughing Strategy

Waveform roughing enables roughing of hardened materials (50+ HRC) that would be impossible with conventional toolpaths. Settings: engagement angle 30-45°, axial depth 1-1.5x diameter, Vc 80-120 m/min (carbide with AlTiN coating), fz 0.03-0.06mm/tooth. The constant engagement prevents the thermal shock and intermittent loading that causes carbide tool fracture in hardened steel. This enables rough-from-hard workflows where the part is heat-treated before machining, eliminating the distortion that occurs when machining soft → heat treating → finish machining.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:worknc-docs
**Operations:** roughing

## Related
- [[edgecam-cam-tips-ec-001|Waveform Roughing Maintains Constant Tool Engagement]]
- [[worknc-cam-tips-wnc-013|Waveform Roughing Optimizes Tool Load for Longer Life]]
- [[worknc-cam-tips-wnc-155|Waveform Roughing — Constant Engagement Angle for Maximum MRR]]
- [[worknc-cam-tips-wnc-156|Waveform Entry Strategy — Helical and Ramp Approach]]
- [[edgecam-cam-tips-ec-002|Waveform Trochoidal Mode for Narrow Slots]]
