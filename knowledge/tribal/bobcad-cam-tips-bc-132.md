---
id: "bc-132"
title: "BobCAD V36 Rest Machining with Stock Model Tracking"
source: "web:bobcad-docs"
confidence: 0.89
category: "cam_strategy"
tags: ["v36", "rest-machining", "stock-model", "progressive-tools", "air-cutting"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.560Z
---

# BobCAD V36 Rest Machining with Stock Model Tracking

V36 enhances rest machining by maintaining a precise in-process stock model updated after each operation. The rest machining algorithm computes toolpaths only where the smaller tool can access material the larger tool left behind. Select 'From Previous Operation' as the stock source to use the actual remaining material shape. For deep pockets with corner radii, use 3-4 progressive tool sizes — the system automatically limits cutting to the uncleared fillets and corners. This eliminates air cutting and reduces finishing time by 20-40%.

**Category:** cam_strategy
**Confidence:** 0.89
**Source:** web:bobcad-docs
**Operations:** roughing, finishing

## Related
- [[esprit-cam-tips-esp-006|ProfitMilling Rest Machining from Previous Stock]]
- [[bobcad-cam-tips-bc-027|3D Rest Machining from Stock Model]]
- [[bobcad-cam-tips-bc-197|BobCAD Rest Machining Progressive Tool Strategy for Hard Milling]]
- [[camworks-cam-tips-cw-043|Rest Machining — Automatic Stock Model for Multi-Tool Finishing]]
- [[edgecam-cam-tips-ec-006|Rest Machining from Waveform with Smaller Cutter]]
