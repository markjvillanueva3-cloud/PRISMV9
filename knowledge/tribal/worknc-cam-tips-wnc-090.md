---
id: "wnc-090"
title: "Smooth Flow with NURBS Output for HSM"
source: "web:worknc-nurbs"
confidence: 90
category: "cam_strategy"
tags: ["smooth-flow", "nurbs", "hsm", "b-spline"]
_source: "worknc-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.691Z
---

# Smooth Flow with NURBS Output for HSM

WorkNC's smooth flow option generates toolpaths with gradual direction changes using B-spline interpolation. For HSM, enable NURBS output if the controller supports it (Siemens 840D, Fanuc 30i). This produces smaller NC files with smoother motion compared to linear-segment output. Set minimum arc radius to match controller look-ahead capability (typically 0.1-0.5 mm).

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:worknc-nurbs
**Operations:** finishing, hsm

## Related
- [[topsolid-cam-tips-ts-094|Smooth Flow Toolpaths Minimize Direction Changes]]
- [[bobcad-cam-tips-bc-101|Smooth Flow and Arc Fitting for HSM Controllers]]
- [[catia-cam-tips-cat-095|Smooth Flow Tool Path Transitions Eliminate Dwell Marks]]
- [[mastercam-cam-tips-mc-077|Smooth flow toolpaths maintain constant velocity for glass-like finishes]]
- [[surfcam-cam-tips-sc2-091|Smooth Flow Toolpaths for Continuous Machine Motion]]
