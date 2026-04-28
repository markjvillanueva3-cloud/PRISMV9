---
id: "esp-100"
title: "Cusp Height Analysis for Quality Verification"
source: "web:esprit-surface-quality"
confidence: 87
category: "surface_finish"
tags: ["cusp-analysis", "quality", "verification", "ra"]
_source: "esprit-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.519Z
---

# Cusp Height Analysis for Quality Verification

ESPRIT's cusp analysis tool measures the theoretical cusp height across the entire machined surface and displays it as a color map. Red zones indicate areas where cusp height exceeds the specification — these need additional passes or smaller stepover. Use cusp analysis after programming to verify that the finished surface meets the drawing's Ra/Rz requirements. Convert cusp height to Ra using the approximation Ra ≈ 0.37 × cusp height for ball-nose cutters on flat surfaces.

**Category:** surface_finish
**Confidence:** 87
**Source:** web:esprit-surface-quality
**Operations:** 3d_finishing

## Related
- [[edgecam-cam-tips-ec-087|Cusp Analysis for Quality Verification]]
- [[bobcad-cam-tips-bc-122|Verification Probing with SPC Data Output]]
- [[catia-cam-tips-cat-080|On-Machine Verification Probing Reduces Setup Iterations]]
- [[powermill-cam-tips-pm-023|ViewMill Verification Catches Gouges Before Machine]]
- [[worknc-cam-tips-wnc-131|Auto5 Toolpath Quality Assessment — Cusp Height Verification]]
