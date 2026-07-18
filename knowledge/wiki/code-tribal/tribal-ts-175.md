---
name: tribal-ts-175
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["topsolid", "additive", "repair", "ded", "worn-parts"]
confidence: 84
source: "web:topsolid-docs"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-175.md
promoted_at: 2026-06-09T22:31:16.776Z
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
