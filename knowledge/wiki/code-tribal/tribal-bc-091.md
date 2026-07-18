---
name: tribal-bc-091
category: code-tribal
subdomain: post_processor
domain: tribal-knowledge
tags: ["sub-programs", "pattern", "bolt-circle", "file-size"]
confidence: 87
source: "web:bobcad-subprogram"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-091.md
promoted_at: 2026-06-09T22:31:15.955Z
---

# Sub-Program Output for Repeated Patterns

BobCAD posts generate sub-programs (M98/M99 Fanuc, L-calls Siemens) for repeated operations: bolt-circle drilling, pattern milling, and mirror operations. This reduces NC file size and simplifies at-machine editing. Configure sub-program numbering start (e.g., O8000) to avoid conflicts with main program numbers. For mill-turn, sub-programs can encapsulate common turning cycles that are reused across multiple part families.

**Category:** post_processor
**Confidence:** 87
**Source:** web:bobcad-subprogram
**Operations:** posting

## Related
- [[surfcam-cam-tips-sc2-074|Sub-Program and Macro Output for Pattern Operations]]
- [[gibbscam-cam-tips-gc-169|Post processor sub-program output for repeated patterns reduces program size]]
- [[fusion360-cam-tips-ext-f360-083|Sub-Program Output for Repetitive Operations]]
- [[gibbscam-cam-tips-gc-080|Sub-program output reduces file size for repeated operations and patterns]]
- [[edgecam-cam-tips-ec-078|Sub-Program Output for Repeated Patterns]]
