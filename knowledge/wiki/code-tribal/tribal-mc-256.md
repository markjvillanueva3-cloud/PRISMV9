---
name: tribal-mc-256
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "equal-scallop", "cusp-height", "surface-finish", "adaptive-stepover", "organic-shapes"]
confidence: 88
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-256.md
promoted_at: 2026-06-09T22:31:16.458Z
---

# Equal Scallop toolpath maintains constant cusp height across varying surface curvature for uniform finish

Mastercam's Equal Scallop (Scallop) toolpath dynamically adjusts the stepover distance based on local surface curvature to maintain a constant theoretical scallop height across the entire part. On flat areas the stepover increases (up to the max stepover limit), while on steep or highly curved regions the stepover decreases automatically. Set the target scallop height (typically 0.005-0.015 mm for finish milling) rather than a fixed stepover distance. This produces a visually uniform surface finish without the over-cutting on curved areas or under-cutting on flat areas that fixed-stepover parallel finishing creates. Equal Scallop is ideal for organic shapes (medical implants, consumer products, aerospace fairings) where uniform visual appearance matters. Calculation time is 2-3x longer than parallel finishing due to the adaptive stepover computation.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:mastercam-docs
**Operations:** finishing

## Related
- [[mastercam-cam-tips-mc-257|Combining Equal Scallop with Steep/Shallow boundary yields optimal finish across mixed-angle surfaces]]
- [[mastercam-cam-tips-mc-259|Equal Scallop spiral pattern eliminates step-marks by using continuous spiral motion instead of offset rows]]
- [[mastercam-cam-tips-mc-054|Scallop toolpath produces uniform cusp height across varying surface curvature]]
- [[mastercam-cam-tips-mc-056|Parallel finishing with 45-degree cut angle hides machining marks on flat surfaces]]
- [[mastercam-cam-tips-mc-061|Equal Scallop produces tighter surface tolerance than standard Scallop]]
