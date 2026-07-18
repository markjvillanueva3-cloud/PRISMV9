---
name: tribal-bc-178
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["nesting", "tabs", "micro-joints", "snap-tabs", "sheet-metal"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-178.md
promoted_at: 2026-06-09T22:31:15.976Z
---

# BobCAD Nesting Tab and Micro-Joint Placement for Sheet Parts

BobCAD automatically places tabs (micro-joints) to prevent nested parts from tipping or shifting after cutting. Set tab width (0.5-2mm for sheet metal) and spacing (every 50-100mm of perimeter). The nesting module places tabs at corners and mid-span of long straight edges. After cutting, parts are removed by breaking the tabs and deburring the tab locations. For parts requiring no deburring at tab locations, use 'snap tabs' — thinner tabs (0.3mm) that break cleanly. BobCAD generates a separate tab removal program if needed for critical edges.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:bobcad-docs
**Operations:** contouring, cutting

## Related
- [[bobcad-cam-tips-bc-175|BobCAD Nesting Module for Sheet Metal Cutting Optimization]]
- [[topsolid-cam-tips-ts-145|TopSolid Wire EDM Tab Management — Prevent Core Drop with Smart Tabs]]
- [[bobcad-cam-tips-bc-075|True-Shape Nesting for Maximum Sheet Yield]]
- [[bobcad-cam-tips-bc-176|BobCAD True-Shape Nesting vs Rectangular Nesting]]
- [[bobcad-cam-tips-bc-177|BobCAD Nesting with Common-Line Cutting]]
