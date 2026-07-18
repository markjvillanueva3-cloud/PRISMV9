---
name: tribal-cat-156
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "lathe", "sub-spindle", "part-transfer", "bar-feeder"]
confidence: 0
source: "web:dassault-forum"
promoted_from: knowledge/tribal/catia-cam-tips-cat-156.md
promoted_at: 2026-06-09T22:31:16.067Z
---

# CATIA Lathe Sub-Spindle Transfer and Bar-Feeder Programming

For multi-spindle CNC lathes with sub-spindle, CATIA Lathe Machining supports part transfer (handoff) programming. Define both spindles in the machine resource. Program OP1 on the main spindle (front-side machining), then add a 'Part Transfer' operation that defines: (1) sub-spindle approach position, (2) clamp/unclamp sequence, (3) cutoff operation if machining from bar stock. Program OP2 on the sub-spindle for back-side machining. CATIA synchronizes both spindles in the NC output, generating correct channel codes (e.g., Fanuc $1/$2) for simultaneous execution.

**Category:** cam_strategy
**Confidence:** 0.83
**Source:** web:dassault-forum
**Operations:** turning

## Related
- [[catia-cam-tips-cat-035|Lathe Roughing Strategy Selection Based on Material Hardness]]
- [[catia-cam-tips-cat-036|Lathe Finish Turning Nose Radius Compensation Critical]]
- [[catia-cam-tips-cat-037|Groove Turning Insert Width Must Match or Undersize Groove]]
- [[catia-cam-tips-cat-038|Thread Turning Infeed Strategy Affects Thread Quality]]
- [[catia-cam-tips-cat-039|Face Turning Constant Surface Speed for Uniform Finish]]
