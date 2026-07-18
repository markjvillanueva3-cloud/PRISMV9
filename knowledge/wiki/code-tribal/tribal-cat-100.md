---
name: tribal-cat-100
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "scallop", "surface-quality", "stepover", "ball-nose"]
confidence: 91
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-100.md
promoted_at: 2026-05-26T16:07:20.073Z
---

# Scallop Height Calculation Drives Stepover Selection

In CATIA surface finishing, scallop height is the primary metric for surface quality. For ball-nose tools: scallop_height = R - sqrt(R² - (stepover/2)²), where R is ball radius. Target 0.005-0.01mm for mold polishing surfaces, 0.01-0.02mm for aerospace aerodynamic surfaces, and 0.02-0.05mm for general machined surfaces. CATIA's scallop-height mode automatically computes the required stepover for each surface region based on local curvature, producing optimal results with minimum passes.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:catia-docs
**Operations:** finishing

## Related
- [[gibbscam-cam-tips-gc-104|Scallop height calculation drives stepover selection for target Ra]]
- [[catia-cam-tips-cat-013|Sweeping Operation Stepover Linked to Scallop Height]]
- [[esprit-cam-tips-esp-097|Scallop Height Control for Predictable Surface Finish]]
- [[topsolid-cam-tips-ts-023|Scallop-Height Finishing Ensures Uniform Surface Quality]]
- [[powermill-cam-tips-pm-018|Stepover Calculation for Target Cusp Height]]
