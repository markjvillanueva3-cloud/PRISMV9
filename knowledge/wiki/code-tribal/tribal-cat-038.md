---
name: tribal-cat-038
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "lathe", "threading", "infeed", "flank", "turning"]
confidence: 89
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-038.md
promoted_at: 2026-06-09T22:31:16.038Z
---

# Thread Turning Infeed Strategy Affects Thread Quality

CATIA Lathe threading supports three infeed strategies: Radial (straight plunge — simple but high forces), Flank (angled at 29.5 degrees — reduced forces but one-side wear), and Modified Flank (alternating sides — best for hard materials). For standard metric/unified threads, use Flank infeed. For exotic thread forms (buttress, acme), use Radial with reduced depth per pass (0.05-0.1mm). Always set the spring pass count to 2-3 at the final depth to ensure thread form accuracy.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:catia-docs
**Operations:** thread_turning

## Related
- [[catia-cam-tips-cat-035|Lathe Roughing Strategy Selection Based on Material Hardness]]
- [[catia-cam-tips-cat-036|Lathe Finish Turning Nose Radius Compensation Critical]]
- [[catia-cam-tips-cat-037|Groove Turning Insert Width Must Match or Undersize Groove]]
- [[catia-cam-tips-cat-039|Face Turning Constant Surface Speed for Uniform Finish]]
- [[catia-cam-tips-cat-040|Bore Turning Requires Minimum Bore Diameter for Tool Clearance]]
