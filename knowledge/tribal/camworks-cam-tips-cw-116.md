---
id: "cw-116"
title: "Tool Measurement Probing — Verify Tool Length and Diameter On-Machine"
source: "web:camworks-docs"
confidence: 87
category: "cam_strategy"
tags: ["camworks", "probing", "tool-measurement", "verification", "safety"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.734Z
---

# Tool Measurement Probing — Verify Tool Length and Diameter On-Machine

Program tool measurement probing to verify tool length and diameter before critical operations. The probe cycle measures the tool against the tool setter (typically a table-mounted touch probe) and updates the tool offset register. This catches: wrong tool loaded (length mismatch > 5mm), broken tool (no contact detected), and worn tool (diameter undersize). Set a tolerance window — if measured length deviates > 0.5mm from expected, the program should alarm rather than silently updating the offset.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:camworks-docs
**Operations:** probing

## Related
- [[camworks-cam-tips-cw-119|Verification Probing — Final Part Inspection On-Machine]]
- [[camworks-cam-tips-cw-196|Automated Probing Cycles — First-Part Verification Before Production]]
- [[camworks-cam-tips-cw-198|Stock Verification Probing — Confirm Raw Material Before Machining]]
- [[camworks-cam-tips-cw-200|Tool Length and Diameter Measurement — Laser and Touch Probes]]
- [[camworks-cam-tips-cw-053|5-Axis Collision Avoidance — Automatic Tool Tilting Around Obstacles]]
