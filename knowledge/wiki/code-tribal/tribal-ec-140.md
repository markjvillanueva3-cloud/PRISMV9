---
name: tribal-ec-140
category: code-tribal
subdomain: post_processing
domain: tribal-knowledge
tags: ["fixture-plate", "sub-programs", "work-offsets", "post-processor"]
confidence: 0
source: "web:edgecam-docs"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-140.md
promoted_at: 2026-06-09T22:31:16.194Z
---

# Fixture Plate Sub-Program Generation for CNC Efficiency

Configure the post processor to output fixture plate programs as main program + sub-programs. Each part instance becomes a sub-program (O-number) called with work offset. The main program handles tool changes and calls sub-programs with G54.1 P-codes for each position. This reduces program size by 80-90% for high-count plates and simplifies editing — change the sub-program once to update all instances.

**Category:** post_processing
**Confidence:** 0.84
**Source:** web:edgecam-docs
**Operations:** all

## Related
- [[gibbscam-cam-tips-gc-169|Post processor sub-program output for repeated patterns reduces program size]]
- [[edgecam-cam-tips-ec-138|Fixture Plate Grid Pattern with Instance Machining]]
- [[edgecam-cam-tips-ec-142|Fixture Plate Part Presence Probing Before Machining]]
- [[bobcad-cam-tips-bc-091|Sub-Program Output for Repeated Patterns]]
- [[edgecam-cam-tips-ec-078|Sub-Program Output for Repeated Patterns]]
