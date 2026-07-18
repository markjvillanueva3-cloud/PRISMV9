---
name: tribal-cw-089
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "post-processor", "sub-program", "patterns", "file-size"]
confidence: 87
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-089.md
promoted_at: 2026-06-09T22:31:16.006Z
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
