---
id: "spr-020"
title: "Fixture and Workholding Definition"
source: "web:sprutcam-tutorials"
confidence: 0.87
category: "cam_strategy"
tags: ["fixture", "workholding", "collision-body", "soft-jaws"]
_source: "sprutcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.862Z
---

# Fixture and Workholding Definition

Define fixtures as collision bodies in SprutCAM: import fixture CAD model, position relative to the part, and mark as 'Fixture' type. The machining simulation checks tool, holder, and workpiece against fixture geometry. For soft jaws, model the actual jaw profile (not just the vise body) for accurate interference checking. Update fixture models when changing clamping strategy.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:sprutcam-tutorials
**Operations:** setup

## Related
- [[topsolid-cam-tips-ts-130|TopSolid'Cam 7 Automatic Fixture Selection from Catalog]]
- [[bobcad-cam-tips-bc-139|BobCAM for SOLIDWORKS Assembly-Level Machining Setup]]
- [[camworks-cam-tips-cw-062|Multi-Body Part Machining — Separate Operations per Solid Body]]
- [[camworks-cam-tips-cw-156|SOLIDWORKS Assembly Machining — Fixture and Multi-Part Setups]]
- [[camworks-cam-tips-cw-199|Fixture Probing — Work Coordinate System Alignment from Part Features]]
