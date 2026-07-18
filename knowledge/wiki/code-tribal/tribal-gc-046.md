---
name: tribal-gc-046
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "mtm", "sub-spindle", "transfer", "synchronization", "part-off"]
confidence: 88
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-046.md
promoted_at: 2026-06-09T22:31:16.324Z
---

# Sub-spindle transfer requires precise sync and clamp force control

Part transfer from main spindle to sub-spindle in GibbsCAM MTM requires careful synchronization. Program the sequence: sub-spindle advances → grips part → main spindle releases → part-off tool cuts → sub-spindle retracts. Set the spindle synchronization M-code before transfer to match RPM. For thin-wall parts, specify reduced clamping pressure on the sub-spindle to prevent deformation. GibbsCAM simulates the entire transfer sequence including spindle advance, grip, cut-off, and retract to verify clearances and timing.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-050|Part-off tool approach angle and feed rate prevent pip formation]]
- [[gibbscam-cam-tips-gc-138|MTM wait codes synchronize part cutoff with sub-spindle catch for lights-out safety]]
- [[gibbscam-cam-tips-gc-141|MTM C-axis milling on the sub-spindle requires transformed coordinate origin]]
- [[gibbscam-cam-tips-gc-171|GibbsCAM gear skiving on multi-task machines produces internal gears without broaching]]
- [[bobcad-cam-tips-bc-056|Sub-Spindle Transfer for Complete Part Machining]]
