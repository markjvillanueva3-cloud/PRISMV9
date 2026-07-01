---
name: tribal-mc-151
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "swiss", "b-axis", "live-tooling", "cross-hole", "milling"]
confidence: 83
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-151.md
promoted_at: 2026-06-09T22:31:16.432Z
---

# B-axis milling on Swiss machines enables off-axis holes and flats without re-chucking

Many Swiss-type lathes include a B-axis (rotary) milling spindle that can machine cross-holes, flats, slots, and contours at angles to the part axis. In Mastercam, program B-axis operations using Mill toolpaths within the Swiss machine group, setting the Tool Plane to the angled orientation. The C-axis (spindle rotation) indexes the part to the correct angular position while the B-axis positions the milling tool. Key considerations: (1) B-axis positioning accuracy is typically ±0.01° — verify this is sufficient for the feature tolerance; (2) live tool RPM is limited (typically 6,000–10,000 RPM) compared to a machining center, so adjust cutting speeds accordingly; (3) always program the B-axis move before the C-axis index to prevent collision with the guide bushing.

**Category:** cam_strategy
**Confidence:** 83
**Source:** web:community
**Operations:** milling, swiss

## Related
- [[mastercam-cam-tips-mc-253|Mastercam 2025 B-axis contour turning enables complex profile turning with live tooling on mill-turn]]
- [[mastercam-cam-tips-mc-084|Y-axis operations enable off-center milling for complex turned parts]]
- [[mastercam-cam-tips-mc-148|Guide bushing proximity in Swiss machining limits unsupported material length for rigidity]]
- [[mastercam-cam-tips-mc-149|Sub-spindle synchronization in Mastercam enables back-side machining after part-off]]
- [[mastercam-cam-tips-mc-150|Gang tooling layout in Swiss machining requires careful clearance planning for simultaneous cuts]]
