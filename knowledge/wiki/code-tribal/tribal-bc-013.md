---
name: tribal-bc-013
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["facing", "minimize-retracts", "continuous", "cycle-time"]
confidence: 89
source: "web:bobcad-facing-v37"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-013.md
promoted_at: 2026-06-09T22:31:15.934Z
---

# Facing with Minimize Retracts for Continuous Cutting

BobCAD V37 enhanced facing with 'Minimize Retracts' keeps the tool at cutting depth between passes instead of retracting to the rapid plane. After the first pass, the tool moves directly to the next depth rather than retracting unnecessarily. This reduces cycle time by 20-40% on multi-pass facing operations. Set overlap to 5-10% of tool diameter. For large face mills (50mm+), use unidirectional climb milling at 70% stepover for best surface finish.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:bobcad-facing-v37
**Operations:** facing

## Related
- [[sprutcam-cam-tips-spr-048|Facing Cycle Optimization for Cycle Time]]
- [[bobcad-cam-tips-bc-047|Face Turning with CSS and Max RPM Control]]
- [[bobcad-cam-tips-bc-170|BobCAD Swiss-Type Sub-Spindle Back-Working Operations]]
- [[camworks-cam-tips-cw-067|Facing — Optimize Feed Direction and Constant Surface Speed]]
- [[catia-cam-tips-cat-002|Facing Operation Overlap Percentage for Full Coverage]]
