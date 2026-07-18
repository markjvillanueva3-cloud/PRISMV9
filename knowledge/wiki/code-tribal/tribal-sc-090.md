---
name: tribal-sc-090
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["solidcam", "gpp", "arc-output", "3d-arcs", "surface-finish"]
confidence: 85
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-090.md
promoted_at: 2026-06-09T22:31:16.591Z
---

# GPP Arc Output Control — Enable 3D Arcs for Smoother 5-Axis Motion

To output ModuleWorks 3D arcs (ARC_3D_5X) instead of linearized point clouds, configure the VMID Working Style and Controller Definition for arc support. Enable 'Arc fit' in the GPP settings to convert linear segments back to arcs where possible, reducing G-code file size by 40-60% and improving surface finish through smoother machine motion. Verify your controller supports G02/G03 with I/J/K endpoint specification in the active plane — older controls may only support 2D arcs in G17/G18/G19.

**Category:** programming
**Confidence:** 85
**Source:** web:solidcam-docs
**Operations:** post_processing, 5axis_finishing

## Related
- [[solidcam-cam-tips-sc-167-2|Chance-Constrained with iMachining Advantage]]
- [[solidcam-cam-tips-sc-181-2|Feature Recognition for Drilling Automation]]
- [[solidcam-cam-tips-sc-061|HSM Spiral Finishing — Center-Out for Convex, Outside-In for Concave]]
- [[solidcam-cam-tips-sc-074|5-Axis Lead/Lag Fine-Tuning — Prevent Tool Tip Contact on Concave Surfaces]]
- [[solidcam-cam-tips-sc-078|Turning Roughing — Use Wiper Insert Geometry for Better Surface Direct from Rough]]
