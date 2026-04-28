---
id: "ec-124"
title: "Waveform Plunge Strategy for Deep Pockets"
source: "web:edgecam-docs"
confidence: 0.86
category: "cam_strategy"
tags: ["waveform", "plunge", "helical-entry", "deep-pocket"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.363Z
---

# Waveform Plunge Strategy for Deep Pockets

For deep pockets exceeding 3x tool diameter depth, configure Waveform's plunge strategy to use helical entry with controlled helix angle (2-4° for steel, 5-8° for aluminum). Set the helix radius to 60-80% of pocket corner radius to ensure clearance. Enable 'ramp from outside' when possible to start the helix from open stock rather than plunging into enclosed material. The pre-drill option can further reduce cycle time by drilling a clearance hole at the helix center.

**Category:** cam_strategy
**Confidence:** 0.86
**Source:** web:edgecam-docs
**Operations:** roughing, pocketing

## Related
- [[edgecam-cam-tips-ec-005|Waveform Multi-Level with Progressive Depth Control]]
- [[surfcam-cam-tips-sc2-126|Helical Entry for Deep Pocket and Hole Features]]
- [[edgecam-cam-tips-ec-001|Waveform Roughing Maintains Constant Tool Engagement]]
- [[edgecam-cam-tips-ec-002|Waveform Trochoidal Mode for Narrow Slots]]
- [[edgecam-cam-tips-ec-003|Waveform Chip Thinning Automatically Increases Feed]]
