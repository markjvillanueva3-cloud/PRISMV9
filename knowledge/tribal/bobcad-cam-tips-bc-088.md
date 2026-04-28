---
id: "bc-088"
title: "Multi-Axis Post Configuration for Rotary Axes"
source: "web:bobcad-multiaxis-post"
confidence: 89
category: "post_processor"
tags: ["multi-axis-post", "rtcp", "rotary-axis", "controller-specific"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.526Z
---

# Multi-Axis Post Configuration for Rotary Axes

BobCAD multi-axis posting requires correct configuration of rotary axis directions, zero positions, and output format. For table-table machines, configure A/C directions matching the physical machine. For head-head, configure B/C. Set rotary output to shortest-path rotation. Configure RTCP (Rotary Tool Center Point) output to match your controller's requirements — Fanuc G43.4/G43.5, Siemens TRAORI, Heidenhain TCPM. Verify with a simple test part before production use.

**Category:** post_processor
**Confidence:** 89
**Source:** web:bobcad-multiaxis-post
**Operations:** posting, 5_axis

## Related
- [[surfcam-cam-tips-sc2-071|Multi-Axis Post Configuration for Rotary Axis Output]]
- [[gibbscam-cam-tips-gc-077|Multi-axis post processors handle rotary axis output and RTCP compensation]]
- [[catia-cam-tips-cat-071|Multi-Axis Post-Processor RTCP and TCP Mode Configuration]]
- [[catia-cam-tips-cat-188|Multi-Axis Post Processor Rotary Axis Output Configuration]]
- [[cimatron-cam-tips-cim-058|RTCP/TCPM Configuration in Post Processor]]
