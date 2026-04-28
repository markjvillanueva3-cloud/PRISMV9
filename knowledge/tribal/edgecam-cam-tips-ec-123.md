---
id: "ec-123"
title: "Waveform Rest Roughing with Automatic Stock Tracking"
source: "web:edgecam-docs"
confidence: 0.87
category: "cam_strategy"
tags: ["waveform", "rest-roughing", "stock-tracking", "multi-tool"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.362Z
---

# Waveform Rest Roughing with Automatic Stock Tracking

Waveform rest roughing uses the in-process stock model to detect remaining material after a larger tool pass. Set the previous tool diameter accurately — Edgecam generates Waveform paths only where material remains. Enable 'detect thin walls' to prevent the rest roughing tool from plunging into already-machined thin sections. For multi-level rest roughing, run largest-to-smallest tool order and update the stock model after each operation.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:edgecam-docs
**Operations:** roughing

## Related
- [[worknc-cam-tips-wnc-159|WorkNC Re-Machining with Stock Tracking — Multi-Tool Roughing]]
- [[edgecam-cam-tips-ec-001|Waveform Roughing Maintains Constant Tool Engagement]]
- [[edgecam-cam-tips-ec-002|Waveform Trochoidal Mode for Narrow Slots]]
- [[edgecam-cam-tips-ec-003|Waveform Chip Thinning Automatically Increases Feed]]
- [[edgecam-cam-tips-ec-004|Waveform Corner Strategies Prevent Load Spikes]]
