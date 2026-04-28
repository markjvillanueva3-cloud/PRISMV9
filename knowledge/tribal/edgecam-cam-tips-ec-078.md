---
id: "ec-078"
title: "Sub-Program Output for Repeated Patterns"
source: "web:edgecam-post"
confidence: 87
category: "cam_strategy"
tags: ["sub-programs", "repeated-patterns", "code-reduction", "post"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.312Z
---

# Sub-Program Output for Repeated Patterns

Configure Edgecam's post to output sub-programs (M98/M99 on Fanuc, L-calls on Siemens) for repeated patterns. Sub-programs reduce code size by 80-90% for hole patterns and fixture arrays. Set the numbering convention to match your DNC system. Enable auto-detection of repeating patterns to automatically identify sub-program candidates. Verify that the machine has adequate memory for the sub-program call stack depth.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:edgecam-post
**Operations:** post_processing

## Related
- [[bobcad-cam-tips-bc-091|Sub-Program Output for Repeated Patterns]]
- [[edgecam-cam-tips-ec-140|Fixture Plate Sub-Program Generation for CNC Efficiency]]
- [[fusion360-cam-tips-ext-f360-083|Sub-Program Output for Repetitive Operations]]
- [[gibbscam-cam-tips-gc-169|Post processor sub-program output for repeated patterns reduces program size]]
- [[surfcam-cam-tips-sc2-074|Sub-Program and Macro Output for Pattern Operations]]
