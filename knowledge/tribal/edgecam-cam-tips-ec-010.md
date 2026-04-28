---
id: "ec-010"
title: "Waveform vs Conventional Roughing Decision Matrix"
source: "web:edgecam-waveform"
confidence: 88
category: "cam_strategy"
tags: ["waveform", "conventional", "decision", "comparison"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.256Z
---

# Waveform vs Conventional Roughing Decision Matrix

Use Waveform for: deep pockets (>1x tool diameter), complex shapes with islands and corners, hard materials (>35 HRC), and when tool life is critical. Use conventional roughing for: simple open faces, shallow pockets (<0.5x diameter depth), soft materials with no engagement concerns, and when programming time must be minimized. Waveform adds 20-30% more G-code points than conventional, so ensure your controller has adequate block processing speed (>1000 blocks/sec).

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:edgecam-waveform
**Operations:** roughing

## Related
- [[edgecam-cam-tips-ec-001|Waveform Roughing Maintains Constant Tool Engagement]]
- [[edgecam-cam-tips-ec-002|Waveform Trochoidal Mode for Narrow Slots]]
- [[edgecam-cam-tips-ec-003|Waveform Chip Thinning Automatically Increases Feed]]
- [[edgecam-cam-tips-ec-004|Waveform Corner Strategies Prevent Load Spikes]]
- [[edgecam-cam-tips-ec-005|Waveform Multi-Level with Progressive Depth Control]]
