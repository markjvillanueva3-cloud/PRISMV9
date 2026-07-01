---
name: tribal-ts-144
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["topsolid", "wire-edm", "multi-pass", "skim", "surface-finish"]
confidence: 91
source: "web:topsolid-docs"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-144.md
promoted_at: 2026-05-26T16:07:21.159Z
---

# TopSolid Wire EDM Multi-Pass Sequencing — Automatic Rough-Skim-Finish

TopSolid'Cam Wire EDM automatically generates multi-pass sequences: rough cut (maximum offset, full power), skim passes (decreasing offsets, reduced power), and finish cut (on-size, fine generator). The number of passes and offsets are loaded from the technology database based on the target surface finish: Ra 3.2µm needs 1 skim, Ra 0.8µm needs 2-3 skims, Ra 0.2µm needs 3-4 skims. Each pass uses different wire speed, tension, and flushing parameters. TopSolid calculates total cycle time including wire consumption for cost estimation.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:topsolid-docs
**Operations:** wire_edm

## Related
- [[camworks-cam-tips-cw-160|Wire EDM Multi-Pass Strategy — Rough, Skim, and Finish Cuts]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[gibbscam-cam-tips-gc-065|Skim cuts progressively improve surface finish and dimensional accuracy]]
- [[surfcam-cam-tips-sc2-164|SURFCAM Wire EDM Multi-Pass Skim Cut Strategies]]
- [[wedm-knowledge-tips-wedm-mcam-004-2|4-axis Wire EDM synchronization methods — match upper/lower chains correctly]]
