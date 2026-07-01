---
name: tribal-f360-106
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["fusion360", "arc-fitting", "g2-g3", "file-size", "smooth-motion"]
confidence: 86
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-106.md
promoted_at: 2026-06-09T22:31:16.278Z
---

# Arc Fitting to Replace Linear Segments

Enable Arc Fitting (Use Arcs option in the post processor) to convert sequences of short linear moves into G2/G3 arc interpolations. This is particularly effective for circular and rounded features where the toolpath would otherwise consist of hundreds of tiny G1 lines. Arc fitting reduces file size by 50-70% on curved features and produces smoother machine motion because the controller interpolates arcs natively rather than processing many short line segments. Verify arc output against your controller's minimum arc radius — some controls reject arcs below 0.1mm radius.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:fusion360-docs
**Operations:** general

## Related
- [[mastercam-cam-tips-mc-248|Toolpath filtering and arc fitting reduce NC file size and improve machine motion quality]]
- [[topsolid-cam-tips-ts-095|Arc Fitting Reduces NC File Size and Improves Motion]]
- [[worknc-cam-tips-wnc-046|Arc Fitting Reduces File Size and Improves Motion]]
- [[worknc-cam-tips-wnc-196|WorkNC Toolpath Smoothing — G2/G3 Arc Fitting for Controller Compatibility]]
- [[fusion360-cam-tips-ext-f360-051|Scallop Finishing with Smooth Offsets Enabled]]
