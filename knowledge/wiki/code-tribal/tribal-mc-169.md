---
name: tribal-mc-169
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "common-line", "nesting", "shared-edge", "material-saving", "router"]
confidence: 84
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-169.md
promoted_at: 2026-06-09T22:31:16.436Z
---

# Common line cutting shares edges between adjacent parts to eliminate double cuts and save material

When nested parts share a straight or simple curved edge, Mastercam can program a single common-line cut that separates both parts simultaneously. This eliminates the cutter-width gap between parts, saving material (1 kerf width per shared edge) and reducing cycle time (one cut instead of two). In Mastercam, enable common-line cutting in the Nesting parameters and set the minimum shared edge length (typically 10 mm minimum for stable cutting). Common line cutting works best with parts that have straight or gently curved shared edges — complex curves with tight radii should retain separate cuts with gaps. For accurate common-line results, ensure cutter compensation is set to Computer mode so both parts receive correct dimensions. Common line cutting can improve sheet utilization by 3–8% on densely nested layouts.

**Category:** cam_strategy
**Confidence:** 84
**Source:** web:community
**Operations:** routing, nesting

## Related
- [[mastercam-cam-tips-mc-164|Nesting layout optimization in Mastercam Router maximizes sheet utilization above 85%]]
- [[mastercam-cam-tips-mc-168|Remnant tracking in Mastercam nesting reuses partial sheets from previous jobs]]
- [[mastercam-cam-tips-mc-238|Common line cutting between nested parts saves one kerf width per shared edge]]
- [[bobcad-cam-tips-bc-177|BobCAD Nesting with Common-Line Cutting]]
- [[mastercam-cam-tips-mc-165|Compression cutters prevent delamination on both top and bottom surfaces of composite laminates]]
