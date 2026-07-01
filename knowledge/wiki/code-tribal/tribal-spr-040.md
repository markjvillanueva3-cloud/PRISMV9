---
name: tribal-spr-040
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["multi-machine", "distribution", "optimization", "scheduling"]
confidence: 0
source: "web:sprutcam-forum"
promoted_from: knowledge/tribal/sprutcam-cam-tips-spr-040.md
promoted_at: 2026-06-09T22:31:16.628Z
---

# Multi-Machine Job Distribution Strategy

When distributing a job across multiple machines in SprutCAM: (1) assign roughing to the most rigid machine (highest spindle torque), (2) assign finishing to the most accurate machine (best positioning repeatability), (3) assign drilling to the machine with the fastest tool changer. Create separate NC programs per machine with matching datum references. Transfer stock (IPW) between machines via coordinate system alignment.

**Category:** cam_strategy
**Confidence:** 0.81
**Source:** web:sprutcam-forum
**Operations:** setup

## Related
- [[esprit-cam-tips-esp-203|Multi-Machine Job Scheduling Optimization]]
- [[cimatron-cam-tips-cim-095|Multi-Machine Post Processing]]
- [[esprit-cam-tips-esp-205|Multi-Machine Tool Inventory Optimization]]
- [[esprit-cam-tips-esp-207|Multi-Machine Energy Optimization for Green Manufacturing]]
- [[sprutcam-cam-tips-spr-199|Multi-Machine Post for Flexible Scheduling]]
