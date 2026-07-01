---
name: tribal-sc2-074
category: code-tribal
subdomain: post_processor
domain: tribal-knowledge
tags: ["sub-programs", "macros", "pattern", "bolt-circle", "file-size"]
confidence: 87
source: "web:surfcam-subprogram"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-074.md
promoted_at: 2026-06-09T22:31:16.676Z
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
