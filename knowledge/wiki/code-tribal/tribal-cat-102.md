---
name: tribal-cat-102
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "tolerance", "chord-deviation", "accuracy", "surface-quality"]
confidence: 90
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-102.md
promoted_at: 2026-05-26T16:07:20.075Z
---

# Machining Tolerance vs Surface Tolerance Distinction

In CATIA, the machining tolerance (chord deviation) controls how closely the tool path approximates the ideal surface, while the surface tolerance controls the final part accuracy. Set the machining tolerance to 50% of the part surface tolerance to ensure the tool path deviations plus other error sources (machine accuracy, tool deflection) stay within specification. Typical values: 0.005mm machining tolerance for 0.01mm surface tolerance. Excessively tight tolerance increases NC file size and computation time exponentially with minimal quality improvement.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:catia-docs
**Operations:** finishing

## Related
- [[camworks-cam-tips-cw-110|Tolerance Control — Set Chord Error for Target Surface Quality]]
- [[catia-cam-tips-cat-011|Wall Finishing With Spring Pass for Tolerance Control]]
- [[catia-cam-tips-cat-056|Gouge Detection Sensitivity Settings for Different Operations]]
- [[catia-cam-tips-cat-100|Scallop Height Calculation Drives Stepover Selection]]
- [[catia-cam-tips-cat-101|Cusp Height Control on Ruled and Flat Surfaces with Flat End Mills]]
