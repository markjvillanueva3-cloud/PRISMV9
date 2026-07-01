---
name: tribal-ec-086
category: code-tribal
subdomain: surface_finish
domain: tribal-knowledge
tags: ["scallop-height", "ball-nose", "stepover", "ra-calculation"]
confidence: 90
source: "web:edgecam-surface"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-086.md
promoted_at: 2026-05-26T16:07:20.185Z
---

# Scallop Height Calculation for Ball-Nose Cutters

For ball-nose finishing, scallop height h = S-squared / (8 x R), where S is stepover and R is ball radius. For a 10mm ball nose at 0.3mm stepover: h = 0.0011mm. On curved surfaces the effective radius changes. Enable constant-scallop mode to automatically adjust stepover. Target scallop heights: 0.01mm semi-finish, 0.003-0.005mm finish, less than 0.001mm for mirror. Convert to Ra using Ra approximately equals 0.37 x scallop height.

**Category:** surface_finish
**Confidence:** 90
**Source:** web:edgecam-surface
**Operations:** 3d_finishing

## Related
- [[surfcam-cam-tips-sc2-081|Scallop Height Control for Predictable Surface Finish]]
- [[edgecam-cam-tips-ec-173|Hard Milling Surface Finish Scallop Height Control]]
- [[catia-cam-tips-cat-100|Scallop Height Calculation Drives Stepover Selection]]
- [[esprit-cam-tips-esp-097|Scallop Height Control for Predictable Surface Finish]]
- [[gibbscam-cam-tips-gc-104|Scallop height calculation drives stepover selection for target Ra]]
