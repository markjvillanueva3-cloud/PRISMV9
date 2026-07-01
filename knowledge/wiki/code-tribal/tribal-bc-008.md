---
name: tribal-bc-008
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["air-cut", "avoid-air-machining", "stock-aware", "cycle-time"]
confidence: 89
source: "web:bobcad-air-cut"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-008.md
promoted_at: 2026-06-09T22:31:15.933Z
---

# Air Cut Avoidance in Adaptive Roughing

BobCAD's 'Avoid Air Machining' option terminates the toolpath as soon as the stock is cleared from a region, accounting for the tool diameter. This eliminates the wasted passes that occur when conventional offset patterns continue beyond the stock boundary. For complex pocket shapes and near-net stock, this can reduce cycle time by 20-40%. Enable in all Adaptive Roughing operations. Set minimum engagement threshold to 5% of tool diameter to trigger the skip.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:bobcad-air-cut
**Operations:** roughing, pocketing

## Related
- [[bobcad-cam-tips-bc-105|Air Cut Reduction with Stock Model Awareness]]
- [[camworks-cam-tips-cw-030|VoluMill Air Cut Reduction — Minimize Non-Cutting Travel Time]]
- [[mastercam-cam-tips-mc-210|Air cut minimization uses stock-aware linking to skip regions with no material]]
- [[surfcam-cam-tips-sc2-009|TrueMill Air Cut Reduction via Stock Boundary Tracking]]
- [[surfcam-cam-tips-sc2-088|Air Cut Reduction Skips Empty Passes]]
