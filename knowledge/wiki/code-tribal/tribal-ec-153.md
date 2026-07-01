---
name: tribal-ec-153
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["b-axis", "sub-spindle", "part-transfer", "coordination"]
confidence: 0
source: "web:edgecam-forum"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-153.md
promoted_at: 2026-06-09T22:31:16.197Z
---

# B-Axis with Sub-Spindle Part Transfer Coordination

When programming B-axis operations before sub-spindle part transfer, ensure the B-axis is returned to 0° (home position) before the transfer sequence. Program a clearance move with B0 before the part catch/transfer M-codes. In the post processor, add a B-axis home check in the PartTransfer event. After transfer to sub-spindle, re-establish B-axis orientation relative to the new spindle centerline — the coordinate system flips with the part.

**Category:** cam_strategy
**Confidence:** 0.8
**Source:** web:edgecam-forum
**Operations:** turning

## Related
- [[catia-cam-tips-cat-156|CATIA Lathe Sub-Spindle Transfer and Bar-Feeder Programming]]
- [[esprit-cam-tips-esp-148|Mill-Turn Spindle Synchronization for Part Transfer]]
- [[fusion360-cam-tips-ext-f360-079|Part Transfer Between Main and Sub Spindle]]
- [[fusion360-cam-tips-ext-f360-133|Sub-Spindle Transfer and Back Working]]
- [[sprutcam-cam-tips-spr-047|Back-Working Operations on Sub-Spindle]]
