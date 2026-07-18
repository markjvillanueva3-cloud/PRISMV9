---
name: tribal-pm-017
category: code-tribal
subdomain: optimization
domain: tribal-knowledge
tags: ["arc-fitting", "nc-file-size", "g02-g03", "controller-memory"]
confidence: 90
source: "web:powermill-docs"
promoted_from: knowledge/tribal/powermill-cam-tips-pm-017.md
promoted_at: 2026-05-26T16:07:20.372Z
---

# Arc Fitting Reduces NC File Size by 60-80%

Enable arc fitting in PowerMill output settings to convert sequences of linear moves into G02/G03 arcs where applicable. This reduces NC file size by 60-80% on curved surfaces while maintaining the same geometric accuracy. Set arc tolerance equal to or tighter than the toolpath tolerance. Arc fitting is especially beneficial for older controllers with limited memory or look-ahead, as fewer blocks means the controller can maintain commanded feed rate without buffer underruns.

**Category:** optimization
**Confidence:** 90
**Source:** web:powermill-docs
**Operations:** finishing

## Related
- [[surfcam-cam-tips-sc2-084|Arc Fitting Replaces Dense Points with Smooth Arcs]]
- [[bobcad-cam-tips-bc-101|Smooth Flow and Arc Fitting for HSM Controllers]]
- [[bobcad-cam-tips-bc-135|BobCAD V36 High-Speed Machining Output Optimization]]
- [[bobcad-cam-tips-bc-195|BobCAD Hard Milling Toolpath Smoothing for Surface Quality]]
- [[camworks-cam-tips-cw-028|VoluMill Corner Strategies — Manage Engagement Spikes in Tight Radii]]
