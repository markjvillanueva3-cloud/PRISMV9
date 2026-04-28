---
id: "mc-210"
title: "Air cut minimization uses stock-aware linking to skip regions with no material"
source: "web:community"
confidence: 86
category: "cam_strategy"
tags: ["mastercam", "air-cut", "stock-aware", "rapid-through", "rest-machining", "linking"]
_source: "mastercam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.287Z
---

# Air cut minimization uses stock-aware linking to skip regions with no material

Mastercam's linking engine can detect air regions (areas where the tool would travel at feed rate but contact no material) and convert them to rapid moves. Enable this by using Stock Model input and selecting 'Skip air regions' or 'Rapid through air' in the linking parameters. The toolpath maintains cutting feed only when the tool is in contact with stock, then switches to rapid for transitions across empty zones. This is particularly effective for rest machining operations where large areas of the part are already at final dimension and only isolated pockets of rest material need cutting. Without air-region detection, the finishing tool methodically traverses the entire part surface at feed rate even over zones with zero remaining stock. On rest operations, air-region skipping reduces cycle time by 20–50%. The stock model accuracy directly affects the quality of air-region detection.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:community
**Operations:** finishing, roughing

## Related
- [[mastercam-cam-tips-mc-040|Dynamic Mill micro lifts eliminate full retracts between slices]]
- [[mastercam-cam-tips-mc-113|Reduce air cutting by using stock-aware toolpaths and tight containment boundaries]]
- [[mastercam-cam-tips-mc-114|Toolpath linking parameters control retract height, lead-in, and lead-out strategy]]
- [[mastercam-cam-tips-mc-139|Micro-retract minimization in hard milling prevents re-engagement shock on brittle tools]]
- [[mastercam-cam-tips-mc-178|Stock model generation from previous operations provides accurate rest material boundaries]]
