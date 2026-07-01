---
name: tribal-ec-173
category: code-tribal
subdomain: quality
domain: tribal-knowledge
tags: ["hard-milling", "scallop-height", "ball-nose", "surface-finish"]
confidence: 0
source: "web:edgecam-docs"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-173.md
promoted_at: 2026-06-09T22:31:16.202Z
---

# Hard Milling Surface Finish Scallop Height Control

For hardened material finishing with ball-nose tools, control scallop height directly in Edgecam by setting the stepover based on the formula: ae = 2 × √(R² - (R - h)²) where R is ball radius and h is target scallop height. For Ra 0.4μm target on 60 HRC steel with a 6mm ball-nose (R=3mm), set h = 0.002mm giving ae = 0.22mm. Enable 3D scallop-height-driven stepover in Edgecam to maintain constant scallop across varying surface curvature.

**Category:** quality
**Confidence:** 0.89
**Source:** web:edgecam-docs
**Operations:** finishing

## Related
- [[surfcam-cam-tips-sc2-081|Scallop Height Control for Predictable Surface Finish]]
- [[cimatron-cam-tips-cim-028|Hard Milling Strategy for >50 HRC Materials]]
- [[edgecam-cam-tips-ec-171|Hardened Material Rest Machining with Small Tools]]
- [[edgecam-cam-tips-ec-086|Scallop Height Calculation for Ball-Nose Cutters]]
- [[esprit-cam-tips-esp-097|Scallop Height Control for Predictable Surface Finish]]
