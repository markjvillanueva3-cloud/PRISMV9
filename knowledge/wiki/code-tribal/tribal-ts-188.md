---
name: tribal-ts-188
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["topsolid", "process-capability", "cpk", "production", "release"]
confidence: 88
source: "web:topsolid-docs"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-188.md
promoted_at: 2026-06-09T22:31:16.779Z
---

# Process Capability Studies — Cp/Cpk Before Production Release

Run a process capability study (30-50 parts) on the first production batch before releasing the TopSolid program for ongoing production. Calculate Cp and Cpk for each critical dimension. Minimum acceptable: Cpk ≥ 1.33 (4σ process, 63 PPM). For critical aerospace/medical dimensions: Cpk ≥ 1.67 (5σ, 0.57 PPM). If Cpk < 1.33, investigate and improve: center the process (adjust tool offsets to shift the mean toward nominal), reduce variation (tighten fixture, improve thermal control, add spring pass), or request wider tolerance from design. Document the capability study results in TopSolid's project notes for traceability.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:topsolid-docs
**Operations:** general

## Related
- [[topsolid-cam-tips-ts-187|Stochastic Surface Roughness — Predicting Finish Distribution]]
- [[bobcad-cam-tips-bc-200|Process Capability Monitoring for BobCAD Production Programs]]
- [[catia-cam-tips-cat-213|Monte Carlo Process Capability Estimation for CATIA Machining]]
- [[cimatron-cam-tips-cim-044|Cpk Prediction for Mold Cavity Dimensions]]
- [[edgecam-cam-tips-ec-218|Process Capability Study Setup from Edgecam Programs]]
