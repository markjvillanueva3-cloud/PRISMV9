---
name: tribal-f360-083
category: code-tribal
subdomain: post_processor
domain: tribal-knowledge
tags: ["fusion360", "sub-programs", "repetitive-operations", "file-size", "g-code"]
confidence: 84
source: "web:autodesk-community"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-083.md
promoted_at: 2026-06-09T22:31:16.272Z
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
