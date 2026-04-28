---
id: "ec-003"
title: "Waveform Chip Thinning Automatically Increases Feed"
source: "web:edgecam-waveform"
confidence: 91
category: "speeds_feeds"
tags: ["waveform", "chip-thinning", "feed-rate", "engagement"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.251Z
---

# Waveform Chip Thinning Automatically Increases Feed

Waveform automatically applies chip thinning compensation when radial engagement drops below 50% of tool diameter. At low radial engagement, the actual chip is thinner than the programmed feed-per-tooth, so Edgecam increases the feed rate to maintain the target chip thickness. At 10% engagement, feed can be 2.5-3x the nominal rate. This prevents rubbing (which causes heat and premature wear) and maintains productive cutting at all times.

**Category:** speeds_feeds
**Confidence:** 91
**Source:** web:edgecam-waveform
**Operations:** roughing

## Related
- [[edgecam-cam-tips-ec-002|Waveform Trochoidal Mode for Narrow Slots]]
- [[edgecam-cam-tips-ec-004|Waveform Corner Strategies Prevent Load Spikes]]
- [[edgecam-cam-tips-ec-121|Waveform Roughing Morphing Zone Control]]
- [[worknc-cam-tips-wnc-155|Waveform Roughing — Constant Engagement Angle for Maximum MRR]]
- [[esprit-cam-tips-esp-003|ProfitMilling Chip Thinning Compensation Boosts Feed Rates]]
