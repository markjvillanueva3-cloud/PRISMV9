---
id: "cw-089"
title: "Sub-Program Output — Reduce G-Code File Size for Pattern Operations"
source: "web:camworks-docs"
confidence: 87
category: "cam_strategy"
tags: ["camworks", "post-processor", "sub-program", "patterns", "file-size"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.713Z
---

# Sub-Program Output — Reduce G-Code File Size for Pattern Operations

Enable sub-program output for operations with repeated patterns (bolt circles, grid patterns, multi-cavity). The post generates the toolpath once as a sub-program (O-number or P-label) and calls it with coordinate offsets for each instance. This reduces G-code file size by 80-95% for highly repetitive parts. Verify the sub-program call format matches your controller: Fanuc uses M98 P____ L____, Siemens uses CALL with parameters, Heidenhain uses CALL LBL.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:camworks-docs
**Operations:** milling, drilling

## Related
- [[esprit-cam-tips-esp-076|Sub-Program Output for Repeated Patterns]]
- [[gibbscam-cam-tips-gc-080|Sub-program output reduces file size for repeated operations and patterns]]
- [[topsolid-cam-tips-ts-070|Sub-Program Output for Repeated Patterns]]
- [[worknc-cam-tips-wnc-063|Sub-Program Output Reduces File Size for Patterns]]
- [[camworks-cam-tips-cw-085|Post Customization — Modify Output Format for Your Controller]]
