---
id: "sc2-078"
title: "Automatic Tool Selection Based on Feature Geometry"
source: "web:surfcam-auto-tool"
confidence: 86
category: "setup"
tags: ["auto-tool-select", "feature-geometry", "tool-diameter", "optimization"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.091Z
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
