---
name: tribal-gc-104
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "surface-quality", "scallop", "stepover", "ra", "ball-nose"]
confidence: 88
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-104.md
promoted_at: 2026-06-09T22:31:16.338Z
---

# Scallop height calculation drives stepover selection for target Ra

Surface roughness from ball nose finishing is directly related to scallop height: Ra ≈ scallop/4 for typical finishing conditions. Calculate the required stepover from the target scallop: stepover = 2×sqrt(2×R×scallop - scallop²) where R is ball nose radius. For a 10mm ball nose targeting Ra 0.4 (scallop 0.0016mm), the stepover is 0.25mm. In GibbsCAM, set this as the stepover or use the 'Constant Scallop Height' strategy that auto-adjusts stepover for varying curvature. On steep walls, the effective scallop is further reduced, so the stepover can be larger without quality loss.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:gibbscam-docs

## Related
- [[catia-cam-tips-cat-100|Scallop Height Calculation Drives Stepover Selection]]
- [[camworks-cam-tips-cw-111|Scallop Height Control — Calculate Step-Over for Target Ra]]
- [[powermill-cam-tips-pm-018|Stepover Calculation for Target Cusp Height]]
- [[topsolid-cam-tips-ts-023|Scallop-Height Finishing Ensures Uniform Surface Quality]]
- [[esprit-cam-tips-esp-097|Scallop Height Control for Predictable Surface Finish]]
