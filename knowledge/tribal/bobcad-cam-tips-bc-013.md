---
id: "bc-013"
title: "Facing with Minimize Retracts for Continuous Cutting"
source: "web:bobcad-facing-v37"
confidence: 89
category: "cam_strategy"
tags: ["facing", "minimize-retracts", "continuous", "cycle-time"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.454Z
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
