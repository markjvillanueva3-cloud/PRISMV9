---
id: "cw-057"
title: "Configuration Management — Separate CAM Setups per SOLIDWORKS Config"
source: "web:camworks-docs"
confidence: 87
category: "cam_strategy"
tags: ["camworks", "solidworks", "configurations", "variants", "setup"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.675Z
---

# Configuration Management — Separate CAM Setups per SOLIDWORKS Config

SOLIDWORKS configurations (different sizes, revisions, or options of a part) can each have independent CAMWorks feature trees and operations. Create a separate Machine Setup per configuration to maintain distinct toolpaths. Use the TechDB to ensure consistent operations across configurations — when a new configuration is created, applying TechDB operation mapping generates correct toolpaths immediately without copying from another configuration.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:camworks-docs
**Operations:** milling

## Related
- [[camworks-cam-tips-cw-158|SOLIDWORKS Configurations — One Model, Multiple CAM Setups]]
- [[camworks-cam-tips-cw-062|Multi-Body Part Machining — Separate Operations per Solid Body]]
- [[mastercam-cam-tips-mc-271|Mastercam for SolidWorks configurations enable machining multiple part variants from a single setup]]
- [[solidcam-cam-tips-sc-099|Configuration Management — Separate CAM Projects per SolidWorks Configuration]]
- [[camworks-cam-tips-cw-055|Associative Machining — Automatic Toolpath Update on Design Changes]]
