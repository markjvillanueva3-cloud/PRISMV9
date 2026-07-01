---
name: tribal-ts-178
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["topsolid", "additive", "support-structure", "pbf", "lattice"]
confidence: 83
source: "web:topsolid-docs"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-178.md
promoted_at: 2026-06-09T22:31:16.776Z
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
