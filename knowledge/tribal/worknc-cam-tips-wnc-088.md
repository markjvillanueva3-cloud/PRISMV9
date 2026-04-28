---
id: "wnc-088"
title: "Scallop Control Sets Maximum Cusp Height"
source: "web:worknc-scallop-ctrl"
confidence: 93
category: "cam_strategy"
tags: ["scallop", "cusp-height", "roughness", "quality"]
_source: "worknc-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.689Z
---

# Scallop Control Sets Maximum Cusp Height

WorkNC's scallop control specifies maximum allowable cusp height and automatically calculates required stepover. For mold-quality surfaces (Ra 0.4-0.8): target 0.002-0.005 mm. For general surfaces (Ra 1.6-3.2): 0.01-0.02 mm. Actual roughness is typically 2-3x theoretical scallop due to tool deflection, vibration, and material spring-back. Account for this multiplier when setting scallop targets.

**Category:** cam_strategy
**Confidence:** 93
**Source:** web:worknc-scallop-ctrl
**Operations:** finishing

## Related
- [[cimatron-cam-tips-cim-026|Surface Quality Optimization via Scallop Control]]
- [[topsolid-cam-tips-ts-091|Scallop Control Sets Maximum Cusp Height]]
- [[bobcad-cam-tips-bc-024|Scallop Machining with Constant Cusp Height]]
- [[edgecam-cam-tips-ec-019|3D Finish with Raster and Scallop Control]]
- [[esprit-cam-tips-esp-014|Scallop-Based Finishing Maintains Constant Cusp Height]]
