---
name: tribal-ts-050
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["sub-spindle", "transfer", "stock-update", "mill-turn"]
confidence: 91
source: "web:topsolid-subspindle"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-050.md
promoted_at: 2026-05-26T16:07:20.747Z
---

# Sub-Spindle Transfer with Automatic Stock Update

TopSolid manages sub-spindle part transfer operations with automatic stock model update. After OP1 on the main spindle, the system simulates the part pickup by the sub-spindle, including cutoff and face cleanup, and automatically creates the OP2 stock model reflecting the as-machined state. Define the transfer point, grip length, and cutoff width in the transfer operation. The sub-spindle coordinate system is automatically mirrored for correct tool orientation.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:topsolid-subspindle
**Operations:** turning

## Related
- [[sprutcam-cam-tips-spr-005|Mill-Turn Synchronization for Sub-Spindle Transfer]]
- [[bobcad-cam-tips-bc-056|Sub-Spindle Transfer for Complete Part Machining]]
- [[esprit-cam-tips-esp-043|Sub-Spindle Transfer Sequence Critical for Part Quality]]
- [[esprit-cam-tips-esp-148|Mill-Turn Spindle Synchronization for Part Transfer]]
- [[fusion360-cam-tips-ext-f360-079|Part Transfer Between Main and Sub Spindle]]
