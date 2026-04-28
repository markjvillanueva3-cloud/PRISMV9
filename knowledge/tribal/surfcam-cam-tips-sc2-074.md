---
id: "sc2-074"
title: "Sub-Program and Macro Output for Pattern Operations"
source: "web:surfcam-subprogram"
confidence: 87
category: "post_processor"
tags: ["sub-programs", "macros", "pattern", "bolt-circle", "file-size"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.088Z
---

# Sub-Program and Macro Output for Pattern Operations

SURFCAM posts can generate sub-programs (M98/M99 on Fanuc, L-calls on Siemens) for repeated operations like bolt-circle drilling, pattern milling, and mirror operations. This reduces NC file size and makes the program easier to edit at the machine. Configure the post to detect repeated toolpath patterns and output them as sub-program calls. Set the sub-program numbering start (e.g., O8000) to avoid conflicts with the main program number range.

**Category:** post_processor
**Confidence:** 87
**Source:** web:surfcam-subprogram
**Operations:** posting

## Related
- [[bobcad-cam-tips-bc-091|Sub-Program Output for Repeated Patterns]]
- [[gibbscam-cam-tips-gc-169|Post processor sub-program output for repeated patterns reduces program size]]
- [[fusion360-cam-tips-ext-f360-083|Sub-Program Output for Repetitive Operations]]
- [[gibbscam-cam-tips-gc-080|Sub-program output reduces file size for repeated operations and patterns]]
- [[edgecam-cam-tips-ec-078|Sub-Program Output for Repeated Patterns]]
