---
id: "wnc-159"
title: "WorkNC Re-Machining with Stock Tracking — Multi-Tool Roughing"
source: "web:worknc-docs"
confidence: 91
category: "cam_strategy"
tags: ["re-machining", "stock-tracking", "multi-tool", "workflow"]
_source: "worknc-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.744Z
---

# WorkNC Re-Machining with Stock Tracking — Multi-Tool Roughing

WorkNC tracks the stock model through multiple roughing operations for accurate re-machining. The workflow: (1) Z-level roughing with large tool creates initial pockets, (2) waveform roughing with medium tool removes corners and step transitions, (3) re-machining with small tool reaches tight areas. Each operation receives the updated stock model from the previous step. Without stock tracking, the small tool would attempt to remove all material including areas already cleared, wasting 60-70% of cycle time on air cuts.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:worknc-docs
**Operations:** roughing, milling

## Related
- [[edgecam-cam-tips-ec-123|Waveform Rest Roughing with Automatic Stock Tracking]]
- [[catia-cam-tips-cat-105|Re-Machining Detects Residual Stock from Previous Operations]]
- [[worknc-cam-tips-wnc-129|Auto5 for Re-Machining — Reaching Material Missed by 3-Axis]]
- [[worknc-cam-tips-wnc-152|WorkNC Advanced Re-Machining — Automatic Rest Material Detection]]
- [[worknc-cam-tips-wnc-153|WorkNC Multi-Level Re-Machining — Progressive Tool Size Reduction]]
