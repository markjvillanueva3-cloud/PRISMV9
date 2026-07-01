---
name: tribal-cat-054
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "machine-builder", "kinematic", "chain", "joint"]
confidence: 88
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-054.md
promoted_at: 2026-06-09T22:31:16.042Z
---

# Machine Builder Kinematic Chain Definition Order

When building a machine model in CATIA NC Machine Tool Builder, define the kinematic chain from the fixed base to the spindle (for milling) or from the base to the chuck (for turning). Each joint must be defined in order: base → column → saddle → table/spindle. Incorrect chain order causes simulation axes to move in wrong directions. For 5-axis machines, the two rotary axes must be the last two joints in the chain (either table-table, table-head, or head-head configuration). Validate by manually jogging each axis in simulation.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:catia-docs
**Operations:** simulation

## Related
- [[catia-cam-tips-cat-051|NC Machine Simulation Requires Complete Machine Model]]
- [[catia-cam-tips-cat-106|Previous Operation Reference Chain for Multi-Step Rest Machining]]
- [[catia-cam-tips-cat-001|Pocketing Spiral vs Zigzag Tool Path Style Selection]]
- [[catia-cam-tips-cat-002|Facing Operation Overlap Percentage for Full Coverage]]
- [[catia-cam-tips-cat-003|Profile Contouring Compensation Mode Selection]]
