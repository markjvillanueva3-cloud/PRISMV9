---
name: tribal-pm-018
category: code-tribal
subdomain: surface_finish
domain: tribal-knowledge
tags: ["stepover", "cusp-height", "ball-nose", "surface-quality", "variable-stepover"]
confidence: 93
source: "web:powermill-docs"
promoted_from: knowledge/tribal/powermill-cam-tips-pm-018.md
promoted_at: 2026-05-26T16:07:20.375Z
---

# Stepover Calculation for Target Cusp Height

Calculate stepover from target cusp height using: stepover = 2 × sqrt(2×R×h - h²), where R is the ball nose radius and h is the desired cusp height. For a 10mm ball nose targeting 0.005mm cusp: stepover = 2 × sqrt(2×5×0.005) = 0.447mm. In PowerMill, set 'Stepover' to 'Cusp Height' mode and enter the target value directly — the system calculates variable stepover based on local surface curvature, using tighter stepover in high-curvature areas.

**Category:** surface_finish
**Confidence:** 93
**Source:** web:powermill-docs
**Operations:** finishing

## Related
- [[catia-cam-tips-cat-100|Scallop Height Calculation Drives Stepover Selection]]
- [[gibbscam-cam-tips-gc-104|Scallop height calculation drives stepover selection for target Ra]]
- [[edgecam-cam-tips-ec-086|Scallop Height Calculation for Ball-Nose Cutters]]
- [[esprit-cam-tips-esp-097|Scallop Height Control for Predictable Surface Finish]]
- [[fusion360-cam-tips-ext-f360-099|Surface Topology Analysis for Stepover Calculation]]
