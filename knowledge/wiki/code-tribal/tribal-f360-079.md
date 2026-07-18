---
name: tribal-f360-079
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["fusion360", "mill-turn", "part-transfer", "sub-spindle", "synchronization"]
confidence: 83
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-079.md
promoted_at: 2026-06-09T22:31:16.271Z
---

# Part Transfer Between Main and Sub Spindle

For parts requiring machining on both ends, use Fusion's Part Transfer feature to program the handoff from main spindle to sub spindle. Define the transfer type (push or pull), gripping overlap distance (typically 5-15mm), and synchronization speed. After transfer, create a second setup referencing the sub-spindle with inverted Z-axis direction. Always verify the transfer G-code sequence in simulation — incorrect clamping pressure or synchronization timing can eject the part.

**Category:** cam_strategy
**Confidence:** 83
**Source:** web:fusion360-docs
**Operations:** mill_turn

## Related
- [[fusion360-cam-tips-ext-f360-133|Sub-Spindle Transfer and Back Working]]
- [[fusion360-cam-tips-ext-f360-066|Multi-Channel Synchronization for Mill-Turn 5-Axis]]
- [[bobcad-cam-tips-bc-145|BobCAD Mill-Turn Dual-Spindle Part Transfer Programming]]
- [[esprit-cam-tips-esp-148|Mill-Turn Spindle Synchronization for Part Transfer]]
- [[sprutcam-cam-tips-spr-005|Mill-Turn Synchronization for Sub-Spindle Transfer]]
