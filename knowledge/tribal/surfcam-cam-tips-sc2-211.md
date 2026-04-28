---
id: "sc2-211"
title: "SURFCAM Multi-Channel Post for Mill-Turn Machines"
source: "web:surfcam-docs"
confidence: 0.86
category: "post_processing"
tags: ["multi-channel", "mill-turn", "synchronization", "dual-spindle", "turret"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.213Z
---

# SURFCAM Multi-Channel Post for Mill-Turn Machines

SURFCAM's multi-channel post processor generates synchronized G-code for mill-turn machines with multiple spindles and turrets. Each channel (main spindle, sub-spindle, upper turret, lower turret) gets its own NC program or program section. Synchronization points are inserted as M-codes or wait/sync commands. Define the channel assignment in the operation properties — each SURFCAM operation maps to a specific channel. The post merges channels into the machine's expected format (Mazak: multi-program, Okuma: $1/$2 sections, DMG: channel blocks). Test synchronization timing carefully to prevent collisions.

**Category:** post_processing
**Confidence:** 0.86
**Source:** web:surfcam-docs
**Operations:** turning, milling

## Related
- [[controller-knowledge-tips-ctrl-076|Multi-Channel Programming and Channel Synchronization]]
- [[edgecam-cam-tips-ec-145|Code Wizard Multi-Channel Output for Mill-Turn]]
- [[fusion360-cam-tips-ext-f360-066|Multi-Channel Synchronization for Mill-Turn 5-Axis]]
- [[topsolid-cam-tips-ts-128|TopSolid'Cam 7 Multi-Channel Synchronization for Mill-Turn]]
- [[bobcad-cam-tips-bc-145|BobCAD Mill-Turn Dual-Spindle Part Transfer Programming]]
