---
id: "ts-175"
title: "TopSolid Additive Feature Repair — Adding Material to Worn Parts"
source: "web:topsolid-docs"
confidence: 84
category: "cam_strategy"
tags: ["topsolid", "additive", "repair", "ded", "worn-parts"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.519Z
---

# TopSolid Additive Feature Repair — Adding Material to Worn Parts

TopSolid programs additive repair workflows: scan the worn part, compare to nominal CAD, calculate the material deficit volume, and generate DED toolpaths to rebuild the worn region. Then program finish machining to restore the nominal geometry. This is critical for high-value aerospace and energy components (turbine blades, bearing journals, seal surfaces) where the base part costs $10K-100K. TopSolid handles the coordinate alignment between the scan data, nominal model, and machine coordinate system. Post-repair inspection probing verifies the restored dimensions.

**Category:** cam_strategy
**Confidence:** 84
**Source:** web:topsolid-docs
**Operations:** milling, general

## Related
- [[topsolid-cam-tips-ts-174|TopSolid Hybrid Additive-Subtractive — DED Build and Machine]]
- [[topsolid-cam-tips-ts-177|TopSolid Multi-Material Additive — Gradient Structures]]
- [[powermill-cam-tips-pm-070|Additive/Hybrid Manufacturing with PowerMill]]
- [[sprutcam-cam-tips-spr-191|Additive DED for Repair and Build-Up]]
- [[tebis-cam-tips-teb-125|Additive/Hybrid Manufacturing Integration]]
