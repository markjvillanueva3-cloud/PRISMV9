---
id: "gc-169"
title: "Post processor sub-program output for repeated patterns reduces program size"
source: "web:gibbscam-docs"
confidence: 84
category: "cam_strategy"
tags: ["gibbscam", "post-processor", "sub-programs", "pattern", "file-size"]
_source: "gibbscam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.965Z
---

# Post processor sub-program output for repeated patterns reduces program size

GibbsCAM's post can output repeated toolpath patterns (bolt circles, hole grids) as sub-programs (M98/M99 or O-number calls). Enable 'Sub-program Output' in the post settings and set the minimum repeat count (e.g., 4+) that triggers sub-program creation. The post extracts the repeating pattern, writes it as a sub-program, and calls it with coordinate offsets. This can reduce program file size by 60-80% for parts with many identical features. For older controls with limited memory, this is essential — a 2 MB program might compress to 200 KB with sub-programs. Verify the control supports the sub-program calling convention your post outputs.

**Category:** cam_strategy
**Confidence:** 84
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-080|Sub-program output reduces file size for repeated operations and patterns]]
- [[bobcad-cam-tips-bc-091|Sub-Program Output for Repeated Patterns]]
- [[surfcam-cam-tips-sc2-074|Sub-Program and Macro Output for Pattern Operations]]
- [[gibbscam-cam-tips-gc-076|Post processor customization through Compost enables machine-specific G-code]]
- [[gibbscam-cam-tips-gc-077|Multi-axis post processors handle rotary axis output and RTCP compensation]]
