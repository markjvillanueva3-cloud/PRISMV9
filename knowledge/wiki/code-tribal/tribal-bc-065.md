---
name: tribal-bc-065
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["wire-edm", "corners", "power-reduction", "overburn", "dwell"]
confidence: 87
source: "web:bobcad-wire-edm-corners"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-065.md
promoted_at: 2026-06-09T22:31:15.948Z
---

# Corner Strategy with Power Reduction

BobCAD Wire EDM corner strategies control power and overburn at sharp corners. At internal corners, wire overcuts due to discharge energy continuing after direction change. Program corner dwell (0.5-2s) and power reduction (30-50%) within 1mm of corners. For external corners, reduce approach speed rather than power to maintain wire tension. BobCAD's corner parameters are set per profile segment, allowing different strategies for different corner angles on the same part.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:bobcad-wire-edm-corners
**Operations:** wire_edm

## Related
- [[surfcam-cam-tips-sc2-059|Corner Strategies: Power Reduction and Overburn Control]]
- [[camworks-cam-tips-cw-164|Wire EDM Corner Strategy — Sharp Corners Without Overburn]]
- [[camworks-cam-tips-cw-078|Wire EDM Corner Strategy — Power Reduction and Dwell for Sharp Corners]]
- [[surfcam-cam-tips-sc2-166|SURFCAM Wire EDM Corner Strategy with Power Reduction]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
