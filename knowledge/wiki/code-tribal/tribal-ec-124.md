---
name: tribal-ec-124
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["waveform", "plunge", "helical-entry", "deep-pocket"]
confidence: 0
source: "web:edgecam-docs"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-124.md
promoted_at: 2026-06-09T22:31:16.189Z
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
