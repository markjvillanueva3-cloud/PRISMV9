---
name: tribal-wedm-mcam-004
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["wire-edm", "4-axis", "uv-axis", "synchronization", "sync-mode", "entity", "branch", "taper"]
confidence: 91
source: "mastercam_wire_tutorial:page44"
promoted_from: knowledge/tribal/wedm-knowledge-tips-wedm-mcam-004-2.md
promoted_at: 2026-05-26T16:07:21.315Z
---

# 4-axis Wire EDM synchronization methods — match upper/lower chains correctly

4-axis Wire EDM cuts different profiles in XY (lower) and UV (upper) planes. Synchronization determines how the wire moves between chains: (1) By Entity — matches endpoint of each entity, requires same entity count in both chains. (2) By Branch — matches contours at branch points, requires 3D geometry connecting upper/lower. (3) By Point — matches user-defined point entities on each chain. (4) Manual — user-defined matching of chain sections. (5) By Node — matches parametric splines by node points. (6) Manual/Density — matches chains and assigns density for areas with small radii. Choose sync mode based on geometry: same-shape taper uses By Entity; different-shape profiles need By Point or Manual.

**Category:** programming
**Confidence:** 91
**Source:** mastercam_wire_tutorial:page44
**Operations:** wire_edm

## Related
- [[esprit-cam-tips-esp-154|Wire EDM 4-Axis Taper Cutting with Independent UV Motion]]
- [[mastercam-cam-tips-mc-119|4-axis taper wire EDM requires synchronized upper/lower guide geometry]]
- [[surfcam-cam-tips-sc2-056|4-Axis Wire EDM Taper Cutting with Independent UV]]
- [[wedm-knowledge-tips-jm-die-004|JM Die E28xx taper 5-pass for 4-axis UV work — E2821-E2822-E2823-E2824-E2825]]
- [[wedm-knowledge-tips-jm-die-018|JM Die NOZE TEST pattern — 4-axis UV taper benchmark program]]
