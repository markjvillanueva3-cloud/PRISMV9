---
id: "ts-174"
title: "TopSolid Hybrid Additive-Subtractive — DED Build and Machine"
source: "web:topsolid-docs"
confidence: 85
category: "cam_strategy"
tags: ["topsolid", "additive", "ded", "hybrid", "build"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.519Z
---

# TopSolid Hybrid Additive-Subtractive — DED Build and Machine

TopSolid supports hybrid additive manufacturing with Directed Energy Deposition (DED) followed by CNC machining. Program the build-up sequence (laser/arc deposition layer by layer) and the intermediate machining operations in a single project. For DED-built features, TopSolid manages the near-net stock shape and generates finish machining toolpaths referencing the as-built geometry. Key advantage: machine critical surfaces while the part is still on the build platform, using the build coordinate system. This eliminates re-fixturing errors for features that reference the build datum.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:topsolid-docs
**Operations:** milling, general

## Related
- [[topsolid-cam-tips-ts-175|TopSolid Additive Feature Repair — Adding Material to Worn Parts]]
- [[topsolid-cam-tips-ts-177|TopSolid Multi-Material Additive — Gradient Structures]]
- [[cimatron-cam-tips-cim-146|Additive/Hybrid Manufacturing for Mold Repair]]
- [[esprit-cam-tips-esp-168|Hybrid Additive-Subtractive Programming in ESPRIT]]
- [[nx-cam-tips-ext-nx-128|Additive Manufacturing in NX]]
