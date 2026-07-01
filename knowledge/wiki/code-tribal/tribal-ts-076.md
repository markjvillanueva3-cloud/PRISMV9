---
name: tribal-ts-076
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["tool-assembly", "validation", "reach", "clearance"]
confidence: 90
source: "web:topsolid-assembly-valid"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-076.md
promoted_at: 2026-05-26T16:07:20.794Z
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
