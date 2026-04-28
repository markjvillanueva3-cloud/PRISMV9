---
id: "sc-101"
title: "SolidWorks Feature Freeze — Lock Geometry Before Complex CAM Setup"
source: "web:solidcam-docs"
confidence: 85
category: "cam_strategy"
tags: ["solidcam", "solidworks", "feature-freeze", "geometry-lock", "references"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.741Z
---

# SolidWorks Feature Freeze — Lock Geometry Before Complex CAM Setup

Before investing significant time in complex multi-operation CAM setups, use SolidWorks Feature Freeze bar to lock the part geometry. This prevents upstream feature modifications from invalidating face references used by SolidCAM operations. If design changes are required, temporarily unfreeze, make modifications, then refreeze and regenerate affected operations. This workflow prevents the cascading geometry reference failures that occur when SolidWorks rebuilds the feature tree with different face IDs.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:solidcam-docs
**Operations:** setup, workflow

## Related
- [[solidcam-cam-tips-sc-097|Design Change Propagation — Selective Toolpath Regeneration]]
- [[solidcam-cam-tips-sc-098|Assembly Machining — Reference Fixture Bodies for Collision Avoidance]]
- [[solidcam-cam-tips-sc-099|Configuration Management — Separate CAM Projects per SolidWorks Configuration]]
- [[solidcam-cam-tips-sc-100|Sheet Metal Unfolding — Machine Flat Pattern Directly]]
- [[solidcam-cam-tips-sc-143-2|Monte Carlo Cycle Time Estimation]]
