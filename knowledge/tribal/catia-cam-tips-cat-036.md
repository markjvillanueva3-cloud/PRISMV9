---
id: "cat-036"
title: "Lathe Finish Turning Nose Radius Compensation Critical"
source: "web:catia-docs"
confidence: 91
category: "cam_strategy"
tags: ["catia", "lathe", "finishing", "nose-radius", "compensation", "turning"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.829Z
---

# Lathe Finish Turning Nose Radius Compensation Critical

In CATIA Lathe Finishing operations, always specify the insert nose radius correctly in the tool definition. CATIA uses the nose radius to compute the compensated tool path — an incorrect value causes dimensional errors proportional to the radius difference. Enable Finish Allowance of 0.0mm for the final pass. Use Tool Nose Radius Compensation (TNRC) mode 'With Compensation' and ensure the post-processor outputs G41/G42 correctly for your controller.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:catia-docs
**Operations:** finish_turning

## Related
- [[catia-cam-tips-cat-041|Contour Turning Combines Roughing and Finishing in One Profile]]
- [[catia-cam-tips-cat-035|Lathe Roughing Strategy Selection Based on Material Hardness]]
- [[catia-cam-tips-cat-037|Groove Turning Insert Width Must Match or Undersize Groove]]
- [[catia-cam-tips-cat-038|Thread Turning Infeed Strategy Affects Thread Quality]]
- [[catia-cam-tips-cat-039|Face Turning Constant Surface Speed for Uniform Finish]]
