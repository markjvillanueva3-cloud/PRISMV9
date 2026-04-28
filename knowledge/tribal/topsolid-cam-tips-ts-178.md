---
id: "ts-178"
title: "TopSolid Support Structure Design for Metal PBF"
source: "web:topsolid-docs"
confidence: 83
category: "cam_strategy"
tags: ["topsolid", "additive", "support-structure", "pbf", "lattice"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.522Z
---

# TopSolid Support Structure Design for Metal PBF

TopSolid'Design generates support structures for metal powder bed fusion parts: lattice supports for general overhang regions, solid supports for critical datum surfaces, and cone/tooth supports for easy removal. Support contact area affects removal difficulty — minimize contact width (0.3-0.5mm teeth) for manual removal. For supports on machined surfaces, extend 0.5-1mm above the nominal surface to provide cleanup stock. TopSolid can export the supported part in native format for direct transfer to build preparation software (Materialise Magics, Autodesk Netfabb).

**Category:** cam_strategy
**Confidence:** 83
**Source:** web:topsolid-docs
**Operations:** general

## Related
- [[topsolid-cam-tips-ts-176|TopSolid Additive Build Orientation — Optimizing for Subsequent Machining]]
- [[topsolid-cam-tips-ts-174|TopSolid Hybrid Additive-Subtractive — DED Build and Machine]]
- [[topsolid-cam-tips-ts-175|TopSolid Additive Feature Repair — Adding Material to Worn Parts]]
- [[topsolid-cam-tips-ts-177|TopSolid Multi-Material Additive — Gradient Structures]]
- [[topsolid-cam-tips-ts-179|TopSolid Additive Cost Estimation — Material, Time, and Post-Processing]]
