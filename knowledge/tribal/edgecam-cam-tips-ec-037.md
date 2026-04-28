---
id: "ec-037"
title: "Turning Finishing with Spring Pass for Accuracy"
source: "web:edgecam-turning"
confidence: 89
category: "cam_strategy"
tags: ["turning", "finishing", "spring-pass", "deflection"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.281Z
---

# Turning Finishing with Spring Pass for Accuracy

After finish turning, program a spring pass (identical finishing pass with zero additional stock removal) to cut the material that deflected away from the tool during the first finish pass. The spring pass removes 0.01-0.05mm depending on part rigidity and cutting force. This is essential for long slender shafts (L/D > 5) and thin-wall cylinders where deflection causes oversize. Reduce feed rate to 50-70% of the finishing feed for the spring pass.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:edgecam-turning
**Operations:** turning_finishing

## Related
- [[gibbscam-cam-tips-gc-054|Finish turning spring pass removes deflection error from the first pass]]
- [[camworks-cam-tips-cw-064|Turn Finishing — Single-Pass Profile Following with Spring Cut Option]]
- [[mastercam-cam-tips-mc-175|Spring passes in micro finishing remove deflection-induced oversize material]]
- [[bobcad-cam-tips-bc-044|Finish Turning with Insert Angle Gouge Protection]]
- [[catia-cam-tips-cat-036|Lathe Finish Turning Nose Radius Compensation Critical]]
