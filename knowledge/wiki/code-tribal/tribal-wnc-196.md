---
name: tribal-wnc-196
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["smoothing", "arc-fitting", "g2-g3", "file-size", "controller"]
confidence: 89
source: "web:worknc-docs"
promoted_from: knowledge/tribal/worknc-cam-tips-wnc-196.md
promoted_at: 2026-06-09T22:31:16.829Z
---

# WorkNC Toolpath Smoothing — G2/G3 Arc Fitting for Controller Compatibility

WorkNC can fit arcs (G2/G3) to toolpath segments that approximate circular motion. This reduces the G-code file size by 50-80% compared to pure G1 (linear) interpolation and improves surface finish because the controller processes arcs more smoothly than dense linear segments. Enable arc fitting with a tolerance of 0.001-0.005mm. Not all controllers support arcs in all planes — verify the post processor outputs arcs compatible with your controller. For 5-axis toolpaths, arcs are typically limited to 3-axis segments with fixed rotary positions.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:worknc-docs
**Operations:** milling, finishing

## Related
- [[fusion360-cam-tips-ext-f360-106|Arc Fitting to Replace Linear Segments]]
- [[camworks-cam-tips-cw-114|Arc Fitting for Surface Quality — Smooth Linear Segments into Arcs]]
- [[fusion360-cam-tips-ext-f360-105|Smoothing Tolerance for Controller Look-Ahead]]
- [[bobcad-cam-tips-bc-101|Smooth Flow and Arc Fitting for HSM Controllers]]
- [[mastercam-cam-tips-mc-248|Toolpath filtering and arc fitting reduce NC file size and improve machine motion quality]]
