---
name: tribal-mc-148
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "swiss", "guide-bushing", "rigidity", "deflection", "bar-stock"]
confidence: 85
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-148.md
promoted_at: 2026-06-09T22:31:16.431Z
---

# Guide bushing proximity in Swiss machining limits unsupported material length for rigidity

In Swiss-type lathe programming with Mastercam, the guide bushing supports the bar stock at the cutting zone, providing exceptional rigidity for small-diameter parts. The key programming constraint is that the unsupported length (distance from guide bushing to the cutting point) must be minimized — ideally less than 2× the bar diameter. In Mastercam, sequence operations to machine features closest to the guide bushing first, then advance the bar to expose the next section. If a feature requires machining far from the bushing (>3× D), reduce cutting forces by halving the feed rate and depth of cut to prevent bar deflection. The guide bushing position is defined in the Machine Group Properties under the Swiss configuration — set this accurately to match the physical machine.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:mastercam-docs
**Operations:** turning, swiss

## Related
- [[mastercam-cam-tips-mc-071|3+2 positioning uses indexed tilts instead of simultaneous 5-axis for rigidity]]
- [[mastercam-cam-tips-mc-149|Sub-spindle synchronization in Mastercam enables back-side machining after part-off]]
- [[mastercam-cam-tips-mc-150|Gang tooling layout in Swiss machining requires careful clearance planning for simultaneous cuts]]
- [[mastercam-cam-tips-mc-151|B-axis milling on Swiss machines enables off-axis holes and flats without re-chucking]]
- [[mastercam-cam-tips-mc-152|Bar feeder programming in Mastercam automates stock advance and remnant handling]]
