---
id: "bc-065"
title: "Corner Strategy with Power Reduction"
source: "web:bobcad-wire-edm-corners"
confidence: 87
category: "cam_strategy"
tags: ["wire-edm", "corners", "power-reduction", "overburn", "dwell"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.507Z
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
