---
name: tribal-mc-061
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "equal-scallop", "surface-quality", "class-a", "offset", "optical"]
confidence: 85
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-061.md
promoted_at: 2026-06-09T22:31:16.410Z
---

# Equal Scallop produces tighter surface tolerance than standard Scallop

Mastercam Equal Scallop uses an offset-from-surface algorithm that keeps the distance between adjacent passes truly equal regardless of surface curvature, unlike standard Scallop which approximates. The result is a more uniform finish with no banding or visible stepover variation. Equal Scallop takes 20-40% longer to calculate but produces measurably better finishes (Ra improvement of 10-20% vs standard Scallop at the same stepover). Use it for Class A surfaces, optical molds, and parts requiring polished finishes.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:mastercam-docs
**Operations:** finishing, 3d_finishing

## Related
- [[mastercam-cam-tips-mc-131|Accelerated Finishing toolpath type auto-calculates step-over from target scallop and tool profile]]
- [[mastercam-cam-tips-mc-246|Blending distance control in multiaxis toolpaths smooths feed rate transitions at zone boundaries]]
- [[mastercam-cam-tips-mc-248|Toolpath filtering and arc fitting reduce NC file size and improve machine motion quality]]
- [[mastercam-cam-tips-mc-256|Equal Scallop toolpath maintains constant cusp height across varying surface curvature for uniform finish]]
- [[mastercam-cam-tips-mc-257|Combining Equal Scallop with Steep/Shallow boundary yields optimal finish across mixed-angle surfaces]]
