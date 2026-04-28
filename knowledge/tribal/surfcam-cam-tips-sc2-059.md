---
id: "sc2-059"
title: "Corner Strategies: Power Reduction and Overburn Control"
source: "web:surfcam-wire-edm-corners"
confidence: 88
category: "cam_strategy"
tags: ["wire-edm", "corners", "power-reduction", "overburn", "dwell"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.077Z
---

# Corner Strategies: Power Reduction and Overburn Control

SURFCAM Wire EDM corner strategies control the power reduction and overburn at internal and external corners. At sharp internal corners, the wire overcuts due to the discharge energy continuing after the direction change. Program corner dwell (0.5-2 seconds) and power reduction (30-50% of main cut power) within 1mm of the corner. For external corners, reduce the approach speed rather than the power to maintain the wire tension and prevent wire breakage.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:surfcam-wire-edm-corners
**Operations:** wire_edm

## Related
- [[bobcad-cam-tips-bc-065|Corner Strategy with Power Reduction]]
- [[camworks-cam-tips-cw-164|Wire EDM Corner Strategy — Sharp Corners Without Overburn]]
- [[camworks-cam-tips-cw-078|Wire EDM Corner Strategy — Power Reduction and Dwell for Sharp Corners]]
- [[surfcam-cam-tips-sc2-166|SURFCAM Wire EDM Corner Strategy with Power Reduction]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
