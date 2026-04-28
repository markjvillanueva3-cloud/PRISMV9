---
id: "teb-037"
title: "Cusp Height Control Produces Predictable Surface Roughness"
source: "web:tebis-docs"
confidence: 91
category: "finishing"
tags: ["cusp-height", "surface-roughness", "step-over", "ra"]
_source: "tebis-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.249Z
---

# Cusp Height Control Produces Predictable Surface Roughness

Set finishing step-over based on target cusp height rather than a fixed distance. Tebis calculates the step-over needed for the target cusp using the actual tool geometry (ball, bullnose, or barrel) and local surface curvature. For mold finish requirements: Ra 0.4μm → cusp 0.003mm, Ra 0.8μm → cusp 0.008mm, Ra 1.6μm → cusp 0.015mm. The resulting surface can be polished to final finish in 30-50% less time than with fixed step-over toolpaths.

**Category:** finishing
**Confidence:** 91
**Source:** web:tebis-docs
**Operations:** finishing

## Related
- [[solidcam-cam-tips-sc-180-2|Helical Milling for Holes]]
- [[topsolid-cam-tips-ts-091|Scallop Control Sets Maximum Cusp Height]]
- [[camworks-cam-tips-cw-111|Scallop Height Control — Calculate Step-Over for Target Ra]]
- [[bobcad-cam-tips-bc-024|Scallop Machining with Constant Cusp Height]]
- [[cimatron-cam-tips-cim-003|Z-Level Finishing with Constant Cusp Height]]
