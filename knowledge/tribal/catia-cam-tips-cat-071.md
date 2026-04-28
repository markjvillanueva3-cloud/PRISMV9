---
id: "cat-071"
title: "Multi-Axis Post-Processor RTCP and TCP Mode Configuration"
source: "web:catia-docs"
confidence: 91
category: "cam_strategy"
tags: ["catia", "multi-axis", "post-processor", "rtcp", "tcp"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.856Z
---

# Multi-Axis Post-Processor RTCP and TCP Mode Configuration

For 5-axis post-processors in CATIA, correctly configure RTCP (Rotated Tool Center Point) or TCP (Tool Center Point) mode. If your controller supports RTCP (Fanuc G43.4, Siemens TRAORI, Heidenhain TCPM), enable it in the PP table and output tool tip coordinates with rotary angles — the controller handles the pivot compensation. Without RTCP, the post must output machine coordinates (including pivot length offsets) and the NC code becomes machine-specific. Mismatched RTCP settings cause large positioning errors.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:catia-docs
**Operations:** post_processing

## Related
- [[catia-cam-tips-cat-188|Multi-Axis Post Processor Rotary Axis Output Configuration]]
- [[edgecam-cam-tips-ec-075|Multi-Axis Post Processors for 4/5-Axis Machines]]
- [[topsolid-cam-tips-ts-068|Multi-Axis Post Configuration Handles RTCP/TCP]]
- [[worknc-cam-tips-wnc-060|Multi-Axis Post Handles TCP/RTCP Transformations]]
- [[catia-cam-tips-cat-025|Multi-Axis Sweeping Lead/Lag Angle for Surface Quality]]
