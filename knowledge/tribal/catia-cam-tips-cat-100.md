---
id: "cat-100"
title: "Scallop Height Calculation Drives Stepover Selection"
source: "web:catia-docs"
confidence: 91
category: "cam_strategy"
tags: ["catia", "scallop", "surface-quality", "stepover", "ball-nose"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.879Z
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
