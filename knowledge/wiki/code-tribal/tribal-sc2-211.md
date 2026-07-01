---
name: tribal-sc2-211
category: code-tribal
subdomain: post_processing
domain: tribal-knowledge
tags: ["multi-channel", "mill-turn", "synchronization", "dual-spindle", "turret"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-211.md
promoted_at: 2026-06-09T22:31:16.706Z
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
