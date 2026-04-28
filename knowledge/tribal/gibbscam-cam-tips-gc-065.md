---
id: "gc-065"
title: "Skim cuts progressively improve surface finish and dimensional accuracy"
source: "web:gibbscam-docs"
confidence: 88
category: "cam_strategy"
tags: ["gibbscam", "wire-edm", "skim-cut", "surface-finish", "multi-pass"]
_source: "gibbscam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.883Z
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
