---
name: tribal-mc-044
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "dynamic-contour", "gap-settings", "interrupted", "profiling", "retract"]
confidence: 83
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-044.md
promoted_at: 2026-06-09T22:31:16.406Z
---

# Dynamic Contour gap settings prevent retracts on interrupted profiles

When machining interrupted profiles (e.g., walls with windows or slots), Dynamic Contour's Gap Settings control whether the tool retracts, stays at depth, or feeds across air gaps. Set Gap Size to the maximum allowable traverse distance without retract (typically 5-15 mm). For gaps larger than this threshold, the tool retracts to a safe height. Staying at depth across small gaps saves 2-5 seconds per gap and reduces tool marks from re-entry.

**Category:** cam_strategy
**Confidence:** 83
**Source:** web:community
**Operations:** profiling, contouring

## Related
- [[mastercam-cam-tips-mc-040|Dynamic Mill micro lifts eliminate full retracts between slices]]
- [[mastercam-cam-tips-mc-114|Toolpath linking parameters control retract height, lead-in, and lead-out strategy]]
- [[mastercam-cam-tips-mc-251|Mastercam 2025 Enhanced Multi-axis Linking reduces retract distances with collision-aware transitions]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
