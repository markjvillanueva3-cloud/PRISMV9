---
name: tribal-bc-112
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["reaming", "g85", "precision", "dwell", "drill-group"]
confidence: 87
source: "web:bobcad-reaming"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-112.md
promoted_at: 2026-06-09T22:31:15.960Z
---

# Reaming for Precision Hole Finishing

BobCAD reaming uses G85 (feed-in, feed-out) at 50-70% of drilling speed and 2-3x drilling feed rate. Stock removal: 0.1-0.3mm per side. Program 0.5s dwell at bottom for hole sizing. For blind holes, set reaming depth 2mm shorter than drilled depth. BobCAD handles the speed/feed transition from drilling to reaming automatically when both operations are in the same drill group — the posted code includes the correct modal changes.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:bobcad-reaming
**Operations:** reaming, drilling

## Related
- [[surfcam-cam-tips-sc2-096|Reaming with Controlled Feed and Speed for Accuracy]]
- [[camworks-cam-tips-cw-102|Reaming — Slow Speed Precision Finishing for Tight-Tolerance Holes]]
- [[esprit-cam-tips-esp-082|Reaming Cycle with Controlled Feed and Dwell]]
- [[topsolid-cam-tips-ts-089|Reaming with Controlled Feed and Speed]]
- [[worknc-cam-tips-wnc-085|Reaming with Controlled Feed and Speed]]
