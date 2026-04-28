---
id: "ec-145"
title: "Code Wizard Multi-Channel Output for Mill-Turn"
source: "web:edgecam-docs"
confidence: 0.84
category: "post_processing"
tags: ["code-wizard", "multi-channel", "mill-turn", "synchronization"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.379Z
---

# Code Wizard Multi-Channel Output for Mill-Turn

For multi-channel mill-turn machines (e.g., twin-spindle with Y-axis), configure Code Wizard to generate synchronized output. Define channel mappings: main spindle = Channel 1, sub-spindle = Channel 2. Use synchronization codes (WAIT/M-code handshakes) at transfer points. The post tracks both spindles' positions independently and generates proper G14/G15 plane switching or manufacturer-specific syntax (Mazak SMOOTH, Okuma OSP).

**Category:** post_processing
**Confidence:** 0.84
**Source:** web:edgecam-docs
**Operations:** turning, milling

## Related
- [[controller-knowledge-tips-ctrl-076|Multi-Channel Programming and Channel Synchronization]]
- [[fusion360-cam-tips-ext-f360-066|Multi-Channel Synchronization for Mill-Turn 5-Axis]]
- [[surfcam-cam-tips-sc2-211|SURFCAM Multi-Channel Post for Mill-Turn Machines]]
- [[topsolid-cam-tips-ts-128|TopSolid'Cam 7 Multi-Channel Synchronization for Mill-Turn]]
- [[camworks-cam-tips-cw-166|Swiss-Type Simultaneous Operations — Overlapped Milling and Turning]]
