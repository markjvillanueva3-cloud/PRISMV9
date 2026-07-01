---
name: tribal-bc-158
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["wire-edm", "multi-cavity", "optimization", "bridge-connections", "sequencing"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-158.md
promoted_at: 2026-06-09T22:31:15.970Z
---

# BobCAD Wire EDM Multi-Cavity Optimization with Common Start Holes

For dies with multiple cavities, BobCAD optimizes the cutting sequence to minimize wire threading operations. Group cavities that can be reached from a single start hole using bridge connections — the wire stays threaded and moves between cavities via connecting paths outside the part boundary. For cavities that require separate start holes, optimize the cutting order to minimize rapid travel distance. BobCAD's automatic sequencing uses a nearest-neighbor algorithm. For 10+ cavities, manually verify the sequence — the algorithm may not find the globally optimal order.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:bobcad-docs
**Operations:** wire_edm

## Related
- [[camworks-cam-tips-cw-077|Wire Threading Strategy — Automatic Re-Threading for Multi-Opening Parts]]
- [[camworks-cam-tips-cw-163|Wire EDM Start Hole Optimization — Minimize Pre-Drilling]]
- [[esprit-cam-tips-esp-058|Wire EDM Automatic Operation Sequencing for Lights-Out]]
- [[topsolid-cam-tips-ts-146|TopSolid Wire EDM Start Point Optimization — Threading and Path Planning]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
