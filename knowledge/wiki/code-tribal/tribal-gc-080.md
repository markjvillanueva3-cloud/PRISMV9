---
name: tribal-gc-080
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "post-processor", "sub-program", "m98", "pattern", "file-size"]
confidence: 86
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-080.md
promoted_at: 2026-06-09T22:31:16.332Z
---

# Sub-program output reduces file size for repeated operations and patterns

Configure the GibbsCAM post to output repeated operations as sub-programs (M98/M99 on Fanuc, L-calls on Heidenhain). For bolt circles, hole patterns, and repeated pocket features, the sub-program contains the machining moves while the main program calls it with coordinate offsets. This reduces program size dramatically for parts with hundreds of identical features. In TMS, enable sub-program output so each part instance calls the same sub-routine with different work offsets. Some controls support up to 9 levels of sub-program nesting for complex pattern-of-patterns layouts.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-169|Post processor sub-program output for repeated patterns reduces program size]]
- [[camworks-cam-tips-cw-089|Sub-Program Output — Reduce G-Code File Size for Pattern Operations]]
- [[catia-cam-tips-cat-074|Sub-Program Generation for Repeated Geometry Patterns]]
- [[gibbscam-cam-tips-gc-076|Post processor customization through Compost enables machine-specific G-code]]
- [[gibbscam-cam-tips-gc-077|Multi-axis post processors handle rotary axis output and RTCP compensation]]
