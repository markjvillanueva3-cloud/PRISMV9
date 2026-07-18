---
name: tribal-ec-145
category: code-tribal
subdomain: post_processing
domain: tribal-knowledge
tags: ["code-wizard", "multi-channel", "mill-turn", "synchronization"]
confidence: 0
source: "web:edgecam-docs"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-145.md
promoted_at: 2026-06-09T22:31:16.195Z
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
