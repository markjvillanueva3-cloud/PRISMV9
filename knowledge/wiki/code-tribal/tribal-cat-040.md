---
name: tribal-cat-040
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "lathe", "boring", "clearance", "deep-bore", "turning"]
confidence: 87
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-040.md
promoted_at: 2026-06-09T22:31:16.039Z
---

# Bore Turning Requires Minimum Bore Diameter for Tool Clearance

In CATIA Boring operations, the minimum bore diameter must be at least 1.5x the boring bar shank diameter for adequate chip clearance. Define the tool with correct minimum bore diameter, shank length, and overhang in the tool assembly. For deep bores (L/D > 4), reduce depth of cut by 50% and feedrate by 30% to control chatter. CATIA's collision checking verifies the bar clears the bore wall — enable it and include the turret/toolpost in the machine model.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:catia-docs
**Operations:** bore_turning

## Related
- [[catia-cam-tips-cat-035|Lathe Roughing Strategy Selection Based on Material Hardness]]
- [[catia-cam-tips-cat-036|Lathe Finish Turning Nose Radius Compensation Critical]]
- [[catia-cam-tips-cat-037|Groove Turning Insert Width Must Match or Undersize Groove]]
- [[catia-cam-tips-cat-038|Thread Turning Infeed Strategy Affects Thread Quality]]
- [[catia-cam-tips-cat-039|Face Turning Constant Surface Speed for Uniform Finish]]
