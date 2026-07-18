---
name: tribal-mc-209
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "transfer-move", "rapid", "direct-transfer", "collision-check", "linking"]
confidence: 85
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-209.md
promoted_at: 2026-06-09T22:31:16.446Z
---

# Transfer moves between features should use rapid positioning with collision-checked paths

Transfer moves (repositioning between unconnected cutting regions) are non-cutting moves that should be as fast as possible without collision risk. In Mastercam, transfer moves default to rapid traverse (G0) with a retract-to-clearance-plane path. For faster transfers on parts with no obstruction between features, enable Direct transfer (tool rapids directly between features at clearance height without full retract). For parts with tall features or fixtures between cutting regions, use Safe retract that guarantees collision-free paths by retracting to the maximum Z before repositioning. The Output Feed Move option forces transfer moves to feed rate instead of rapid — use this only when the machine's rapid moves don't follow the exact programmed path (older machines with rounded rapid corners). In Mastercam Machine Simulation, transfer moves are shown in a different color — verify every transfer for collision.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:community
**Operations:** roughing, finishing

## Related
- [[mastercam-cam-tips-mc-040|Dynamic Mill micro lifts eliminate full retracts between slices]]
- [[mastercam-cam-tips-mc-114|Toolpath linking parameters control retract height, lead-in, and lead-out strategy]]
- [[mastercam-cam-tips-mc-139|Micro-retract minimization in hard milling prevents re-engagement shock on brittle tools]]
- [[mastercam-cam-tips-mc-206|Feed plane position controls where the tool transitions from rapid to feed rate on approach]]
- [[mastercam-cam-tips-mc-207|Retract height optimization uses incremental mode to minimize vertical travel on variable-height parts]]
