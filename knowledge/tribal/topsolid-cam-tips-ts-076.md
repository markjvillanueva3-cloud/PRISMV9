---
id: "ts-076"
title: "Tool Assembly Validation Checks Reach and Clearance"
source: "web:topsolid-assembly-valid"
confidence: 90
category: "cam_strategy"
tags: ["tool-assembly", "validation", "reach", "clearance"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.444Z
---

# Tool Assembly Validation Checks Reach and Clearance

TopSolid validates tool assemblies by checking: (1) tool length reaches the deepest machined surface with clearance, (2) holder diameter doesn't interfere with workpiece walls, (3) tool-to-tool spacing in the magazine is adequate, and (4) the tool assembly weight doesn't exceed the spindle limit. Run assembly validation before posting to catch tool setup issues. The reach check is especially critical for deep cavities where a longer holder or extension may push the assembly past the spindle's weight limit.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:topsolid-assembly-valid
**Operations:** general

## Related
- [[topsolid-cam-tips-ts-062|Collision Detection Covers Full Tool Assembly]]
- [[worknc-cam-tips-wnc-054|Collision Detection Covers Full Tool Assembly]]
- [[bobcad-cam-tips-bc-094|Tool Assembly Definitions for Collision Accuracy]]
- [[catia-cam-tips-cat-149|Multi-Axis Collision Avoidance with Holder and Spindle Definition]]
- [[cimatron-cam-tips-cim-010|Tool Assembly Collision Checking]]
