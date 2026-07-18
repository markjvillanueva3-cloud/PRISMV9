---
name: tribal-esp-169
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["additive", "ded", "deposition-strategy", "bead-width", "overlap"]
confidence: 0
source: "web:esprit-docs"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-169.md
promoted_at: 2026-06-09T22:31:16.252Z
---

# Directed Energy Deposition Toolpath Strategies

For DED/LMD additive operations in ESPRIT, choose from multiple deposition strategies: raster (parallel lines), contour-offset (outside-in or inside-out), spiral, and zigzag. Set under Additive → Strategy → Deposition Pattern. Key parameters: bead width (0.5-3mm depending on nozzle and power), layer height (typically 30-70% of bead width for good interlayer bonding), overlap percentage (30-50% between adjacent beads to prevent porosity), and laser power (500-4000W for steel). ESPRIT simulates the thermal build-up layer by layer, flagging overheating zones where interpass cooling pauses may be needed.

**Category:** cam_strategy
**Confidence:** 0.8
**Source:** web:esprit-docs
**Operations:** additive

## Related
- [[cimatron-cam-tips-cim-146|Additive/Hybrid Manufacturing for Mold Repair]]
- [[cimatron-cam-tips-cim-189|Additive DED for Mold Repair and Modification]]
- [[esprit-cam-tips-esp-168|Hybrid Additive-Subtractive Programming in ESPRIT]]
- [[hypermill-cam-tips-ext-hm-193|Additive DED for Mold Repair]]
- [[nx-cam-tips-ext-nx-128|Additive Manufacturing in NX]]
