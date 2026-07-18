---
name: tribal-sc2-078
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["auto-tool-select", "feature-geometry", "tool-diameter", "optimization"]
confidence: 86
source: "web:surfcam-auto-tool"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-078.md
promoted_at: 2026-06-09T22:31:16.677Z
---

# Automatic Tool Selection Based on Feature Geometry

SURFCAM can automatically select tools from the library based on feature geometry: pocket size determines maximum tool diameter, corner radii determine minimum tool radius, and depth determines minimum tool length. Enable 'Auto tool select' and set the selection criteria: prefer largest possible tool (fastest cycle time), or prefer tools already in the magazine (minimize tool changes). Always review auto-selected tools before posting — the algorithm may choose a suboptimal combination.

**Category:** setup
**Confidence:** 86
**Source:** web:surfcam-auto-tool
**Operations:** setup

## Related
- [[bobcad-cam-tips-bc-096|Automatic Tool Selection from Feature Geometry]]
- [[mastercam-cam-tips-mc-109|Tool measurement probing verifies tool length and radius before cutting]]
- [[bobcad-cam-tips-bc-158|BobCAD Wire EDM Multi-Cavity Optimization with Common Start Holes]]
- [[bobcad-cam-tips-bc-175|BobCAD Nesting Module for Sheet Metal Cutting Optimization]]
- [[bobcad-cam-tips-bc-220|BobCAD Multi-Objective Optimization for Cost-Quality-Time Trade-offs]]
