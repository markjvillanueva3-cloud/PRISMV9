---
name: tribal-mc-156
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "advanced-drill", "per-segment", "speed-feed", "deep-hole", "peck"]
confidence: 87
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-156.md
promoted_at: 2026-06-09T22:31:16.433Z
---

# Mastercam Advanced Drill allows per-segment speed, feed, and cycle changes within a single hole

Unlike the standard Drill toolpath that uses one set of parameters for the entire hole, Advanced Drill divides the hole into segments with independently configurable speed, feed, cycle type, and coolant. This is critical for deep holes where the first segment uses a high-speed peck for the pilot zone, the middle segments use progressively shorter pecks with reduced feed for chip management, and the final segment uses a dwell at the bottom for improved hole accuracy. In Mastercam, define segments by depth range and assign unique parameters to each. For cross-drilled holes that break through into an intersecting hole, reduce feed by 50% in the breakthrough segment to prevent drill grab. Advanced Drill eliminates the need for custom drill cycle macros in the control.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:mastercam-docs
**Operations:** drilling, hole_making

## Related
- [[mastercam-cam-tips-mc-159|Deep hole BTA drilling requires through-tool coolant programming and guide pad alignment]]
- [[mastercam-cam-tips-mc-160|Gun drilling parameters focus on straight-line accuracy and coolant flow for extreme depth ratios]]
- [[mastercam-cam-tips-mc-288|Composite stack drilling in Mastercam uses peck cycles with controlled thrust force to prevent delamination]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
