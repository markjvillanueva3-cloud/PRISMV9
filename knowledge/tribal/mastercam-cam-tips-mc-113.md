---
id: "mc-113"
title: "Reduce air cutting by using stock-aware toolpaths and tight containment boundaries"
source: "web:community"
confidence: 87
category: "cam_strategy"
tags: ["mastercam", "air-cutting", "stock-aware", "containment", "cycle-time", "optimization"]
_source: "mastercam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.197Z
---

# Reduce air cutting by using stock-aware toolpaths and tight containment boundaries

Air cutting (tool moving at cutting feed with no material contact) wastes 10-35% of cycle time on complex parts. Three strategies to minimize it: (1) use Stock Model as input for every operation after the first, so the toolpath only engages where material exists; (2) define tight containment boundaries around each feature instead of using the full part boundary; (3) enable Mastercam's air-region detection which lifts and rapids across verified empty zones. Combining all three typically recovers 15-25% of total cycle time.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:community
**Operations:** roughing, finishing

## Related
- [[mastercam-cam-tips-mc-261|Stock-aware multi-axis finishing uses in-process stock model to avoid air cutting on previously machined areas]]
- [[mastercam-cam-tips-mc-040|Dynamic Mill micro lifts eliminate full retracts between slices]]
- [[mastercam-cam-tips-mc-049|Core Rough targets island walls specifically for reduced cycle time]]
- [[mastercam-cam-tips-mc-116|Depth-first ordering reduces tool changes; breadth-first reduces setup complexity]]
- [[mastercam-cam-tips-mc-117|Common edge detection in Mastercam prevents double-cutting shared pocket walls]]
