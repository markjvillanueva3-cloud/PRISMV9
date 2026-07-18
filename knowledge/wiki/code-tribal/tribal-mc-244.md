---
name: tribal-mc-244
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "swarf-milling", "ruled-surface", "side-cutting", "wall-finishing", "multiaxis"]
confidence: 86
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-244.md
promoted_at: 2026-06-09T22:31:16.455Z
---

# Swarf milling uses the full side of the tool to finish ruled surfaces in a single pass per strip

Swarf (side-cutting) milling in Mastercam tilts the tool to align the full flute length with a ruled surface, cutting the entire wall height in one pass. This produces excellent surface finish with no cusps (unlike Z-level finishing with a ball end mill). The surface must be ruled (definable by straight lines between two curves) for true swarf milling — complex freeform surfaces cannot be swarf-cut. In Mastercam Multiaxis, select the Swarf toolpath type: define the drive surface (the wall to be cut), the check surface (floor or adjacent surface to protect), and the tool axis control (align tool axis to surface ruling direction). Use a flat or corner-radius end mill with flute length equal to or longer than the wall height. Step-over is measured along the wall surface, not in XY — set to 30–50% of tool diameter for roughing and 10–20% for finishing. Swarf milling reduces cycle time by 70–90% compared to Z-level finishing on tall walls.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:mastercam-docs
**Operations:** finishing, 5_axis

## Related
- [[mastercam-cam-tips-mc-137|Tangent barrel cutters finish ruled surfaces and flat walls in a single pass per strip]]
- [[mastercam-cam-tips-mc-064|Swarf cutting uses the tool's side to machine ruled surfaces in one pass]]
- [[mastercam-cam-tips-mc-130|Taper barrel cutters combine wall finishing and floor blending in a single tool]]
- [[mastercam-cam-tips-mc-144|Draft angle finishing in mold work requires tool axis alignment to the draft direction]]
- [[mastercam-cam-tips-mc-199|Point and drive curve selection for multiaxis toolpaths must align with tool contact intent]]
