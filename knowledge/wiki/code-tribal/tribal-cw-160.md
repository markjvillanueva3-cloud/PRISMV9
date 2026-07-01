---
name: tribal-cw-160
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "wire-edm", "multi-pass", "skim", "surface-finish"]
confidence: 91
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-160.md
promoted_at: 2026-05-26T16:07:19.996Z
---

# Wire EDM Multi-Pass Strategy — Rough, Skim, and Finish Cuts

CAMWorks Wire EDM programs multi-pass cutting: rough cut (maximum MRR, 0.01-0.02mm oversize), 1-3 skim cuts (progressively smaller offsets), and a final finish cut (on-size). Each pass uses different power settings, wire tension, flushing pressure, and offset from the programmed path. In CAMWorks, define the number of passes and the system assigns decreasing offsets automatically from the TechDB. Typical surface finish progression: Ra 3.2µm (rough) → Ra 0.8µm (skim) → Ra 0.2µm (finish).

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:camworks-docs
**Operations:** wire_edm

## Related
- [[topsolid-cam-tips-ts-144|TopSolid Wire EDM Multi-Pass Sequencing — Automatic Rough-Skim-Finish]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[camworks-cam-tips-cw-075|Skim Cuts — Multi-Pass Wire EDM for Surface Finish and Accuracy]]
- [[gibbscam-cam-tips-gc-065|Skim cuts progressively improve surface finish and dimensional accuracy]]
- [[surfcam-cam-tips-sc2-164|SURFCAM Wire EDM Multi-Pass Skim Cut Strategies]]
