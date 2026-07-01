---
name: tribal-bc-134
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["v37", "thread-milling", "custom-profile", "helical", "multi-start"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-134.md
promoted_at: 2026-06-09T22:31:15.965Z
---

# BobCAD V37 Thread Milling with Custom Thread Profiles

V37 expands thread milling to support custom thread profiles beyond standard ISO/UN threads. Define the thread profile as a wireframe cross-section and BobCAD generates a helical toolpath that traces the profile at the specified pitch. This enables buttress threads, Acme threads, and custom sealing profiles. Set the number of spring passes (1-2) at the start and end of the helix for smooth thread lead-in/out. For multi-start threads, specify the number of starts and BobCAD generates offset helical passes. Use single-point thread mills for thread diameters <2x the tool diameter.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:bobcad-docs
**Operations:** threading

## Related
- [[bobcad-cam-tips-bc-015|Thread Milling with Helical Interpolation]]
- [[catia-cam-tips-cat-131|Prismatic Thread Milling Operation Configuration]]
- [[edgecam-cam-tips-ec-015|Thread Milling for Large or Non-Standard Threads]]
- [[edgecam-cam-tips-ec-203|Custom Thread Milling Cycle with Variable Pitch]]
- [[gibbscam-cam-tips-gc-005|Thread milling uses helical interpolation for precision internal threads]]
