---
id: "f360-083"
title: "Sub-Program Output for Repetitive Operations"
source: "web:autodesk-community"
confidence: 84
category: "post_processor"
tags: ["fusion360", "sub-programs", "repetitive-operations", "file-size", "g-code"]
_source: "fusion360-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:42.692Z
---

# Sub-Program Output for Repetitive Operations

Enable sub-program output in the post processor for operations that repeat at multiple locations (e.g., identical pockets at 6 positions). The post generates the toolpath once as a sub-program (O-number or L-label) and calls it with coordinate offsets using G54-G59 or G10/G52 shifts. This reduces G-code file size by 60-80% for multi-instance parts and makes edits easier — change the sub-program once and all instances update.

**Category:** post_processor
**Confidence:** 84
**Source:** web:autodesk-community
**Operations:** post_processing

## Related
- [[fusion360-cam-tips-ext-f360-105|Smoothing Tolerance for Controller Look-Ahead]]
- [[fusion360-cam-tips-ext-f360-106|Arc Fitting to Replace Linear Segments]]
- [[fusion360-cam-tips-ext-f360-175|Custom Post Processor Development in JavaScript]]
- [[bobcad-cam-tips-bc-091|Sub-Program Output for Repeated Patterns]]
- [[gibbscam-cam-tips-gc-169|Post processor sub-program output for repeated patterns reduces program size]]
