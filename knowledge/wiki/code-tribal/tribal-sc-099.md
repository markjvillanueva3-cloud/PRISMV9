---
name: tribal-sc-099
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["solidcam", "solidworks", "configurations", "variants", "cam-part"]
confidence: 86
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-099.md
promoted_at: 2026-06-09T22:31:16.593Z
---

# Configuration Management — Separate CAM Projects per SolidWorks Configuration

For SolidWorks parts with multiple configurations (e.g., left-hand/right-hand variants), create separate SolidCAM CAM Parts linked to each configuration rather than switching configurations within a single CAM project. SolidCAM stores geometry references that can break when configurations swap suppressed features. Each CAM Part maintains its own CoordSys, tool assignments, and operation parameters, enabling independent verification and post-processing per variant.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:solidcam-docs
**Operations:** setup, workflow

## Related
- [[camworks-cam-tips-cw-057|Configuration Management — Separate CAM Setups per SOLIDWORKS Config]]
- [[camworks-cam-tips-cw-158|SOLIDWORKS Configurations — One Model, Multiple CAM Setups]]
- [[mastercam-cam-tips-mc-271|Mastercam for SolidWorks configurations enable machining multiple part variants from a single setup]]
- [[solidcam-cam-tips-sc-097|Design Change Propagation — Selective Toolpath Regeneration]]
- [[solidcam-cam-tips-sc-098|Assembly Machining — Reference Fixture Bodies for Collision Avoidance]]
