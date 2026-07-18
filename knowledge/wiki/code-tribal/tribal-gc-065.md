---
name: tribal-gc-065
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "wire-edm", "skim-cut", "surface-finish", "multi-pass"]
confidence: 88
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-065.md
promoted_at: 2026-06-09T22:31:16.329Z
---

# Skim cuts progressively improve surface finish and dimensional accuracy

After the initial rough cut in GibbsCAM Wire EDM, program 2-4 skim (trim) passes with progressively smaller offsets. The first skim removes 0.05-0.10mm, subsequent skims remove 0.01-0.03mm each. Each skim pass uses lower power settings and higher wire speed for finer surface finish. The final skim can achieve Ra 0.2-0.4 μm and dimensional accuracy of ±0.002mm. Set the skim offsets in the 'Multi-Pass' dialog and GibbsCAM outputs each pass with the corresponding technology (power/speed) settings from the machine's technology database.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:gibbscam-docs

## Related
- [[camworks-cam-tips-cw-160|Wire EDM Multi-Pass Strategy — Rough, Skim, and Finish Cuts]]
- [[esprit-cam-tips-esp-156|Wire EDM Skim Cut Strategy for Surface Finish Optimization]]
- [[mastercam-cam-tips-mc-120|Skim cuts in wire EDM progressively improve surface finish and dimensional accuracy]]
- [[surfcam-cam-tips-sc2-164|SURFCAM Wire EDM Multi-Pass Skim Cut Strategies]]
- [[topsolid-cam-tips-ts-144|TopSolid Wire EDM Multi-Pass Sequencing — Automatic Rough-Skim-Finish]]
