---
name: tribal-mc-040
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "dynamic-mill", "micro-lifts", "linking", "air-cutting", "retract"]
confidence: 85
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-040.md
promoted_at: 2026-06-09T22:31:16.405Z
---

# Dynamic Mill micro lifts eliminate full retracts between slices

Enable Micro Lifts in Dynamic Mill linking parameters to replace full retract moves with small lift-off distances (typically 0.25-0.5 mm above the cut surface). This keeps the tool near the workpiece during repositioning between slices, reducing air-cutting time by 15-30% on parts with many isolated pockets. Micro lifts are safe because Dynamic Motion already ensures the tool path is gouge-free at the linking height.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:mastercam-docs
**Operations:** roughing, 2d_pocket

## Related
- [[mastercam-cam-tips-mc-114|Toolpath linking parameters control retract height, lead-in, and lead-out strategy]]
- [[mastercam-cam-tips-mc-206|Feed plane position controls where the tool transitions from rapid to feed rate on approach]]
- [[mastercam-cam-tips-mc-251|Mastercam 2025 Enhanced Multi-axis Linking reduces retract distances with collision-aware transitions]]
- [[mastercam-cam-tips-mc-041|Dynamic Mill approach distance controls initial engagement ramp length]]
- [[mastercam-cam-tips-mc-042|Dynamic Mill slot width controls minimum feature size for engagement]]
