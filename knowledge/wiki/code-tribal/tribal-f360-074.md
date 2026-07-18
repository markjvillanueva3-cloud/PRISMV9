---
name: tribal-f360-074
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["fusion360", "turning", "roughing", "depth-of-cut", "chip-breaker"]
confidence: 86
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-074.md
promoted_at: 2026-06-09T22:31:16.270Z
---

# Turning Roughing Profile with DOC Pattern Selection

In Turning Profile Roughing, select the cutting pattern based on your insert geometry. Use Zig-Zag (bidirectional) for CNMG-style 80-degree inserts on gentle profiles, and One Way for WNMG 80-degree trigon inserts on profiles with undercuts. Set the Maximum Depth of Cut to 50-80% of the insert's edge length to maintain safe chip breaking. Enable Use Chip Breaker compensation if your insert has built-in chip breaker geometry to prevent long stringy chips.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:fusion360-docs
**Operations:** turning_profile

## Related
- [[camworks-cam-tips-cw-063|Turn Roughing — Optimize Stock Removal with Proper Depth of Cut Sequence]]
- [[edgecam-cam-tips-ec-036|Turning Roughing with Optimized Pass Distribution]]
- [[fusion360-cam-tips-ext-f360-041|Multi-Depth Adaptive with Progressive Stepdown]]
- [[fusion360-cam-tips-ext-f360-045|Chip Load vs DOC Relationship in Adaptive Clearing]]
- [[fusion360-cam-tips-ext-f360-075|Turning Face Operation with Constant Surface Speed]]
