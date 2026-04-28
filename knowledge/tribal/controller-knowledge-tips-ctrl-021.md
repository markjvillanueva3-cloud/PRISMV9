---
id: "ctrl-021"
title: "Heidenhain cycle 32 for surface finish tolerance"
source: "controller:heidenhain_cycle32_guide"
confidence: 90
category: "programming"
tags: ["heidenhain", "cycle-32", "tolerance", "surface-finish", "hsm"]
_source: "controller-knowledge-tips.ts"
indexed_at: 2026-04-28T01:00:42.169Z
---

# Heidenhain cycle 32 for surface finish tolerance

Cycle 32 sets the contour tolerance for HSM on TNC 640. Syntax: CYCL DEF 32.0 TOLERANCE, CYCL DEF 32.1 T0.01 (tolerance in mm). Lower values = more accurate but slower. Typical: 0.005mm for finishing, 0.05mm for roughing. This controls the internal spline filter — essential for good surface finish with short-segment CAM output. Similar concept to Siemens CYCLE832 and Fanuc G05.1.

**Category:** programming
**Confidence:** 90
**Source:** controller:heidenhain_cycle32_guide

## Related
- [[controller-knowledge-tips-ctrl-082|TNC 640 Cycle 32 TOLERANCE for HSM optimization]]
- [[mastercam-cam-tips-mc-074|Arc Fit Tolerance controls the smoothness vs accuracy tradeoff in HSM toolpaths]]
- [[mastercam-cam-tips-mc-277|Uncertainty propagation in feeds and speeds quantifies surface finish variability from input parameter ranges]]
- [[topsolid-cam-tips-ts-089|Reaming with Controlled Feed and Speed]]
- [[worknc-cam-tips-wnc-085|Reaming with Controlled Feed and Speed]]
