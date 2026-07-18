---
name: tribal-ec-123
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["waveform", "rest-roughing", "stock-tracking", "multi-tool"]
confidence: 0
source: "web:edgecam-docs"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-123.md
promoted_at: 2026-06-09T22:31:16.189Z
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
