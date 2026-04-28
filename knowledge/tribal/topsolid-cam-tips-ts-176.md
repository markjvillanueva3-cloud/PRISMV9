---
id: "ts-176"
title: "TopSolid Additive Build Orientation — Optimizing for Subsequent Machining"
source: "web:topsolid-docs"
confidence: 83
category: "cam_strategy"
tags: ["topsolid", "additive", "build-orientation", "pbf", "machinability"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.520Z
---

# TopSolid Additive Build Orientation — Optimizing for Subsequent Machining

When planning powder bed fusion (PBF) builds that will require post-build machining, optimize the build orientation for machinability: critical surfaces perpendicular to the build plate (best dimensional accuracy), support structures on non-functional surfaces (minimize cleanup machining), and flat datum surfaces parallel to the build plate for fixturing. TopSolid analyzes the part geometry and recommends build orientations that balance print quality, support volume, and post-processing machinability. A poor build orientation can double or triple the post-machining time.

**Category:** cam_strategy
**Confidence:** 83
**Source:** web:topsolid-docs
**Operations:** general

## Related
- [[topsolid-cam-tips-ts-178|TopSolid Support Structure Design for Metal PBF]]
- [[topsolid-cam-tips-ts-174|TopSolid Hybrid Additive-Subtractive — DED Build and Machine]]
- [[topsolid-cam-tips-ts-175|TopSolid Additive Feature Repair — Adding Material to Worn Parts]]
- [[topsolid-cam-tips-ts-177|TopSolid Multi-Material Additive — Gradient Structures]]
- [[topsolid-cam-tips-ts-179|TopSolid Additive Cost Estimation — Material, Time, and Post-Processing]]
