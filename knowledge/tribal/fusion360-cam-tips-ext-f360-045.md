---
id: "f360-045"
title: "Chip Load vs DOC Relationship in Adaptive Clearing"
source: "web:fusion360-docs"
confidence: 87
category: "speeds_feeds"
tags: ["fusion360", "adaptive-clearing", "chip-load", "depth-of-cut", "feed-rate"]
_source: "fusion360-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:42.659Z
---

# Chip Load vs DOC Relationship in Adaptive Clearing

In Adaptive Clearing, chip load (feed per tooth) and depth of cut are inversely related for constant tool load. When you double the axial depth from 1xD to 2xD, reduce chip load by 25-30% to maintain the same cutting force. Fusion's feed rate calculator does not automatically adjust for this relationship — you must manually reduce the feed rate when increasing depth to prevent overloading the tool's weakest section at full flute engagement.

**Category:** speeds_feeds
**Confidence:** 87
**Source:** web:fusion360-docs
**Operations:** 3d_adaptive, 2d_adaptive

## Related
- [[fusion360-cam-tips-ext-f360-040|Fine-Tune Optimal Load by Material Hardness]]
- [[fusion360-cam-tips-ext-f360-041|Multi-Depth Adaptive with Progressive Stepdown]]
- [[fusion360-cam-tips-ext-f360-042|Rest Machining Adaptive with Tight Tolerance Overlap]]
- [[fusion360-cam-tips-ext-f360-043|Separate Radial and Axial Stock-to-Leave for Adaptive]]
- [[fusion360-cam-tips-ext-f360-044|Control Entry Position to Avoid Thin Walls]]
