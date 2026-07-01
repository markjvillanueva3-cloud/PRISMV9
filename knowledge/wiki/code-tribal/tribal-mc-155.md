---
name: tribal-mc-155
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "swiss", "pinch-turning", "vibration", "opposing-tools", "slender-parts"]
confidence: 82
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-155.md
promoted_at: 2026-06-09T22:31:16.433Z
---

# Pinch turning uses opposing tools on main and sub-spindle slides for vibration-free OD machining

Pinch turning positions two OD turning tools 180° apart on opposite tool slides, both cutting simultaneously. The opposing cutting forces cancel out radial deflection, enabling aggressive feeds on slender parts (L/D > 5) that would chatter with a single tool. In Mastercam, program pinch turning by creating two synchronized turning operations in the Sync Manager — one on the main tool slide, one on the sub-spindle tool slide — both set to the same Z-range, depth of cut, and feed. The tools must be identical (same nose radius, lead angle) and their Z-positions must track within 0.1 mm. Pinch turning is particularly effective for Swiss-machined shafts and pins where deflection would otherwise limit the depth of cut. Radial force cancellation allows 2× the normal feed rate with better surface finish.

**Category:** cam_strategy
**Confidence:** 82
**Source:** web:community
**Operations:** turning, swiss

## Related
- [[mastercam-cam-tips-mc-148|Guide bushing proximity in Swiss machining limits unsupported material length for rigidity]]
- [[mastercam-cam-tips-mc-149|Sub-spindle synchronization in Mastercam enables back-side machining after part-off]]
- [[mastercam-cam-tips-mc-150|Gang tooling layout in Swiss machining requires careful clearance planning for simultaneous cuts]]
- [[mastercam-cam-tips-mc-151|B-axis milling on Swiss machines enables off-axis holes and flats without re-chucking]]
- [[mastercam-cam-tips-mc-152|Bar feeder programming in Mastercam automates stock advance and remnant handling]]
