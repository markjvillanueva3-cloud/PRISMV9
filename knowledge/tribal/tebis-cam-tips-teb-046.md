---
id: "teb-046"
title: "Surface Extension Prevents Edge Rollover on Open Boundaries"
source: "web:tebis-docs"
confidence: 89
category: "finishing"
tags: ["surface-extension", "edge-rollover", "boundary", "overcut"]
_source: "tebis-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.256Z
---

# Surface Extension Prevents Edge Rollover on Open Boundaries

Extend machining surfaces by 2-5mm beyond part edges before finishing. Tebis surface extension creates tangent-continuous extensions that let the tool ride onto and off the part smoothly. Without extension, the ball endmill decelerates at the edge, causing over-cutting (edge rollover) of 0.01-0.03mm. The extension also prevents burr formation at open edges. Use G2 (curvature-continuous) extension for Class A surfaces.

**Category:** finishing
**Confidence:** 89
**Source:** web:tebis-docs
**Operations:** finishing

## Related
- [[cimatron-cam-tips-cim-035|Surface Extension for Clean Tool Exit]]
- [[cimatron-cam-tips-cim-073|Surface Extension for Clean Tool Exit]]
- [[hypermill-cam-tips-ext-hm-143|Surface Extension for Clean Tool Exit]]
- [[powermill-cam-tips-pm-200|Surface Extension Best Practices]]
- [[sprutcam-cam-tips-spr-070|Surface Extension for Clean Tool Exit]]
